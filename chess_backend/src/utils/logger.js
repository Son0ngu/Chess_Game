/**
 * Logger utility for Chess Game application
 * Provides both Winston logger and simple console logger options
 */

// Check if Winston is installed
let winston;
try {
  winston = require('winston');
} catch (err) {
  console.log('Winston not installed. Using simple console logger instead.');
  winston = null;
}

// Create a Winston logger if available
let logger;

if (winston) {
  // Define log format
  const logFormat = winston.format.printf(({ level, message, timestamp }) => {
    return `${timestamp} ${level}: ${message}`;
  });

  // Configure Winston logger
  logger = winston.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      logFormat
    ),
    defaultMeta: { service: 'chess-game' },
    transports: [
      // Console transport
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          logFormat
        )
      })
    ]
  });

  // Add file transports in production
  if (process.env.NODE_ENV === 'production') {
    const path = require('path');
    
    // Error logs
    logger.add(new winston.transports.File({ 
      filename: path.join(__dirname, '../logs/error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }));
    
    // Combined logs
    logger.add(new winston.transports.File({ 
      filename: path.join(__dirname, '../logs/combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }));
  }
} else {
  // Simple console logger as fallback
  logger = {
    error: (message) => console.error(`[ERROR] ${new Date().toISOString()}: ${message}`),
    warn: (message) => console.warn(`[WARN] ${new Date().toISOString()}: ${message}`),
    info: (message) => console.info(`[INFO] ${new Date().toISOString()}: ${message}`),
    debug: (message) => {
      if (process.env.NODE_ENV !== 'production') {
        console.debug(`[DEBUG] ${new Date().toISOString()}: ${message}`);
      }
    },
    verbose: (message) => {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[VERBOSE] ${new Date().toISOString()}: ${message}`);
      }
    }
  };
}

// Helper to log game events with consistent format
logger.gameEvent = (gameId, event, details = {}) => {
  logger.info(`Game ${gameId}: ${event} - ${JSON.stringify(details)}`);
};

// Helper to log user actions
logger.userAction = (userId, username, action, details = {}) => {
  logger.info(`User ${username} (${userId}): ${action} - ${JSON.stringify(details)}`);
};

// Helper to log performance metrics
logger.performance = (operation, timeInMs) => {
  logger.debug(`Performance: ${operation} took ${timeInMs}ms`);
};

module.exports = logger;