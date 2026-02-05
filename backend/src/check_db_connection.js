import { pool } from './db.js';

async function check() {
  try {
    const res = await pool.query('SELECT NOW()');
    console.log('DB Connection Successful:', res.rows[0]);
    process.exit(0);
  } catch (err) {
    console.error('DB Connection Failed:', err.message);
    process.exit(1);
  }
}

check();
