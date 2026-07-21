import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { createRequire } from 'module';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
// We need the SERVICE ROLE KEY ideally to bypass RLS, but ANON KEY might work if RLS is disabled on the table.
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

// Embeddings agora via API Caramel (Qwen3-Embedding). ATENÇÃO: os vetores do
// Qwen NÃO são comparáveis com os do Gemini mesmo em 768 dims — esta é uma
// re-embed COMPLETA. Rode com --reset para limpar a base antes (recomendado).
const carameloApiUrl = process.env.CARAMELO_API_URL;
const carameloApiKey = process.env.CARAMELO_API_KEY;
const resetBase = process.argv.includes('--reset');

if (!supabaseUrl || !supabaseKey || !carameloApiUrl || !carameloApiKey) {
    console.error("Faltam variáveis: SUPABASE_* e CARAMELO_API_URL/CARAMELO_API_KEY. Cheque .env.local.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const EMBEDDING_MODEL = 'caramelo-embed';
const EMBEDDING_DIMENSIONS = 768;

async function embedText(text) {
    const res = await fetch(`${carameloApiUrl}/v1/embeddings`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${carameloApiKey}`,
        },
        body: JSON.stringify({
            model: EMBEDDING_MODEL,
            input: text,
            dimensions: EMBEDDING_DIMENSIONS,
        }),
    });
    const data = await res.json();
    if (!res.ok) {
        throw new Error(data.error?.message || `HTTP ${res.status}`);
    }
    return data.data[0].embedding;
}

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
    const fileName = path.basename(filePath);
    const ext = path.extname(filePath).toLowerCase();
    
    let content = '';
    
    // Handle different file types
    if (ext === '.pdf') {
        try {
            const require = createRequire(import.meta.url);
            const pdfParse = require('pdf-parse');
            const dataBuffer = fs.readFileSync(filePath);
            const pdfData = await pdfParse(dataBuffer);
            content = pdfData.text;
        } catch (err) {
            console.error(`Failed to parse PDF ${fileName}:`, err.message);
            console.log('  → Install pdf-parse: npm install pdf-parse');
            return;
        }
    } else {
        content = fs.readFileSync(filePath, 'utf-8');
    }
    
    // Skip empty files
    if (!content.trim()) return;

    console.log(`Processing ${fileName}...`);
    const chunks = chunkText(content);
    
    for (let i = 0; i < chunks.length; i++) {
        const chunkContent = chunks[i];
        
        try {
            // Generate embedding
            const embedding = await embedText(chunkContent);

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

    // Re-embed limpo: remove os vetores antigos (Gemini) antes de regravar com
    // Qwen. Sem isso, os .insert abaixo DUPLICAM as linhas.
    if (resetBase) {
        console.log("🧹 --reset: limpando nutrition_guidelines...");
        const { error } = await supabase
            .from('nutrition_guidelines')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // apaga tudo
        if (error) {
            console.error("Erro ao limpar a base:", error.message);
            process.exit(1);
        }
        console.log("✅ Base limpa.");
    } else {
        console.warn("⚠️  Rodando SEM --reset: as linhas serão adicionadas (pode duplicar). Use --reset para re-embed limpo.");
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
