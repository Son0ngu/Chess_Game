const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const gameController = require('../controllers/gameController');

// Get user's games
router.get('/my-games', auth, gameController.getUserGames);

// Get player statistics
router.get('/player-stats', gameController.getPlayerStats);

// Get a specific game
router.get('/:id', auth, gameController.getGame);

// Make a move in a game
router.post('/:id/move', auth, gameController.makeMove);

// Resign a game
router.post('/:id/resign', auth, gameController.resignGame);

// Offer draw
router.post('/:id/offer-draw', auth, gameController.offerDraw);

// Accept draw
router.post('/:id/accept-draw', auth, gameController.acceptDraw);

// Handle timeout
router.post('/:id/timeout', auth, gameController.handleTimeout);

// Complete game with result
router.post('/:id/complete', auth, gameController.completeGame);

// Find match
router.post('/match', auth, gameController.findMatch);

module.exports = router;
