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
    
    // Sử dụng GameService thay vì tạo game trực tiếp
    const gameOptions = {
      timeControl: timeControl || '10min',
      isRanked: false
    };
    
    // Gọi service để tạo game
    const gameId = await GameService.createGame(whitePlayer, blackPlayer, gameOptions);
    
    res.status(201).json({ 
      message: 'Game created successfully', 
      gameId: gameId,
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' // Vị trí bàn cờ ban đầu
    });
  } catch (err) {
    logger.error(`Error creating game: ${err.message}`);
    res.status(500).json({ error: err.message || 'Failed to create game' });
  }
};

// Get game by ID
const getGame = async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);
    if (!game) return res.status(404).json({ error: 'Game not found' });
    
    // Chuyển đổi sang format client mong đợi
    const formattedGame = gameAdapter.toClassicFormat(game);
    res.json(formattedGame);
  } catch (err) {
    logger.error(`Error fetching game: ${err.message}`);
    res.status(500).json({ error: 'Failed to retrieve game' });
  }
};

// Make a move
const makeMove = async (req, res) => {
  try {
    const { from, to, promotion, userId } = req.body;
    const gameId = req.params.id;
    
    // Sử dụng GameService để thực hiện nước đi
    const moveResult = await GameService.makeMove(gameId, userId, from, to, promotion);
    
    // Chuyển đổi kết quả
    const response = { 
      message: 'Move recorded', 
      fen: moveResult.fen,
      isGameOver: moveResult.isGameOver,
      status: moveResult.isGameOver ? 
        (moveResult.result.type || 'completed') : 
        'active'
    };
    
    // Bổ sung thông tin người chơi nếu game kết thúc
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
    
    // Sử dụng GameService
    const games = await GameService.getUserGames(userId);
    
    // Chuyển đổi định dạng phù hợp cho client
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
    const { userId, gameMode, timeControl } = req.body;
    
    // Chuyển logic này sang GameService
    const matchResult = await GameService.matchUsers(userId, {
      gameMode,
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
    const userId = req.user._id; // Lấy từ middleware auth
    
    // Sử dụng GameService để xử lý đầu hàng 
    const result = await GameService.resignGame(gameId, userId);
    
    // Chuyển đổi kết quả sang định dạng phù hợp
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
    
    // Sử dụng GameService
    const gameResult = await GameService.completeGame(gameId, result);
    
    // Lấy thông tin người chơi
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

// Get active players
const getPlayerRankings = async (req, res) => {
  try {
    // Sử dụng GameService
    const rankings = await GameService.getPlayerRankings();
    res.json(rankings);
  } catch (err) {
    logger.error(`Error retrieving player rankings: ${err.message}`);
    res.status(500).json({ error: err.message || 'Failed to retrieve rankings' });
  }
};

// Handle timeout of a game
const handleTimeout = async (req, res) => {
  try {
    const { gameId, playerId } = req.body;
    
    // Sử dụng GameService
    const gameResult = await GameService.handleTimeout(gameId, playerId);
    
    // Lấy thông tin người chơi
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

// Handle draw agreements
const handleDrawOffer = async (req, res) => {
  try {
    const { gameId, respondingPlayerId, accepted } = req.body;
    
    // Sử dụng GameService
    const result = await GameService.handleDrawOffer(gameId, respondingPlayerId, accepted);
    
    if (accepted) {
      // Lấy thông tin người chơi
      const white = result.players.find(p => p.color === 'white');
      const black = result.players.find(p => p.color === 'black');
      
      return res.json({
        message: 'Draw accepted',
        status: result.status,
        drawReason: result.drawReason,
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
    } else {
      return res.json({
        message: 'Draw declined',
        status: 'active'
      });
    }
  } catch (err) {
    logger.error(`Error handling draw offer: ${err.message}`);
    res.status(500).json({ error: err.message || 'Failed to process draw offer' });
  }
};

// Xử lý đề nghị hòa
const offerDraw = async (req, res) => {
  try {
    const gameId = req.params.id;
    const userId = req.user._id;
    
    // Sử dụng GameService
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

// Xử lý chấp nhận hòa
const acceptDraw = async (req, res) => {
  try {
    const gameId = req.params.id;
    const userId = req.user._id;
    
    // Sử dụng GameService để xử lý chấp nhận hòa
    const result = await GameService.acceptDraw(gameId, userId);
    
    // Chuyển đổi kết quả
    const response = gameAdapter.toClassicFormat({
      _id: gameId,
      status: 'completed',
      result: '1/2-1/2',
      resultReason: 'agreement',
      players: result.players
    });
    
    res.json({ 
      message: 'Draw accepted', 
      result: response.result 
    });
  } catch (err) {
    logger.error(`Error accepting draw: ${err.message}`);
    res.status(500).json({ error: 'Failed to accept draw' });
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
  handleDrawOffer,
  offerDraw,
  acceptDraw
};