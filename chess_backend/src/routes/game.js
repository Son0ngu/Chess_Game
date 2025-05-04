const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const gameController = require('../controllers/gameController');

// Get user's games
router.get('/my-games', auth, gameController.getUserGames);

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

module.exports = router;
