import { pool } from './src/db.js';

async function check() {
    try {
        const nuts = await pool.query('SELECT * FROM nutrients');
        console.log('--- NUTRIENTS ---');
        console.table(nuts.rows);

        const userCols = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users'
    `);
        console.log('--- USER COLS ---');
        console.table(userCols.rows);

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
