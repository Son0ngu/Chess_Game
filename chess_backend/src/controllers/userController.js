const User = require('../models/user');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Register new user
const registerUser = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: 'User already exists' });

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = new User({
      username,
      email,
      password: hashedPassword,
      elo: 1200, // default rating
    });

    await user.save();

    res.status(201).json({ message: 'User registered', userId: user._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
};

// Login user
const loginUser = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // Find user by email or username
    const user = await User.findOne(
      email ? { email } : { username }
    );
    
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Compare password
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

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
        elo: user.elo
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
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

module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
};
