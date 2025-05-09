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
const rateLimit = require('express-rate-limit');

// Initialize Express app
const app = express();

// Limit request body size to prevent large payload DoS
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Global rate limiter - applies to all routes
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 200 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: 'Too many requests from this IP, please try again after 15 minutes',
  handler: (req, res, next, options) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(options.statusCode).send(options.message);
  }
});

// Stricter rate limiter for authentication routes
const authLimiter = rateLimit({
  windowMs: 30 * 60 * 1000, // 30 minutes
  max: 20, // limit each IP to 20 login attempts per windowMs
  message: 'Too many login attempts, please try again after 30 minutes',
  standardHeaders: true,
  legacyHeaders: false,
});

// Disable 'x-powered-by' header for security
app.disable('x-powered-by');

// Apply global rate limiter to all requests
app.use(globalLimiter);

// SSL options
const sslOptions = {
  key: fs.readFileSync('/etc/secrets/server-key.pem'),
  cert: fs.readFileSync('./certs/server.pem'),
  ca: fs.readFileSync('./certs/ca.pem')
};

// Set security headers
app.use((req, res, next) => {
  res.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self'; object-src 'none';");
  next();
});

// Use HTTPS server for everything
const httpsServer = https.createServer(sslOptions, app);

// Update Socket.IO CORS settings to allow Firebase origin
const io = socketIO(httpsServer, {
  cors: {
    origin: [
      process.env.CLIENT_URL || "https://localhost:3000", 
      "https://chess-79bd8.web.app"
    ],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Connect to MongoDB
connectDB();

// Middleware

// Update CORS middleware to allow Firebase origin
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    const allowedOrigins = [
      process.env.CLIENT_URL || "https://localhost:3000",
      "https://chess-79bd8.web.app"
    ];
    
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/auth', authLimiter, authRoutes);
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
