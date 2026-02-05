import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error('No API key found in .env');
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

import fs from 'fs';

async function listModels() {
    try {
        // Does not seem to be exposed cleanly in new node SDK, but let's try a direct fetch if SDK fails
        // Actually, just try a few known ones
        const logStream = fs.createWriteStream('model_test_output.txt');

        const fetch = (await import('node-fetch')).default || global.fetch; // Use native if available

        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        const resp = await fetch(url);
        const data = await resp.json();

        logStream.write(`List Models Response:\n${JSON.stringify(data, null, 2)}\n`);
        console.log('Listed models to file.');
        process.exit(0);
    } catch (err) {
        console.error('Fatal:', err);
    }
}

listModels();
