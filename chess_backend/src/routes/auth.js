const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const auth = require('../middleware/auth');
const logger = require('../utils/logger');

// Register a new user
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }]
    });
    
    if (existingUser) {
      if (existingUser.email === email) {
        return res.status(400).json({ error: 'Email already in use' });
      } else {
        return res.status(400).json({ error: 'Username already taken' });
      }
    }

    // Create user
    const user = new User({
      username,
      email,
      password
    });

    await user.save();

    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    logger.error(`Registration error: ${err.message}`);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log("Login attempt for:", username);
    console.log("Request body:", req.body);
    
    // Find user by username
    const user = await User.findOne({ username });
    if (!user) {
      console.log(`User "${username}" not found in database`);
      return res.status(400).json({ error: 'Invalid login credentials' });
    }
    console.log(`User found: ${user.username}, ID: ${user._id}`);
    
    // Check if password field exists in user document
    if (!user.password) {
      console.error("User has no password field:", user);
      return res.status(500).json({ error: 'Account setup issue. Please contact support.' });
    }
    
    try {
      // Compare password
      const isMatch = await user.comparePassword(password);
      console.log(`Password match: ${isMatch}`);
      
      if (!isMatch) {
        console.log("Password doesn't match");
        return res.status(400).json({ error: 'Invalid login credentials' });
      }
      
      // Update last login time
      user.lastActive = Date.now();
      user.isOnline = true;
      await user.save();
      
      // Generate JWT
      try {
        const token = jwt.sign(
          { id: user._id },
          process.env.JWT_SECRET,
          { expiresIn: '1d' }
        );
        console.log("JWT generated successfully");
        
        // Return success response
        res.json({
          token,
          user: {
            id: user._id,
            username: user.username,
            email: user.email,
            elo: user.elo
          }
        });
      } catch (jwtError) {
        console.error("JWT signing error:", jwtError);
        return res.status(500).json({ error: 'Authentication error' });
      }
    } catch (passwordError) {
      console.error("Password comparison error:", passwordError);
      return res.status(500).json({ error: 'Authentication error' });
    }
  } catch (error) {
    console.error("Login route error:", error);
    logger.error(`Login error: ${error.message}`);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user profile
router.get('/profile', auth, async (req, res) => {
  try {
    res.json({
      id: req.user._id,
      username: req.user.username,
      email: req.user.email,
      elo: req.user.elo,
      stats: {
        games: req.user.games,
        wins: req.user.wins,
        losses: req.user.losses,
        draws: req.user.draws
      },
      avatar: req.user.avatar,
      createdAt: req.user.createdAt
    });
  } catch (err) {
    logger.error(`Profile fetch error: ${err.message}`);
    res.status(500).json({ error: 'Failed to retrieve profile' });
  }
});

// Update user profile
router.put('/profile', auth, async (req, res) => {
  try {
    const updates = {};
    
    // Allow updating specific fields
    if (req.body.email) updates.email = req.body.email;
    if (req.body.avatar) updates.avatar = req.body.avatar;
    if (req.body.password) {
      // If updating password, hash it
      const user = req.user;
      user.password = req.body.password;
      await user.save();
    }
    
    if (Object.keys(updates).length > 0) {
      await User.findByIdAndUpdate(req.user._id, updates);
    }
    
    res.json({ message: 'Profile updated successfully' });
  } catch (err) {
    logger.error(`Profile update error: ${err.message}`);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Logout user
router.post('/logout', auth, async (req, res) => {
  try {
    // Update user status
    req.user.isOnline = false;
    req.user.lastActive = Date.now();
    await req.user.save();
    
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    logger.error(`Logout error: ${err.message}`);
    res.status(500).json({ error: 'Logout failed' });
  }
});

module.exports = router;