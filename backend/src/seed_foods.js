import { pool } from './db.js';

// Helper to find nutrient ID by code
async function getNutrientMap() {
    const res = await pool.query('SELECT id, code FROM nutrients');
    const map = {};
    res.rows.forEach(r => map[r.code] = r.id);
    return map;
}

const COMMON_FOODS = [
    // CEREALS & GRAINS
    { name: 'Rice, white, raw', cat: 'Grain', kcal: 360, p: 6.8, f: 0.5, c: 79, fib: 1 },
    { name: 'Rice, brown, raw', cat: 'Grain', kcal: 362, p: 7.5, f: 2.7, c: 76, fib: 3.4 },
    { name: 'Wheat Flour (Atta)', cat: 'Grain', kcal: 340, p: 11, f: 2, c: 72, fib: 11 },
    { name: 'Oats, rolled', cat: 'Grain', kcal: 389, p: 16.9, f: 6.9, c: 66, fib: 10.6 },
    { name: 'Quinoa, raw', cat: 'Grain', kcal: 368, p: 14, f: 6, c: 64, fib: 7 },
    { name: 'Bread, white (slice)', cat: 'Grain', kcal: 265, p: 9, f: 3, c: 49, fib: 2.7 },
    { name: 'Bread, whole wheat', cat: 'Grain', kcal: 247, p: 13, f: 3.4, c: 41, fib: 7 },

    // PULSES & LEGUMES
    { name: 'Toor Dal (Pigeon Pea)', cat: 'Pulse', kcal: 335, p: 22, f: 1.5, c: 63, fib: 15 },
    { name: 'Moong Dal (Green Gram)', cat: 'Pulse', kcal: 348, p: 24, f: 1.2, c: 60, fib: 16 },
    { name: 'Masoor Dal (Red Lentil)', cat: 'Pulse', kcal: 343, p: 25, f: 1, c: 60, fib: 30 },
    { name: 'Chana Dal (Chickpea Split)', cat: 'Pulse', kcal: 360, p: 21, f: 5, c: 60, fib: 17 },
    { name: 'Chickpeas (Kabuli Chana)', cat: 'Pulse', kcal: 364, p: 19, f: 6, c: 61, fib: 17 },
    { name: 'Kidney Beans (Rajma)', cat: 'Pulse', kcal: 333, p: 24, f: 0.8, c: 60, fib: 25 },
    { name: 'Black Gram (Urad Dal)', cat: 'Pulse', kcal: 341, p: 25, f: 1.6, c: 59, fib: 18 },
    { name: 'Soybean', cat: 'Pulse', kcal: 446, p: 36, f: 20, c: 30, fib: 9 },

    // VEGETABLES
    { name: 'Onion, red', cat: 'Vegetable', kcal: 40, p: 1.1, f: 0.1, c: 9, fib: 1.7 },
    { name: 'Tomato', cat: 'Vegetable', kcal: 18, p: 0.9, f: 0.2, c: 3.9, fib: 1.2 },
    { name: 'Potato', cat: 'Vegetable', kcal: 77, p: 2, f: 0.1, c: 17, fib: 2.2 },
    { name: 'Carrot', cat: 'Vegetable', kcal: 41, p: 0.9, f: 0.2, c: 10, fib: 2.8 },
    { name: 'Spinach', cat: 'Vegetable', kcal: 23, p: 2.9, f: 0.4, c: 3.6, fib: 2.2 },
    { name: 'Cauliflower', cat: 'Vegetable', kcal: 25, p: 1.9, f: 0.3, c: 5, fib: 2 },
    { name: 'Cabbage', cat: 'Vegetable', kcal: 25, p: 1.3, f: 0.1, c: 5.8, fib: 2.5 },
    { name: 'Broccoli', cat: 'Vegetable', kcal: 34, p: 2.8, f: 0.4, c: 7, fib: 2.6 },
    { name: 'Capsicum (Bell Pepper)', cat: 'Vegetable', kcal: 20, p: 0.9, f: 0.2, c: 4.6, fib: 1.7 },
    { name: 'Brinjal (Eggplant)', cat: 'Vegetable', kcal: 25, p: 1, f: 0.2, c: 6, fib: 3 },
    { name: 'Okra (Ladies Finger)', cat: 'Vegetable', kcal: 33, p: 1.9, f: 0.2, c: 7, fib: 3.2 },
    { name: 'Cucumber', cat: 'Vegetable', kcal: 15, p: 0.7, f: 0.1, c: 3.6, fib: 0.5 },
    { name: 'Peas, green', cat: 'Vegetable', kcal: 81, p: 5, f: 0.4, c: 14, fib: 5 },
    { name: 'Ginger', cat: 'Vegetable', kcal: 80, p: 1.8, f: 0.8, c: 18, fib: 2 },
    { name: 'Garlic', cat: 'Vegetable', kcal: 149, p: 6.4, f: 0.5, c: 33, fib: 2.1 },

    // FRUITS
    { name: 'Apple', cat: 'Fruit', kcal: 52, p: 0.3, f: 0.2, c: 14, fib: 2.4 },
    { name: 'Banana', cat: 'Fruit', kcal: 89, p: 1.1, f: 0.3, c: 23, fib: 2.6 },
    { name: 'Orange', cat: 'Fruit', kcal: 47, p: 0.9, f: 0.1, c: 12, fib: 2.4 },
    { name: 'Mango', cat: 'Fruit', kcal: 60, p: 0.8, f: 0.4, c: 15, fib: 1.6 },
    { name: 'Grapes', cat: 'Fruit', kcal: 69, p: 0.7, f: 0.2, c: 18, fib: 0.9 },
    { name: 'Watermelon', cat: 'Fruit', kcal: 30, p: 0.6, f: 0.2, c: 8, fib: 0.4 },
    { name: 'Papaya', cat: 'Fruit', kcal: 43, p: 0.5, f: 0.3, c: 11, fib: 1.7 },

    // DAIRY & EGG
    { name: 'Milk, whole', cat: 'Dairy', kcal: 61, p: 3.2, f: 3.3, c: 4.8, fib: 0 },
    { name: 'Milk, skimmed', cat: 'Dairy', kcal: 35, p: 3.4, f: 0.1, c: 5, fib: 0 },
    { name: 'Curd (Yogurt)', cat: 'Dairy', kcal: 60, p: 3.5, f: 3, c: 4.7, fib: 0 },
    { name: 'Paneer (Cottage Cheese)', cat: 'Dairy', kcal: 265, p: 18, f: 20, c: 1.2, fib: 0 },
    { name: 'Cheese, Cheddar', cat: 'Dairy', kcal: 402, p: 25, f: 33, c: 1.3, fib: 0 },
    { name: 'Butter', cat: 'Dairy', kcal: 717, p: 0.9, f: 81, c: 0.1, fib: 0 },
    { name: 'Ghee', cat: 'Dairy', kcal: 900, p: 0, f: 99.5, c: 0, fib: 0 },
    { name: 'Egg, whole', cat: 'Animal', kcal: 155, p: 13, f: 11, c: 1.1, fib: 0 },
    { name: 'Egg, white', cat: 'Animal', kcal: 52, p: 11, f: 0.2, c: 0.7, fib: 0 },

    // MEAT & FISH
    { name: 'Chicken Breast, raw', cat: 'Meat', kcal: 165, p: 31, f: 3.6, c: 0, fib: 0 },
    { name: 'Chicken Thigh, raw', cat: 'Meat', kcal: 209, p: 26, f: 10.9, c: 0, fib: 0 },
    { name: 'Mutton / Lamb', cat: 'Meat', kcal: 294, p: 25, f: 21, c: 0, fib: 0 },
    { name: 'Fish (Salmon/Mackerel)', cat: 'Meat', kcal: 208, p: 20, f: 13, c: 0, fib: 0 },

    // OILS & FAT
    { name: 'Oil, Sunflower', cat: 'Fat', kcal: 884, p: 0, f: 100, c: 0, fib: 0 },
    { name: 'Oil, Olive', cat: 'Fat', kcal: 884, p: 0, f: 100, c: 0, fib: 0 },
    { name: 'Oil, Coconut', cat: 'Fat', kcal: 862, p: 0, f: 100, c: 0, fib: 0 },

    // NUTS & SEEDS
    { name: 'Almonds', cat: 'Nut', kcal: 579, p: 21, f: 50, c: 22, fib: 12.5 },
    { name: 'Cashews', cat: 'Nut', kcal: 553, p: 18, f: 44, c: 30, fib: 3.3 },
    { name: 'Walnuts', cat: 'Nut', kcal: 654, p: 15, f: 65, c: 14, fib: 6.7 },
    { name: 'Peanuts', cat: 'Nut', kcal: 567, p: 26, f: 49, c: 16, fib: 8.5 },
    { name: 'Coconut, fresh grated', cat: 'Nut', kcal: 354, p: 3.3, f: 33, c: 15, fib: 9 },
    { name: 'Coconut, desiccated', cat: 'Nut', kcal: 660, p: 7, f: 65, c: 24, fib: 16 },

    // SOUTH INDIAN ESSENTIALS (Spices & Veg)
    { name: 'Tamarind Pulp', cat: 'Spice', kcal: 239, p: 2.8, f: 0.6, c: 62.5, fib: 5.1 },
    { name: 'Curry Leaves', cat: 'Vegetable', kcal: 108, p: 6, f: 1, c: 18, fib: 6.4 },
    { name: 'Coriander Leaves', cat: 'Vegetable', kcal: 23, p: 2, f: 0.5, c: 3.7, fib: 2.8 },
    { name: 'Green Chilli', cat: 'Vegetable', kcal: 40, p: 2, f: 0.2, c: 9, fib: 1.5 },
    { name: 'Ginger Paste', cat: 'Spice', kcal: 80, p: 1.8, f: 0.7, c: 18, fib: 2 },
    { name: 'Garlic Paste', cat: 'Spice', kcal: 149, p: 6.4, f: 0.5, c: 33, fib: 2.1 },
    { name: 'Mustard Seeds', cat: 'Spice', kcal: 508, p: 26, f: 36, c: 28, fib: 12 },
    { name: 'Cumin Seeds (Jeera)', cat: 'Spice', kcal: 375, p: 18, f: 22, c: 44, fib: 10 },
    { name: 'Fenugreek Seeds (Methi)', cat: 'Spice', kcal: 323, p: 23, f: 6.4, c: 58, fib: 25 },
    { name: 'Turmeric Powder', cat: 'Spice', kcal: 354, p: 8, f: 10, c: 65, fib: 21 },
    { name: 'Red Chilli Powder', cat: 'Spice', kcal: 282, p: 12, f: 14, c: 50, fib: 35 },
    { name: 'Coriander Powder', cat: 'Spice', kcal: 298, p: 12, f: 18, c: 55, fib: 42 },
    { name: 'Asafoetida (Hing)', cat: 'Spice', kcal: 297, p: 4, f: 1.1, c: 68, fib: 4 },
    { name: 'Sambar Powder', cat: 'Spice', kcal: 335, p: 14, f: 12, c: 53, fib: 20 }, // estimated mix

    // SOUTH INDIAN VEGETABLES
    { name: 'Drumstick (Moringa)', cat: 'Vegetable', kcal: 64, p: 9.4, f: 1.4, c: 8.3, fib: 2 },
    { name: 'Ladies Finger (Okra)', cat: 'Vegetable', kcal: 33, p: 1.9, f: 0.2, c: 7.5, fib: 3.2 },
    { name: 'Brinjal (Eggplant)', cat: 'Vegetable', kcal: 25, p: 1, f: 0.2, c: 6, fib: 3 },
    { name: 'Bottle Gourd (Lauki)', cat: 'Vegetable', kcal: 15, p: 0.2, f: 0.1, c: 3.6, fib: 0.5 },
    { name: 'Bitter Gourd (Karela)', cat: 'Vegetable', kcal: 34, p: 3.6, f: 0.2, c: 7, fib: 2.8 },
    { name: 'Snake Gourd', cat: 'Vegetable', kcal: 18, p: 0.5, f: 0.1, c: 3.3, fib: 0.6 },
    { name: 'Ridge Gourd', cat: 'Vegetable', kcal: 20, p: 0.5, f: 0.1, c: 3.4, fib: 0.5 },
    { name: 'Cluster Beans (Gavar)', cat: 'Vegetable', kcal: 34, p: 3, f: 0.4, c: 7, fib: 3 },
    { name: 'Broad Beans (Averakkai)', cat: 'Vegetable', kcal: 48, p: 4, f: 0.3, c: 8, fib: 3 },
    { name: 'Pumpkin (Yellow)', cat: 'Vegetable', kcal: 26, p: 1, f: 0.1, c: 6.5, fib: 0.5 },
    { name: 'Ash Gourd', cat: 'Vegetable', kcal: 13, p: 0.4, f: 0.1, c: 3, fib: 2 },
    { name: 'Plantain (Raw Banana)', cat: 'Vegetable', kcal: 89, p: 1, f: 0, c: 23, fib: 2.6 },
    { name: 'Elephant Yam (Suran)', cat: 'Vegetable', kcal: 118, p: 1.5, f: 0.1, c: 28, fib: 4 },

    // FLOURS & OTHERS
    { name: 'Rava (Semolina)', cat: 'Grain', kcal: 360, p: 12.7, f: 1, c: 72.8, fib: 3.9 },
    { name: 'Rice Flour', cat: 'Grain', kcal: 365, p: 6, f: 1.4, c: 80, fib: 2.4 },
    { name: 'Ragi (Finger Millet) Flour', cat: 'Grain', kcal: 328, p: 7.3, f: 1.3, c: 72, fib: 3.6 },
    { name: 'Besan (Chickpea Flour)', cat: 'Grain', kcal: 387, p: 22, f: 7, c: 58, fib: 10 },
    { name: 'Vermicelli (Wheat)', cat: 'Grain', kcal: 330, p: 10, f: 1, c: 74, fib: 3 },

    // SUGAR & SPICES
    { name: 'Sugar', cat: 'Sweet', kcal: 387, p: 0, f: 0, c: 100, fib: 0 },
    { name: 'Jaggery', cat: 'Sweet', kcal: 383, p: 0.4, f: 0.1, c: 95, fib: 0 },
    { name: 'Honey', cat: 'Sweet', kcal: 304, p: 0.3, f: 0, c: 82, fib: 0.2 },
];

