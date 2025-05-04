const connectDB = require('../config/database');
const Game = require('../models/Game');
const User = require('../models/user');
const Room = require('../models/Room');
const { Chess } = require('chess.js');

// Ensure DB connection is established
connectDB();

// ELO rating constants
//const ELO_WIN_POINTS = 150;
//const ELO_LOSE_POINTS = 100;
//const DEFAULT_ELO = 1200;

// Create a new game
const createGame = async (req, res) => {
  try {
    const { whitePlayer, blackPlayer, timeControl } = req.body;
    
    // Verify players exist
    const whiteExists = await User.findById(whitePlayer);
    const blackExists = await User.findById(blackPlayer);
    
    if (!whiteExists || !blackExists) {
      return res.status(404).json({ error: 'One or both players not found' });
    }
    
    // Initialize new chess game
    const chess = new Chess();
    
    // Create game record
    const game = new Game({
      whitePlayer,
      blackPlayer,
      timeControl,
      pgn: chess.pgn(),
      fen: chess.fen(),
      status: 'active',
      moves: []
    });
    
    await game.save();
    
    res.status(201).json({ 
      message: 'Game created successfully', 
      gameId: game._id,
      fen: game.fen
    });
  } catch (err) {
    console.error('Error creating game:', err);
    res.status(500).json({ error: 'Failed to create game' });
  }
};

// Get game by ID
const getGame = async (req, res) => {
  try {
    const game = await Game.findById(req.params.id)
      .populate('whitePlayer', 'username elo')
      .populate('blackPlayer', 'username elo');
      
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    res.json(game);
  } catch (err) {
    console.error('Error retrieving game:', err);
    res.status(500).json({ error: 'Failed to retrieve game' });
  }
};

// Make a move
const makeMove = async (req, res) => {
  try {
    const { from, to, promotion } = req.body;
    const gameId = req.params.id;
    
    const game = await Game.findById(gameId);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    if (game.status !== 'active') {
      return res.status(400).json({ error: 'Game is not active' });
    }
    
    // Load current position
    const chess = new Chess();
    chess.load(game.fen);
    
    // Attempt move
    const moveObj = { from, to, ...(promotion && { promotion }) };
    const move = chess.move(moveObj);
    
    if (!move) {
      return res.status(400).json({ error: 'Invalid move' });
    }
    
    // Update game state
    game.fen = chess.fen();
    game.pgn = chess.pgn();
    game.moves.push({
      from,
      to,
      promotion,
      fen: chess.fen(),
      moveNumber: game.moves.length + 1
    });
    
    let updatedPlayerInfo = null;
    
    // Check game status
    if (chess.isGameOver()) {
      if (chess.isCheckmate()) {
        game.status = 'checkmate';
        game.winner = chess.turn() === 'w' ? game.blackPlayer : game.whitePlayer;
        
        // Update ELO ratings when game ends in checkmate
        await updateEloRatings(game);
        
        // Get updated player information after ELO changes
        const whitePlayer = await User.findById(game.whitePlayer);
        const blackPlayer = await User.findById(game.blackPlayer);
        
        updatedPlayerInfo = {
          white: {
            id: whitePlayer._id,
            username: whitePlayer.username,
            elo: whitePlayer.elo || DEFAULT_ELO,
            eloChange: game.eloChanges?.[whitePlayer._id.toString()]?.change || 0
          },
          black: {
            id: blackPlayer._id,
            username: blackPlayer.username,
            elo: blackPlayer.elo || DEFAULT_ELO,
            eloChange: game.eloChanges?.[blackPlayer._id.toString()]?.change || 0
          }
        };
        
        // Update player statuses
        await User.updateMany(
          { _id: { $in: [game.whitePlayer, game.blackPlayer] } },
          { status: 'online', currentGame: null }
        );
      } else {
        game.status = 'draw';
        // No ELO change for draws
      }
    }
    
    await game.save();
    
    const response = { 
      message: 'Move recorded', 
      fen: game.fen,
      isGameOver: chess.isGameOver(),
      status: game.status
    };
    
    // Include player info if game is over and ELO was updated
    if (updatedPlayerInfo) {
      response.players = updatedPlayerInfo;
    }
    
    res.json(response);
  } catch (err) {
    console.error('Error making move:', err);
    res.status(500).json({ error: 'Failed to process move' });
  }
};

