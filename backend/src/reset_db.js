import fs from 'fs';
import { pool } from './db.js';

const DROP_SQL = `
DROP TABLE IF EXISTS intake_logs CASCADE;
DROP TABLE IF EXISTS recipe_ingredients CASCADE;
DROP TABLE IF EXISTS recipes CASCADE;
DROP TABLE IF EXISTS food_nutrients CASCADE;
DROP TABLE IF EXISTS foods CASCADE;
DROP TABLE IF EXISTS rda_values CASCADE;
DROP TABLE IF EXISTS rda_profiles CASCADE;
DROP TABLE IF EXISTS nutrients CASCADE;
DROP TABLE IF EXISTS users CASCADE;
`;

async function reset() {
    try {
        console.log('Dropping tables...');
        await pool.query(DROP_SQL);
        console.log('Tables dropped.');

        const schemaPath = './src/sql/schema.sql';
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        console.log('Running schema.sql...');
        await pool.query(schemaSql);
        console.log('Database reset complete.');
        process.exit(0);
    } catch (err) {
        console.error('Reset failed:', err);
        process.exit(1);
    }
}

reset();
