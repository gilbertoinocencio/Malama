// Dispara manualmente a Edge Function generate-empirical-cases
// (a mesma que o pg_cron roda todo dia 1º do mês).
// Toda a lógica vive em supabase/functions/generate-empirical-cases/index.ts.
//
// Usage: npm run rag:casos

import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
    console.error('Missing env vars: need VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
    process.exit(1);
}

const res = await fetch(`${supabaseUrl}/functions/v1/generate-empirical-cases`, {
    method: 'POST',
    headers: {
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
    },
    body: '{}',
});

const data = await res.json();
if (!res.ok) {
    console.error('Failed:', res.status, data);
    process.exit(1);
}

console.log('Planos com desfecho mensurável:', data.measurable_outcomes);
console.log('Casos gerados/atualizados:', data.generated);
if (data.skipped?.length) console.log('Coortes puladas (k-anonimato):', data.skipped.join('; '));
if (data.errors?.length) console.error('Erros:', data.errors.join('; '));
