// import { analyzeTextLog } from '../services/geminiService'; // Moved to dynamic import
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env.local from project root
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const testGemini = async () => {
    console.log('🧪 Testing Gemini 1.5 Flash Integration...');

    if (!process.env.VITE_GOOGLE_API_KEY && !process.env.API_KEY) {
        console.error('❌ Error: API_KEY or VITE_GOOGLE_API_KEY not found in environment.');
        // Check if we can use the one from source for testing purposes if env is missing
        // or just warn user
        return;
    }

    // Hack: The service file expects API_KEY, but Vite uses VITE_GOOGLE_API_KEY usually. 
    // ensure process.env.API_KEY is populated if service uses it.
    if (process.env.VITE_GOOGLE_API_KEY && !process.env.API_KEY) {
        process.env.API_KEY = process.env.VITE_GOOGLE_API_KEY;
    }

    // If env vars are still missing, try to read from local file directly or ask user
    // For now, let's try to see if we can just pass it directly if we knew it, but we don't.
    // Let's print what we have
    console.log('API Key present:', !!process.env.API_KEY);
    console.log('VITE API Key present:', !!process.env.VITE_GOOGLE_API_KEY);

    try {
        const testPrompt = "Apple, 1 medium";
        console.log(`📤 Sending prompt: "${testPrompt}"`);

        // Dynamic import to ensure env is set before module load
        const { analyzeTextLog } = await import('../services/geminiService');

        const result = await analyzeTextLog(testPrompt);

        console.log('✅ Response received:');
        console.log(JSON.stringify(result, null, 2));
        console.log('✨ Gemini Service is working correctly!');
    } catch (error) {
        console.error('❌ Error testing Gemini:', error);
    }
};

testGemini();
