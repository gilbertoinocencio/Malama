// =====================================================
// NURA — Edge Function: gemini-proxy
// Protects the Gemini API key server-side.
// All frontend Gemini calls route through here.
// POST { action, model, generationConfig?, contents?, content? }
// =====================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const GEMINI_API_KEY   = Deno.env.get('GEMINI_API_KEY')!;
const GEMINI_BASE      = 'https://generativelanguage.googleapis.com/v1beta/models';

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

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  // ── Auth ──────────────────────────────────────────
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return json({ error: 'Unauthorized' }, 401);

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return json({ error: 'Unauthorized' }, 401);

  // ── Dispatch ─────────────────────────────────────
  try {
    const body = await req.json();
    const { action, model, generationConfig, contents, content } = body;

    if (!model) return json({ error: 'model is required' }, 400);

    // ── generateContent (text, chat, vision) ─────────
    if (action === 'generateContent') {
      if (!contents) return json({ error: 'contents is required for generateContent' }, 400);

      const reqBody: Record<string, unknown> = { contents };
      if (generationConfig) reqBody.generationConfig = generationConfig;

      const res = await fetch(
        `${GEMINI_BASE}/${model}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(reqBody),
        }
      );

      if (!res.ok) {
        const err = await res.text();
        console.error('Gemini generateContent error:', err);
        return json({ error: 'Gemini API error', details: err }, 502);
      }

      const geminiData = await res.json();
      const candidates: any[] = geminiData.candidates || [];
      const allParts: any[] = candidates[0]?.content?.parts || [];

      // Filter out thought parts (gemini-2.5-flash extended thinking)
      const responseParts = allParts.filter((p: any) => !p.thought && typeof p.text === 'string');
      const text = responseParts.length > 0
        ? responseParts.map((p: any) => p.text as string).join('')
        : allParts.map((p: any) => p.text || '').join('');

      return json({ candidates, text });
    }

    // ── embedContent ─────────────────────────────────
    if (action === 'embedContent') {
      if (!content) return json({ error: 'content is required for embedContent' }, 400);

      // gemini-embedding-001 defaults to 3072 dims; truncate to 768 to match
      // the nutrition_guidelines.embedding column (vector(768)).
      const res = await fetch(
        `${GEMINI_BASE}/${model}:embedContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: `models/${model}`,
            content: { parts: [{ text: content }] },
            outputDimensionality: 768,
          }),
        }
      );

      if (!res.ok) {
        const err = await res.text();
        console.error('Gemini embedContent error:', err);
        return json({ error: 'Gemini embed error', details: err }, 502);
      }

      const embedData = await res.json();
      return json({ embedding: embedData.embedding });
    }

    return json({ error: `Unknown action: ${action}` }, 400);

  } catch (err) {
    console.error('gemini-proxy unhandled error:', err);
    return json({ error: 'Internal error' }, 500);
  }
});
