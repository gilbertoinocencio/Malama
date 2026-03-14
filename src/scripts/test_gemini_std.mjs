import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.error("❌ API Key not found");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);


async function test() {
    console.log("📡 Connecting with @google/generative-ai...");

    const models = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro", "gemini-1.0-pro-latest"];

    for (const modelName of models) {
        console.log(`\n🧪 Testing model: ${modelName}`);
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent("Hello.");
            const response = await result.response;
            console.log(`✅ Success (${modelName}):`, response.text().slice(0, 50));
            return; // Exit on first success
        } catch (e) {
            console.error(`❌ Failed (${modelName}):`, e.message || e);
            if (e.response) console.error("Response:", e.response);
        }
    }
}

