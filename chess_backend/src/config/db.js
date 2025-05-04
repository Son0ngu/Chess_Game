const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * Connect to MongoDB database
 */
const connectDB = async () => {
  try {
    // Get MongoDB URI from environment variables or use default
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/chess_game';
    
    // Kết nối đơn giản, không cần các tùy chọn cũ
    await mongoose.connect(mongoURI);
    
    logger.info(`MongoDB Connected: ${mongoose.connection.host}`);
  } catch (error) {
    logger.error(`MongoDB connection error: ${error.message}`);
    // Exit process with failure
    process.exit(1);
  }
};

module.exports = connectDB;