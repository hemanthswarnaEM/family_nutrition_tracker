import { pool } from './db.js';

async function check() {
    try {
        await pool.query('SELECT count(*) FROM users');
        console.log('Users table exists.');
        process.exit(0);
    } catch (err) {
        if (err.code === '42P01') { // undefined_table
            console.log('Users table does NOT exist.');
            process.exit(2); // Custom code for "missing"
        }
        console.error('Error:', err.message);
        process.exit(1);
    }
}
check();