async function seed() {
    const client = await pool.connect();
    try {
        console.log('Fetching nutrients...');
        const nutMap = await getNutrientMap();
        const energyId = nutMap['energy_kcal'];
        const protId = nutMap['protein'];
        const fatId = nutMap['fat_total'];
        const carbId = nutMap['carbohydrates'];
        const fiberId = nutMap['fiber'];

        console.log(`Seeding ${COMMON_FOODS.length} common foods...`);

        for (const food of COMMON_FOODS) {
            // 1. Insert Food (Upsert logic: check name)
            const check = await client.query('SELECT id FROM foods WHERE name = $1', [food.name]);
            let foodId;

            if (check.rows.length === 0) {
                const ins = await client.query(
                    `INSERT INTO foods (name, category, default_unit, grams_per_unit) 
           VALUES ($1, $2, 'g', 1) RETURNING id`,
                    [food.name, food.cat]
                );
                foodId = ins.rows[0].id;
            } else {
                foodId = check.rows[0].id;
                // Optional: update category
            }

            // 2. Insert/Update Nutrients
            const nuts = [
                { id: energyId, val: food.kcal },
                { id: protId, val: food.p },
                { id: fatId, val: food.f },
                { id: carbId, val: food.c },
                { id: fiberId, val: food.fib }
            ];

            for (const n of nuts) {
                if (!n.id) continue;
                // Delete existing mapping for this nutrient
                await client.query('DELETE FROM food_nutrients WHERE food_id=$1 AND nutrient_id=$2', [foodId, n.id]);
                // Insert
                await client.query(
                    `INSERT INTO food_nutrients (food_id, nutrient_id, amount_per_100g) VALUES ($1, $2, $3)`,
                    [foodId, n.id, n.val]
                );
            }
        }
        console.log('Seeding complete.');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    } finally {
        client.release();
    }
}

seed();
