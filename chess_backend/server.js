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

// SSL options
const sslOptions = {
  key: fs.readFileSync('./certs/server-key.pem'),
  cert: fs.readFileSync('./certs/server.pem'),
  ca: fs.readFileSync('./certs/ca.pem')
};

// Disable 'x-powered-by' header for security
app.disable('x-powered-by');

// Set security headers
res.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self'; object-src 'none';");

// Initialize Express app
const app = express();

// Use HTTPS server for everything
const httpsServer = https.createServer(sslOptions, app);

// Initialize Socket.IO with CORS settings
const io = socketIO(httpsServer, {
  cors: {
    origin: process.env.CLIENT_URL || "https://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || "https://localhost:3000",
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
httpsServer.listen(PORT, () => {
  logger.info(`HTTPS server running on https://localhost:${PORT}`);
  console.log(`HTTPS server running on https://localhost:${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error(`Unhandled Rejection: ${err}`);
  httpsServer.close(() => process.exit(1));
});

console.log(`Server running on port ${PORT}`);