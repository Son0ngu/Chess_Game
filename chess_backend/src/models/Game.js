const mongoose = require('mongoose');

const moveSchema = new mongoose.Schema({
  from: String,
  to: String,
  san: String, // Standard Algebraic Notation (e.g. e4, Nf3)
});

const gameSchema = new mongoose.Schema(
  {
    playerWhite: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    playerBlack: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    moves: [moveSchema],
    fen: {
      type: String,
      default: 'start', // chess.js default
    },
    status: {
      type: String,
      enum: ['waiting', 'ongoing', 'finished'],
      default: 'waiting',
    },
    winner: {
      type: String,
      enum: ['white', 'black', 'draw', null],
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Game', gameSchema);