// Get user's games
const getUserGames = async (req, res) => {
  try {
    const userId = req.params.userId;
    
    const games = await Game.find({
      $or: [
        { whitePlayer: userId },
        { blackPlayer: userId }
      ]
    })
    .populate('whitePlayer', 'username elo')
    .populate('blackPlayer', 'username elo')
    .sort({ createdAt: -1 });
    
    res.json(games);
  } catch (err) {
    console.error('Error retrieving user games:', err);
    res.status(500).json({ error: 'Failed to retrieve games' });
  }
};

// Find match for player based on ELO
const findMatch = async (req, res) => {
  try {
    const { userId, gameMode, timeControl } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    // Find the user and their ELO rating
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get user's ELO or use default
    const userElo = user.elo || DEFAULT_ELO;
    
    // ELO range to match with (initially small)
    let eloRange = 50;
    let potentialOpponent = null;
    let attempts = 0;
    const maxAttempts = 3;
    
    // Try to find opponent with progressively wider ELO ranges
    while (!potentialOpponent && attempts < maxAttempts) {
      // Find users with ELO within range who are looking for a match
      potentialOpponent = await User.findOne({
        _id: { $ne: userId },
        elo: { 
          $gte: userElo - eloRange, 
          $lte: userElo + eloRange 
        },
        status: 'looking_for_match',
        gameMode: gameMode || 'casual'
      });
      
      // Widen the ELO range for next attempt
      eloRange += 50;
      attempts++;
    }
    
    if (potentialOpponent) {
      // Create a game with the matched opponent
      const whitePlayer = Math.random() < 0.5 ? userId : potentialOpponent._id;
      const blackPlayer = whitePlayer === userId ? potentialOpponent._id : userId;
      
      const chess = new Chess();
      
      const game = new Game({
        whitePlayer,
        blackPlayer,
        timeControl: timeControl || '10min',
        pgn: chess.pgn(),
        fen: chess.fen(),
        status: 'active',
        moves: [],
        gameMode: gameMode || 'casual'
      });
      
      await game.save();
      
      // Update player statuses
      await User.updateMany(
        { _id: { $in: [userId, potentialOpponent._id] } },
        { status: 'in_game', currentGame: game._id }
      );
      
      return res.json({
        success: true,
        message: 'Match found',
        gameId: game._id,
        opponent: {
          id: potentialOpponent._id,
          username: potentialOpponent.username,
          elo: potentialOpponent.elo || DEFAULT_ELO
        }
      });
    } else {
      // No match found, update user status to looking
      await User.findByIdAndUpdate(userId, {
        status: 'looking_for_match',
        gameMode: gameMode || 'casual',
        timeControlPreference: timeControl || '10min'
      });
      
      return res.json({
        success: true,
        message: 'Looking for a match',
        elo: userElo
      });
    }
  } catch (err) {
    console.error('Error finding match:', err);
    res.status(500).json({ error: 'Failed to find match' });
  }
};

// Handle game resignation
const resignGame = async (req, res) => {
  try {
    const { gameId, userId } = req.body;
    
    const game = await Game.findById(gameId);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    if (game.status !== 'active') {
      return res.status(400).json({ error: 'Game is not active' });
    }
    
    // Determine winner based on who resigned
    if (game.whitePlayer.toString() === userId) {
      game.winner = game.blackPlayer;
    } else if (game.blackPlayer.toString() === userId) {
      game.winner = game.whitePlayer;
    } else {
      return res.status(400).json({ error: 'User is not a player in this game' });
    }
    
    game.status = 'resignation';
    
    // Update ELO ratings
    await updateEloRatings(game);
    
    await game.save();
    
    // Get updated player information
    const whitePlayer = await User.findById(game.whitePlayer);
    const blackPlayer = await User.findById(game.blackPlayer);
    
    // Update player statuses
    await User.updateMany(
      { _id: { $in: [game.whitePlayer, game.blackPlayer] } },
      { status: 'online', currentGame: null }
    );
    
    res.json({
      message: 'Game resigned',
      winner: game.winner,
      status: game.status,
      players: {
        white: {
          id: whitePlayer._id,
          username: whitePlayer.username,
          elo: whitePlayer.elo || DEFAULT_ELO,
          eloChange: game.eloChanges?.[whitePlayer._id.toString()]?.change || 0
        },
        black: {
          id: blackPlayer._id,
          username: blackPlayer.username,
          elo: blackPlayer.elo || DEFAULT_ELO,
          eloChange: game.eloChanges?.[blackPlayer._id.toString()]?.change || 0
        }
      }
    });
  } catch (err) {
    console.error('Error resigning game:', err);
    res.status(500).json({ error: 'Failed to resign game' });
  }
};

