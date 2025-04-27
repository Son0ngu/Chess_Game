// Entry point for the Chess backend server
// This file loads the server configuration from src/config/server.js

require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const connectDB = require('./src/config/db');
const authRoutes = require('./src/routes/auth');
const gamesRoutes = require('./src/routes/game'); // Note: Changed from 'games' to 'game'
const errorHandler = require('./src/middleware/errorHandler');
const setupGameSocket = require('./src/socket/gameSocket');
const logger = require('./src/utils/logger');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.IO with CORS settings
const io = socketIO(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/auth', authRoutes); // Make sure this matches
app.use('/games', gamesRoutes);

// Base route
app.get('/', (req, res) => {
  res.send('Chess Game API Server');
});

// Error handling middleware
app.use(errorHandler);

// Set up Socket.IO for game events
setupGameSocket(io);

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

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error(`Unhandled Rejection: ${err}`);
  server.close(() => process.exit(1));
});