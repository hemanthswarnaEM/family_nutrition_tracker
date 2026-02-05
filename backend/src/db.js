
// backend/src/db.js
import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();
const { Pool } = pkg;

// Connects using the DATABASE_URL defined in your .env file
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});