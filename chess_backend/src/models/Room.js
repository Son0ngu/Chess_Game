// src/models/Room.js

const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema(
  {
    roomCode: {
      type: String,
      required: true,
      unique: true,
    },
    playerWhite: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    playerBlack: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    gameId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Game',
    },
    isPrivate: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Room', roomSchema);
