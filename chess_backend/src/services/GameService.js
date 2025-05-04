const { Chess } = require('chess.js');
const Game = require('../models/Game');
const User = require('../models/user');
const logger = require('../utils/logger');

/**
 * Chuyển đổi thời gian kiểm soát thành số giây
 * Ví dụ: '10min' => 600 giây
 */
function calculateTimeInSeconds(timeControl) {
  if (!timeControl) return 600; // Mặc định 10 phút nếu không có
  
  try {
    if (timeControl.endsWith('min')) {
      const minutes = parseInt(timeControl.replace('min', ''));
      return minutes * 60; // Chuyển đổi phút sang giây
    }
    
    if (timeControl.includes('+')) {
      // Định dạng "5+3" (5 phút + 3 giây mỗi lượt)
      const [minutes, increment] = timeControl.split('+').map(Number);
      return minutes * 60; // Chỉ trả về thời gian cơ sở
    }
    
    // Nếu không khớp với định dạng nào, giả định là số phút
    const minutes = parseInt(timeControl);
    if (!isNaN(minutes)) {
      return minutes * 60;
    }
    
    return 600; // Mặc định 10 phút
  } catch (error) {
    logger.error(`Error parsing time control: ${timeControl}`);
    return 600; // Mặc định 10 phút nếu có lỗi
  }
}

/**
 * GameService - Handles all chess game logic and state management
 */
class GameService {
  constructor() {
    // In-memory cache of active games
    this.activeGames = new Map();
    // In-memory queue of players looking for matches
    this.matchmakingQueue = [];
    // Lưu trữ lịch sử nước đi cho từng game
    this.gameHistory = new Map();
    // Time-based cleanup interval (5 minutes)
    setInterval(() => this.cleanupInactiveGames(), 5 * 60 * 1000);
  }

  /**
   * Create a new game between two players
   */
  async createGame(player1Id, player2Id, gameOptions = {}) {
    try {
      logger.debug(`Creating game between ${player1Id} and ${player2Id}`);
      
      // Fetch player info
      const [player1, player2] = await Promise.all([
        User.findById(player1Id, 'username'),
        User.findById(player2Id, 'username')
      ]);
      
      if (!player1 || !player2) {
        throw new Error('One or both players not found');
      }

      // Create chess instance
      const chess = new Chess();
      
      // Create new game document
      const game = new Game({
        players: [
          {
            user: player1Id,
            username: player1.username,
            color: 'white',
            timeRemaining: calculateTimeInSeconds(gameOptions.timeControl) 
          },
          {
            user: player2Id,
            username: player2.username,
            color: 'black',
            timeRemaining: calculateTimeInSeconds(gameOptions.timeControl)
          }
        ],
        fen: chess.fen(),
        pgn: chess.pgn(),
        timeControl: gameOptions.timeControl || '10min',
        isRanked: !!gameOptions.isRanked,
        status: 'active',
        startTime: new Date()
      });
      
      // Save to database
      await game.save();
      
      // Add game to memory cache
      this.activeGames.set(game._id.toString(), {
        id: game._id.toString(),
        chess,
        players: game.players.map(p => ({
          id: p.user.toString(),
          username: p.username,
          color: p.color,
          timeRemaining: p.timeRemaining
        })),
        moves: [],
        drawOffers: [],
        undoRequests: [],
        lastMoveTime: Date.now()
      });
      
      // Convert ObjectId to string and return
      const gameId = game._id.toString();
      logger.debug(`Game created with ID: ${gameId}`);
      return gameId;
    } catch (error) {
      logger.error(`Error creating game: ${error.stack}`);
      throw error;
    }
  }
  
  /**
   * Add player to matchmaking queue
   */
  addToMatchmaking(userId) {
    const timeControl = '10min';
    
    // Add player to queue
    this.matchmakingQueue.push({
      userId,
      timeControl,
      timestamp: Date.now()
    });
    
    logger.info(`User ${userId} added to matchmaking queue`);
    
    // Try to find a match
    return this.findMatch();
  }
  
