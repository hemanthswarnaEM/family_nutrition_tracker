-- USERS (dad, mom, brother, etc.)
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'user',
  sex TEXT,
  date_of_birth DATE,
  height_cm NUMERIC,
  weight_kg NUMERIC,
  activity_level TEXT,
  goal TEXT,
  health_flags TEXT[]
);
-- NUTRIENTS
CREATE TABLE nutrients (
  id SERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  unit TEXT NOT NULL,
  category TEXT NOT NULL,
  lower_is_better BOOLEAN NOT NULL DEFAULT FALSE,
  track_type TEXT NOT NULL DEFAULT 'daily'
);
-- RDA PROFILES (e.g. male_51_60)
CREATE TABLE rda_profiles (
  id SERIAL PRIMARY KEY,
  label TEXT NOT NULL,
  sex TEXT,
  age_min INT,
  age_max INT
);
-- RDA VALUES (per nutrient)
CREATE TABLE rda_values (
  id SERIAL PRIMARY KEY,
  rda_profile_id INT REFERENCES rda_profiles(id) ON DELETE CASCADE,
  nutrient_id INT REFERENCES nutrients(id) ON DELETE CASCADE,
  daily_target NUMERIC NOT NULL,
  upper_limit NUMERIC
);
-- USER SPECIFIC TARGETS (Overrides RDA)
CREATE TABLE user_nutrient_targets (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  nutrient_id INT REFERENCES nutrients(id) ON DELETE CASCADE,
  daily_target NUMERIC NOT NULL,
  UNIQUE(user_id, nutrient_id)
);
-- FOODS (ingredients + simple foods)
CREATE TABLE foods (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  default_unit TEXT,
  grams_per_unit NUMERIC
);
-- FOOD NUTRIENTS (per 100 g of raw food)
CREATE TABLE food_nutrients (
  id SERIAL PRIMARY KEY,
  food_id INT REFERENCES foods(id) ON DELETE CASCADE,
  nutrient_id INT REFERENCES nutrients(id) ON DELETE CASCADE,
  amount_per_100g NUMERIC NOT NULL
);
-- RECIPES (home dishes like sambar)
CREATE TABLE recipes (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  created_by_user_id INT REFERENCES users(id),
  total_cooked_weight_g NUMERIC,
  is_public BOOLEAN NOT NULL DEFAULT TRUE
);
-- RECIPE INGREDIENTS (all in grams)
CREATE TABLE recipe_ingredients (
  id SERIAL PRIMARY KEY,
  recipe_id INT REFERENCES recipes(id) ON DELETE CASCADE,
  food_id INT REFERENCES foods(id),
  quantity_g NUMERIC NOT NULL
);
-- INTAKE LOGS (who ate what when, in grams)
CREATE TABLE intake_logs (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  recipe_id INT REFERENCES recipes(id),
  food_id INT REFERENCES foods(id),
  grams NUMERIC NOT NULL,
  eaten_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  meal_type TEXT
);




-- Insert Core Nutrients (Run this first)
INSERT INTO nutrients (code, name, unit, category, lower_is_better) VALUES
('energy_kcal', 'Energy', 'kcal', 'macro', FALSE),
('protein', 'Protein', 'g', 'macro', FALSE),
('fat_total', 'Total Fat', 'g', 'macro', TRUE),
('carbohydrates', 'Carbohydrates', 'g', 'macro', FALSE),
('fiber', 'Fiber', 'g', 'macro', FALSE),
('sodium', 'Sodium', 'mg', 'mineral', TRUE),
('calcium', 'Calcium', 'mg', 'mineral', FALSE),
('iron', 'Iron', 'mg', 'mineral', FALSE),
('potassium', 'Potassium', 'mg', 'mineral', FALSE),
('vit_a', 'Vitamin A', 'mcg', 'vitamin', FALSE),
('vit_c', 'Vitamin C', 'mg', 'vitamin', FALSE),
('vit_d', 'Vitamin D', 'mcg', 'vitamin', FALSE),
('vit_b12', 'Vitamin B12', 'mcg', 'vitamin', FALSE);

SELECT * FROM nutrients;

-- Insert RDA Profile and Values (Run this second)
INSERT INTO rda_profiles (label, sex, age_min, age_max) VALUES
('male_51_60_standard', 'male', 51, 60);

