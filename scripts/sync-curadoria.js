import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
// We need the SERVICE ROLE KEY ideally to bypass RLS, but ANON KEY might work if RLS is disabled on the table.
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const geminiApiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

if (!supabaseUrl || !supabaseKey || !geminiApiKey) {
    console.error("Missing required environment variables. Please check .env or .env.local.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const genAI = new GoogleGenerativeAI(geminiApiKey);
// Using text-embedding-004 as it is standard and outputs 768 dimensions
const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const curadoriaDir = path.join(__dirname, '..', 'Curadoria');

// Helper to chunk text
function chunkText(text, maxChars = 1000) {
    const paragraphs = text.split('\n\n');
    const chunks = [];
    let currentChunk = "";

    for (const p of paragraphs) {
        if ((currentChunk.length + p.length) > maxChars && currentChunk.length > 0) {
            chunks.push(currentChunk.trim());
            currentChunk = "";
        }
        currentChunk += p + "\n\n";
    }
    if (currentChunk.trim().length > 0) {
        chunks.push(currentChunk.trim());
    }
    return chunks;
}

// Function to process a single file
async function processFile(filePath, category) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const fileName = path.basename(filePath);
    
    // Skip empty files
    if (!content.trim()) return;

    console.log(`Processing ${fileName}...`);
    const chunks = chunkText(content);
    
    for (let i = 0; i < chunks.length; i++) {
        const chunkContent = chunks[i];
        
        try {
            // Generate embedding
            const result = await embeddingModel.embedContent(chunkContent);
            const embedding = result.embedding.values;

            // Upsert into Supabase
            const { error } = await supabase
                .from('nutrition_guidelines')
                .insert({
                    title: fileName.replace(/\.[^/.]+$/, ""), // remove extension
                    content: chunkContent,
                    category: category,
                    source_file: fileName,
                    embedding: embedding
                });

            if (error) {
                console.error(`Error inserting chunk ${i+1} of ${fileName}:`, error.message);
            } else {
                console.log(`- Inserted chunk ${i+1}/${chunks.length} of ${fileName}`);
            }
        } catch (err) {
            console.error(`Failed to embed chunk ${i+1} of ${fileName}:`, err.message);
        }
    }
}

// Main execution function
async function main() {
    if (!fs.existsSync(curadoriaDir)) {
        console.log("Curadoria directory not found.");
        return;
    }

    const categories = fs.readdirSync(curadoriaDir);
    
    for (const category of categories) {
        const categoryPath = path.join(curadoriaDir, category);
        if (fs.statSync(categoryPath).isDirectory()) {
            const files = fs.readdirSync(categoryPath);
            for (const file of files) {
                const filePath = path.join(categoryPath, file);
                if (fs.statSync(filePath).isFile()) {
                    await processFile(filePath, category);
                }
            }
        }
    }
    
    console.log("Sync complete!");
}

main();
