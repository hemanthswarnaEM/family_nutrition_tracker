import dotenv from 'dotenv';
import pg from 'pg';
const { Pool } = pg;

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://postgres:5432@localhost:5432/family_nutrition'
});

async function run() {
    const client = await pool.connect();
    try {
        const userId = 1; // Default to first user
        console.log(`Initializing targets for User ${userId}...`);

        // 1. Get RDA Profile
        // Hardcoding to 'male_51_60_standard' for now as per schema, or logic to pick based on user age
        const profileRes = await client.query("SELECT id FROM rda_profiles WHERE label = 'male_51_60_standard'");
        if (profileRes.rows.length === 0) {
            console.error("RDA Profile not found.");
            return;
        }
        const profileId = profileRes.rows[0].id;

        // 2. Fetch RDA values
        const rdaValues = await client.query(`
      SELECT nutrient_id, daily_target 
      FROM rda_values 
      WHERE rda_profile_id = $1
    `, [profileId]);

        // 3. Insert into user_nutrient_targets
        for (const row of rdaValues.rows) {
            try {
                await client.query(`
          INSERT INTO user_nutrient_targets (user_id, nutrient_id, daily_target)
          VALUES ($1, $2, $3)
          ON CONFLICT (user_id, nutrient_id) DO UPDATE 
          SET daily_target = EXCLUDED.daily_target
        `, [userId, row.nutrient_id, row.daily_target]);
            } catch (e) {
                console.error("Error setting target:", e.message);
            }
        }
        console.log(`Set ${rdaValues.rows.length} targets for User ${userId}.`);

    } catch (err) {
        console.error(err);
    } finally {
        client.release();
        pool.end();
    }
}

run();
