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
}

module.exports = new GameService();