const User = require('../models/user'); 
const Game = require('../models/Game');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Register new user
const registerUser = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }]  // Check both email and username
    });
    
    if (existingUser) {
      return res.status(400).json({ 
        error: existingUser.username === username 
          ? 'Username already taken' 
          : 'Email already registered' 
      });
    }

    // Create user
    const user = new User({
      username,
      email,
      password, // Just use the plain password here - it will be hashed by the pre-save middleware
      //elo: 1200, // default rating
    });

    await user.save();

    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
};

// Login user
const loginUser = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Find user by username
    const user = await User.findOne({ username });
    
    if (!user) return res.status(404).json({ error: 'Invalid username or password' });

    // Compare password
    const match = await user.comparePassword(password);
    if (!match) return res.status(401).json({ error: 'Invalid username or password' });

    // Update status to online
    user.status = 'online';
    user.lastActive = new Date();
    await user.save();

    // Sign token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '1d',
    });

    res.json({ 
      message: 'Login successful', 
      token, 
      user: {
        id: user._id,
        username: user.username,
        elo: user.elo,
        email: user.email,
        gamesPlayed: user.gamesPlayed,
        gamesWon: user.gamesWon,
        status: user.status
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
};

// Logout user
const logoutUser = async (req, res) => {
  try {
    // Update user status to offline
    await User.findByIdAndUpdate(req.userId, {
      status: 'offline',
      lastActive: new Date()
    });
    
    res.json({ message: 'Logout successful' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Logout failed' });
  }
};

// Get user profile
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not get user' });
  }
};

// Get player rankings
/*const getPlayerRankings = async (req, res) => {
  try {
    // Get all users with ELO ratings, sort by highest ELO
    const players = await User.find({}, 'username elo gamesPlayed gamesWon')
      .sort({ elo: -1 });
    
    // Calculate additional stats
    const playersWithStats = players.map((player, index) => ({
      rank: index + 1,
      username: player.username,
      elo: player.elo || 1200,
      gamesPlayed: player.gamesPlayed || 0,
      gamesWon: player.gamesWon || 0,
      winRate: player.gamesPlayed ? 
        Math.round((player.gamesWon / player.gamesPlayed) * 100) : 0
    }));
    
    res.json(playersWithStats);
  } catch (err) {
    console.error('Error retrieving player rankings:', err);
    res.status(500).json({ error: 'Failed to retrieve rankings' });
  }
};*/

// Get active users for matchmaking
const getActiveUsers = async (req, res) => {
  try {
    const activeUsers = await User.find(
      { status: { $in: ['online', 'looking_for_match'] } },
      'username elo status'
    );
    
    res.json(activeUsers);
  } catch (err) {
    console.error('Error retrieving active users:', err);
    res.status(500).json({ error: 'Failed to retrieve active users' });
  }
};

// Get top players for leaderboard
const getLeaderboard = async (req, res) => {
  try {
    // Get top 10 players with most games and highest ELO
    const topPlayers = await User.find(
      { gamesPlayed: { $gt: 5 } }, // Only include players with more than 5 games
      'username elo gamesPlayed gamesWon'
    )
    .sort({ elo: -1 })
    .limit(10);
    
    const leaderboard = topPlayers.map((player, index) => ({
      rank: index + 1,
      username: player.username,
      elo: player.elo || 1200,
      gamesPlayed: player.gamesPlayed || 0,
      winRate: player.gamesPlayed ? 
        Math.round((player.gamesWon / player.gamesPlayed) * 100) : 0
    }));
    
    res.json(leaderboard);
  } catch (err) {
    console.error('Error retrieving leaderboard:', err);
    res.status(500).json({ error: 'Failed to retrieve leaderboard' });
  }
};

// Forgot password - generate reset token
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'No account found with that email' });
    }
    
    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetToken = resetToken;
    user.resetTokenExpiration = Date.now() + 3600000; // 1 hour
    await user.save();
    
    // In a real app, you would send this token by email
    // For development purposes, just return it in the response
    res.json({
      message: 'Password reset token generated',
      resetToken,
      // Only include this note in development
      note: 'In production, this token would be sent by email rather than returned in the response'
    });
  } catch (err) {
    console.error('Error generating reset token:', err);
    res.status(500).json({ error: 'Failed to process request' });
  }
};

// Reset password using token
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }
    
    // Find user with valid token
    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiration: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }
    
    // Update password and clear token
    user.password = newPassword;
    user.resetToken = null;
    user.resetTokenExpiration = null;
    await user.save();
    
    res.json({ message: 'Password reset successful' });
  } catch (err) {
    console.error('Error resetting password:', err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
};

// Export all the controller functions
module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  getUserProfile,
  getPlayerRankings,
  getActiveUsers,
  getLeaderboard,
  forgotPassword,
  resetPassword
};