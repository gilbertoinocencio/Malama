// =====================================================
// NURA — Edge Function: gemini-proxy
// Roteia as chamadas de LLM para a API Caramel (endpoint OpenAI-compatible),
// com FALLBACK para o Gemini em caso de falha/timeout. Mantém o CONTRATO
// Gemini-shaped de entrada/saída para o frontend (src/lib/geminiProxy.ts e os
// services que já dependem dele NÃO mudam).
//
// POST { action, model, generationConfig?, contents?, content? }
//   generateContent → { candidates, text, provider }
//   embedContent    → { embedding: { values }, provider }
// =====================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const GEMINI_API_KEY   = Deno.env.get('GEMINI_API_KEY')!;
const GEMINI_BASE      = 'https://generativelanguage.googleapis.com/v1beta/models';

const CARAMELO_API_URL = Deno.env.get('CARAMELO_API_URL') ?? '';
const CARAMELO_API_KEY = Deno.env.get('CARAMELO_API_KEY') ?? '';
// Free tier do Render dorme e acorda em ~50-60s; timeout curto viraria fallback
// permanente no 1º request após ociosidade.
const CARAMELO_TIMEOUT_MS = 60_000;

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

// ── Tradução Gemini → OpenAI ────────────────────────────────────────────────

// contents Gemini (parts com text/inlineData) → messages OpenAI (content
// string ou array multimodal com image_url data-URI).
function contentsParaMessages(contents: any[]): any[] {
  return (contents || []).map((c: any) => {
    const role = c.role === 'model' ? 'assistant' : (c.role || 'user');
    const parts: any[] = c.parts || [];
    const temImagem = parts.some((p: any) => p.inlineData);

    if (!temImagem) {
      const texto = parts.map((p: any) => p.text || '').join('');
      return { role, content: texto };
    }
    // Multimodal: mistura texto e imagens em partes OpenAI
    const openaiParts = parts.map((p: any) => {
      if (p.inlineData) {
        const { mimeType, data } = p.inlineData;
        return { type: 'image_url', image_url: { url: `data:${mimeType};base64,${data}` } };
      }
      return { type: 'text', text: p.text || '' };
    });
    return { role, content: openaiParts };
  });
}

// generationConfig Gemini → params OpenAI. responseSchema não tem equivalente
// confiável no SiliconFlow: vira instrução textual anexada à última msg user.
function aplicarGenerationConfig(
  messages: any[],
  generationConfig: any,
): { response_format?: any; temperature?: number; max_tokens?: number } {
  const extra: any = {};
  if (!generationConfig) return extra;

  if (generationConfig.responseMimeType === 'application/json') {
    extra.response_format = { type: 'json_object' };
  }
  if (typeof generationConfig.temperature === 'number') {
    extra.temperature = generationConfig.temperature;
  }
  if (typeof generationConfig.maxOutputTokens === 'number') {
    extra.max_tokens = generationConfig.maxOutputTokens;
  }
  // thinkingConfig é descartado (sem análogo).

  if (generationConfig.responseSchema) {
    const instrucao =
      '\n\nResponda APENAS com JSON válido, sem texto ao redor, obedecendo exatamente este schema: ' +
      JSON.stringify(generationConfig.responseSchema);
    // anexa à última mensagem de usuário
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        if (typeof messages[i].content === 'string') {
          messages[i].content += instrucao;
        } else if (Array.isArray(messages[i].content)) {
          messages[i].content.push({ type: 'text', text: instrucao });
        }
        break;
      }
    }
  }
  return extra;
}

// Resposta OpenAI → shape Gemini que o adaptador espera ({ candidates, text }).
function respostaOpenAIParaGemini(data: any): { candidates: any[]; text: string } {
  const text = data?.choices?.[0]?.message?.content ?? '';
  return {
    candidates: [{ content: { parts: [{ text }] } }],
    text,
  };
}

// ── Chamadas ────────────────────────────────────────────────────────────────

