import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import pg from 'pg';
const { Pool } = pg;

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://postgres:5432@localhost:5432/family_nutrition'
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function estimateNutrients(foodName) {
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    const prompt = `Estimate nutrients for 100g of RAW "${foodName}". Return JSON object with keys: energy_kcal, protein, fat_total, carbohydrates, fiber, sodium, calcium, iron, potassium, vit_a, vit_c, vit_d, vit_b12. Values in numbers. If negligible use 0. Return ONLY JSON.`;
    try {
        const result = await model.generateContent(prompt);
        let text = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(text);
    } catch (err) {
        console.error("AI Estimate Error:", err.message);
        return null;
    }
}

async function run() {
    const client = await pool.connect();
    try {
        console.log("Scanning for foods with NO nutrients...");

        // Find foods with 0 entries in food_nutrients
        const res = await client.query(`
      SELECT f.id, f.name 
      FROM foods f
      LEFT JOIN food_nutrients fn ON f.id = fn.food_id
      WHERE fn.id IS NULL
    `);

        console.log(`Found ${res.rows.length} foods to enrich.`);

        for (const food of res.rows) {
            console.log(`Processing: ${food.name}...`);
            const nutrients = await estimateNutrients(food.name);

            if (nutrients) {
                // Get Nutrient IDs
                const codes = Object.keys(nutrients);
                const nutrIdsRes = await client.query(
                    `SELECT id, code FROM nutrients WHERE code = ANY($1::text[])`,
                    [codes]
                );

                for (const row of nutrIdsRes.rows) {
                    const val = nutrients[row.code];
                    if (val > 0) {
                        await client.query(
                            `INSERT INTO food_nutrients (food_id, nutrient_id, amount_per_100g)
               VALUES ($1, $2, $3)`,
                            [food.id, row.id, val]
                        );
                    }
                }
                console.log(`  -> Enriched!`);
            } else {
                console.log(`  -> Failed to estimate.`);
            }

            // Rate limit protection
            await new Promise(r => setTimeout(r, 2000));
        }

    } catch (err) {
        console.error(err);
    } finally {
        client.release();
        pool.end();
    }
}

run();
