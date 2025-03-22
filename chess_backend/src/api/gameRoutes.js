const express = require('express');
const router = express.Router();
const {
  createGame,
  joinGame,
  makeMoveInGame,
  getGameById,
} = require('../controllers/gameController');

router.post('/games', createGame);
router.post('/games/:id/join', joinGame);
router.post('/games/:id/move', makeMoveInGame);
router.get('/games/:id', getGameById);

module.exports = router;
