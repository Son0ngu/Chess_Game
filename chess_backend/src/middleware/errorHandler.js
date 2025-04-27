const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  // Log error
  logger.error(`${err.name}: ${err.message}`);
  
  // Set status code
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  
  // Send error response
  res.status(statusCode).json({
    error: err.message || 'Server Error',
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack
  });
};

module.exports = errorHandler;