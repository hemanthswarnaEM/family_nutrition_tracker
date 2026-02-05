
const API_BASE = 'http://localhost:4002/api';
import result from 'pg';
const { Pool } = result;
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://postgres:5432@localhost:5432/family_nutrition' });

async function testEnrichment() {
    console.log("TEST: Auto-Enrichment on Log");

    // 1. Create a "Hollow" Food directly in SQL (bypassing the API creation logic)
    console.log("Creating hollow food 'Invis-Apple'...");
    const client = await pool.connect();
    let foodId;
    let userId;
    try {
        const foodRes = await client.query("INSERT INTO foods (name, category, default_unit, grams_per_unit) VALUES ('Invis-Apple', 'fruit', 'g', 1) RETURNING id");
        foodId = foodRes.rows[0].id;
        console.log("Created Food ID:", foodId);

        // Ensure no nutrients
        await client.query("DELETE FROM food_nutrients WHERE food_id = $1", [foodId]);

        // Get a user for logging
        const userRes = await client.query("SELECT id FROM users LIMIT 1");
        userId = userRes.rows[0].id;

    } finally {
        client.release();
    }

    // 2. Log it via API
    console.log("Logging meal with hollow food...");
    const res = await fetch(`${API_BASE}/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, food_id: foodId, grams: 100, meal_type: 'snack' })
    });

    if (!res.ok) {
        console.error("Log failed:", await res.text());
        return;
    }
    console.log("Log created. Waiting 8s for background enrichment...");

    // 3. Wait and Check
    await new Promise(r => setTimeout(r, 8000));

    const client2 = await pool.connect();
    try {
        const nutRes = await client2.query("SELECT count(*) FROM food_nutrients WHERE food_id = $1", [foodId]);
        const count = parseInt(nutRes.rows[0].count);
        console.log(`Nutrient Count for Food ${foodId}: ${count}`);

        if (count > 0) console.log("SUCCESS: Food was auto-enriched!");
        else console.error("FAILURE: Food still has no nutrients.");

        // Cleanup
        await client2.query("DELETE FROM intake_logs WHERE food_id = $1", [foodId]);
        await client2.query("DELETE FROM food_nutrients WHERE food_id = $1", [foodId]);
        await client2.query("DELETE FROM foods WHERE id = $1", [foodId]);
    } finally {
        client2.release();
    }
    process.exit();
}

testEnrichment().catch(console.error);
