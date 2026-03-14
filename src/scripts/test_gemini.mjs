import { GoogleGenAI } from "@google/genai";
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.error("❌ API Key not found");
    process.exit(1);
}

console.log("🔑 API Key found, length:", apiKey.length);

const ai = new GoogleGenAI({ apiKey });

async function test() {
    console.log("-----------------------------------------");
    console.log("📡 Testing: gemini-1.5-flash");
    try {
        const response = await ai.models.generateContent({
            model: "gemini-1.5-flash",
            contents: "Hello."
        });
        console.log("✅ Success 1.5-flash:", response.text ? response.text.slice(0, 50) : "No text");
    } catch (e) {
        console.error("❌ Failed 1.5-flash:", e.status, e.message);
        if (e.body) console.error("Body:", e.body);
    }

    console.log("-----------------------------------------");
    console.log("📡 Testing: gemini-1.5-flash-001");
    try {
        const response = await ai.models.generateContent({
            model: "gemini-1.5-flash-001",
            contents: "Hello."
        });
        console.log("✅ Success 1.5-flash-001:", response.text ? response.text.slice(0, 50) : "No text");
    } catch (e) {
        console.error("❌ Failed 1.5-flash-001:", e.status, e.message);
    }
}

test();
