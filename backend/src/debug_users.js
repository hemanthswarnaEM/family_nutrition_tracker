import { pool } from './db.js';

async function checkUsers() {
    try {
        const res = await pool.query('SELECT id, name, email, role FROM users');
        console.log(JSON.stringify(res.rows, null, 2));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkUsers();
