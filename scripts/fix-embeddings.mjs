// Corrige os embeddings de nutrition_guidelines: re-gera cada vetor a partir
// do content JÁ gravado e faz UPDATE (o insert em lote do sync deixou vetores
// desalinhados com o content). Idempotente — pode rodar quantas vezes precisar.
//
// Uso: node scripts/fix-embeddings.mjs

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const URL = process.env.CARAMELO_API_URL;
const KEY = process.env.CARAMELO_API_KEY;

async function embed(text) {
  const r = await fetch(`${URL}/v1/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({ model: 'caramelo-embed', input: text, dimensions: 768 }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(JSON.stringify(j).slice(0, 200));
  return j.data[0].embedding;
}

function cos(a, b) {
  let d = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { d += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return d / (Math.sqrt(na) * Math.sqrt(nb));
}

const { data: rows, error } = await sb
  .from('nutrition_guidelines')
  .select('id, content');
if (error) { console.error('erro ao ler:', error.message); process.exit(1); }

console.log(`Corrigindo ${rows.length} embeddings...`);
let ok = 0, skip = 0, fail = 0;

for (let i = 0; i < rows.length; i++) {
  const row = rows[i];
  if (!row.content || !row.content.trim()) { skip++; continue; }
  try {
    const vec = await embed(row.content);
    const { error: upErr } = await sb
      .from('nutrition_guidelines')
      .update({ embedding: vec })
      .eq('id', row.id);
    if (upErr) { console.error(`  update falhou id ${row.id}: ${upErr.message}`); fail++; continue; }
    ok++;
    if ((i + 1) % 25 === 0) console.log(`  ${i + 1}/${rows.length}...`);
    await new Promise((r) => setTimeout(r, 120)); // respiro anti rate-limit
  } catch (e) {
    console.error(`  embed falhou id ${row.id}: ${e.message}`);
    fail++;
  }
}

console.log(`\nConcluído: ${ok} corrigidos, ${skip} pulados (vazios), ${fail} falhas.`);

// Verificação rápida: pega 3 linhas e confere o cosseno stored-vs-fresh
const { data: check } = await sb.from('nutrition_guidelines').select('content, embedding').limit(3);
console.log('\nVerificação (deve dar ~1.0):');
for (const r of check) {
  if (!r.content?.trim()) continue;
  const stored = typeof r.embedding === 'string' ? JSON.parse(r.embedding) : r.embedding;
  const fresh = await embed(r.content);
  console.log(`  cos(stored,fresh) = ${cos(stored, fresh).toFixed(4)}`);
}
