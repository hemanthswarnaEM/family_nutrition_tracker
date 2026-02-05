import { pool } from './src/db.js';
async function run() {
    const res = await pool.query('SELECT * FROM users');
    console.log('Users:', res.rows.length);
    if (res.rows.length > 0) console.log('Last user:', res.rows[res.rows.length - 1].email);
    process.exit(0);
}
run();
