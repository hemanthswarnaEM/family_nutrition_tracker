// backend/src/index.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from './db.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

// --- CONFIG ---
dotenv.config();

const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// 1. parseMealDescription
async function parseMealDescription(text) {
  if (!genAI) throw new Error("GEMINI_API_KEY is not set");
  const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
  const prompt = `
  You are a nutrition assistant. Parse meal description into JSON list:
  1. Identify food name (specific).
  2. Estimate quantity in grams.
  3. Confidence level.
  Return valid JSON array. No markdown.
  Input: "${text}"
  `;
  try {
    const result = await model.generateContent(prompt);
    let jsonStr = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (err) {
    console.error("AI Parse Error:", err);
    throw new Error("Failed to parse meal");
  }
}

// 2. estimateNutrients
async function estimateNutrients(foodName) {
  if (!genAI) return null;
  const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
  const prompt = `Estimate nutrients for 100g of RAW "${foodName}". Return JSON object with keys: energy_kcal, protein, fat_total, carbohydrates, fiber, sodium, calcium, iron, potassium, vit_a, vit_c, vit_d, vit_b12. Values in numbers. If negligible use 0. Return ONLY JSON.`;
  try {
    const result = await model.generateContent(prompt);
    let text = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(text);
  } catch (err) {
    console.error("AI Estimate Error:", err);
    return null;
  }
}

// 3. findOrEstimateFood
async function findOrEstimateFood(query, existingFoods) {
  if (!genAI) throw new Error("AI not configured");
  const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
  // Truncate list if too long to save tokens
  const contextList = existingFoods.length > 300 ? existingFoods.slice(0, 300) : existingFoods;

  const prompt = `
      User Query: "${query}"
      Existing Foods: ${JSON.stringify(contextList)}
      Task:
      1. Check if "${query}" is a synonym for an existing food.
      2. If MATCH: return {"action": "match", "existing_food_name": "Exact Name"}
      3. If NO MATCH: Estimate nutrients for 100g. return {"action": "create", "new_food_name": "Proper Name", "nutrients": {energy_kcal, protein...}}
      Return ONLY JSON.
      `;
  try {
    const result = await model.generateContent(prompt);
    let text = result.response.text();
    console.log(`[AI Raw Output]: ${text}`);
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(text);
  } catch (err) {
    console.error("Gemini Error:", JSON.stringify(err, null, 2));
    throw new Error("AI process failed: " + err.message);
  }
}

// --- MIDDLEWARE & CORS ---
app.use(cors({
  origin: [
    "http://localhost:3000",
    "http://localhost:4000",
    "https://family-nutrition-tracker.netlify.app", // Keep your placeholder
    "https://celadon-sawine-0b98e2.netlify.app"    // ADD YOUR ACTUAL NETLIFY URL HERE
  ],
  credentials: true
}));

app.use(express.json());

// Fix "Cannot GET /" by adding this root route
app.get('/', (req, res) => {
  res.json({ message: "Family Nutrition Tracker API is live!", status: "healthy" });
});

// --- AI SETUP ---
let genAI;
try {
  if (GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    console.log('Gemini AI initialized');
  } else {
    console.warn('WARNING: GEMINI_API_KEY not set');
  }
} catch (e) {
  console.error('Failed to init Gemini AI:', e);
}

// -----------------------------------------------------------------------------
// HELPER: AI Parsing logic (imported at top)
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// MIDDLEWARE
// -----------------------------------------------------------------------------
function authRequired(req, res, next) {
  const authHeader = req.headers['authorization']; // Bearer <token>
  if (!authHeader) return res.status(401).json({ error: 'Missing Authorization header' });

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload; // { id, role, ... }
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

function adminRequired(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// =====================
// AUTH ROUTES
// =====================

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    // Check existing
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // Hash password
    const hash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, 'user')
       RETURNING id, name, email, role`,
      [name, email, hash]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Register failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const userRes = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    if (userRes.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = userRes.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// =====================
// CORE ROUTES
// =====================

// Get all users (for dropdowns)
app.get('/api/users', async (_req, res) => {
  try {
    const result = await pool.query('SELECT id, name, role FROM users ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

// Create new user (Admin)
app.post('/api/users', authRequired, adminRequired, async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Missing fields' });

    const hash = await bcrypt.hash(password, 10);
    const r = await pool.query(
      `INSERT INTO users (name, email, password_hash, role) 
       VALUES ($1, $2, $3, $4) RETURNING id, name, email, role`,
      [name, email, hash, role || 'user']
    );
    res.json(r.rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update specific user password (Admin)
app.put('/api/users/:id/password', authRequired, adminRequired, async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const { password } = req.body;
    if (!password || password.length < 4) {
      return res.status(400).json({ error: 'Password too short' });
    }

    const hash = await bcrypt.hash(password, 10);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, userId]);

    res.json({ status: 'ok', message: 'Password updated' });
  } catch (err) {
    console.error('Error resetting password:', err);
    res.status(500).json({ error: 'Failed to update password' });
  }
});

// Update User Profile (Self or Admin)
app.put('/api/users/:id', authRequired, async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  if (req.user.role !== 'admin' && req.user.id !== userId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  let { name, email, sex, date_of_birth, height_cm, weight_kg, activity_level } = req.body;

  // Sanitize numeric inputs: Convert '' or invalid numbers to null
  const safeHeight = (height_cm === '' || isNaN(Number(height_cm))) ? null : Number(height_cm);
  const safeWeight = (weight_kg === '' || isNaN(Number(weight_kg))) ? null : Number(weight_kg);

  // Sanitize strings need to be null if empty, OR let COALESCE handle null
  // But req.body might have '' for strings too. 
  // For strings, usually '' is valid in DB, but let's stick to update if provided
  // Actually, COALESCE($1, col) means if $1 is NULL, use col.
  // If request sends '', and we pass '', it updates to empty string. That's usually OK for name/email.
  // But for date_of_birth, '' is invalid syntax.
  const safeDob = (date_of_birth === '') ? null : date_of_birth;

  try {
    const result = await pool.query(
      `UPDATE users 
       SET name = COALESCE($1, name), 
           email = COALESCE($2, email), 
           sex = COALESCE($3, sex), 
           date_of_birth = COALESCE($4, date_of_birth), 
           height_cm = COALESCE($5, height_cm), 
           weight_kg = COALESCE($6, weight_kg), 
           activity_level = COALESCE($7, activity_level)
       WHERE id=$8
       RETURNING id, name, email, role, sex, date_of_birth, height_cm, weight_kg, activity_level`,
      [name || null, email || null, sex || null, safeDob, safeHeight, safeWeight, activity_level || null, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Get User Detail (Self or Admin)
app.get('/api/users/:id', authRequired, async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  if (req.user.role !== 'admin' && req.user.id !== userId) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    const r = await pool.query('SELECT id, name, email, role, sex, date_of_birth, height_cm, weight_kg, activity_level FROM users WHERE id=$1', [userId]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: 'Failed' });
  }
});


// Search foods
app.get('/api/foods/search', async (req, res) => {
  const q = req.query.q || '';
  try {
    const result = await pool.query(
      `SELECT * FROM foods 
        WHERE name ILIKE $1 
        ORDER BY name 
        LIMIT 20`,
      [`%${q}%`]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Search failed' });
  }
});

// (Import removed - using inline function)

// AI Smart Match & Create
app.post('/api/foods/smart-match', authRequired, async (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: 'Query required' });

  try {
    // 1. Get all food names for context
    // Optimization: In prod, cache this or use vector search. For <1000 items, fetching all is fine.
    const allFoodsRes = await pool.query('SELECT id, name FROM foods');
    const existingFoods = allFoodsRes.rows.map(f => f.name);

    // 2. Call AI
    console.log(`[SmartMatch] Querying AI for: ${query}`);
    const result = await findOrEstimateFood(query, existingFoods);
    console.log(`[SmartMatch] AI Result:`, JSON.stringify(result));

    // 3. Handle Result
    if (result.action === 'match') {
      const matchedName = result.existing_food_name;
      const dbFood = await pool.query('SELECT * FROM foods WHERE name = $1', [matchedName]);
      if (dbFood.rows.length > 0) {
        return res.json({ type: 'match', food: dbFood.rows[0] });
      } else {
        console.warn(`[SmartMatch] AI matched '${matchedName}' but not found in DB.`);
        // Proceed to create fallback?
      }
    }

    // 4. Create New (if action=create OR match failed)
    // Check if name exists to catch race conditions or AI hallucinations
    const foodName = result.new_food_name || query; // fallback
    const check = await pool.query('SELECT * FROM foods WHERE name = $1', [foodName]);
    if (check.rows.length > 0) {
      return res.json({ type: 'match', food: check.rows[0] });
    }

    // Insert new
    const insertRes = await pool.query(
      `INSERT INTO foods (name, category, default_unit, grams_per_unit)
             VALUES ($1, 'custom', 'g', 1)
             RETURNING id, name, category`,
      [foodName]
    );
    const newFood = insertRes.rows[0];

    // Add Nutrients
    if (result.nutrients) {
      const mapping = result.nutrients;
      const codes = Object.keys(mapping);
      const nutrIdsRes = await pool.query(
        `SELECT id, code FROM nutrients WHERE code = ANY($1::text[])`,
        [codes]
      );
      for (const row of nutrIdsRes.rows) {
        const val = mapping[row.code];
        if (val > 0) {
          await pool.query(
            `INSERT INTO food_nutrients (food_id, nutrient_id, amount_per_100g)
                          VALUES ($1, $2, $3)`,
            [newFood.id, row.id, val]
          );
        }
      }
    }

    return res.json({ type: 'created', food: newFood });

  } catch (err) {
    console.error('Smart match error:', err);
    // Fallback: Create basic custom food if AI fails
    const fallbackName = query.charAt(0).toUpperCase() + query.slice(1);

    // Check exist
    const check = await pool.query('SELECT * FROM foods WHERE name ILIKE $1', [fallbackName]);
    if (check.rows.length > 0) {
      return res.json({ type: 'match', food: check.rows[0] });
    }

    // Create
    const insertRes = await pool.query(
      `INSERT INTO foods (name, category, default_unit, grams_per_unit)
       VALUES ($1, 'custom', 'g', 1)
       RETURNING id, name, category`,
      [fallbackName]
    );
    return res.json({
      type: 'created',
      food: insertRes.rows[0],
      warning: "AI enrichment failed (Region/Network). Added as basic item."
    });
  }
});

// List all nutrients (for UI)
app.get('/api/nutrients', async (_req, res) => {
  try {
    const result = await pool.query('SELECT * FROM nutrients ORDER BY category, name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

// Create Custom Food (with Auto-Nutrients)
app.post('/api/foods/custom', async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });

  try {
    // 1. Create Food
    const insertRes = await pool.query(
      `INSERT INTO foods (name, category, default_unit, grams_per_unit)
       VALUES ($1, 'custom', 'g', 1)
       RETURNING id, name`,
      [name]
    );
    const food = insertRes.rows[0];
    const cleanName = food.name;

    // --- AI AUTO-FILL NUTRIENTS ---
    try {
      const estimated = await estimateNutrients(cleanName);
      if (estimated) {
        const mapping = estimated;
        const codes = Object.keys(mapping);
        const nutrIdsRes = await pool.query(
          `SELECT id, code FROM nutrients WHERE code = ANY($1::text[])`,
          [codes]
        );
        for (const row of nutrIdsRes.rows) {
          const val = mapping[row.code];
          if (val > 0) {
            await pool.query(
              `INSERT INTO food_nutrients (food_id, nutrient_id, amount_per_100g)
               VALUES ($1, $2, $3)`,
              [food.id, row.id, val]
            );
          }
        }
      }
    } catch (e) {
      console.error('Failed to estimate nutrients for custom food', e);
    }
    // -----------------------------

    res.json(food);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Create failed' });
  }
});

// Helper to auto-enrich food if missing nutrients
async function ensureFoodNutrients(foodId, foodName) {
  try {
    const nutCheck = await pool.query('SELECT 1 FROM food_nutrients WHERE food_id = $1 LIMIT 1', [foodId]);
    if (nutCheck.rows.length === 0) {
      console.log(`[Auto-Enrich] Food ${foodId} (${foodName}) has no nutrients. Estimating...`);
      const estimated = await estimateNutrients(foodName);

      if (estimated) {
        const mapping = estimated;
        const codes = Object.keys(mapping);
        const nutrIdsRes = await pool.query(
          `SELECT id, code FROM nutrients WHERE code = ANY($1::text[])`,
          [codes]
        );
        for (const row of nutrIdsRes.rows) {
          const val = mapping[row.code];
          if (val > 0) {
            await pool.query(
              `INSERT INTO food_nutrients (food_id, nutrient_id, amount_per_100g)
               VALUES ($1, $2, $3)`,
              [foodId, row.id, val]
            );
          }
        }
        console.log(`[Auto-Enrich] Successfully enriched ${foodName}`);
      }
    }
  } catch (e) {
    console.error(`[Auto-Enrich] Failed for ${foodName}`, e);
  }
}

// Log Intake
app.post('/api/logs', async (req, res) => {
  const { user_id, food_id, recipe_id, grams, meal_type } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO intake_logs (user_id, food_id, recipe_id, grams, meal_type)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [user_id, food_id || null, recipe_id || null, grams, meal_type]
    );

    // BACKGROUND CHECK: Auto-enrich food if needed
    if (food_id) {
      // Fetch name for AI
      pool.query('SELECT name FROM foods WHERE id = $1', [food_id]).then(r => {
        if (r.rows.length > 0) {
          ensureFoodNutrients(food_id, r.rows[0].name);
        }
      });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Log failed' });
  }
});

// List recipes (basic)
app.get('/api/recipes', async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, category, total_cooked_weight_g
         FROM recipes
        ORDER BY id DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching recipes:', err);
    res.status(500).json({ error: 'Failed to fetch recipes' });
  }
});

// Create new recipe
app.post('/api/recipes', authRequired, async (req, res) => {
  const { name, category, total_cooked_weight_g, ingredients } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Insert Recipe
    const recipeRes = await client.query(
      `INSERT INTO recipes (name, category, created_by_user_id, total_cooked_weight_g, is_public)
       VALUES ($1, $2, $3, $4, TRUE)
       RETURNING id, name`,
      [name, category, req.user.id, total_cooked_weight_g || 0]
    );
    const recipeId = recipeRes.rows[0].id;

    // 2. Insert Ingredients
    if (ingredients && ingredients.length > 0) {
      for (const ing of ingredients) {
        await client.query(
          `INSERT INTO recipe_ingredients (recipe_id, food_id, quantity_g)
           VALUES ($1, $2, $3)`,
          [recipeId, ing.food_id, ing.quantity_g]
        );
      }
    }

    await client.query('COMMIT');
    res.json(recipeRes.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Create recipe error:', err);
    res.status(500).json({ error: 'Failed to create recipe' });
  } finally {
    client.release();
  }
});

// --- HELPER: Backfill Single Nutrient ---
async function backfillNutrient(nutrientId, nutrientCode, nutrientName) {
  console.log(`[Backfill] Starting backfill for ${nutrientName} (${nutrientCode})...`);
  try {
    const allFoods = await pool.query('SELECT id, name FROM foods');
    for (const food of allFoods.rows) {
      // Check if already exists (sanity check)
      const check = await pool.query('SELECT 1 FROM food_nutrients WHERE food_id=$1 AND nutrient_id=$2', [food.id, nutrientId]);
      if (check.rows.length > 0) continue;

      // Ask AI
      if (!genAI) continue;
      const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
      const prompt = `Estimate ${nutrientName} content for 100g of RAW "${food.name}". Return ONLY a JSON object: {"amount": <number>, "unit": "<unit>"}. If negligible, return {"amount": 0}.`;

      try {
        const result = await model.generateContent(prompt);
        let text = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        const json = JSON.parse(text);

        const amount = Number(json.amount);
        if (!isNaN(amount) && amount >= 0) {
          await pool.query(
            `INSERT INTO food_nutrients (food_id, nutrient_id, amount_per_100g) VALUES ($1, $2, $3)`,
            [food.id, nutrientId, amount]
          );
        }
        // Rate limit: 2 seconds
        await new Promise(r => setTimeout(r, 2000));

      } catch (err) {
        console.error(`[Backfill] Failed for ${food.name}:`, err.message);
      }
    }
    console.log(`[Backfill] Completed for ${nutrientName}.`);
  } catch (err) {
    console.error(`[Backfill] Critical error:`, err);
  }
}

// Admin: Add New Nutrient
app.post('/api/admin/nutrients', authRequired, adminRequired, async (req, res) => {
  const { name, unit, daily_target, category } = req.body;

  if (!name || !unit || !daily_target) {
    return res.status(400).json({ error: 'Missing fields: name, unit, daily_target' });
  }

  const code = name.toLowerCase().replace(/[^a-z0-9]/g, '_');

  try {
    // 1. Create Nutrient
    const nutRes = await pool.query(
      `INSERT INTO nutrients (code, name, unit, category, lower_is_better)
       VALUES ($1, $2, $3, $4, FALSE)
       RETURNING id, code, name`,
      [code, name, unit, category || 'mineral']
    );
    const nutrient = nutRes.rows[0];

    // 2. Set Default Target for All Users
    const users = await pool.query('SELECT id FROM users');
    for (const u of users.rows) {
      await pool.query(
        `INSERT INTO user_nutrient_targets (user_id, nutrient_id, daily_target)
         VALUES ($1, $2, $3)
         ON CONFLICT DO NOTHING`,
        [u.id, nutrient.id, daily_target]
      );
    }

    // 3. Trigger Backfill (Async - do not await)
    backfillNutrient(nutrient.id, nutrient.code, nutrient.name);

    res.json({ success: true, nutrient, message: "Nutrient created. Backfill started in background." });

  } catch (err) {
    console.error("Add Nutrient Error:", err);
    if (err.code === '23505') { // Unique violation
      return res.status(400).json({ error: 'Nutrient code already exists' });
    }
    res.status(500).json({ error: 'Failed' });
  }
});

// Update Recipe
app.put('/api/recipes/:id', authRequired, async (req, res) => {
  const recipeId = parseInt(req.params.id, 10);
  const { name, category, total_cooked_weight_g, ingredients } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Verify Ownership
    const check = await client.query('SELECT created_by_user_id FROM recipes WHERE id = $1', [recipeId]);
    if (check.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Recipe not found' });
    }
    if (req.user.role !== 'admin' && check.rows[0].created_by_user_id !== req.user.id) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Forbidden' });
    }

    // 2. Update Recipe Details
    const updateRes = await client.query(
      `UPDATE recipes 
       SET name = $1, category = $2, total_cooked_weight_g = $3, updated_at = NOW()
       WHERE id = $4
       RETURNING id, name, updated_at`,
      [name, category, total_cooked_weight_g || 0, recipeId]
    );

    // 3. Replace Ingredients (Delete All -> Insert New)
    // Optimization: Could diff them, but full replace is safer/easier for now
    await client.query('DELETE FROM recipe_ingredients WHERE recipe_id = $1', [recipeId]);

    if (ingredients && ingredients.length > 0) {
      for (const ing of ingredients) {
        await client.query(
          `INSERT INTO recipe_ingredients (recipe_id, food_id, quantity_g)
           VALUES ($1, $2, $3)`,
          [recipeId, ing.food_id, ing.quantity_g]
        );
      }
    }

    await client.query('COMMIT');
    res.json(updateRes.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Update recipe error:', err);
    res.status(500).json({ error: 'Failed to update recipe' });
  } finally {
    client.release();
  }
});

// Delete Recipe
app.delete('/api/recipes/:id', authRequired, async (req, res) => {
  const recipeId = parseInt(req.params.id, 10);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Verify Ownership
    const check = await client.query('SELECT created_by_user_id FROM recipes WHERE id = $1', [recipeId]);
    if (check.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Recipe not found' });
    }
    if (req.user.role !== 'admin' && check.rows[0].created_by_user_id !== req.user.id) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Forbidden' });
    }

    // 2. Delete Ingredients (Manual cascade if FK not set, safer anyway)
    await client.query('DELETE FROM recipe_ingredients WHERE recipe_id = $1', [recipeId]);

    // 3. Delete Recipe
    await client.query('DELETE FROM recipes WHERE id = $1', [recipeId]);

    await client.query('COMMIT');
    res.json({ message: 'Recipe deleted successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Delete recipe error:', err);
    res.status(500).json({ error: 'Failed to delete recipe' });
  } finally {
    client.release();
  }
});

// Get single recipe with ingredients
app.get('/api/recipes/:id', async (req, res) => {
  const recipeId = parseInt(req.params.id, 10);
  try {
    const recipeRes = await pool.query('SELECT * FROM recipes WHERE id = $1', [recipeId]);
    if (recipeRes.rows.length === 0) return res.status(404).json({ error: 'Recipe not found' });

    const ingRes = await pool.query(
      `SELECT ri.food_id, ri.quantity_g, f.name as food_name
       FROM recipe_ingredients ri
       JOIN foods f ON f.id = ri.food_id
       WHERE ri.recipe_id = $1`,
      [recipeId]
    );

    res.json({
      ...recipeRes.rows[0],
      ingredients: ingRes.rows
    });
  } catch (err) {
    console.error('Error fetching recipe details:', err);
    res.status(500).json({ error: 'Failed to fetch details' });
  }
});

// Get recent logs
app.get('/api/logs/recent', authRequired, async (req, res) => {
  const { user_id } = req.query;
  // Admin can view others, regular user only themselves
  const targetId = user_id || req.user.id;
  if (req.user.role !== 'admin' && parseInt(targetId) !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const result = await pool.query(
      `SELECT l.id, l.food_id, l.grams, l.eaten_at, f.name as food_name
       FROM intake_logs l
       LEFT JOIN foods f ON l.food_id = f.id
       WHERE l.user_id = $1
       ORDER BY l.eaten_at DESC
       LIMIT 5`,
      [targetId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching logs:', err);
    res.status(500).json({ error: 'Failed' });
  }
});

// Update Log (Grams only for now)
app.put('/api/logs/:id', authRequired, async (req, res) => {
  const logId = parseInt(req.params.id, 10);
  const { grams } = req.body;

  if (!grams || grams <= 0) {
    return res.status(400).json({ error: 'Valid grams required' });
  }

  try {
    const client = await pool.connect();
    try {
      // 1. Verify Ownership
      const check = await client.query('SELECT user_id FROM intake_logs WHERE id = $1', [logId]);
      if (check.rows.length === 0) return res.status(404).json({ error: 'Log not found' });

      if (req.user.role !== 'admin' && check.rows[0].user_id !== req.user.id) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      // 2. Update
      const result = await client.query(
        'UPDATE intake_logs SET grams = $1 WHERE id = $2 RETURNING *',
        [grams, logId]
      );
      res.json(result.rows[0]);
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Update log error:', err);
    res.status(500).json({ error: 'Failed to update log' });
  }
});

// Delete Log
app.delete('/api/logs/:id', authRequired, async (req, res) => {
  const logId = parseInt(req.params.id, 10);

  try {
    const client = await pool.connect();
    try {
      // 1. Verify Ownership
      const check = await client.query('SELECT user_id FROM intake_logs WHERE id = $1', [logId]);
      if (check.rows.length === 0) return res.status(404).json({ error: 'Log not found' });

      if (req.user.role !== 'admin' && check.rows[0].user_id !== req.user.id) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      // 2. Delete
      await client.query('DELETE FROM intake_logs WHERE id = $1', [logId]);
      res.json({ message: 'Deleted successfully' });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Delete log error:', err);
    res.status(500).json({ error: 'Failed to delete log' });
  }
});

// =====================
// INTAKE LOGS & ANALYTICS
// =====================

// Helper: Calculate TDEE Targets
function calculateTargets(user) {
  if (!user.weight_kg || !user.height_cm || !user.date_of_birth || !user.sex) return null;

  const weight = Number(user.weight_kg);
  const height = Number(user.height_cm);

  const dob = new Date(user.date_of_birth);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  if (today.getMonth() < dob.getMonth() || (today.getMonth() === dob.getMonth() && today.getDate() < dob.getDate())) {
    age--;
  }

  // Mifflin-St Jeor
  // Men: 10W + 6.25H - 5A + 5
  // Women: 10W + 6.25H - 5A - 161
  let bmr = (10 * weight) + (6.25 * height) - (5 * age);
  if (user.sex === 'male') bmr += 5;
  else bmr -= 161;

  // Activity Multiplier
  const levels = {
    'sedentary': 1.2,
    'light': 1.375,
    'moderate': 1.55,
    'active': 1.725,
    'very_active': 1.9
  };
  const multiplier = levels[user.activity_level] || 1.2;
  const tdee = Math.round(bmr * multiplier);

  // Standard Split: 50% Carbs, 30% Fat, 20% Protein
  const proteinG = Math.round((tdee * 0.20) / 4);
  const fatG = Math.round((tdee * 0.30) / 9);
  const carbsG = Math.round((tdee * 0.50) / 4);

  return {
    energy_kcal: tdee,
    protein: proteinG,
    fat_total: fatG,
    carbohydrates: carbsG,
  };
}

app.get('/api/analytics/day', authRequired, async (req, res) => {
  const client = await pool.connect();
  try {
    const { user_id, date } = req.query;
    if (!user_id || !date) {
      return res.status(400).json({ error: 'user_id and date are required' });
    }

    // 1) Get logs for the day
    const logsRes = await client.query(
      `SELECT food_id, grams
         FROM intake_logs
        WHERE user_id = $1
          AND eaten_at::date = $2::date`,
      [user_id, date]
    );

    const gramsByFood = {};
    for (const row of logsRes.rows) {
      if (row.food_id) {
        gramsByFood[row.food_id] = (gramsByFood[row.food_id] || 0) + Number(row.grams);
      }
    }

    // 2) Collect food IDs
    const foodIds = Object.keys(gramsByFood).map((id) => parseInt(id, 10));

    // 3) Load food_nutrients
    let foodNutRes = { rows: [] };
    if (foodIds.length > 0) {
      foodNutRes = await client.query(
        `SELECT food_id, nutrient_id, amount_per_100g
           FROM food_nutrients
          WHERE food_id = ANY($1::int[])`,
        [foodIds]
      );
    }

    let missingFoods = [];
    if (foodIds.length > 0) {
      const foodIdsWithNutrients = new Set(foodNutRes.rows.map((r) => r.food_id));
      const missingFoodIds = foodIds.filter(fid => !foodIdsWithNutrients.has(fid));
      if (missingFoodIds.length > 0) {
        const mfRes = await client.query('SELECT id, name FROM foods WHERE id=ANY($1)', [missingFoodIds]);
        missingFoods = mfRes.rows;
      }
    }

    // Sum up totals
    const nutrientTotals = {};
    for (const row of foodNutRes.rows) {
      const fid = row.food_id;
      const nid = row.nutrient_id;
      const per100 = Number(row.amount_per_100g);
      const gramsFood = gramsByFood[fid] || 0;
      const amount = gramsFood * (per100 / 100.0);
      nutrientTotals[nid] = (nutrientTotals[nid] || 0) + amount;
    }

    // 4) Targets
    let targetsByNutrient = {};
    let profileLabel = null;

    // A. User Overrides
    const userTargetsRes = await client.query(
      `SELECT nutrient_id, daily_target 
       FROM user_nutrient_targets 
       WHERE user_id = $1`,
      [user_id]
    );
    for (const row of userTargetsRes.rows) {
      targetsByNutrient[row.nutrient_id] = {
        daily_target: Number(row.daily_target),
        upper_limit: null,
        source: 'user_override'
      };
    }

    // B. Calculated Bio-Metrics
    const userRes = await client.query(`SELECT sex, date_of_birth, weight_kg, height_cm, activity_level FROM users WHERE id = $1`, [user_id]);
    const userData = userRes.rows[0] || {};

    const calculated = calculateTargets(userData);
    if (calculated) {
      const macroCodes = Object.keys(calculated);
      const macroIdsRes = await client.query(`SELECT id, code FROM nutrients WHERE code = ANY($1::text[])`, [macroCodes]);

      for (const row of macroIdsRes.rows) {
        if (!targetsByNutrient[row.id]) {
          targetsByNutrient[row.id] = {
            daily_target: calculated[row.code],
            upper_limit: null,
            source: 'calculated_biometric'
          };
        }
      }
    }

    // C. RDA Profile
    let userSex = userData.sex;
    let userAge = null;
    if (userData.date_of_birth) {
      const d = new Date(date);
      const b = new Date(userData.date_of_birth);
      let age = d.getFullYear() - b.getFullYear();
      if (d.getMonth() < b.getMonth() || (d.getMonth() === b.getMonth() && d.getDate() < b.getDate())) age--;
      userAge = age;
    }

    let rdaProfileRes = null;
    if (userSex && Number.isFinite(userAge)) {
      rdaProfileRes = await client.query(
        `SELECT id, label FROM rda_profiles 
         WHERE sex=$1 AND age_min <= $2 AND age_max >= $2 
         ORDER BY age_min LIMIT 1`,
        [userSex, userAge]
      );
    }
    if (!rdaProfileRes || rdaProfileRes.rows.length === 0) {
      rdaProfileRes = await client.query(`SELECT id, label FROM rda_profiles WHERE label = 'male_51_60_standard' LIMIT 1`);
    }

    if (rdaProfileRes.rows.length > 0) {
      const pid = rdaProfileRes.rows[0].id;
      profileLabel = rdaProfileRes.rows[0].label;
      const rdaVals = await client.query(`SELECT nutrient_id, daily_target, upper_limit FROM rda_values WHERE rda_profile_id=$1`, [pid]);

      for (const row of rdaVals.rows) {
        const nid = row.nutrient_id;
        if (!targetsByNutrient[nid]) {
          targetsByNutrient[nid] = {
            daily_target: Number(row.daily_target),
            upper_limit: row.upper_limit ? Number(row.upper_limit) : null,
            source: 'rda_profile'
          };
        }
      }
    }

    // 5) Build Response
    const allIds = new Set([
      ...Object.keys(nutrientTotals).map(Number),
      ...Object.keys(targetsByNutrient).map(Number)
    ]);

    let resultObj = {};

    if (allIds.size > 0) {
      const metamap = await client.query(
        `SELECT id, code, name, unit, category, lower_is_better 
         FROM nutrients WHERE id = ANY($1::int[])`,
        [Array.from(allIds)]
      );

      for (const meta of metamap.rows) {
        const nid = meta.id;
        const total = nutrientTotals[nid] || 0;
        const target = targetsByNutrient[nid] || {};

        resultObj[meta.code] = {
          code: meta.code, // Include code in object
          name: meta.name,
          total_amount: total,
          unit: meta.unit,
          rda_target: target.daily_target || 0,
          custom_target: target.daily_target || 0,
          upper_limit: target.upper_limit,
          source: target.source
        };
      }
    }

    // Convert to Array for frontend (DashboardPage.js expects .find())
    const nutrientArray = Object.values(resultObj);

    res.json({
      user_id: Number(user_id),
      date,
      total_grams_by_food: gramsByFood,
      nutrients: nutrientArray,
      missing_foods: missingFoods,
      rda_profile_used: profileLabel,
      calculated_targets: !!calculated
    });

  } catch (err) {
    console.error('Error in /api/analytics/day:', err);
    res.status(500).json({ error: 'Failed to compute analytics' });
  } finally {
    client.release();
  }
});

// History range endpoint
app.get('/api/analytics/history', authRequired, async (req, res) => {
  const client = await pool.connect();
  try {
    const { user_id, start_date, end_date } = req.query;
    if (!user_id || !start_date || !end_date) {
      return res.status(400).json({ error: 'user_id, start_date, and end_date required' });
    }

    // Aggregate nutrients by date
    // 1. Get logs in range
    const logsRes = await client.query(
      `SELECT l.eaten_at::date as date, l.food_id, l.grams
       FROM intake_logs l
       WHERE l.user_id = $1
         AND l.eaten_at::date >= $2::date
         AND l.eaten_at::date <= $3::date
       ORDER BY l.eaten_at::date ASC`,
      [user_id, start_date, end_date]
    );

    // 2. Fetch food nutrients for these logs
    const foodIds = [...new Set(logsRes.rows.map(r => r.food_id))];
    let foodNutMap = {};

    if (foodIds.length > 0) {
      const nutRes = await client.query(
        `SELECT fn.food_id, n.code, fn.amount_per_100g
             FROM food_nutrients fn
             JOIN nutrients n ON fn.nutrient_id = n.id
             WHERE fn.food_id = ANY($1::int[])
               AND n.code IN ('energy_kcal', 'protein', 'fat_total', 'carbohydrates')`,
        [foodIds]
      );
      for (const row of nutRes.rows) {
        if (!foodNutMap[row.food_id]) foodNutMap[row.food_id] = {};
        foodNutMap[row.food_id][row.code] = Number(row.amount_per_100g);
      }
    }

    // 3. Group by date
    const history = {};
    for (const log of logsRes.rows) {
      const d = log.date.toISOString().slice(0, 10);
      if (!history[d]) {
        history[d] = { date: d, energy_kcal: 0, protein: 0, fat_total: 0, carbohydrates: 0 };
      }

      const nutrients = foodNutMap[log.food_id] || {};
      const factor = Number(log.grams) / 100.0;

      history[d].energy_kcal += (nutrients.energy_kcal || 0) * factor;
      history[d].protein += (nutrients.protein || 0) * factor;
      history[d].fat_total += (nutrients.fat_total || 0) * factor;
      history[d].carbohydrates += (nutrients.carbohydrates || 0) * factor;
    }

    res.json(Object.values(history));

  } catch (err) {
    console.error('Error in /api/analytics/history:', err);
    res.status(500).json({ error: 'Failed to fetch history' });
  } finally {
    client.release();
  }
});

app.post('/api/ai/parse-meal', authRequired, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'text is required' });

    const items = await parseMealDescription(text);
    res.json({ items });
  } catch (err) {
    console.error('AI Error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log('Registered updated routes for logs');
  console.log(`Backend listening on http://localhost:${PORT}`);
});
