const axios = require('axios');
const logger = require('../utils/logger');
const User = require('../models/user'); // Add this import for the User model

const validateCaptcha = async (req, res, next) => {
  try {
    // Kiểm tra xem người dùng có yêu cầu xác minh captcha không
    const user = await User.findOne({ username: req.body.username });
    
    // Nếu người dùng không tồn tại hoặc không cần captcha, bỏ qua
    if (!user || !user.requireCaptcha) {
      return next();
    }
    
    // Nếu cần captcha nhưng không có token, báo lỗi
    const captchaToken = req.body.captchaToken;
    if (!captchaToken) {
      return res.status(400).json({ error: 'CAPTCHA verification required' });
    }
    
    // Xác minh captcha với Google
    const response = await axios.post(
      'https://www.google.com/recaptcha/api/siteverify',
      null,
      {
        params: {
          secret: process.env.RECAPTCHA_SECRET_KEY,
          response: captchaToken
        }
      }
    );
    
    if (!response.data.success) {
      logger.error('CAPTCHA verification failed:', response.data);
      return res.status(400).json({ error: 'CAPTCHA verification failed' });
    }
    
    // Xác minh thành công, tiếp tục
    next();
  } catch (error) {
    logger.error(`CAPTCHA validation error: ${error.message}`);
    return res.status(500).json({ error: 'CAPTCHA validation failed' });
  }
};

module.exports = validateCaptcha;