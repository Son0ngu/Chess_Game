const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const auth = require('../middleware/auth');
const logger = require('../utils/logger');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { registerValidation, loginValidation } = require('../middleware/userValidator');
const { validationResult } = require('express-validator');
const validateCaptcha = require('../middleware/captchaValidator');

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.error("Validation errors:", errors.array()); // Fix: removed undefined err
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Register a new user with CAPTCHA
router.post('/register', registerValidation, handleValidation, validateCaptcha, async (req, res) => {
  try {
    const { username, email, password, captchaToken } = req.body;
    
    // Kiểm tra CAPTCHA cho đăng ký (luôn yêu cầu)
    if (!captchaToken) {
      return res.status(400).json({ error: 'CAPTCHA verification required' });
    }
    
    // Kiểm tra xem người dùng đã tồn tại chưa
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }]
    });
    
    if (existingUser) {
      if (existingUser.email === email) {
        logger.error("Email already in use"); // Fix: removed undefined err
        return res.status(400).json({ error: 'Email already in use' });
      } else {
        logger.error("Username already taken"); // Fix: removed undefined err
        return res.status(400).json({ error: 'Username already taken' });
      }
    }

    // Tạo người dùng mới
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

// Login user with CAPTCHA
router.post('/login', loginValidation, handleValidation, validateCaptcha, async (req, res) => {
  try {
    const { username, password } = req.body;
    logger.debug("Login attempt for:", username);
    
    // Tìm người dùng
    const user = await User.findOne({ username });
    if (!user) {
      logger.debug(`User "${username}" not found in database`);
      return res.status(400).json({ error: 'Invalid login credentials' });
    }
    
    // So sánh mật khẩu
    const isMatch = await user.comparePassword(password.trim());
    
    if (!isMatch) {
      // Tăng số lần thất bại
      user.failedLoginAttempts += 1;
      user.lastFailedLogin = Date.now();
      
      // Nếu đạt ngưỡng 5 lần, yêu cầu CAPTCHA
      if (user.failedLoginAttempts >= 5) {
        user.requireCaptcha = true;
        logger.debug(`CAPTCHA required for user ${username} after ${user.failedLoginAttempts} failed attempts`);
      }
      
      await user.save();
      logger.debug(`Failed login attempt ${user.failedLoginAttempts} for user ${username}`);
      
      return res.status(400).json({ 
        error: 'Invalid login credentials',
        requireCaptcha: user.requireCaptcha
      });
    }
    
    // Đăng nhập thành công - đặt lại bộ đếm
    user.failedLoginAttempts = 0;
    user.requireCaptcha = false;
    user.lastActive = Date.now();
    user.isOnline = true;
    await user.save();
    
    // Tạo JWT và trả về response thành công
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
    
    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
    
  } catch (error) {
    logger.error("Login route error:", error);
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
      stats: {
        games: req.user.gamesPlayed,
        wins: req.user.gamesWon,
        losses: req.user.gamesLost, 
        draws: req.user.gamesDrawn
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

const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

router.post('/recover', async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      logger.error(`No user found with email: ${email}`); // Fixed undefined err
      return res.status(404).json({ error: "No user with that email" });
    }

    // 1. Generate a reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiration = new Date(Date.now() + 900000); // 15 phút

    user.resetToken = resetToken;
    user.resetTokenExpiration = resetTokenExpiration;

    console.log(resetTokenExpiration);

    console.log(`Generated reset token: ${resetToken}`);
    console.log(`Token expires at: ${new Date(resetTokenExpiration)}`);

    await user.save();

    // 2. Create reset URL
    const resetUrl = `https://chess-79bd8.web.app//reset-password/${resetToken}`; 
    // Nếu bạn deploy, đổi localhost:3000 thành yourfrontend.com

    // 3. Send email
    await transporter.sendMail({
      to: user.email,
      subject: 'Password Reset Request',
      html: `
        <h2>Password Reset</h2>
        <p>Click the link below to reset your password:</p>
        <a href="${resetUrl}">Reset Password</a>
        <p>This link will expire in 1 hour.</p>
      `,
    });

    res.json({ message: "Recovery email sent! Check your inbox." });
  } catch (err) {
    console.error("Password recovery error:", err);
    logger.error(`Password recovery error: ${err.message}`); // Fixed undefined err
    res.status(500).json({ error: "Password recovery failed" });
  }
});

router.post('/reset-password/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    console.log("Received reset token:", token);
    console.log("Received new password:", password);

    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiration: { $gt: Date.now() }, // token còn hạn
    });

    if (!user) {
      console.log("No user found with matching token or token expired.");
      logger.error("Invalid or expired reset token"); // Fixed undefined err
      return res.status(400).json({ error: "Invalid or expired token" });
    }

    console.log("User found:", user.email);


    // Update mật khẩu
    user.password = password;
    user.resetToken = undefined;
    user.resetTokenExpiration = undefined;
    await user.save();

    res.json({ message: "Password has been reset successfully!" });
  } catch (err) {
    console.error("Reset password error:", err);
    logger.error(`Reset password error: ${err.message}`); // Fixed undefined err
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;