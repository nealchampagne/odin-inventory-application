const express = require('express');
const app = express();
const path = require('path');
require('dotenv').config();
const methodOverride = require('method-override');
const fs = require('node:fs');
const { capFirst } = require('./utils/strings');
app.locals.capFirst = capFirst;

// Ensure CA cert is available for secure DB connections
const caCertPath = path.join(__dirname, 'temp-ca.pem');
fs.writeFileSync(caCertPath, process.env.CA_CERT);

// Middleware to parse JSON bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware to override HTTP methods
app.use(methodOverride(function (req, res) {
  if (req.body && typeof req.body === 'object' && '_method' in req.body) {
    return req.body._method;
  }
  if (req.query && '_method' in req.query) {
    return req.query._method;
  }
}));

// Middleware to serve static files
app.use(express.static(path.join(__dirname, 'public')));

// use ejs view engine
app.set('views', path.resolve('views/trainers'));
app.set('view engine', 'ejs');

// Routes
const trainerRouter = require('./routes/trainers');
app.use('/', trainerRouter);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.statusCode || 500).send(err.message);
})

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`TOP Inventory Application - listening on port ${PORT}!`);
});