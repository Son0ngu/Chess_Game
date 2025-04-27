const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Game = require('../models/Game');
const GameService = require('../services/GameService');
const logger = require('../utils/logger');

// Get user's games
router.get('/my-games', auth, async (req, res) => {
  try {
    const games = await Game.find({
      'players.user': req.user._id
    }).sort({ createdAt: -1 }).limit(20);
    
    const formattedGames = games.map(game => game.getPublicGame());
    
    res.json(formattedGames);
  } catch (err) {
    logger.error(`Error fetching games: ${err.message}`);
    res.status(500).json({ error: 'Failed to retrieve games' });
  }
});

// Get a specific game
router.get('/:id', auth, async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);
    
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    res.json(game.getPublicGame());
  } catch (err) {
    logger.error(`Error fetching game ${req.params.id}: ${err.message}`);
    res.status(500).json({ error: 'Failed to retrieve game' });
  }
});

// Make a move in a game
router.post('/:id/move', auth, async (req, res) => {
  try {
    const { from, to, promotion } = req.body;
    
    if (!from || !to) {
      return res.status(400).json({ error: 'From and to positions are required' });
    }
    
    const result = await GameService.makeMove(
      req.params.id,
      req.user._id,
      from,
      to,
      promotion
    );
    
    res.json(result);
  } catch (err) {
    logger.error(`Error making move: ${err.message}`);
    res.status(400).json({ error: err.message });
  }
});

// Resign a game
router.post('/:id/resign', auth, async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);
    
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    // Check if user is part of the game
    const playerIndex = game.players.findIndex(
      p => p.user.toString() === req.user._id.toString()
    );
    
    if (playerIndex === -1) {
      return res.status(403).json({ error: 'You are not part of this game' });
    }
    
    // Check if game is active
    if (game.status !== 'active') {
      return res.status(400).json({ error: 'Game is not active' });
    }
    
    // Update game status
    game.status = 'completed';
    game.result = game.players[playerIndex].color === 'white' ? '0-1' : '1-0';
    game.resultReason = 'resignation';
    await game.save();
    
    // If ranked game, update ratings
    if (game.isRanked) {
      const winner = game.players.find(p => p.user.toString() !== req.user._id.toString());
      await GameService.updatePlayerRatings(game, {
        type: 'resignation',
        winner: winner.color
      });
    }
    
    res.json({ message: 'Game resigned', result: game.result });
  } catch (err) {
    logger.error(`Error resigning game: ${err.message}`);
    res.status(500).json({ error: 'Failed to resign game' });
  }
});

// Offer draw
router.post('/:id/offer-draw', auth, async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);
    
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    // Check if user is part of the game
    const playerIndex = game.players.findIndex(
      p => p.user.toString() === req.user._id.toString()
    );
    
    if (playerIndex === -1) {
      return res.status(403).json({ error: 'You are not part of this game' });
    }
    
    // Check if game is active
    if (game.status !== 'active') {
      return res.status(400).json({ error: 'Game is not active' });
    }
    
    // Add draw offer
    game.drawOffers.push(req.user._id);
    await game.save();
    
    res.json({ message: 'Draw offered' });
  } catch (err) {
    logger.error(`Error offering draw: ${err.message}`);
    res.status(500).json({ error: 'Failed to offer draw' });
  }
});

// Accept draw
router.post('/:id/accept-draw', auth, async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);
    
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    // Check if user is part of the game
    const playerIndex = game.players.findIndex(
      p => p.user.toString() === req.user._id.toString()
    );
    
    if (playerIndex === -1) {
      return res.status(403).json({ error: 'You are not part of this game' });
    }
    
    // Check if there's a draw offer from the opponent
    const opponent = game.players.find(
      p => p.user.toString() !== req.user._id.toString()
    );
    
    if (!opponent || !game.drawOffers.includes(opponent.user.toString())) {
      return res.status(400).json({ error: 'No draw offer to accept' });
    }
    
    // Update game status
    game.status = 'completed';
    game.result = '1/2-1/2';
    game.resultReason = 'agreement';
    await game.save();
    
    // If ranked game, update ratings
    if (game.isRanked) {
      await GameService.updatePlayerRatings(game, {
        type: 'draw',
        reason: 'agreement'
      });
    }
    
    res.json({ message: 'Draw accepted', result: game.result });
  } catch (err) {
    logger.error(`Error accepting draw: ${err.message}`);
    res.status(500).json({ error: 'Failed to accept draw' });
  }
});

module.exports = router;
