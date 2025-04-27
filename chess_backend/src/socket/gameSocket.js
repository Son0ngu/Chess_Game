const jwt = require('jsonwebtoken');
const User = require('../models/user');
const GameService = require('../services/GameService');
const logger = require('../utils/logger');

/**
 * Set up Socket.IO handlers for chess game communication
 */
const setupGameSocket = (io) => {
  // Authentication middleware
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('authentication_error'));
    }
    
    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Get user
      const user = await User.findById(decoded.id);
      
      if (!user) {
        return next(new Error('authentication_error'));
      }
      
      // Attach user to socket
      socket.user = {
        id: user._id.toString(),
        username: user.username,
        elo: user.elo
      };
      
      // Update user's online status
      await User.findByIdAndUpdate(user._id, { 
        isOnline: true, 
        lastActive: Date.now() 
      });
      
      next();
    } catch (error) {
      return next(new Error('authentication_error'));
    }
  });

  // Connection handling
  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.user.username} (${socket.id})`);
    
    // Join lobby
    socket.on('lobby:join', async () => {
      socket.join('lobby');
      
      // Send online users count and active players
      io.to('lobby').emit('lobby:usersCount', await countOnlineUsers());
      io.to('lobby').emit('lobby:activePlayers', await GameService.getActivePlayers());
    });
    
    // Leave lobby
    socket.on('lobby:leave', () => {
      socket.leave('lobby');
    });
    
    // Find match
    socket.on('game:findMatch', async (data) => {
      const { gameMode = 'casual', timeControl = '10min' } = data;
      
      // Add player to matchmaking
      const match = GameService.addToMatchmaking(socket.user.id, {
        gameMode,
        timeControl
      });
      
      // If a match is found, create a game and notify players
      if (match) {
        try {
          const gameId = await GameService.createGame(match.player1, match.player2, match.options);
          
          // Get player sockets
          const player1Socket = findSocketByUserId(match.player1);
          const player2Socket = findSocketByUserId(match.player2);
          
          if (player1Socket) {
            player1Socket.emit('game:matched', { id: gameId });
            player1Socket.join(`game:${gameId}`);
          }
          
          if (player2Socket) {
            player2Socket.emit('game:matched', { id: gameId });
            player2Socket.join(`game:${gameId}`);
          }
        } catch (error) {
          logger.error(`Error creating match: ${error.message}`);
          socket.emit('game:error', { message: 'Failed to create game' });
        }
      }
    });
    
    // Cancel matchmaking
    socket.on('game:cancelMatch', () => {
      // Logic to remove player from matchmaking queue
      // This would need to be implemented in GameService
    });
    
    // Join a specific game
    socket.on('game:join', async ({ gameId }) => {
      try {
        // Get game data
        const game = await GameService.getGame(gameId);
        
        if (!game) {
          return socket.emit('game:error', { message: 'Game not found' });
        }
        
        // Check if user is part of the game
        const player = game.players.find(p => p.id === socket.user.id);
        
        if (!player) {
          return socket.emit('game:error', { message: 'You are not part of this game' });
        }
        
        // Join the game room
        socket.join(`game:${gameId}`);
        
        // Send initial game data
        socket.emit('game:data', {
          id: game.id,
          players: game.players,
          board: getBoardFromFEN(game.chess.fen()),
          position: game.chess.fen(),
          currentTurn: game.chess.turn() === 'w' ? 'white' : 'black',
          moves: getMoveHistory(game.chess),
          legalMoves: GameService.getLegalMovesMap(game.chess),
          inCheck: game.chess.inCheck()
        });
        
        logger.info(`${socket.user.username} joined game ${gameId}`);
      } catch (error) {
        logger.error(`Error joining game: ${error.message}`);
        socket.emit('game:error', { message: 'Failed to join game' });
      }
    });
    
    // Leave a game
    socket.on('game:leave', ({ gameId }) => {
      socket.leave(`game:${gameId}`);
      logger.info(`${socket.user.username} left game ${gameId}`);
    });
    
    // Make a move
    socket.on('game:move', async ({ gameId, from, to, promotion }) => {
      try {
        const result = await GameService.makeMove(gameId, socket.user.id, from, to, promotion);
        
        // Broadcast the move to all players in the game
        io.to(`game:${gameId}`).emit('game:update', {
          board: getBoardFromFEN(result.fen),
          position: result.fen,
          lastMove: {
            from,
            to,
            piece: result.move.piece,
            color: result.move.color,
            captured: result.move.captured,
            promotion: result.move.promotion
          },
          currentTurn: result.currentTurn,
          inCheck: result.inCheck,
          legalMoves: result.legalMoves,
          gameOver: result.isGameOver,
          result: result.result
        });
        
        // If game is over, notify lobby of active players change
        if (result.isGameOver) {
          io.to('lobby').emit('lobby:activePlayers', await GameService.getActivePlayers());
        }
        
      } catch (error) {
        logger.error(`Move error: ${error.message}`);
        socket.emit('game:moveRejected', { error: error.message });
      }
    });
    
    // Request undo
    socket.on('game:requestUndo', async ({ gameId }) => {
      try {
        const userId = socket.user.id;
        const result = await GameService.requestUndo(gameId, userId);
        
        // Gửi yêu cầu undo tới đối thủ (sử dụng định dạng room đúng)
        socket.to(`game:${gameId}`).emit('game:undoRequest', {
          gameId,
          requesterId: userId
        });
        
        logger.info(`${socket.user.username} requested undo in game ${gameId}`);
      } catch (error) {
        logger.error(`Undo request error: ${error.message}`);
        socket.emit('game:error', { message: error.message });
      }
    });

    // Accept undo
    socket.on('game:acceptUndo', async ({ gameId }) => {
      try {
        const userId = socket.user.id;
        const result = await GameService.acceptUndo(gameId, userId);
        
        // Gửi trạng thái mới đến cả hai người chơi
        io.to(`game:${gameId}`).emit('game:update', {
          board: getBoardFromFEN(result.fen),
          position: result.fen,
          currentTurn: result.currentTurn,
          legalMoves: result.legalMoves,
          inCheck: result.inCheck,
          history: result.history
        });
        
        // Thông báo cho người yêu cầu rằng undo được chấp nhận
        socket.to(`game:${gameId}`).emit('game:undoResponse', { accepted: true });
        
        logger.info(`${socket.user.username} accepted undo in game ${gameId}`);
      } catch (error) {
        logger.error(`Accept undo error: ${error.message}`);
        socket.emit('game:error', { message: error.message });
      }
    });

    // Decline undo
    socket.on('game:declineUndo', async ({ gameId }) => {
      try {
        const userId = socket.user.id;
        const result = await GameService.declineUndo(gameId, userId);
        
        // Thông báo cho người yêu cầu rằng undo bị từ chối
        socket.to(`game:${gameId}`).emit('game:undoResponse', { accepted: false });
        
        logger.info(`${socket.user.username} declined undo in game ${gameId}`);
      } catch (error) {
        logger.error(`Decline undo error: ${error.message}`);
        socket.emit('game:error', { message: error.message });
      }
    });
    
    // Offer draw
    socket.on('game:offerDraw', ({ gameId }) => {
      socket.to(`game:${gameId}`).emit('game:drawOffer', {
        offeredBy: socket.user.id
      });
    });
    
    // Respond to draw offer
    socket.on('game:acceptDraw', async ({ gameId }) => {
      try {
        // Update game status in database
        const result = await GameService.acceptDraw(gameId, socket.user.id);
        
        // Broadcast game over to all players
        io.to(`game:${gameId}`).emit('game:over', {
          result: {
            type: 'draw',
            reason: 'agreement'
          }
        });
        
        // Update lobby active players
        io.to('lobby').emit('lobby:activePlayers', await GameService.getActivePlayers());
      } catch (error) {
        logger.error(`Accept draw error: ${error.message}`);
        socket.emit('game:error', { message: 'Failed to accept draw' });
      }
    });
    
    socket.on('game:declineDraw', ({ gameId }) => {
      socket.to(`game:${gameId}`).emit('game:drawDeclined');
    });
    
    // Resign game
    socket.on('game:resign', async ({ gameId }) => {
      try {
        // Update game status in database
        const result = await GameService.resignGame(gameId, socket.user.id);
        
        // Broadcast game over to all players
        io.to(`game:${gameId}`).emit('game:over', {
          result: {
            type: 'resignation',
            winner: result.winner
          }
        });
        
        // Update lobby active players
        io.to('lobby').emit('lobby:activePlayers', await GameService.getActivePlayers());
      } catch (error) {
        logger.error(`Resign error: ${error.message}`);
        socket.emit('game:error', { message: 'Failed to resign game' });
      }
    });
    
    // Handle disconnection
    socket.on('disconnect', async () => {
      logger.info(`Socket disconnected: ${socket.user.username}`);
      
      // Update user's online status
      await User.findByIdAndUpdate(socket.user.id, { 
        isOnline: false,
        lastActive: Date.now()
      });
      
      // Notify lobby of user count change
      io.to('lobby').emit('lobby:usersCount', await countOnlineUsers());
    });
  });

  // Helper function to count online users
  async function countOnlineUsers() {
    const count = await User.countDocuments({ isOnline: true });
    return count;
  }
  
  // Helper function to find a socket by user ID
  function findSocketByUserId(userId) {
    let userSocket = null;
    
    for (const [id, socket] of io.sockets.sockets.entries()) {
      if (socket.user && socket.user.id === userId) {
        userSocket = socket;
        break;
      }
    }
    
    return userSocket;
  }
  
  // Helper function to convert FEN to board representation
  function getBoardFromFEN(fen) {
    const chess = new (require('chess.js').Chess)(fen);
    const board = Array(8).fill().map(() => Array(8).fill(null));
    
    // Extract pieces from chess.js instance
    chess.board().forEach((row, rowIndex) => {
      row.forEach((square, colIndex) => {
        if (square) {
          board[rowIndex][colIndex] = {
            type: square.type,
            color: square.color === 'w' ? 'white' : 'black'
          };
        }
      });
    });
    
    return board;
  }
  
  // Helper function to get move history
  function getMoveHistory(chess) {
    return chess.history({ verbose: true }).map(move => ({
      from: move.from,
      to: move.to,
      piece: move.piece,
      color: move.color === 'w' ? 'white' : 'black',
      captured: move.captured,
      promotion: move.promotion,
      san: move.san
    }));
  }
};

module.exports = setupGameSocket;