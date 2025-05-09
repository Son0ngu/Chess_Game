// Entry point for the Chess backend server

require('dotenv').config();
const express = require('express');
const http = require('http');
const https = require('https');
const fs = require('fs');
const socketIO = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
const connectDB = require('./src/config/db');
const authRoutes = require('./src/routes/auth');
const gamesRoutes = require('./src/routes/game');
const errorHandler = require('./src/middleware/errorHandler');
const setupGameSocket = require('./src/socket/gameSocket');
const logger = require('./src/utils/logger');

// Initialize Express app
tconst app = express();

// Limit request body size to prevent large payload DoS
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Global rate limiter - applies to all routes
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again after 15 minutes',
  handler: (req, res, next, options) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(options.statusCode).send(options.message);
  }
});

// Stricter rate limiter for authentication routes\ const authLimiter = rateLimit({
  windowMs: 30 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many login attempts, please try again after 30 minutes'
});

// Disable 'x-powered-by' header for security
app.disable('x-powered-by');

// Apply global rate limiter to all requests
app.use(globalLimiter);

// Set security headers
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; object-src 'none';"
  );
  next();
});

// CORS setup
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';
const ALLOWED_ORIGINS = [CLIENT_URL, process.env.FIREBASE_HOSTING_URL];
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || ALLOWED_ORIGINS.includes(origin)) callback(null, true);
      else callback(new Error('Not allowed by CORS'));
    },
    credentials: true
  })
);

// Connect to MongoDB\connectDB();

// API routes
app.use('/auth', authLimiter, authRoutes);
app.use('/games', gamesRoutes);
app.get('/', (req, res) => res.send('Chess Game API Server'));
app.use(errorHandler);

// Setup HTTP or HTTPS server based on environment
const isProduction = process.env.NODE_ENV === 'production';
let server;
if (isProduction) {
  // Render provides SSL/TLS termination
  server = http.createServer(app);
} else {
  const sslOptions = {
    key: fs.readFileSync('/etc/secrets/server-key.pem'),
    cert: fs.readFileSync('./certs/server.pem'),
    ca: fs.readFileSync('./certs/ca.pem')
  };
  server = https.createServer(sslOptions, app);
}

// Initialize Socket.IO\ nconst io = socketIO(server, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ['GET', 'POST'],
    credentials: true
  }
});
setupGameSocket(io);

// MongoDB event handlers
mongoose.connection.on('connected', () => {
  logger.info('Connected to MongoDB');
});
mongoose.connection.on('error', err => {
  logger.error(`MongoDB connection error: ${err}`);
  process.exit(1);
});
mongoose.connection.on('disconnected', () => console.log('MongoDB disconnected'));

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  const protocol = isProduction ? 'http' : 'https';
  logger.info(`Server running on ${protocol}://0.0.0.0:${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', err => {
  logger.error(`Unhandled Rejection: ${err}`);
  server.close(() => process.exit(1));
});
