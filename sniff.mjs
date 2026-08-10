// Escuta passiva do canal de sinalização da consulta.
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';

const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf8').split('\n')
    .filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);

const ROOM = process.argv[2];
const c = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
await c.auth.signInWithPassword({ email: 'charli@n.com', password: '12345678' });

const t0 = Date.now();
const ts = () => `${((Date.now() - t0) / 1000).toFixed(1)}s`;
const count = { doctor: {}, patient: {} };

c.channel(`webrtc:${ROOM}`, { config: { broadcast: { self: false } } })
  .on('broadcast', { event: 'signal' }, ({ payload }) => {
    const from = payload.from ?? '?';
    const type = payload.type ?? '?';
    count[from] = count[from] || {};
    count[from][type] = (count[from][type] || 0) + 1;
    if (type === 'ice-candidate') {
      const cand = payload.candidate?.candidate ?? '';
      const kind = /typ (\w+)/.exec(cand)?.[1] ?? 'end';
      if (count[from][type] <= 6) console.log(`${ts()}  ${from.padEnd(7)} ice-candidate  typ=${kind}`);
    } else {
      console.log(`${ts()}  ${from.padEnd(7)} ${type}`);
    }
  })
  .subscribe((s) => console.log(`${ts()}  [sniffer] canal: ${s} — sala ${ROOM}`));

setTimeout(() => {
  console.log('\n===== RESUMO =====');
  for (const side of ['doctor', 'patient']) {
    const e = count[side] || {};
    const total = Object.entries(e).map(([k, v]) => `${k}=${v}`).join(' ') || 'NADA';
    console.log(`${side.padEnd(8)}: ${total}`);
  }
  process.exit(0);
}, 150000);