async function chamarCaramelo(contents: any[], generationConfig: any): Promise<any> {
  const messages = contentsParaMessages(contents);
  const extra = aplicarGenerationConfig(messages, generationConfig);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CARAMELO_TIMEOUT_MS);
  try {
    const res = await fetch(`${CARAMELO_API_URL}/v1/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${CARAMELO_API_KEY}`,
      },
      body: JSON.stringify({ model: 'caramelo-auto', messages, ...extra }),
    });
    if (!res.ok) throw new Error(`Caramel HTTP ${res.status}: ${await res.text()}`);
    return respostaOpenAIParaGemini(await res.json());
  } finally {
    clearTimeout(timer);
  }
}

// Fallback: código Gemini original, preservado.
async function chamarGemini(model: string, contents: any[], generationConfig: any): Promise<any> {
  const reqBody: Record<string, unknown> = { contents };
  if (generationConfig) reqBody.generationConfig = generationConfig;

  const res = await fetch(`${GEMINI_BASE}/${model}:generateContent?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reqBody),
  });
  if (!res.ok) throw new Error(`Gemini HTTP ${res.status}: ${await res.text()}`);

  const geminiData = await res.json();
  const candidates: any[] = geminiData.candidates || [];
  const allParts: any[] = candidates[0]?.content?.parts || [];
  const responseParts = allParts.filter((p: any) => !p.thought && typeof p.text === 'string');
  const text = responseParts.length > 0
    ? responseParts.map((p: any) => p.text as string).join('')
    : allParts.map((p: any) => p.text || '').join('');
  return { candidates, text };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  // ── Auth (inalterada: exige usuário logado do Malama) ─────────────
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return json({ error: 'Unauthorized' }, 401);
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return json({ error: 'Unauthorized' }, 401);

  try {
    const body = await req.json();
    const { action, model, generationConfig, contents, content } = body;
    if (!model) return json({ error: 'model is required' }, 400);

    // ── generateContent (texto, chat, visão) ─────────
    if (action === 'generateContent') {
      if (!contents) return json({ error: 'contents is required for generateContent' }, 400);

      try {
        const data = await chamarCaramelo(contents, generationConfig);
        return json({ ...data, provider: 'caramel' });
      } catch (caramelErr) {
        console.warn('⚠️ Caramel falhou, fallback Gemini:', String(caramelErr));
        try {
          const data = await chamarGemini(model, contents, generationConfig);
          return json({ ...data, provider: 'gemini' });
        } catch (geminiErr) {
          console.error('❌ Ambos falharam (generateContent):', String(geminiErr));
          return json({ error: 'Nenhum provedor de LLM disponível' }, 502);
        }
      }
    }

    // ── embedContent (SEM fallback Gemini: vetores incompatíveis) ────
    if (action === 'embedContent') {
      if (!content) return json({ error: 'content is required for embedContent' }, 400);

      try {
        const res = await fetch(`${CARAMELO_API_URL}/v1/embeddings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${CARAMELO_API_KEY}`,
          },
          body: JSON.stringify({ model: 'caramelo-embed', input: content, dimensions: 768 }),
        });
        if (!res.ok) throw new Error(`Caramel embeddings HTTP ${res.status}: ${await res.text()}`);
        const data = await res.json();
        const values = data?.data?.[0]?.embedding;
        if (!Array.isArray(values)) throw new Error('embeddings sem vetor');
        // Shape Gemini que o adaptador espera: { embedding: { values } }
        return json({ embedding: { values }, provider: 'caramel' });
      } catch (embedErr) {
        // Falha FECHADA: retornar vetor Gemini contra base re-embeddada com Qwen
        // produziria similaridades sem sentido. Os services degradam para [].
        console.error('❌ Caramel embeddings falhou (sem fallback):', String(embedErr));
        return json({ error: 'Embeddings indisponível' }, 502);
      }
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (err) {
    console.error('gemini-proxy unhandled error:', err);
    return json({ error: 'Internal error' }, 500);
  }
});