// Handle game completion and ELO updates
const completeGame = async (req, res) => {
  try {
    const { gameId, result } = req.body;
    
    const game = await Game.findById(gameId);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    if (game.status !== 'active') {
      return res.status(400).json({ error: 'Game is already completed' });
    }
    
    // Update game status based on result
    switch (result.type) {
      case 'checkmate':
        game.status = 'checkmate';
        game.winner = result.winner;
        break;
      case 'resignation':
        game.status = 'resignation';
        game.winner = result.winner;
        break;
      case 'timeout':
        game.status = 'timeout';
        game.winner = result.winner;
        break;
      case 'draw':
        game.status = 'draw';
        game.drawReason = result.reason || 'agreement';
        break;
      default:
        return res.status(400).json({ error: 'Invalid result type' });
    }
    
    // Update ELO ratings if there's a winner
    if (game.winner) {
      await updateEloRatings(game);
    }
    
    await game.save();
    
    // Get updated player information after ELO changes
    const whitePlayer = await User.findById(game.whitePlayer);
    const blackPlayer = await User.findById(game.blackPlayer);
    
    // Update player statuses
    await User.updateMany(
      { _id: { $in: [game.whitePlayer, game.blackPlayer] } },
      { status: 'online', currentGame: null }
    );
    
    res.json({
      message: 'Game completed',
      status: game.status,
      result: result.type,
      winner: game.winner,
      players: {
        white: {
          id: whitePlayer._id,
          username: whitePlayer.username,
          elo: whitePlayer.elo || DEFAULT_ELO,
          eloChange: game.eloChanges?.[whitePlayer._id.toString()]?.change || 0
        },
        black: {
          id: blackPlayer._id,
          username: blackPlayer.username,
          elo: blackPlayer.elo || DEFAULT_ELO,
          eloChange: game.eloChanges?.[blackPlayer._id.toString()]?.change || 0
        }
      }
    });
  } catch (err) {
    console.error('Error completing game:', err);
    res.status(500).json({ error: 'Failed to complete game' });
  }
};

// Get player ranking and ELO data
const getPlayerRankings = async (req, res) => {
  try {
    // Get all users with ELO ratings, sort by highest ELO
    const players = await User.find({}, 'username elo gamesPlayed gamesWon')
      .sort({ elo: -1 });
    
    // Calculate additional stats
    const playersWithStats = players.map((player, index) => ({
      rank: index + 1,
      username: player.username,
      elo: player.elo || DEFAULT_ELO,
      gamesPlayed: player.gamesPlayed || 0,
      gamesWon: player.gamesWon || 0,
      winRate: player.gamesPlayed ? 
        Math.round((player.gamesWon / player.gamesPlayed) * 100) : 0
    }));
    
    res.json(playersWithStats);
  } catch (err) {
    console.error('Error retrieving player rankings:', err);
    res.status(500).json({ error: 'Failed to retrieve rankings' });
  }
};

// Update ELO ratings based on game outcome
const updateEloRatings = async (game) => {
  try {
    // Only update ELO for games with a winner (not draws)
    if (!game.winner || !['checkmate', 'resignation', 'timeout'].includes(game.status)) {
      return;
    }
    
    const winner = await User.findById(game.winner);
    if (!winner) {
      console.error('Winner not found:', game.winner);
      return;
    }
    
    // Determine loser ID
    const loserId = game.winner.toString() === game.whitePlayer.toString() 
      ? game.blackPlayer 
      : game.whitePlayer;
    
    const loser = await User.findById(loserId);
    if (!loser) {
      console.error('Loser not found:', loserId);
      return;
    }
    
    // Update winner's ELO and game stats
    const winnerElo = (winner.elo || DEFAULT_ELO) + ELO_WIN_POINTS;
    await User.findByIdAndUpdate(winner._id, {
      elo: winnerElo,
      $inc: { gamesPlayed: 1, gamesWon: 1 }
    });
    
    // Update loser's ELO and game stats
    const loserElo = Math.max(0, (loser.elo || DEFAULT_ELO) - ELO_LOSE_POINTS);
    await User.findByIdAndUpdate(loser._id, {
      elo: loserElo,
      $inc: { gamesPlayed: 1 }
    });
    
    console.log(`Updated ELO ratings: ${winner.username} (${winnerElo}), ${loser.username} (${loserElo})`);
    
    // Record ELO changes in game
    game.eloChanges = {
      [winner._id]: {
        before: winner.elo || DEFAULT_ELO,
        after: winnerElo,
        change: ELO_WIN_POINTS
      },
      [loser._id]: {
        before: loser.elo || DEFAULT_ELO,
        after: loserElo,
        change: -ELO_LOSE_POINTS
      }
    };
    
    return game;
  } catch (error) {
    console.error('Error updating ELO ratings:', error);
  }
};

