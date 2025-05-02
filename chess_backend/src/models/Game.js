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
  elo: {
    type: Number,
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
    type: Array,
    default: [],
  },
  lastMove: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

// Index for finding user's games
gameSchema.index({ 'players.user': 1, createdAt: -1 });

// Method to get game state for client
gameSchema.methods.getPublicGame = function() {
  return {
    id: this._id,
    players: this.players,
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

// Fix the model export to prevent the OverwriteModelError
module.exports = mongoose.models.Game || mongoose.model('Game', gameSchema);