  /**
   * Find a match for waiting players
   */
  findMatch() {
    const queue = this.matchmakingQueue;
    
    if (queue.length < 2) {
      return null;
    }
    
    // Simple matching algorithm - match first two players with same time control
    for (let i = 0; i < queue.length; i++) {
      for (let j = i + 1; j < queue.length; j++) {
        const player1 = queue[i];
        const player2 = queue[j];
        
        if (player1.timeControl === player2.timeControl) {
          // Remove matched players from queue
          this.matchmakingQueue = queue.filter((_, idx) => idx !== i && idx !== j);
          
          // Create a new game for these players
          const gameOptions = {
            timeControl: player1.timeControl,
            isRanked: false
          };
          
          // Return the player IDs for game creation
          return {
            player1: player1.userId,
            player2: player2.userId,
            options: gameOptions
          };
        }
      }
    }
    
    return null;
  }

  /**
   * Get game by ID
   */
  async getGame(gameId) {
    // Check in-memory cache first
    if (this.activeGames.has(gameId)) {
      const game = this.activeGames.get(gameId);
      game.lastActivity = Date.now();
      return game;
    }
    
    // If not in memory, get from database
    try {
      const gameData = await Game.findById(gameId);
      
      if (!gameData) {
        throw new Error('Game not found');
      }
      
      // Recreate the chess instance
      const chess = new Chess();
      if (gameData.fen) {
        chess.load(gameData.fen);
      }
      
      // Chuyển đổi từ cấu trúc Game model sang cấu trúc in-memory
      const game = {
        id: gameId,
        chess,
        players: gameData.players.map(p => ({
          id: p.user.toString(),
          username: p.username,
          color: p.color
        })),
        lastActivity: Date.now(),
        options: {
          timeControl: gameData.timeControl,
          isRanked: false
        },
        status: gameData.status
      };
      
      this.activeGames.set(gameId, game);
      return game;
    } catch (error) {
      logger.error(`Error retrieving game ${gameId}: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Make a move in a game
   */
  async makeMove(gameId, userId, from, to, promotion = null) {
    try {
      // Get game from cache or database
      const game = await this.getGame(gameId);
      
      if (!game) {
        throw new Error('Game not found');
      }
      
      // Check if game is active
      if (game.status === 'completed') {
        throw new Error('Game is already completed');
      }
      
      // Find the player making the move
      const player = game.players.find(p => p.id === userId);
      if (!player) {
        throw new Error('Player not part of this game');
      }
      
      // Check if it's the player's turn
      const currentTurn = game.chess.turn() === 'w' ? 'white' : 'black';
      if (player.color !== currentTurn) {
        throw new Error('Not your turn');
      }
      
      // Try to make the move
      const moveOptions = promotion ? { promotion } : {};
      const move = game.chess.move({
        from,
        to,
        ...moveOptions
      });
      
      if (!move) {
        throw new Error('Invalid move');
      }
      
      // Update game in memory
      game.lastActivity = Date.now();
      
      // Lưu trạng thái game vào lịch sử
      this.saveGameState(gameId);
      
      // Save move to database
      await Game.findByIdAndUpdate(gameId, {
        $push: { moves: {
          from,
          to,
          piece: move.piece,
          color: currentTurn,
          captured: move.captured,
          promotion: move.promotion,
          san: move.san
        }},
        fen: game.chess.fen(),
        pgn: game.chess.pgn(),
        status: game.chess.isGameOver() ? 'completed' : 'active',
        result: this.getGameResult(game.chess)
      });
      
      // Check game status
      const gameStatus = this.getGameStatus(game.chess);
      
      // If game is over, update player stats
      if (gameStatus.isGameOver) {
        await this.updatePlayerStats(game, gameStatus.result);
      }
      
      // Return the updated game status
      return {
        gameId,
        move,
        fen: game.chess.fen(),
        currentTurn: game.chess.turn() === 'w' ? 'white' : 'black',
        inCheck: game.chess.inCheck(),
        ...gameStatus
      };
      
    } catch (error) {
      logger.error(`Error making move in game ${gameId}: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Lưu trữ trạng thái game vào lịch sử
   */
  saveGameState(gameId) {
    const game = this.activeGames.get(gameId);
    if (!game) return;
    
    // Lấy lịch sử hiện tại hoặc tạo mới nếu chưa có
    const history = this.gameHistory.get(gameId) || [];
    
    // Lưu trạng thái hiện tại vào lịch sử
    history.push({
      fen: game.chess.fen(),
      pgn: game.chess.pgn(),
      currentTurn: game.chess.turn() === 'w' ? 'white' : 'black',
      inCheck: game.chess.inCheck(),
      timestamp: Date.now()
    });
    
    // Giới hạn số lượng trạng thái lưu trữ (tùy chọn)
    if (history.length > 20) {
      history.shift(); // Loại bỏ trạng thái cũ nhất
    }
    
    this.gameHistory.set(gameId, history);
    
    return history.length - 1; // Trả về chỉ số của trạng thái hiện tại
  }

  /**
   * Handle game resignation
   */
  async resignGame(gameId, resigningUserId) {
    try {
      // Get game from cache or database
      const game = await this.getGame(gameId);
      
      if (!game) {
        throw new Error('Game not found');
      }
      
      // Check if game is already completed
      if (game.status === 'completed') {
        throw new Error('Game is already completed');
      }
      
      // Find the resigning player
      const resigningPlayer = game.players.find(p => p.id === resigningUserId);
      if (!resigningPlayer) {
        throw new Error('Player not part of this game');
      }
      
      // Determine winner (opponent of the resigning player)
      const winner = resigningPlayer.color === 'white' ? 'black' : 'white';
      const winningPlayer = game.players.find(p => p.color === winner);
      
      if (!winningPlayer) {
        throw new Error('Could not determine winner');
      }
      
      // Update game state
      game.status = 'completed';
      
      // Update game in database
      await Game.findByIdAndUpdate(gameId, {
        status: 'completed',
        result: winner === 'white' ? '1-0' : '0-1',
        completedAt: new Date()
      });
      
      // Update player stats
      // Update winner's stats
      await User.findByIdAndUpdate(winningPlayer.id, {
        $inc: { 
          gamesPlayed: 1,
          gamesWon: 1
        },
        status: 'online',
        currentGame: null
      });
      
      // Update loser's stats
      await User.findByIdAndUpdate(resigningPlayer.id, {
        $inc: { 
          gamesPlayed: 1,
          gamesLost: 1
        },
        status: 'online', 
        currentGame: null
      });
      
      logger.info(`Updated stats after resignation: ${winningPlayer.username} won, ${resigningPlayer.username} lost`);
      
      // Remove from active games cache
      this.activeGames.delete(gameId);
      
      return {
        gameId,
        status: 'completed',
        winner,
        winnerUsername: winningPlayer.username,
        resigningUsername: resigningPlayer.username,
        players: game.players // Trả về danh sách players để controller dễ dàng xử lý
      };
      
    } catch (error) {
      logger.error(`Error handling resignation for game ${gameId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Handle draw acceptance
   */
  async acceptDraw(gameId, acceptingUserId) {
    return this.handleDrawOffer(gameId, acceptingUserId, true);
  }

  /**
   * Get the current status of a chess game
   */
  getGameStatus(chess) {
    // Check if the game is over
    const isGameOver = chess.isGameOver();
    
    if (!isGameOver) {
      return {
        isGameOver: false,
        legalMoves: this.getLegalMovesMap(chess)
      };
    }
    
    // Determine the type of ending
    let result = {
      type: null,
      winner: null,
      reason: null
    };
    
    if (chess.isCheckmate()) {
      result.type = 'checkmate';
      result.winner = chess.turn() === 'w' ? 'black' : 'white';
    } else if (chess.isDraw()) {
      result.type = 'draw';
      
      if (chess.isStalemate()) {
        result.reason = 'stalemate';
      } else if (chess.isInsufficientMaterial()) {
        result.reason = 'insufficient_material';
      } else if (chess.isThreefoldRepetition()) {
        result.reason = 'repetition';
      } else {
        result.reason = 'agreement';
      }
    }
    
    return {
      isGameOver,
      result,
      legalMoves: this.getLegalMovesMap(chess)
    };
  }
  
  /**
   * Get a structured map of all legal moves for the current position
   */
  getLegalMovesMap(chess) {
    const moves = chess.moves({ verbose: true });
    const movesMap = {};
    
    moves.forEach(move => {
      if (!movesMap[move.from]) {
        movesMap[move.from] = [];
      }
      movesMap[move.from].push(move.to);
    });
    
    return movesMap;
  }
  
  /**
   * Get the result of a finished game
   */
  getGameResult(chess) {
    if (!chess.isGameOver()) {
      return null;
    }
    
    if (chess.isCheckmate()) {
      return chess.turn() === 'w' ? '0-1' : '1-0';
    } else if (chess.isDraw()) {
      return '1/2-1/2';
    }
    
    return null;
  }
  
  /**
   * Update player stats after a game
   */
  async updatePlayerStats(game, result) {
    const whitePlayer = game.players.find(p => p.color === 'white');
    const blackPlayer = game.players.find(p => p.color === 'black');
    
    if (!whitePlayer || !blackPlayer) {
      logger.error(`Missing player information for game ${game.id}`);
      return;
    }
    
    // Actual scores
    let scoreWhite, scoreBlack;
    
    if (result.type === 'checkmate') {
      scoreWhite = result.winner === 'white' ? 1 : 0;
      scoreBlack = result.winner === 'black' ? 1 : 0;
    } else if (result.type === 'draw') {
      scoreWhite = 0.5;
      scoreBlack = 0.5;
    } else {
      return; // No stats update for other outcomes
    }
    
    // Update in database
    await Promise.all([
      User.findByIdAndUpdate(whitePlayer.id, {
        $inc: {
          gamesPlayed: 1,
          gamesWon: scoreWhite === 1 ? 1 : 0,
          gamesLost: scoreWhite === 0 ? 1 : 0,
          gamesDrawn: scoreWhite === 0.5 ? 1 : 0
        }
      }),
      User.findByIdAndUpdate(blackPlayer.id, {
        $inc: {
          gamesPlayed: 1,
          gamesWon: scoreBlack === 1 ? 1 : 0,
          gamesLost: scoreBlack === 0 ? 1 : 0,
          gamesDrawn: scoreBlack === 0.5 ? 1 : 0
        }
      })
    ]);
    
    logger.info(`Updated stats: ${whitePlayer.username} ${scoreWhite === 1 ? 'won' : (scoreWhite === 0.5 ? 'drew' : 'lost')}, ${blackPlayer.username} ${scoreBlack === 1 ? 'won' : (scoreBlack === 0.5 ? 'drew' : 'lost')}`);
  }
  
  /**
   * Clean up inactive games from memory
   */
  cleanupInactiveGames() {
    const now = Date.now();
    const maxInactivityTime = 30 * 60 * 1000; // 30 minutes
    
    for (const [gameId, game] of this.activeGames.entries()) {
      if (now - game.lastActivity > maxInactivityTime) {
        this.activeGames.delete(gameId);
      }
    }
    
    logger.info(`Cleaned up inactive games. Active games: ${this.activeGames.size}`);
  }
  
  /**
   * Get online players count
   */
  getOnlinePlayersCount() {
    // This would need to be updated with actual connected socket count
    return this.activeGames.size * 2;
  }
  
  /**
   * Get active players list for the lobby
   */
  async getActivePlayers(limit = 50) {
    try {
      // Chỉ lấy người dùng đang online hoặc đang tìm trận trong 30 giây gần đây
      const cutoffTime = new Date(Date.now() - 30000); // 30 seconds
      
      const players = await User.find(
        { 
          status: { $in: ['online', 'looking_for_match', 'in_game'] },
          lastActive: { $gte: cutoffTime }
        },
        'username status lastActive'
      ).sort({ lastActive: -1 }).limit(limit);
      
      // Chuyển đổi sang định dạng mà frontend mong đợi
      return players.map(player => ({
        id: player._id.toString(),
        username: player.username,
        status: player.status
      }));
    } catch (error) {
      logger.error(`Error getting active players: ${error.message}`);
      return [];
    }
  }

  async undoMove(game, userId) {
    // Make sure there is a history of moves to undo
    if (game.moves.length < 1) {
      return null; // No moves to undo
    }
    
    // Get the last move
    const lastMove = game.moves.pop(); // Remove the last move from the history
    game.board = lastMove.previousBoard; // Restore the previous board state
    game.currentTurn = lastMove.previousTurn; // Revert to the previous player's turn
    
    // Optionally, remove any other game state changes related to this move
    game.inCheck = lastMove.previousInCheck;
  
    // Save the updated game state
    await game.save();
    
    return game.getPublicGame(); // Return the updated game state
  }

  /**
   * Get player information from game for API response
   */
  getGamePlayers(gameId) {
    const game = this.activeGames.get(gameId);
    if (!game) return null;
    
    return {
      white: game.players.find(p => p.color === 'white'),
      black: game.players.find(p => p.color === 'black')
    };
  }

  /**
   * Chuyển đổi game từ định dạng Model sang định dạng Service 
   */
  convertGameToServiceFormat(gameModel) {
    // Chuyển từ Game model sang định dạng in-memory trong service
    const chess = new Chess();
    if (gameModel.fen) {
      chess.load(gameModel.fen);
    }
    
    return {
      id: gameModel._id.toString(),
      chess,
      players: gameModel.players.map(p => ({
        id: p.user.toString(),
        username: p.username,
        color: p.color
      })),
      lastActivity: Date.now(),
      options: {
        timeControl: gameModel.timeControl,
        isRanked: false
      },
      status: gameModel.status
    };
  }

  /**
   * Chuyển đổi từ định dạng Service về định dạng Model
   */
  convertGameToModelFormat(serviceGame) {
    return {
      players: serviceGame.players.map(p => ({
        user: p.id,
        username: p.username,
        color: p.color
      })),
      fen: serviceGame.chess.fen(),
      pgn: serviceGame.chess.pgn(),
      status: serviceGame.status,
      timeControl: serviceGame.options.timeControl,
      isRanked: false
    };
  }

  /**
   * Match a user with an opponent and create a game if match found
   * @param {string} userId - ID của người dùng cần tìm đối thủ
   * @param {Object} options - Tùy chọn cho trận đấu
   * @returns {Object} - Kết quả của quá trình tìm đối thủ
   */
  async matchUsers(userId) {
    try {
      const timeControl = '10min';
      logger.debug(`[MATCHMAKING] Starting matchmaking for user ${userId}`);

      // Find user
      const user = await User.findById(userId, 'username');
      if (!user) {
        logger.error(`[MATCHMAKING] User ${userId} not found`);
        return {
          success: false,
          message: 'User not found'
        };
      }

      logger.debug(`[MATCHMAKING] Found user ${user.username}`);

      // Check if there's any player looking for a match
      const potentialOpponents = this.matchmakingQueue
        .filter(entry => entry.userId !== userId && entry.timeControl === timeControl);
      
      logger.debug(`[MATCHMAKING] Found ${potentialOpponents.length} potential opponents`);
      
      if (potentialOpponents.length > 0) {
        // Pick the first matching opponent
        const opponent = potentialOpponents[0];
        
        // Remove opponent from queue
        this.matchmakingQueue = this.matchmakingQueue
          .filter(entry => entry.userId !== opponent.userId);
        
        logger.debug(`[MATCHMAKING] Selected opponent: ${opponent.userId}`);
        
        // Get opponent info
        const opponentUser = await User.findById(opponent.userId, 'username');
        if (!opponentUser) {
          logger.error(`[MATCHMAKING] Opponent ${opponent.userId} not found in database`);
          throw new Error('Opponent not found in database');
        }
        
        // Create game with explicit error handling
        let gameId;
        try {
          gameId = await this.createGame(
            userId,
            opponent.userId,
            { timeControl, isRanked: false }
          );
          
          logger.debug(`[MATCHMAKING] Game created with ID: ${gameId}`);
          
          // Verify gameId is valid
          if (!gameId || typeof gameId !== 'string' || gameId === 'undefined') {
            logger.error(`[MATCHMAKING] Invalid gameId created: ${gameId}`);
            throw new Error('Failed to create a valid game ID');
          }
        } catch (gameError) {
          logger.error(`[MATCHMAKING] Game creation failed: ${gameError.message}`);
          throw new Error(`Game creation failed: ${gameError.message}`);
        }
        
        try {
          // Update player statuses in database
          await User.updateMany(
            { _id: { $in: [userId, opponent.userId] } },
            { status: 'in_game', currentGame: gameId }
          );
          
          logger.debug(`[MATCHMAKING] Updated player statuses to in_game`);
        } catch (updateError) {
          logger.error(`[MATCHMAKING] Failed to update player statuses: ${updateError.message}`);
          // Continue despite this error
        }
        
        return {
          success: true,
          gameId: gameId,
          opponent: {
            id: opponent.userId,
            username: opponentUser.username
          }
        };
      } else {
        // No match found, add user to queue
        this.matchmakingQueue = this.matchmakingQueue
          .filter(entry => entry.userId !== userId);
        
        this.matchmakingQueue.push({
          userId,
          timeControl,
          timestamp: Date.now()
        });
        
        const queuePosition = this.matchmakingQueue.length;
        logger.debug(`[MATCHMAKING] Added ${user.username} to queue at position ${queuePosition}`);
        
        return {
          success: false,
          queuePosition
        };
      }
    } catch (error) {
      logger.error(`[MATCHMAKING] Error: ${error.message}`);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Retrieve games for a specific user
   */
  async getUserGames(userId, limit = 20) {
    try {
      const games = await Game.find({
        'players.user': userId
      }).sort({ createdAt: -1 }).limit(limit);
      
      return games;
    } catch (error) {
      logger.error(`Error retrieving user games: ${error.message}`);
      throw error;
    }
  }

  /**
   * Hoàn thành game với kết quả cho trước
   */
  async completeGame(gameId, result) {
    try {
      // Lấy game từ cache hoặc database
      const game = await this.getGame(gameId);
      
      if (!game) {
        throw new Error('Game not found');
      }
      
      if (game.status === 'completed') {
        throw new Error('Game is already completed');
      }
      
      // Cập nhật trạng thái game trong memory
      game.status = 'completed';
      
      let winnerColor = null;
      let drawReason = null;
      let resultString = null;
      
      switch (result.type) {
        case 'checkmate':
          winnerColor = result.winner;
          resultString = winnerColor === 'white' ? '1-0' : '0-1';
          break;
        case 'resignation':
          winnerColor = result.winner;
          resultString = winnerColor === 'white' ? '1-0' : '0-1';
          break;
        case 'timeout':
          winnerColor = result.winner;
          resultString = winnerColor === 'white' ? '1-0' : '0-1';
          break;
        case 'draw':
          drawReason = result.reason || 'agreement';
          resultString = '1/2-1/2';
          break;
        default:
          throw new Error('Invalid result type');
      }
      
      // Cập nhật game trong database
      const updatedGame = await Game.findByIdAndUpdate(
        gameId,
        {
          status: result.type,
          result: resultString,
          ...(drawReason && { resultReason: drawReason }),
          completedAt: new Date()
        },
        { new: true }
      );
      
      // Cập nhật thống kê người chơi
      if (winnerColor) {
        const winner = game.players.find(p => p.color === winnerColor);
        const loser = game.players.find(p => p.color !== winnerColor);
        
        if (winner && loser) {
          await Promise.all([
            // Cập nhật người thắng
            User.findByIdAndUpdate(winner.id, {
              $inc: { gamesPlayed: 1, gamesWon: 1 },
              status: 'online',
              currentGame: null
            }),
            
            // Cập nhật người thua
            User.findByIdAndUpdate(loser.id, {
              $inc: { gamesPlayed: 1, gamesLost: 1 },
              status: 'online',
              currentGame: null
            })
          ]);
        }
      } else if (result.type === 'draw') {
        // Cập nhật cả hai người chơi trong trường hợp hòa
        await User.updateMany(
          { _id: { $in: game.players.map(p => p.id) } },
          { 
            $inc: { gamesPlayed: 1, gamesDrawn: 1 },
            status: 'online',
            currentGame: null
          }
        );
      }
      
      // Xóa game khỏi bộ nhớ cache
      this.activeGames.delete(gameId);
      
      // Trả về thông tin game đã cập nhật
      return {
        gameId,
        status: updatedGame.status,
        result: resultString,
        winnerColor,
        drawReason,
        players: game.players
      };
    } catch (error) {
      logger.error(`Error completing game ${gameId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Xử lý hết thời gian của người chơi
   */
  async handleTimeout(gameId, timeoutPlayerId) {
    try {
      // Lấy game từ cache hoặc database
      const game = await this.getGame(gameId);
      
      if (!game) {
        throw new Error('Game not found');
      }
      
      if (game.status === 'completed') {
        throw new Error('Game is already completed');
      }
      
      // Xác định người chơi hết thời gian
      const timeoutPlayer = game.players.find(p => p.id === timeoutPlayerId);
      if (!timeoutPlayer) {
        throw new Error('Player is not part of this game');
      }
      
      // Xác định người thắng
      const winnerColor = timeoutPlayer.color === 'white' ? 'black' : 'white';
      
      // Kết thúc game với lý do hết thời gian
      return this.completeGame(gameId, {
        type: 'timeout',
        winner: winnerColor
      });
    } catch (error) {
      logger.error(`Error handling timeout for game ${gameId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Đề nghị hòa
   */
  async offerDraw(gameId, offeringPlayerId) {
    try {
      // Lấy game từ database
      const gameData = await Game.findById(gameId);
      
      if (!gameData) {
        throw new Error('Game not found');
      }
      
      if (gameData.status !== 'active') {
        throw new Error('Game is not active');
      }
      
      // Kiểm tra người chơi có trong game không
      const player = gameData.players.find(p => 
        p.user.toString() === offeringPlayerId.toString()
      );
      
      if (!player) {
        throw new Error('Player is not part of this game');
      }
      
      // Thêm hoặc cập nhật đề nghị hòa
      if (!gameData.drawOffers) {
        gameData.drawOffers = [];
      }
      
      // Chỉ thêm vào nếu chưa có
      if (!gameData.drawOffers.some(id => id.toString() === offeringPlayerId.toString())) {
        gameData.drawOffers.push(offeringPlayerId);
        await gameData.save();
      }
      
      return {
        gameId,
        offeringPlayer: {
          id: player.user,
          username: player.username,
          color: player.color
        },
        drawOffered: true
      };
    } catch (error) {
      logger.error(`Error offering draw for game ${gameId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Xử lý đề nghị hòa (chấp nhận hoặc từ chối)
   */
  async handleDrawOffer(gameId, respondingPlayerId, accepted) {
    try {
      // Lấy game từ database
      const gameData = await Game.findById(gameId);
      
      if (!gameData) {
        throw new Error('Game not found');
      }
      
      if (gameData.status !== 'active') {
        throw new Error('Game is not active');
      }
      
      // Kiểm tra người chơi có trong game không
      const player = gameData.players.find(p => 
        p.user.toString() === respondingPlayerId.toString()
      );
      
      if (!player) {
        throw new Error('Player is not part of this game');
      }
      
      // Check if there is a draw offer
      if (!gameData.drawOffers || gameData.drawOffers.length === 0) {
        throw new Error('No draw has been offered');
      }
      
      // Check that the responding player didn't make the offer
      if (gameData.drawOffers.some(id => id.toString() === respondingPlayerId.toString())) {
        throw new Error('You cannot accept your own draw offer');
      }
      
      if (accepted) {
        // Update game to completed with draw result
        await Game.findByIdAndUpdate(gameId, {
          status: 'completed',
          result: '1/2-1/2',
          resultReason: 'agreement',
          completedAt: new Date()
        });

        // Update both players' stats
        await User.updateMany(
          { _id: { $in: gameData.players.map(p => p.user) } },
          { 
            $inc: { gamesPlayed: 1, gamesDrawn: 1 },
            status: 'online',
            currentGame: null
          }
        );

        // Remove game from active games if it's there
        this.activeGames.delete(gameId);

        // Return success response
        return {
          gameId,
          drawAccepted: true,
          status: 'completed',
          result: '1/2-1/2',
          players: gameData.players
        };
      } else {
        // Just clear draw offers if declined
        gameData.drawOffers = [];
        await gameData.save();
        
        return {
          gameId,
          drawAccepted: false,
          message: 'Draw declined'
        };
      }
    } catch (error) {
      logger.error(`Error handling draw offer for game ${gameId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Lấy bảng xếp hạng người chơi
   */
  async getPlayerRankings(limit = 50) {
    try {
      // Lấy danh sách người chơi đã hoàn thành ít nhất 1 game
      const players = await User.find(
        { gamesPlayed: { $gt: 0 } },
        'username gamesPlayed gamesWon gamesLost gamesDrawn'
      ).limit(limit).sort({ gamesWon: -1, gamesPlayed: 1 });
      
      // Tính toán tỷ lệ thắng và xếp hạng
      return players.map((player, index) => ({
        rank: index + 1,
        id: player._id,
        username: player.username,
        gamesPlayed: player.gamesPlayed || 0,
        gamesWon: player.gamesWon || 0,
        gamesLost: player.gamesLost || 0,
        gamesDrawn: player.gamesDrawn || 0,
        winRate: player.gamesPlayed ? 
          Math.round((player.gamesWon / player.gamesPlayed) * 100) : 0
      }));
    } catch (error) {
      logger.error(`Error retrieving player rankings: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new GameService();