const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  getUserProfile,
} = require('../controllers/userController');

router.post('/users/register', registerUser);
router.post('/users/login', loginUser);
router.get('/users/:id', getUserProfile);

module.exports = router;
