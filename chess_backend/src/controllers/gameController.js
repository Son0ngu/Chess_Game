const Game = require('../models/Game');
const { makeMove } = require('../services/chessService');

// Create a new game
const createGame = async (req, res) => {
  try {
    const newGame = new Game({
      playerWhite: req.body.playerWhite,
      playerBlack: null,
      status: 'waiting',
      moves: [],
      fen: 'start', // chess.js default
    });

    await newGame.save();
    res.status(201).json(newGame);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create game' });
  }
};

// Join an existing game
const joinGame = async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);
    if (!game) return res.status(404).json({ error: 'Game not found' });

    if (game.playerBlack) {
      return res.status(400).json({ error: 'Game is already full' });
    }

    game.playerBlack = req.body.playerBlack;
    game.status = 'ongoing';
    await game.save();

    res.json(game);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to join game' });
  }
};

// Make a move
const makeMoveInGame = async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);
    if (!game) return res.status(404).json({ error: 'Game not found' });

    const { from, to } = req.body;

    const result = makeMove(game.fen, from, to);
    if (!result.valid) {
      return res.status(400).json({ error: result.message });
    }

    game.moves.push({ from, to, san: result.move.san });
    game.fen = result.status.fen;

    // Check for game over
    if (result.status.inCheckmate) {
      game.status = 'finished';
      game.winner = result.move.color;
    }

    await game.save();
    res.json(game);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to make move' });
  }
};

// Get game by ID
const getGameById = async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);
    if (!game) return res.status(404).json({ error: 'Game not found' });
    res.json(game);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching game' });
  }
};

module.exports = {
  createGame,
  joinGame,
  makeMoveInGame,
  getGameById,
};
