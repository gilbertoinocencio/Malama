# Malama

Plataforma de saúde, nutrição e acompanhamento clínico com aplicativos web,
Android e iOS.

## Inteligência artificial

O Caramel é o cérebro principal de todas as funcionalidades generativas:

- `caramelo-baixinho`: tarefas rápidas, como análise textual de refeições e check-ins;
- `caramelo-auto`: conversa nutricional, imagens e sugestões;
- `caramelo-fenomeno`: planos e relatórios clínicos complexos;
- `caramelo-embed`: busca semântica e RAG.

As Edge Functions clínicas usam Claude somente como fallback técnico quando o
Caramel estiver indisponível. O aplicativo não expõe chaves de modelos no frontend:
as chamadas passam pelas Edge Functions do Supabase.

O BodyScan principal funciona localmente com MediaPipe e cálculos antropométricos,
mantendo as imagens no dispositivo durante a análise de pose.

## Stack

- React 19, TypeScript e Vite;
- Tailwind CSS e Framer Motion;
- Capacitor para Android e iOS;
- Supabase para PostgreSQL, autenticação, storage e Edge Functions;
- Caramel para geração e embeddings;
- MediaPipe para o BodyScan local.

## Configuração local

Requisitos: Node.js 20 ou superior, npm e um projeto Supabase.

```bash
npm install
Copy-Item .env.example .env.local
npm run dev
```

As variáveis públicas do frontend são:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon
```

Os segredos dos provedores devem existir somente no Supabase:

```bash
supabase secrets set CARAMELO_API_URL=... CARAMELO_API_KEY=...
supabase secrets set ANTHROPIC_API_KEY=... # fallback clínico opcional
```

## Comandos

```bash
npm run typecheck
npm run build
npm run build:android
npm run build:ios
```

Produção web: [soumalama.com.br](https://www.soumalama.com.br)
