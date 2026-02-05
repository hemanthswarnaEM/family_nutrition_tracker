import bcrypt from 'bcrypt';
import { pool } from './db.js';

async function createAdmin() {
    const NAME = 'hemanth';
    const PASSWORD = 'nopassword';
    const REAL_PASSWORD = '070411';

    try {
        const hash = await bcrypt.hash(REAL_PASSWORD, 10);
        const email = 'hemanth@family.local'; // generate email or use provided

        // Check if exists
        const check = await pool.query('SELECT id FROM users WHERE name = $1', [NAME]);

        if (check.rows.length === 0) {
            console.log('Creating user hemanth...');
            await pool.query(
                `INSERT INTO users (name, email, password_hash, role, sex, height_cm, weight_kg, activity_level, goal)
         VALUES ($1, $2, $3, 'admin', 'male', 175, 70, 'moderate', 'maintain')`,
                [NAME, email, hash]
            );
            console.log('User created.');
        } else {
            console.log('Updating user hemanth...');
            await pool.query(
                `UPDATE users SET password_hash = $1, role = 'admin' WHERE name = $2`,
                [hash, NAME]
            );
            console.log('User updated.');
        }
        process.exit(0);
    } catch (err) {
        console.error('Failed:', err);
        process.exit(1);
    }
}

createAdmin();
