require('dotenv').config();
const { Pool } = require('pg');

console.log('Connecting to DB:', {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  database: process.env.DB_NAME,
});

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: { 
    rejectUnauthorized: true,
    ca: process.env.CA_CERT 
  }, // Adjust based on your environment
});

module.exports = pool;