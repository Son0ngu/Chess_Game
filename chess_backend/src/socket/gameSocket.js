const jwt = require('jsonwebtoken');
const User = require('../models/user');
const GameService = require('../services/GameService');
const logger = require('../utils/logger');
const Game = require('../models/Game');
const { Chess } = require('chess.js'); // Thêm vào đầu file

/**
 * Set up Socket.IO handlers for chess game communication
 */
const setupGameSocket = (io) => {
  // Track active sessions by user ID
  const userSessions = new Map();

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
        username: user.username
      };
      
      // Update user's online status
      await User.findByIdAndUpdate(user._id, { 
        status: 'online',
        lastActive: Date.now() 
      });
      
      next();
    } catch (error) {
      return next(new Error('authentication_error'));
    }
  });

  // Dọn dẹp người dùng không hoạt động
  const INACTIVE_TIMEOUT = 30000; // 30 giây

  // Chạy kiểm tra định kỳ
  setInterval(async () => {
    try {
      const cutoffTime = new Date(Date.now() - INACTIVE_TIMEOUT);
      
      // Tìm và cập nhật người dùng không hoạt động
      const result = await User.updateMany(
        { 
          status: { $in: ['online', 'looking_for_match'] }, 
          lastActive: { $lt: cutoffTime } 
        },
        { status: 'offline' }
      );
      
      if (result.modifiedCount > 0) {
        logger.info(`Marked ${result.modifiedCount} users as offline due to inactivity`);
        
        // Cập nhật danh sách người chơi đang hoạt động
        const activePlayers = await GameService.getActivePlayers();
        io.to('lobby').emit('lobby:activePlayers', activePlayers);
        io.to('lobby').emit('lobby:usersCount', activePlayers.length);
      }
    } catch (error) {
      logger.error(`Error cleaning up inactive users: ${error.message}`);
    }
  }, 15000); // Chạy 15 giây một lần

  // Connection handling
  io.on('connection', (socket) => {
    const userId = socket.user.id;
    const isReconnecting = userSessions.has(userId);
    
    // Store session data
    userSessions.set(userId, {
      socketId: socket.id,
      username: socket.user.username,
      lastActive: new Date(),
      gameId: isReconnecting ? userSessions.get(userId).gameId : null
    });
    
    // If reconnecting and previously in a game, restore that connection
    if (isReconnecting && userSessions.get(userId).gameId) {
      socket.gameId = userSessions.get(userId).gameId;
      socket.join(`game:${socket.gameId}`);
    }
    
    logger.info(`Socket ${isReconnecting ? 're' : ''}connected: ${socket.user.username} (${socket.id})`);
    
    // Heartbeat handler
    socket.on('user:heartbeat', async () => {
      if (!socket.user) return;  // Thiếu return ở đây!
      
      try {
        // Update session data
        if (userSessions.has(socket.user.id)) {
          userSessions.get(socket.user.id).lastActive = new Date();
        }
        
        // Ensure correct game state is maintained
        const gameId = userSessions.get(socket.user.id)?.gameId || socket.gameId;
        
        // Update user status in database
        await User.findByIdAndUpdate(socket.user.id, { 
          lastActive: new Date(),
          status: gameId ? 'in_game' : 'online'
        });
      } catch (error) {
        logger.error(`Heartbeat error for ${socket.user.username}: ${error.message}`);
      }
    });

    // Join lobby
    socket.on('lobby:join', async () => {
      socket.join('lobby');
      
      // Cập nhật trạng thái người dùng thành 'online'
      if (socket.user) {
        await User.findByIdAndUpdate(socket.user.id, { 
          status: 'online', 
          lastActive: new Date() 
        });
      }
      
      // Lấy danh sách người chơi đang hoạt động
      const activePlayers = await GameService.getActivePlayers();
      
      // Gửi danh sách người chơi và SỐ LƯỢNG chính xác
      io.to('lobby').emit('lobby:activePlayers', activePlayers);
      io.to('lobby').emit('lobby:usersCount', activePlayers.length);
      
      logger.info(`User ${socket.user?.username || 'Anonymous'} joined lobby`);
    });
    
    // Leave lobby
    socket.on('lobby:leave', () => {
      socket.leave('lobby');
      
      // Get online users count
      const usersCount = io.sockets.adapter.rooms.get('lobby')?.size || 0;
      
      // Update online users count
      io.to('lobby').emit('lobby:usersCount', usersCount);
    });
    
    // Find match
    socket.on('game:findMatch', async () => {
      if (!socket.user) return;
      
      try {
        // Cập nhật trạng thái người dùng
        await User.findByIdAndUpdate(socket.user.id, { 
          status: 'looking_for_match'
        });
        
        // Gọi GameService để xử lý tìm trận
        const matchResult = await GameService.matchUsers(socket.user.id);
        logger.debug(`Matchmaking result: ${JSON.stringify(matchResult)}`);
        
        if (matchResult.success && matchResult.gameId) {
          // Kiểm tra gameId không phải undefined trước khi emit
          if (!matchResult.gameId || matchResult.gameId === "undefined" || typeof matchResult.gameId !== 'string') {
            logger.error(`Invalid gameId in matchResult: ${matchResult.gameId}`);
            throw new Error('Invalid game ID created');
          }
          
          // Thêm vào socket.on('game:findMatch', ...) sau khi gọi matchUsers()
          if (matchResult.gameId) {
            // Verify game exists in database
            const gameCheck = await Game.findById(matchResult.gameId);
            
            if (!gameCheck) {
              logger.error(`Game with ID ${matchResult.gameId} doesn't exist in database!`);
              throw new Error('Game ID exists but game not found in database');
            } else {
              logger.debug(`Game verification successful: ${matchResult.gameId}`);
            }
          }

          logger.info(`Match found for ${socket.user.username} - Game ID: ${matchResult.gameId}`);
          
          // Nếu đã tìm được đối thủ
          socket.emit('game:matched', {
            gameId: matchResult.gameId,
            opponent: matchResult.opponent
          });
          
          // Thông báo cho đối thủ
          let opponentNotified = false;
          for (const [id, connectedSocket] of io.sockets.sockets.entries()) {
            if (connectedSocket.user && connectedSocket.user.id === matchResult.opponent.id) {
              connectedSocket.emit('game:matched', {
                gameId: matchResult.gameId,
                opponent: {
                  id: socket.user.id,
                  username: socket.user.username
                }
              });
              opponentNotified = true;
              break;
            }
          }
          
          if (!opponentNotified) {
            logger.warn(`Could not notify opponent ${matchResult.opponent.username} about match`);
          }
        } else {
          // Nếu đang tìm trận
          socket.emit('game:finding', {
            position: matchResult.queuePosition || 0
          });
        }
      } catch (error) {
        logger.error(`Matchmaking error for ${socket.user?.username}: ${error.message}`);
        socket.emit('game:error', { message: 'Failed to find match' });
        
        // Đặt lại trạng thái người dùng khi gặp lỗi
        await User.findByIdAndUpdate(socket.user.id, { 
          status: 'online'
        });
      }
    });
    
    // Cancel matchmaking
    socket.on('game:cancelMatch', async () => {
      if (!socket.user) return;
      
      try {
        // Cập nhật trạng thái người dùng
        await User.findByIdAndUpdate(socket.user.id, { 
          status: 'online'
        });
        
        // Xóa người dùng khỏi hàng đợi
        const gameService = require('../services/GameService');
        gameService.matchmakingQueue = gameService.matchmakingQueue.filter(
          entry => entry.userId !== socket.user.id
        );
        
        // Cập nhật danh sách người chơi đang hoạt động
        const activePlayers = await GameService.getActivePlayers();
        io.to('lobby').emit('lobby:activePlayers', activePlayers);
        io.to('lobby').emit('lobby:usersCount', activePlayers.length);
        
        socket.emit('game:matchCancelled', { message: 'Match search cancelled' });
        
        logger.info(`${socket.user.username} cancelled matchmaking`);
      } catch (error) {
        logger.error(`Cancel matchmaking error: ${error.message}`);
        socket.emit('game:error', { message: 'Failed to cancel matchmaking' });
      }
    });
    
    // Join a specific game
    socket.on('game:join', async ({ gameId }) => {
      try {
        // Kiểm tra gameId hợp lệ
        if (!gameId || gameId === 'undefined') {
          return socket.emit('game:error', { 
            message: 'Invalid game ID',
            code: 'INVALID_GAME_ID'
          });
        }
        
        // Update session data with game ID
        if (userSessions.has(socket.user.id)) {
          userSessions.get(socket.user.id).gameId = gameId;
        }
        
        // Get game data
        const game = await GameService.getGame(gameId);
        
        if (!game) {
          return socket.emit('game:error', { 
            message: 'Game not found',
            code: 'GAME_NOT_FOUND'
          });
        }
        
        // Check if user is part of the game
        const player = game.players.find(p => p.id === socket.user.id);
        
        if (!player) {
          return socket.emit('game:error', { message: 'You are not part of this game' });
        }
        
        // Join the game room
        socket.join(`game:${gameId}`);
        
        // Thêm dòng này sau khi join game room thành công
        socket.gameId = gameId;
        
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
        socket.to(`game:${gameId}`).emit('game:undoRequested', {
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

        console.log(result);
        
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
    socket.on('game:offerDraw', async ({ gameId }) => {
      try {
        // Lấy game từ cache hoặc database
        const game = await GameService.getGame(gameId);
        if (!game) {
          throw new Error('Game not found');
        }
        
        // Kiểm tra người chơi có trong game không
        const player = game.players.find(p => p.id === socket.user.id);
        if (!player) {
          throw new Error('Player is not part of this game');
        }
        
        // Xác định đối thủ
        const opponent = game.players.find(p => p.id !== socket.user.id);
        if (!opponent) {
          throw new Error('Opponent not found');
        }
        
        // Cập nhật thông tin đề nghị hòa trong database
        const result = await GameService.offerDraw(gameId, socket.user.id);
        
        // Tìm socket của đối thủ và chỉ gửi cho họ
        for (const [id, connectedSocket] of io.sockets.sockets.entries()) {
          if (connectedSocket.user && connectedSocket.user.id === opponent.id) {
            connectedSocket.emit('game:drawOffer', {
              offeredBy: socket.user.id,
              username: socket.user.username
            });
            break;
          }
        }
        
        logger.info(`${socket.user.username} offered draw in game ${gameId}`);
      } catch (error) {
        logger.error(`Draw offer error: ${error.message}`);
        socket.emit('game:error', { message: error.message });
      }
    });
    
    // Respond to draw offer
    socket.on('game:acceptDraw', async ({ gameId }) => {
      try {
        // Lấy game từ database để kiểm tra
        const gameData = await Game.findById(gameId);
        
        if (!gameData) {
          throw new Error('Game not found');
        }
        
        // Kiểm tra xem có đề nghị hòa không
        if (!gameData.drawOffers || gameData.drawOffers.length === 0) {
          throw new Error('No draw has been offered');
        }
        
        // Kiểm tra người chơi không tự chấp nhận đề nghị của chính mình
        if (gameData.drawOffers.some(id => id.toString() === socket.user.id)) {
          throw new Error('You cannot accept your own draw offer');
        }
        
        // Cập nhật game status
        const result = await GameService.acceptDraw(gameId, socket.user.id);
        
        // Thông báo cho tất cả người chơi
        io.to(`game:${gameId}`).emit('game:over', {
          result: {
            type: 'draw',
            reason: 'agreement'
          }
        });
        
        // Update lobby player count
        io.to('lobby').emit('lobby:activePlayers', await GameService.getActivePlayers());
        
        logger.info(`Draw accepted in game ${gameId}`);
      } catch (error) {
        logger.error(`Accept draw error: ${error.message}`);
        socket.emit('game:error', { message: error.message });
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
        
        // Notify other player about the resignation
        socket.to(`game:${gameId}`).emit('game:playerResigned', {
          username: socket.user.username,
          message: "The noob resign!"
        });
        
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
      if (!socket.user) return;
      
      // Store session data for reconnection, but set a timeout
      setTimeout(() => {
        // If no reconnection after 30s, remove session and mark as offline
        if (userSessions.has(socket.user.id) && 
            userSessions.get(socket.user.id).socketId === socket.id) {
          userSessions.delete(socket.user.id);
          
          // Only update to offline if not reconnected
          User.findByIdAndUpdate(socket.user.id, {
            status: 'offline'
          }).catch(err => logger.error(`Error updating user status: ${err.message}`));
        }
      }, 30000); // 30 second grace period for refresh
      
      // Cập nhật cả số lượng và danh sách
      const activePlayers = await GameService.getActivePlayers();
      io.to('lobby').emit('lobby:activePlayers', activePlayers);
      io.to('lobby').emit('lobby:usersCount', activePlayers.length);
      
      logger.info(`Socket disconnected: ${socket.user.username}`);
      
      if (socket.gameId) {
        const game = await GameService.getGame(socket.gameId);
        if (game && game.status === 'active') {
          // Đánh dấu người chơi đã ngắt kết nối
          await Game.findByIdAndUpdate(
            socket.gameId,
            { $set: { "players.$[elem].disconnected": true } },
            { arrayFilters: [{ "elem.user": socket.user.id }] }
          );
        }
      }
    });
  
    /*
    socket.on('game:undo', async ({ gameId }) => {
      try {
        const game = await Game.findById(gameId);
        if (!game) return socket.emit('game:error', { message: 'Game not found' });
    
        const updatedGame = await GameService.undoMove(game, socket.user.id);
        if (!updatedGame) {
          return socket.emit('game:error', { message: 'Undo failed' });
        }
    
        // Emit updated game state to both players in the room
        io.to(`game:${gameId}`).emit('game:update', {
          board: getBoardFromFEN(updatedGame.fen),
          position: updatedGame.fen,
          currentTurn: updatedGame.currentTurn,
          legalMoves: updatedGame.legalMoves,
          inCheck: updatedGame.inCheck,
          history: updatedGame.moves
        });
    
        // Optional: emit a confirmation
        io.to(`game:${gameId}`).emit('game:undoConfirmed', {
          message: `${socket.user.username} undid the last move`
        });
    
        logger.info(`${socket.user.username} undid move in game ${gameId}`);
      } catch (err) {
        logger.error(`Undo error: ${err.message}`);
        socket.emit('game:error', { message: 'Server error on undo' });
      }
  });
  */
});

  // Helper function to count online users
  async function countOnlineUsers() {
    const count = await User.countDocuments({ status: 'online' });
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