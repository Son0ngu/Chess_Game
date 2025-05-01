const { Chess } = require('chess.js');
const Game = require('../models/Game');
const User = require('../models/user');
const logger = require('../utils/logger');

/**
 * GameService - Handles all chess game logic and state management
 */
class GameService {
  constructor() {
    // In-memory cache of active games
    this.activeGames = new Map();
    // In-memory queue of players looking for matches
    this.matchmakingQueue = {
      casual: [],
      ranked: []
    };
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
      // Create new chess instance
      const chess = new Chess();
      
      // Set default game options
      const options = {
        timeControl: gameOptions.timeControl || '10min',
        isRanked: gameOptions.isRanked || false
      };
      
      // Get player info from database
      const [player1, player2] = await Promise.all([
        User.findById(player1Id, 'username elo'),
        User.findById(player2Id, 'username elo')
      ]);
      
      if (!player1 || !player2) {
        throw new Error('One or both players not found');
      }
      
      // Randomly assign colors
      const whitePlayer = Math.random() < 0.5 ? player1Id : player2Id;
      const blackPlayer = whitePlayer === player1Id ? player2Id : player1Id;
      
      // Create game record in database
      const game = await Game.create({
        players: [
          { 
            user: player1Id, 
            username: player1.username,
            color: whitePlayer === player1Id ? 'white' : 'black',
            elo: player1.elo
          },
          { 
            user: player2Id,
            username: player2.username,
            color: blackPlayer === player2Id ? 'black' : 'white',
            elo: player2.elo
          }
        ],
        fen: chess.fen(),
        pgn: chess.pgn(),
        status: 'active',
        moves: [],
        timeControl: options.timeControl,
        isRanked: options.isRanked
      });
      
      // Store game in memory cache
      this.activeGames.set(game._id.toString(), {
        id: game._id.toString(),
        chess,
        players: [
          { 
            id: player1Id, 
            username: player1.username,
            color: whitePlayer === player1Id ? 'white' : 'black',
            elo: player1.elo
          },
          { 
            id: player2Id,
            username: player2.username,
            color: blackPlayer === player2Id ? 'black' : 'white',
            elo: player2.elo
          }
        ],
        lastActivity: Date.now(),
        options
      });
      
      logger.info(`Game created: ${game._id} between ${player1.username} and ${player2.username}`);
      return game._id.toString();
      
    } catch (error) {
      logger.error(`Error creating game: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Add player to matchmaking queue
   */
  addToMatchmaking(userId, options = {}) {
    const gameMode = options.gameMode || 'casual';
    const timeControl = options.timeControl || '10min';
    
    // Add player to appropriate queue
    this.matchmakingQueue[gameMode].push({
      userId,
      timeControl,
      timestamp: Date.now()
    });
    
    logger.info(`User ${userId} added to ${gameMode} matchmaking queue`);
    
    // Try to find a match
    return this.findMatch(gameMode);
  }
  
  /**
   * Find a match for waiting players
   */
  findMatch(gameMode) {
    const queue = this.matchmakingQueue[gameMode];
    
    if (queue.length < 2) {
      return null;
    }
    
    // Simple matching algorithm - match first two players with same time control
    // Could be improved with ELO matching or other criteria
    for (let i = 0; i < queue.length; i++) {
      for (let j = i + 1; j < queue.length; j++) {
        const player1 = queue[i];
        const player2 = queue[j];
        
        if (player1.timeControl === player2.timeControl) {
          // Remove matched players from queue
          this.matchmakingQueue[gameMode] = queue.filter((_, idx) => idx !== i && idx !== j);
          
          // Create a new game for these players
          const gameOptions = {
            timeControl: player1.timeControl,
            isRanked: gameMode === 'ranked'
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
      
      // Add to in-memory cache
      const game = {
        id: gameId,
        chess,
        players: gameData.players.map(p => ({
          id: p.user.toString(),
          username: p.username,
          color: p.color,
          elo: p.elo
        })),
        lastActivity: Date.now(),
        options: {
          timeControl: gameData.timeControl,
          isRanked: gameData.isRanked
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
      
      // If game is over and ranked, update player ratings
      if (gameStatus.isGameOver && game.options.isRanked) {
        await this.updatePlayerRatings(game, gameStatus.result);
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
   * Xử lý yêu cầu undo nước đi
   */
  async requestUndo(gameId, requesterId) {
    try {
      const game = this.activeGames.get(gameId);
      if (!game) {
        throw new Error('Game not found');
      }
      
      // Kiểm tra xem người yêu cầu có phải là người chơi không
      const player = game.players.find(p => p.id === requesterId);
      if (!player) {
        throw new Error('Not a player in this game');
      }
      
      // Không cho phép undo nếu game đã kết thúc
      if (game.chess.isGameOver()) {
        throw new Error('Cannot undo in a completed game');
      }
      
      // Lấy ID của đối thủ để gửi yêu cầu
      const opponent = game.players.find(p => p.id !== requesterId);
      if (!opponent) {
        throw new Error('Opponent not found');
      }
      
      // Đánh dấu yêu cầu undo đang chờ xử lý
      game.pendingUndoRequest = {
        requesterId,
        requestedAt: Date.now()
      };
      
      // Trả về thông tin để socket controller có thể gửi yêu cầu tới đối thủ
      return {
        gameId,
        requesterId,
        opponentId: opponent.id
      };
      
    } catch (error) {
      logger.error(`Error requesting undo for game ${gameId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Xử lý chấp nhận yêu cầu undo
   */
  async acceptUndo(gameId, accepterId) {
    try {
      const game = this.activeGames.get(gameId);
      if (!game) {
        throw new Error('Game not found');
      }
      
      // Kiểm tra xem có yêu cầu undo đang chờ xử lý không
      if (!game.pendingUndoRequest) {
        throw new Error('No pending undo request');
      }
      
      // Kiểm tra xem người chấp nhận có phải đối thủ không
      const accepter = game.players.find(p => p.id === accepterId);
      if (!accepter || accepter.id === game.pendingUndoRequest.requesterId) {
        throw new Error('Only opponent can accept undo request');
      }
      
      // Lấy lịch sử nước đi
      const history = this.gameHistory.get(gameId);
      if (!history || history.length < 2) {
        throw new Error('No moves to undo');
      }
      
      // Xóa trạng thái hiện tại
      history.pop();
      
      // Lấy trạng thái trước đó
      const previousState = history[history.length - 1];
      
      // Áp dụng trạng thái trước đó
      game.chess.load(previousState.fen);
      
      // Cập nhật game trong database
      await Game.findByIdAndUpdate(gameId, {
        fen: previousState.fen,
        pgn: previousState.pgn,
        $pop: { moves: 1 } // Xóa nước đi cuối cùng
      });
      
      // Xóa yêu cầu undo đang chờ xử lý
      delete game.pendingUndoRequest;
      
      // Cập nhật thời gian hoạt động
      game.lastActivity = Date.now();
      
      // Trả về thông tin trạng thái mới
      return {
        gameId,
        fen: previousState.fen,
        currentTurn: previousState.currentTurn,
        inCheck: previousState.inCheck,
        legalMoves: this.getLegalMovesMap(game.chess),
        history
      };
      
    } catch (error) {
      logger.error(`Error accepting undo for game ${gameId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Xử lý từ chối yêu cầu undo
   */
  declineUndo(gameId, declinerId) {
    try {
      const game = this.activeGames.get(gameId);
      if (!game) {
        throw new Error('Game not found');
      }
      
      // Kiểm tra xem có yêu cầu undo đang chờ xử lý không
      if (!game.pendingUndoRequest) {
        throw new Error('No pending undo request');
      }
      
      // Kiểm tra xem người từ chối có phải đối thủ không
      const decliner = game.players.find(p => p.id === declinerId);
      if (!decliner || decliner.id === game.pendingUndoRequest.requesterId) {
        throw new Error('Only opponent can decline undo request');
      }
      
      // Xóa yêu cầu undo đang chờ xử lý
      delete game.pendingUndoRequest;
      
      // Trả về thông tin để thông báo cho người yêu cầu
      return {
        gameId,
        requesterId: game.pendingUndoRequest.requesterId,
        declinerId
      };
      
    } catch (error) {
      logger.error(`Error declining undo for game ${gameId}: ${error.message}`);
      throw error;
    }
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
      
      // If game is ranked, update ELO ratings
      if (game.options && game.options.isRanked) {
        // Simple fixed ELO change (15 points)
        const ELO_CHANGE = 15;
        
        // Update winner's ELO and stats
        await User.findByIdAndUpdate(winningPlayer.id, {
          $inc: { 
            elo: ELO_CHANGE,
            gamesPlayed: 1,
            gamesWon: 1
          }
        });
        
        // Update loser's ELO and stats
        await User.findByIdAndUpdate(resigningPlayer.id, {
          $inc: { 
            elo: -ELO_CHANGE,
            gamesPlayed: 1,
            gamesLost: 1
          }
        });
        
        logger.info(`Updated ratings after resignation: ${winningPlayer.username} +${ELO_CHANGE}, ${resigningPlayer.username} -${ELO_CHANGE}`);
      }
      
      // Remove from active games cache
      this.activeGames.delete(gameId);
      
      return {
        gameId,
        status: 'completed',
        winner,
        winnerUsername: winningPlayer.username,
        resigningUsername: resigningPlayer.username
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
      
      // Verify the accepting player is in the game
      const acceptingPlayer = game.players.find(p => p.id === acceptingUserId);
      if (!acceptingPlayer) {
        throw new Error('Player not part of this game');
      }
      
      // Mark game as completed with draw result
      game.status = 'completed';
      
      // Update game in database
      await Game.findByIdAndUpdate(gameId, {
        status: 'completed',
        result: '1/2-1/2',
        completedAt: new Date()
      });
      
      // If game is ranked, update player stats (no ELO change for draws)
      if (game.options && game.options.isRanked) {
        // Update both players' stats to record the draw
        for (const player of game.players) {
          await User.findByIdAndUpdate(player.id, {
            $inc: { 
              gamesPlayed: 1,
              gamesDrawn: 1
            }
          });
        }
        
        logger.info(`Game ${gameId} ended in a draw. No ELO change.`);
      }
      
      // Remove from active games cache
      this.activeGames.delete(gameId);
      
      return {
        gameId,
        status: 'completed',
        result: 'draw'
      };
      
    } catch (error) {
      logger.error(`Error handling draw acceptance for game ${gameId}: ${error.message}`);
      throw error;
    }
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
      } else if (chess.isThreefoldRepetition()) {
        result.reason = 'repetition';
      } else if (chess.isInsufficientMaterial()) {
        result.reason = 'insufficient material';
      } else if (chess.isDraw()) {
        result.reason = '50-move rule';
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
   * Update player ratings after a game
   */
  async updatePlayerRatings(game, result) {
    const whitePlayer = game.players.find(p => p.color === 'white');
    const blackPlayer = game.players.find(p => p.color === 'black');
    
    if (!whitePlayer || !blackPlayer) {
      logger.error(`Missing player information for game ${game.id}`);
      return;
    }
    
    // Simple ELO calculation
    const K = 32; // K-factor
    const whiteRating = whitePlayer.elo;
    const blackRating = blackPlayer.elo;
    
    // Expected scores
    const expectedWhite = 1 / (1 + Math.pow(10, (blackRating - whiteRating) / 400));
    const expectedBlack = 1 / (1 + Math.pow(10, (whiteRating - blackRating) / 400));
    
    // Actual scores
    let scoreWhite, scoreBlack;
    
    if (result.type === 'checkmate') {
      scoreWhite = result.winner === 'white' ? 1 : 0;
      scoreBlack = result.winner === 'black' ? 1 : 0;
    } else if (result.type === 'draw') {
      scoreWhite = 0.5;
      scoreBlack = 0.5;
    } else {
      return; // No rating update for other outcomes
    }
    
    // Calculate new ratings
    const newWhiteRating = Math.round(whiteRating + K * (scoreWhite - expectedWhite));
    const newBlackRating = Math.round(blackRating + K * (scoreBlack - expectedBlack));
    
    // Update in database
    await Promise.all([
      User.findByIdAndUpdate(whitePlayer.id, {
        $set: { elo: newWhiteRating },
        $inc: {
          games: 1,
          wins: scoreWhite === 1 ? 1 : 0,
          losses: scoreWhite === 0 ? 1 : 0,
          draws: scoreWhite === 0.5 ? 1 : 0
        }
      }),
      User.findByIdAndUpdate(blackPlayer.id, {
        $set: { elo: newBlackRating },
        $inc: {
          games: 1,
          wins: scoreBlack === 1 ? 1 : 0,
          losses: scoreBlack === 0 ? 1 : 0,
          draws: scoreBlack === 0.5 ? 1 : 0
        }
      })
    ]);
    
    logger.info(`Updated ratings: ${whitePlayer.username} ${whiteRating} -> ${newWhiteRating}, ${blackPlayer.username} ${blackRating} -> ${newBlackRating}`);
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
  async getActivePlayers(limit = 10) {
    const activePlayerIds = new Set();
    
    // Collect unique player IDs from active games
    for (const game of this.activeGames.values()) {
      game.players.forEach(player => {
        activePlayerIds.add(player.id);
      });
    }
    
    // Add players from matchmaking queues
    for (const mode in this.matchmakingQueue) {
      this.matchmakingQueue[mode].forEach(entry => {
        activePlayerIds.add(entry.userId);
      });
    }
    
    // Convert Set to Array and limit the number of results
    const playerIds = [...activePlayerIds].slice(0, limit);
    
    // Get player details from database
    const players = await User.find(
      { _id: { $in: playerIds } },
      'username elo'
    );
    
    return players.map(p => ({
      id: p._id,
      username: p.username,
      rating: p.elo
    }));
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

}

module.exports = new GameService();