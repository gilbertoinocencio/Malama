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
// --dry-run: só processa e mostra estatísticas de chunking/limpeza — não toca
// no banco nem chama a API de embeddings (custo zero, pré-visualização)
const dryRun = process.argv.includes('--dry-run');

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

// ── Limpeza e chunking ─────────────────────────────────────────────────────
// PDFs científicos extraídos com pdf-parse vêm com muito lixo (referências,
// agradecimentos, cabeçalhos/rodapés, formulários) e parágrafos gigantes sem
// \n\n. O pipeline abaixo saneia o texto, corta a seção de referências,
// quebra em chunks de ~1000 chars (dividindo por sentença quando o parágrafo
// é maior) e descarta chunks que são lixo por heurística.

function limparTexto(text) {
    return text
        // bytes nulos/controle quebram o INSERT no Postgres ("unsupported
        // Unicode escape sequence") e não carregam conteúdo
        .replace(/\x00/g, '')
        // eslint-disable-next-line no-control-regex
        .replace(/[\x01-\x08\x0b\x0c\x0e-\x1f]/g, ' ')
        // hifenização de fim de linha do PDF: "trei-\nno" → "treino"
        .replace(/(\w)-\n(\w)/g, '$1$2')
        // espaços múltiplos (mantém \n para o split de parágrafos)
        .replace(/[ \t]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n');
}

// Corta tudo a partir da seção de referências/bibliografia — em papers, é de
// longe a maior fonte de chunks-lixo. Só corta se o marcador aparecer depois
// da metade do texto (títulos como "references" no meio do corpo não cortam).
function cortarReferencias(text) {
    const marcadores = /\n\s*(references|bibliography|referências|literature cited|works cited)\s*\n/i;
    const m = text.match(marcadores);
    if (m && m.index > text.length * 0.5) {
        return text.slice(0, m.index);
    }
    return text;
}

// Heurísticas de lixo: densidade de citações bibliográficas, seções de
// financiamento/agradecimento/ética, e texto com pouca letra (tabelas cruas).
function ehChunkLixo(chunk) {
    const len = chunk.length;
    if (len < 200) return true; // curto demais para ter valor no RAG

    // proporção de caracteres alfabéticos (tabelas viram sopa de números)
    const alfa = (chunk.match(/[a-zA-ZÀ-ÿ]/g) || []).length / len;
    if (alfa < 0.55) return true;

    // densidade de citação: "Fulano, A.B.," + anos entre 1900-2029
    const anos = (chunk.match(/\b(19|20)\d{2}\b/g) || []).length;
    const etAl = (chunk.match(/\bet al\.?/gi) || []).length;
    const iniciais = (chunk.match(/[A-Z]\.\s?[A-Z]?\.?,/g) || []).length;
    if ((anos + etAl + iniciais) / (len / 1000) > 12) return true;

    // seções administrativas de papers
    const admin = /(supported by|funding|grant number|acknowledg|conflict of interest|ethics approval|application form|approved by [A-Z]|copyright ©|all rights reserved|creative commons|downloaded from)/i;
    const hits = (chunk.match(new RegExp(admin.source, 'gi')) || []).length;
    if (hits >= 2) return true;
    if (hits === 1 && len < 600) return true;

    return false;
}

// Divide um texto longo por sentenças, agrupando até maxChars.
function dividirPorSentencas(text, maxChars) {
    const sentencas = text.split(/(?<=[.!?])\s+(?=[A-ZÀ-Ý0-9])/);
    const partes = [];
    let atual = '';
    for (const s of sentencas) {
        if ((atual.length + s.length) > maxChars && atual.length > 0) {
            partes.push(atual.trim());
            atual = '';
        }
        // sentença sozinha maior que o teto (sem pontuação, ex. tabela):
        // corta duro para não estourar o limite de tokens do embedding
        if (s.length > maxChars) {
            for (let i = 0; i < s.length; i += maxChars) {
                partes.push(s.slice(i, i + maxChars).trim());
            }
            continue;
        }
        atual += s + ' ';
    }
    if (atual.trim().length > 0) partes.push(atual.trim());
    return partes;
}

function chunkText(text, maxChars = 1000) {
    const paragraphs = text.split('\n\n');
    const chunks = [];
    let currentChunk = "";

    const fechar = () => {
        if (currentChunk.trim().length > 0) chunks.push(currentChunk.trim());
        currentChunk = "";
    };

    for (const p of paragraphs) {
        // parágrafo maior que o teto: fecha o atual e divide por sentenças
        // (era o bug antigo — parágrafos de 11 mil chars viravam 1 chunk só)
        if (p.length > maxChars) {
            fechar();
            chunks.push(...dividirPorSentencas(p, maxChars));
            continue;
        }
        if ((currentChunk.length + p.length) > maxChars && currentChunk.length > 0) {
            fechar();
        }
        currentChunk += p + "\n\n";
    }
    fechar();

    return chunks.filter((c) => !ehChunkLixo(c));
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
    const chunks = chunkText(cortarReferencias(limparTexto(content)));

    if (dryRun) {
        const lens = chunks.map((c) => c.length);
        const media = lens.length ? Math.round(lens.reduce((a, b) => a + b, 0) / lens.length) : 0;
        console.log(`  [dry-run] ${chunks.length} chunks | len média ${media} | max ${lens.length ? Math.max(...lens) : 0}`);
        return chunks.length;
    }
    
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
            // respiro anti rate-limit (aprendido no incidente de 21/07: o
            // burst de inserts gravou vetores desalinhados; ver fix-embeddings.mjs)
            await new Promise((r) => setTimeout(r, 120));
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
    if (resetBase && !dryRun) {
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
    
    console.log(dryRun ? "Dry-run complete (nada gravado)." : "Sync complete!");
    if (dryRun) return;

    // Validação pós-sync (lição do incidente de 21/07: vetores gravados que
    // não correspondiam ao próprio content). Amostra 3 linhas e confere que
    // re-embeddar o content dá cosseno ~1.0 com o vetor armazenado.
    const cos = (a, b) => {
        let d = 0, na = 0, nb = 0;
        for (let i = 0; i < a.length; i++) { d += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
        return d / (Math.sqrt(na) * Math.sqrt(nb));
    };
    const { data: amostra } = await supabase
        .from('nutrition_guidelines').select('content, embedding').limit(3);
    console.log("Validação (cos stored vs fresh; esperado ~1.0):");
    let suspeito = false;
    for (const row of amostra || []) {
        const stored = typeof row.embedding === 'string' ? JSON.parse(row.embedding) : row.embedding;
        const fresh = await embedText(row.content);
        const c = cos(stored, fresh);
        if (c < 0.98) suspeito = true;
        console.log(`  cos = ${c.toFixed(4)}`);
    }
    if (suspeito) {
        console.error("⚠️  VETORES DESALINHADOS — rode scripts/fix-embeddings.mjs antes de usar o RAG!");
        process.exit(2);
    }
}

main();
