const { body } = require('express-validator');

exports.registerValidation = [
    body('username')
    .trim()
    .isLength({ min: 3, max: 20 }).withMessage('Username must be 3-20 characters')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username must be alphanumeric or underscore'),
  body('email')
    .trim()
    .isEmail().withMessage('Invalid email address')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
];

exports.loginValidation = [
  body('username')
    .trim()
    .notEmpty().withMessage('Username is required'),
  body('password')
    .notEmpty().withMessage('Password is required')
];

exports.forgotPasswordValidation = [
  body('email')
    .trim()
    .isEmail().withMessage('Invalid email address')
    .normalizeEmail()
];

exports.resetPasswordValidation = [
  body('token')
    .notEmpty().withMessage('Token is required'),
  body('newPassword')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
];