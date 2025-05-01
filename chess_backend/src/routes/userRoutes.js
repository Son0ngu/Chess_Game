const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { requireAuth } = require('../middleware/authMiddleware');

// Authentication routes
router.post('/register', userController.registerUser);
router.post('/login', userController.loginUser);
router.post('/logout', requireAuth, userController.logoutUser);
router.post('/forgot-password', userController.forgotPassword);
router.post('/reset-password', userController.resetPassword);

// User profile routes
router.get('/profile/:id', userController.getUserProfile);
router.get('/me', requireAuth, userController.getMyProfile);
router.put('/me', requireAuth, userController.updateProfile);
router.put('/me/password', requireAuth, userController.changePassword);
router.put('/me/avatar', requireAuth, userController.updateAvatar);

// User status routes
router.put('/status', requireAuth, userController.updateStatus);
router.get('/active', userController.getActiveUsers);

// Player stats routes
router.get('/rankings', userController.getPlayerRankings);
router.get('/stats/:id', userController.getPlayerStats);
router.get('/leaderboard', userController.getLeaderboard);

// Game history routes
router.get('/history/:id', userController.getGameHistory);
router.get('/my-games', requireAuth, userController.getMyGames);

module.exports = router;