const mongoose = require('mongoose');

const moveSchema = new mongoose.Schema({
  from: {
    type: String,
    required: true,
  },
  to: {
    type: String,
    required: true,
  },
  piece: {
    type: String,
    required: true,
  },
  color: {
    type: String,
    enum: ['white', 'black'],
    required: true,
  },
  captured: String,
  promotion: String,
  san: String,
  timestamp: {
    type: Date,
    default: Date.now,
  }
});

const playerSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  username: {
    type: String,
    required: true,
  },
  color: {
    type: String,
    enum: ['white', 'black'],
    required: true,
  },
  timeRemaining: {
    type: Number,
  },
  isOffered: {
    type: Boolean,
    default: false,
  },
});

const gameSchema = new mongoose.Schema({
  players: [playerSchema],
  moves: [moveSchema],
  fen: {
    type: String,
    default: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', // Initial FEN position
  },
  pgn: {
    type: String,
    default: '',
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'completed', 'aborted'],
    default: 'pending',
  },
  result: {
    type: String,
    enum: ['1-0', '0-1', '1/2-1/2', '*', null],
    default: '*',
  },
  resultReason: {
    type: String,
    enum: ['checkmate', 'resignation', 'timeout', 'stalemate', 'insufficient_material', 'repetition', '50_move_rule', 'agreement', 'abandonment', null],
    default: null,
  },
  timeControl: {
    type: String,
    default: '10min',
  },
  isRanked: {
    type: Boolean,
    default: false,
  },
  drawOffers: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'User',
    default: [],
  },
  lastMove: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

// Index for finding user's games
gameSchema.index({ 'players.user': 1, createdAt: -1 });

// Thêm các phương thức tiện ích này vào gameSchema.methods

// Lấy người chơi quân trắng
gameSchema.methods.getWhitePlayer = function() {
  return this.players.find(p => p.color === 'white');
};

// Lấy người chơi quân đen
gameSchema.methods.getBlackPlayer = function() {
  return this.players.find(p => p.color === 'black');
};

// Lấy người chơi theo ID
gameSchema.methods.getPlayerById = function(userId) {
  return this.players.find(p => p.user.toString() === userId.toString());
};

// Lấy đối thủ của người chơi hiện tại
gameSchema.methods.getOpponent = function(userId) {
  return this.players.find(p => p.user.toString() !== userId.toString());
};

// Lấy người chơi theo màu
gameSchema.methods.getPlayerByColor = function(color) {
  return this.players.find(p => p.color === color);
};

// Cập nhật phương thức getPublicGame để đảm bảo nhất quán
gameSchema.methods.getPublicGame = function() {
  const whitePlayer = this.getWhitePlayer();
  const blackPlayer = this.getBlackPlayer();
  
  return {
    id: this._id,
    players: this.players,
    whitePlayer: whitePlayer ? {
      id: whitePlayer.user,
      username: whitePlayer.username
    } : null,
    blackPlayer: blackPlayer ? {
      id: blackPlayer.user,
      username: blackPlayer.username
    } : null,
    status: this.status,
    result: this.result,
    resultReason: this.resultReason,
    timeControl: this.timeControl,
    isRanked: this.isRanked,
    moves: this.moves,
    fen: this.fen,
    lastMove: this.lastMove
  };
};

// Thêm các phương thức này vào sau gameSchema.methods

// Chuyển đổi sang định dạng cũ (whitePlayer/blackPlayer)
gameSchema.methods.toLegacyFormat = function() {
  const whitePlayer = this.players.find(p => p.color === 'white');
  const blackPlayer = this.players.find(p => p.color === 'black');
  
  return {
    ...this.toObject(),
    whitePlayer: whitePlayer ? whitePlayer.user : null,
    blackPlayer: blackPlayer ? blackPlayer.user : null
  };
};

// Phương thức tĩnh để chuyển đổi từ định dạng cũ sang định dạng mới
gameSchema.statics.fromLegacyFormat = function(gameData) {
  const players = [];
  
  if (gameData.whitePlayer) {
    players.push({
      user: gameData.whitePlayer,
      username: gameData.whitePlayerUsername || 'White Player',
      color: 'white'
    });
  }
  
  if (gameData.blackPlayer) {
    players.push({
      user: gameData.blackPlayer,
      username: gameData.blackPlayerUsername || 'Black Player',
      color: 'black'
    });
  }
  
  return {
    ...gameData,
    players
  };
};

// Fix the model export to prevent the OverwriteModelError
module.exports = mongoose.models.Game || mongoose.model('Game', gameSchema);