// Handle timeout of a game
const handleTimeout = async (req, res) => {
  try {
    const { gameId, playerId } = req.body;
    
    const game = await Game.findById(gameId);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    if (game.status !== 'active') {
      return res.status(400).json({ error: 'Game is not active' });
    }
    
    // Determine winner based on who timed out
    if (game.whitePlayer.toString() === playerId) {
      game.winner = game.blackPlayer;
    } else if (game.blackPlayer.toString() === playerId) {
      game.winner = game.whitePlayer;
    } else {
      return res.status(400).json({ error: 'Player is not in this game' });
    }
    
    game.status = 'timeout';
    
    // Update ELO ratings
    await updateEloRatings(game);
    
    await game.save();
    
    // Get updated player information
    const whitePlayer = await User.findById(game.whitePlayer);
    const blackPlayer = await User.findById(game.blackPlayer);
    
    // Update player statuses
    await User.updateMany(
      { _id: { $in: [game.whitePlayer, game.blackPlayer] } },
      { status: 'online', currentGame: null }
    );
    
    res.json({
      message: 'Player timed out',
      winner: game.winner,
      status: game.status,
      players: {
        white: {
          id: whitePlayer._id,
          username: whitePlayer.username,
          elo: whitePlayer.elo || DEFAULT_ELO,
          eloChange: game.eloChanges?.[whitePlayer._id.toString()]?.change || 0
        },
        black: {
          id: blackPlayer._id,
          username: blackPlayer.username,
          elo: blackPlayer.elo || DEFAULT_ELO,
          eloChange: game.eloChanges?.[blackPlayer._id.toString()]?.change || 0
        }
      }
    });
  } catch (err) {
    console.error('Error handling timeout:', err);
    res.status(500).json({ error: 'Failed to process timeout' });
  }
};

// Handle draw agreements
const handleDrawOffer = async (req, res) => {
  try {
    const { gameId, offeredBy, accepted } = req.body;
    
    const game = await Game.findById(gameId);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    if (game.status !== 'active') {
      return res.status(400).json({ error: 'Game is not active' });
    }
    
    if (accepted) {
      game.status = 'draw';
      game.drawReason = 'agreement';
      
      await game.save();
      
      // Get player information
      const whitePlayer = await User.findById(game.whitePlayer);
      const blackPlayer = await User.findById(game.blackPlayer);
      
      // Update player statuses
      await User.updateMany(
        { _id: { $in: [game.whitePlayer, game.blackPlayer] } },
        { status: 'online', currentGame: null }
      );
      
      return res.json({
        message: 'Draw accepted',
        status: game.status,
        drawReason: game.drawReason,
        players: {
          white: {
            id: whitePlayer._id,
            username: whitePlayer.username,
            elo: whitePlayer.elo || DEFAULT_ELO
          },
          black: {
            id: blackPlayer._id,
            username: blackPlayer.username,
            elo: blackPlayer.elo || DEFAULT_ELO
          }
        }
      });
    } else {
      return res.json({
        message: 'Draw declined',
        status: game.status
      });
    }
  } catch (err) {
    console.error('Error handling draw offer:', err);
    res.status(500).json({ error: 'Failed to process draw offer' });
  }
};

module.exports = {
  createGame,
  getGame,
  makeMove,
  getUserGames,
  findMatch,
  resignGame,
  completeGame,
  getPlayerRankings,
  handleTimeout,
  handleDrawOffer
};