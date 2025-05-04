// Entry point for the Chess backend server

require('dotenv').config();
const express = require('express');
const socketIO = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const connectDB = require('./src/config/db');
const authRoutes = require('./src/routes/auth');
const gamesRoutes = require('./src/routes/game');
const errorHandler = require('./src/middleware/errorHandler');
const setupGameSocket = require('./src/socket/gameSocket');
const logger = require('./src/utils/logger');
const fs = require('fs');
const https = require('https');
const http = require('http');
const User = require('./src/models/user'); // Assuming User model is defined in this path

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/auth', authRoutes);
app.use('/games', gamesRoutes);

// Base route
app.get('/', (req, res) => {
  res.send('Chess Game API Server');
});

// Error handling middleware
app.use(errorHandler);

// Connect to MongoDB first
connectDB().then(async () => {
  try {
    // Reset trạng thái người dùng khi server khởi động
    const result = await User.updateMany(
      { status: { $in: ['online', 'looking_for_match'] } },
      { status: 'offline' }
    );
    
    console.log(`Reset ${result.modifiedCount} users to offline status`);
  } catch (error) {
    console.error('Error resetting user statuses:', error);
  }

  // Then start the server after database is connected
  let server;

  // Check if we can use HTTPS
  try {
    // Only try to read SSL files if they exist
    const sslOptions = {
      key: fs.readFileSync('./certs/server-key.pem'),
      cert: fs.readFileSync('./certs/server.pem'),
      ca: fs.readFileSync('./certs/ca.pem')
    };

    // Create HTTPS server
    server = https.createServer(sslOptions, app);
    console.log('Using HTTPS server');
  } catch (error) {
    // If SSL certificates not found, use HTTP instead
    server = http.createServer(app);
    console.log('SSL certificates not found, using HTTP server instead');
  }

  // Initialize Socket.IO with CORS settings
  const io = socketIO(server, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  // Set up Socket.IO for game events
  setupGameSocket(io);

  // Start the server
  server.listen(PORT, () => {
    const protocol = server instanceof https.Server ? 'https' : 'http';
    logger.info(`Server running on ${protocol}://localhost:${PORT}`);
    console.log(`Server running on ${protocol}://localhost:${PORT}`);
  });
});

// Handle database connection events
mongoose.connection.on('connected', () => {
  logger.info('Connected to MongoDB');
  console.log('MongoDB is connected');
});

mongoose.connection.on('error', (err) => {
  logger.error(`MongoDB connection error: ${err}`);
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error(`Unhandled Rejection: ${err}`);
  console.error('Unhandled Rejection:', err);
  process.exit(1);
});