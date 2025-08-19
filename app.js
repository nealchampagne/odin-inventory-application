const express = require('express');
const app = express();
const path = require('path');
require('dotenv').config();
const methodOverride = require('method-override');
const fs = require('node:fs');

// Middleware to override HTTP methods
app.use(methodOverride('_method'));

const indexRouter = require('./routes/index');

// use ejs view engine
app.set('views', path.resolve('views'));
app.set('view engine', 'ejs');


// Middleware to serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Middleware to parse JSON bodies
app.use(express.json());

app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/', indexRouter);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.statusCode || 500).send(err.message);
})

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`TOP Inventory Application - listening on port ${PORT}!`);
});