-- Insert RDA targets
WITH target_profile AS (
    SELECT id FROM rda_profiles WHERE label = 'male_51_60_standard'
)
INSERT INTO rda_values (rda_profile_id, nutrient_id, daily_target, upper_limit) VALUES
((SELECT id FROM target_profile), (SELECT id FROM nutrients WHERE code = 'energy_kcal'), 2200, NULL),
((SELECT id FROM target_profile), (SELECT id FROM nutrients WHERE code = 'protein'), 60, NULL),
((SELECT id FROM target_profile), (SELECT id FROM nutrients WHERE code = 'fat_total'), 60, NULL),
((SELECT id FROM target_profile), (SELECT id FROM nutrients WHERE code = 'fiber'), 30, NULL),
((SELECT id FROM target_profile), (SELECT id FROM nutrients WHERE code = 'sodium'), 1500, 2300),
((SELECT id FROM target_profile), (SELECT id FROM nutrients WHERE code = 'calcium'), 1000, 2500),
((SELECT id FROM target_profile), (SELECT id FROM nutrients WHERE code = 'iron'), 8, 45),
((SELECT id FROM target_profile), (SELECT id FROM nutrients WHERE code = 'potassium'), 3400, NULL),
((SELECT id FROM target_profile), (SELECT id FROM nutrients WHERE code = 'vit_d'), 15, 100);

SELECT * FROM rda_values;


-- Insert Sample Foods and Nutrients per 100g (Run this third)
INSERT INTO foods (name, category, default_unit, grams_per_unit) VALUES
('Rice, raw, polished, white', 'Grain', 'g', 1),
('Toor Dal (Pigeon Pea), raw', 'Pulse', 'g', 1),
('Milk, Cow, Pasteurized', 'Dairy', 'ml', 1),
('Curd/Yogurt, plain', 'Dairy', 'dairy', 100),
('Spinach (Palak), raw leaves', 'Vegetable', 'g', 1);

-- Rice (100g)
INSERT INTO food_nutrients (food_id, nutrient_id, amount_per_100g) VALUES
((SELECT id FROM foods WHERE name LIKE 'Rice%'), (SELECT id FROM nutrients WHERE code = 'energy_kcal'), 345),
((SELECT id FROM foods WHERE name LIKE 'Rice%'), (SELECT id FROM nutrients WHERE code = 'protein'), 6.8),
((SELECT id FROM foods WHERE name LIKE 'Rice%'), (SELECT id FROM nutrients WHERE code = 'carbohydrates'), 77.0),
((SELECT id FROM foods WHERE name LIKE 'Rice%'), (SELECT id FROM nutrients WHERE code = 'sodium'), 5);

-- Toor Dal (100g)
INSERT INTO food_nutrients (food_id, nutrient_id, amount_per_100g) VALUES
((SELECT id FROM foods WHERE name LIKE 'Toor Dal%'), (SELECT id FROM nutrients WHERE code = 'energy_kcal'), 335),
((SELECT id FROM foods WHERE name LIKE 'Toor Dal%'), (SELECT id FROM nutrients WHERE code = 'protein'), 22.0),
((SELECT id FROM foods WHERE name LIKE 'Toor Dal%'), (SELECT id FROM nutrients WHERE code = 'fiber'), 15.0),
((SELECT id FROM foods WHERE name LIKE 'Toor Dal%'), (SELECT id FROM nutrients WHERE code = 'iron'), 5.0);

-- Cow Milk (100ml / 103g)
INSERT INTO food_nutrients (food_id, nutrient_id, amount_per_100g) VALUES
((SELECT id FROM foods WHERE name LIKE 'Milk%'), (SELECT id FROM nutrients WHERE code = 'energy_kcal'), 61),
((SELECT id FROM foods WHERE name LIKE 'Milk%'), (SELECT id FROM nutrients WHERE code = 'protein'), 3.2),
((SELECT id FROM foods WHERE name LIKE 'Milk%'), (SELECT id FROM nutrients WHERE code = 'calcium'), 113),
((SELECT id FROM foods WHERE name LIKE 'Milk%'), (SELECT id FROM nutrients WHERE code = 'vit_b12'), 0.4);

-- Spinach (100g)
INSERT INTO food_nutrients (food_id, nutrient_id, amount_per_100g) VALUES
((SELECT id FROM foods WHERE name LIKE 'Spinach%'), (SELECT id FROM nutrients WHERE code = 'energy_kcal'), 23),
((SELECT id FROM foods WHERE name LIKE 'Spinach%'), (SELECT id FROM nutrients WHERE code = 'iron'), 2.7),
((SELECT id FROM foods WHERE name LIKE 'Spinach%'), (SELECT id FROM nutrients WHERE code = 'vit_a'), 9377);

SELECT * FROM food_nutrients;