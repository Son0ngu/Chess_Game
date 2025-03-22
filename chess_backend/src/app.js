const express = require('express');
const app = express();

app.use(express.json()); // body parser

// Routes
app.get('/', (req, res) => {
  res.send('🎉 Backend is running');
});

module.exports = app;
