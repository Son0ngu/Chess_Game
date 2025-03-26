const Game = require('../models/Game');
const User = require('../models/user');
const { Chess } = require('chess.js');

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
    
    // Check game status
    if (chess.isGameOver()) {
      if (chess.isCheckmate()) {
        game.status = 'checkmate';
        game.winner = chess.turn() === 'w' ? game.blackPlayer : game.whitePlayer;
      } else {
        game.status = 'draw';
      }
    }
    
    await game.save();
    
    res.json({ 
      message: 'Move recorded', 
      fen: game.fen,
      isGameOver: chess.isGameOver(),
      status: game.status
    });
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

module.exports = {
  createGame,
  getGame,
  makeMove,
  getUserGames
};
