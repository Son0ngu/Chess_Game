const connectDB = require('../config/db');
const Game = require('../models/Game');
const User = require('../models/user');
const { Chess } = require('chess.js');
const GameService = require('../services/GameService');
const gameAdapter = require('../utils/gameAdapter');
const logger = require('../utils/logger'); // Ensure logger is imported

// Ensure DB connection is established
connectDB();

// Create a new game
const createGame = async (req, res) => {
  try {
    const { whitePlayer, blackPlayer, timeControl } = req.body;
    
    // Simplified game options
    const gameOptions = {
      timeControl: timeControl || '10min'
    };
    
    // Call service to create game
    const gameId = await GameService.createGame(whitePlayer, blackPlayer, gameOptions);
    
    res.status(201).json({ 
      message: 'Game created successfully', 
      gameId: gameId,
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    });
  } catch (err) {
    logger.error(`Error creating game: ${err.message}`);
    res.status(500).json({ error: err.message || 'Failed to create game' });
  }
};

// Get game by ID
const getGame = async (req, res) => {
  try {
    // Use GameService to get game data
    const game = await GameService.getGame(req.params.id);
    
    // Convert to expected client format
    const formattedGame = gameAdapter.toClassicFormat(game);
    res.json(formattedGame);
  } catch (err) {
    logger.error(`Error fetching game: ${err.message}`);
    res.status(500).json({ error: err.message || 'Failed to retrieve game' });
  }
};

// Make a move
const makeMove = async (req, res) => {
  try {
    const { from, to, promotion, userId } = req.body;
    const gameId = req.params.id;
    
    // Use GameService to make the move
    const moveResult = await GameService.makeMove(gameId, userId, from, to, promotion);
    
    // Convert result
    const response = { 
      message: 'Move recorded', 
      fen: moveResult.fen,
      isGameOver: moveResult.isGameOver,
      status: moveResult.isGameOver ? 
        (moveResult.result.type || 'completed') : 
        'active'
    };
    
    // Add player info if game is over
    if (moveResult.isGameOver) {
      const game = await GameService.getGame(gameId);
      
      response.players = {
        white: {
          id: game.players.find(p => p.color === 'white').id,
          username: game.players.find(p => p.color === 'white').username
        },
        black: {
          id: game.players.find(p => p.color === 'black').id,
          username: game.players.find(p => p.color === 'black').username
        }
      };
    }
    
    res.json(response);
  } catch (err) {
    logger.error(`Error making move: ${err.message}`);
    res.status(500).json({ error: err.message || 'Failed to process move' });
  }
};

// Get user's games
const getUserGames = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Use GameService to get the user's games
    const games = await GameService.getUserGames(userId);
    
    // Convert to format for client
    const formattedGames = games.map(game => gameAdapter.toClassicFormat(game));
    
    res.json(formattedGames);
  } catch (err) {
    logger.error(`Error fetching games: ${err.message}`);
    res.status(500).json({ error: err.message || 'Failed to retrieve games' });
  }
};

// Find match for player
const findMatch = async (req, res) => {
  try {
    const { userId, timeControl } = req.body;
    
    // Use GameService for matchmaking
    const matchResult = await GameService.matchUsers(userId, {
      timeControl
    });
    
    res.json(matchResult);
  } catch (err) {
    logger.error(`Error finding match: ${err.message}`);
    res.status(500).json({ error: err.message || 'Failed to find match' });
  }
};

// Handle game resignation
const resignGame = async (req, res) => {
  try {
    const gameId = req.params.id;
    const userId = req.user._id;
    
    // Use GameService to handle resignation 
    const result = await GameService.resignGame(gameId, userId);
    
    // Convert result to expected format
    const response = gameAdapter.toClassicFormat({
      _id: gameId,
      status: 'completed',
      result: result.winner === 'white' ? '1-0' : '0-1',
      resultReason: 'resignation',
      players: result.players
    });
    
    res.json({ 
      message: 'Game resigned', 
      result: response.result
    });
  } catch (err) {
    logger.error(`Error resigning game: ${err.message}`);
    res.status(500).json({ error: err.message || 'Failed to resign game' });
  }
};

// Handle game completion
const completeGame = async (req, res) => {
  try {
    const { gameId, result } = req.body;
    
    // Use GameService
    const gameResult = await GameService.completeGame(gameId, result);
    
    // Get player info
    const white = gameResult.players.find(p => p.color === 'white');
    const black = gameResult.players.find(p => p.color === 'black');
    
    res.json({
      message: 'Game completed',
      status: gameResult.status,
      result: gameResult.result,
      winner: gameResult.winnerColor,
      players: {
        white: {
          id: white.id,
          username: white.username
        },
        black: {
          id: black.id,
          username: black.username
        }
      }
    });
  } catch (err) {
    logger.error(`Error completing game: ${err.message}`);
    res.status(500).json({ error: err.message || 'Failed to complete game' });
  }
};

// Get player statistics
const getPlayerStats = async (req, res) => {
  try {
    // Use GameService to get player stats
    const playerStats = await GameService.getPlayerStats();
    res.json(playerStats);
  } catch (err) {
    logger.error(`Error retrieving player statistics: ${err.message}`);
    res.status(500).json({ error: err.message || 'Failed to retrieve player statistics' });
  }
};

// Handle timeout of a game
const handleTimeout = async (req, res) => {
  try {
    const { gameId, playerId } = req.body;
    
    // Use GameService
    const gameResult = await GameService.handleTimeout(gameId, playerId);
    
    // Get player info
    const white = gameResult.players.find(p => p.color === 'white');
    const black = gameResult.players.find(p => p.color === 'black');
    
    res.json({
      message: 'Player timed out',
      status: gameResult.status,
      winner: gameResult.winnerColor,
      players: {
        white: {
          id: white.id,
          username: white.username
        },
        black: {
          id: black.id,
          username: black.username
        }
      }
    });
  } catch (err) {
    logger.error(`Error handling timeout: ${err.message}`);
    res.status(500).json({ error: err.message || 'Failed to process timeout' });
  }
};

// Offer a draw
const offerDraw = async (req, res) => {
  try {
    const gameId = req.params.id;
    const userId = req.user._id;
    
    // Use GameService
    const result = await GameService.offerDraw(gameId, userId);
    
    res.json({ 
      message: 'Draw offered',
      offeringPlayer: result.offeringPlayer
    });
  } catch (err) {
    logger.error(`Error offering draw: ${err.message}`);
    res.status(500).json({ error: err.message || 'Failed to offer draw' });
  }
};

// Accept or decline a draw offer
const acceptDraw = async (req, res) => {
  try {
    const gameId = req.params.id;
    const userId = req.user._id;
    const accepted = req.body.accepted || true; // Default to accepting
    
    // Use GameService to handle the draw response
    const result = await GameService.handleDrawOffer(gameId, userId, accepted);
    
    if (accepted) {
      // Format response for accepted draw
      const response = gameAdapter.toClassicFormat({
        _id: gameId,
        status: 'completed',
        result: '1/2-1/2',
        resultReason: 'agreement',
        players: result.players
      });
      
      return res.json({ 
        message: 'Draw accepted', 
        result: response.result 
      });
    } else {
      return res.json({
        message: 'Draw declined',
        status: 'active'
      });
    }
  } catch (err) {
    logger.error(`Error handling draw response: ${err.message}`);
    res.status(500).json({ error: err.message || 'Failed to process draw response' });
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
  getPlayerStats,
  handleTimeout,
  offerDraw,
  acceptDraw
};