import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
dotenv.config();

const genAI = process.env.GEMINI_API_KEY
    ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    : null;

export async function parseMealDescription(text) {
    if (!genAI) {
        throw new Error("GEMINI_API_KEY is not set in backend .env");
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `
  You are a nutrition assistant. Parse the following meal description into a JSON list of food items.
  For each item:
  1. Identify the food name (be specific, e.g. "cooked rice" instead of "rice").
  2. Estimate the quantity in grams. If the user specifies units like "cup" or "bow", convert to grams using standard density.
  3. Provide a confidence level ("high", "medium", "low").

  Return ONLY valid JSON array. No markdown formatting.
  
  Example input: "I ate a large bowl of oatmeal and a banana"
  Example output:
  [
    { "food_name": "Oatmeal, cooked", "quantity_g": 350, "confidence": "medium" },
    { "food_name": "Banana, raw", "quantity_g": 118, "confidence": "high" }
  ]

  Description: "${text}"
  `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let jsonStr = response.text();
        // Clean markdown code blocks if present
        jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();

        return JSON.parse(jsonStr);
    } catch (err) {
        console.error("AI Parse Error:", err);
        throw new Error("Failed to parse meal with AI");
    }
}

export async function estimateNutrients(foodName) {
    if (!genAI) return null;

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const prompt = `
    Estimate the nutrient values for 100g of RAW "${foodName}".
    Return a single JSON object with these exact keys (values in numbers):
    - energy_kcal
    - protein (g)
    - fat_total (g)
    - carbohydrates (g)
    - fiber (g)
    - sodium (mg)
    - calcium (mg)
    - iron (mg)
    - potassium (mg)
    - vit_a (mcg)
    - vit_c (mg)
    - vit_d (mcg)
    - vit_b12 (mcg)

    If a value is negligible, use 0. Return ONLY JSON.
  `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(text);
    } catch (err) {
        console.error("AI Estimate Error:", err);
        return null;
    }
}

export async function findOrEstimateFood(query, existingFoods) {
    if (!genAI) throw new Error("AI not configured");
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // Limit context to prevent token overflow if list is huge (e.g. top 200 matches or all if small)
    // For now we pass all
    const prompt = `
    User is searching for food ingredient: "${query}".
    Here is a list of existing foods in our database:
    ${JSON.stringify(existingFoods)}

    Task:
    1. Check if "${query}" is a synonym or close match for any existing food (e.g. "ground nut" == "Peanuts", "bhindi" == "Ladies Finger").
    2. If MATCH found, return JSON: { "action": "match", "existing_food_name": "Exact Name From List" }
    3. If NO match, I need you to estimate nutrients for it to create a new entry. return JSON: { "action": "create", "new_food_name": "Capitalized Name", "nutrients": { ...energy_kcal, protein, fat_total, carbohydrates, fiber... } }

    Return ONLY JSON.
    `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(text);
    } catch (err) {
        console.error("AI Match Error:", err);
        throw new Error("AI processing failed");
    }
}
