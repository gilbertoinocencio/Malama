import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const CARAMELO_API_URL = (Deno.env.get('CARAMELO_API_URL') ?? '').replace(/\/$/, '');
const CARAMELO_API_KEY = Deno.env.get('CARAMELO_API_KEY') ?? '';

// O host do Caramel hiberna quando fica ocioso: a primeira chamada depois de um
// período parado gasta ~40 s apenas subindo o container, antes de processar
// qualquer coisa. Com 45 s o scan de foto (visão, mais lenta que texto) abortava
// justamente nessa primeira chamada e o app dizia "não consegui ler essa foto".
const CARAMELO_TIMEOUT_MS = 90_000;
const MAX_REQUEST_BYTES = 8 * 1024 * 1024;

const TEXT_MODELS = new Set([
  'caramelo-auto',
  'caramelo-baixinho',
  'caramelo-fenomeno',
  // Compatibilidade temporária com builds antigos. O valor é convertido para
  // caramelo-auto e nunca é enviado a outro provedor.
  'gemini-2.5-flash',
]);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

const requireCaramelConfig = () => {
  if (!CARAMELO_API_URL || !CARAMELO_API_KEY) {
    throw new Error('Caramel não configurado no servidor');
  }
};

function contentsToMessages(contents: any[]): any[] {
  return (contents || []).map((content: any) => {
    const role = content.role === 'model' ? 'assistant' : (content.role || 'user');
    const parts: any[] = content.parts || [];
    const hasImage = parts.some((part: any) => part.inlineData);

    if (!hasImage) {
      return { role, content: parts.map((part: any) => part.text || '').join('') };
    }

    return {
      role,
      content: parts.map((part: any) => part.inlineData
        ? {
            type: 'image_url',
            image_url: {
              url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
            },
          }
        : { type: 'text', text: part.text || '' }),
    };
  });
}

function applyGenerationConfig(messages: any[], generationConfig: any): Record<string, unknown> {
  if (!generationConfig) return {};

  const extra: Record<string, unknown> = {};
  if (generationConfig.responseMimeType === 'application/json') {
    extra.response_format = { type: 'json_object' };
  }
  if (typeof generationConfig.temperature === 'number') {
    extra.temperature = Math.min(Math.max(generationConfig.temperature, 0), 2);
  }
  if (generationConfig.maxOutputTokens !== undefined) {
    // Meal/photo analyses can legitimately exceed 2k tokens once item-level
    // micronutrients are included. Respect the client's request up to a safe 4k cap;
    // the old 2k cap was truncating JSON before the closing brace.
    extra.max_tokens = Math.min(Math.max(Number(generationConfig.maxOutputTokens) || 1, 1), 4096);
  }

  // Os modelos de raciocínio do roteador podem gastar todo o limite em tokens
  // internos e devolver content=null. O Caramel aceita este parâmetro nativo.
  if (
    generationConfig.responseMimeType === 'application/json' ||
    generationConfig.thinkingConfig?.thinkingBudget === 0
  ) {
    extra.enable_thinking = false;
  }

  if (generationConfig.responseSchema) {
    const schemaInstruction =
      '\n\nResponda somente com JSON válido, sem markdown nem texto ao redor, obedecendo a este schema: ' +
      JSON.stringify(generationConfig.responseSchema);
    for (let index = messages.length - 1; index >= 0; index--) {
      if (messages[index].role !== 'user') continue;
      if (typeof messages[index].content === 'string') {
        messages[index].content += schemaInstruction;
      } else if (Array.isArray(messages[index].content)) {
        messages[index].content.push({ type: 'text', text: schemaInstruction });
      }
      break;
    }
  }

  return extra;
}

async function caramelFetch(path: string, init: RequestInit, timeoutMs = CARAMELO_TIMEOUT_MS): Promise<Response> {
  requireCaramelConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(`${CARAMELO_API_URL}${path}`, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function generateContent(model: string, contents: any[], generationConfig: any) {
  const messages = contentsToMessages(contents);
  const actualModel = model === 'gemini-2.5-flash' ? 'caramelo-auto' : model;
  const response = await caramelFetch('/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${CARAMELO_API_KEY}`,
    },
    body: JSON.stringify({
      model: actualModel,
      messages,
      ...applyGenerationConfig(messages, generationConfig),
    }),
  });

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 500);
    throw new Error(`Caramel HTTP ${response.status}: ${detail}`);
  }

  const data = await response.json();
  const rawContent = data?.choices?.[0]?.message?.content;
  const text = typeof rawContent === 'string'
    ? rawContent
    : Array.isArray(rawContent)
      ? rawContent.map((part: any) => part?.text || '').join('')
      : '';
  if (!text.trim()) throw new Error('Caramel devolveu resposta vazia');

  const requestId = typeof data?.id === 'string'
    ? data.id.replace(/^chatcmpl-/, '')
    : null;

  return {
    candidates: [{ content: { parts: [{ text }] } }],
    text,
    idRequisicao: requestId,
    provider: 'caramel',
    model: actualModel,
  };
}

async function forwardSignal(path: '/v1/feedback' | '/v1/correcao', payload: unknown) {
  try {
    const response = await caramelFetch(path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${CARAMELO_API_KEY}`,
      },
      body: JSON.stringify(payload),
    }, 10_000);
    return response.ok ? { status: 'ok' } : { status: 'ignorado' };
  } catch {
    return { status: 'ignorado' };
  }
}

export async function handleCaramelProxy(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return json({ error: 'Unauthorized' }, 401);

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return json({ error: 'Unauthorized' }, 401);

  try {
    const declaredSize = Number(req.headers.get('content-length') ?? 0);
    if (declaredSize > MAX_REQUEST_BYTES) return json({ error: 'Request too large' }, 413);
    const rawBody = await req.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_REQUEST_BYTES) {
      return json({ error: 'Request too large' }, 413);
    }
    const body = JSON.parse(rawBody);
    const action = body.action;

    if (!['warmup', 'generateContent', 'embedContent', 'feedback', 'correcao'].includes(action)) {
      return json({ error: 'action not allowed' }, 400);
    }

    // Acorda o serviço em segundo plano no início da sessão. Não consome cota de IA.
    if (action === 'warmup') {
      const response = await caramelFetch('/v1/models', {
        method: 'GET',
        headers: { Authorization: `Bearer ${CARAMELO_API_KEY}` },
      });
      return json({ status: response.ok ? 'ready' : 'unavailable' }, response.ok ? 200 : 503);
    }

    if (action === 'feedback') {
      const { id_requisicao, avaliacao, nota, comentario } = body;
      if (!id_requisicao || (!avaliacao && !nota)) {
        return json({ error: 'Sinal de feedback inválido' }, 400);
      }
      return json(await forwardSignal('/v1/feedback', { id_requisicao, avaliacao, nota, comentario }));
    }

    if (action === 'correcao') {
      const { id_requisicao, tarefa, original, corrigido, campos_alterados } = body;
      if (!id_requisicao || !tarefa || !original || !corrigido) {
        return json({ error: 'Sinal de correção inválido' }, 400);
      }
      return json(await forwardSignal('/v1/correcao', {
        id_requisicao, tarefa, original, corrigido, campos_alterados,
      }));
    }

    const [{ data: canAccess }, { data: withinQuota }] = await Promise.all([
      supabase.rpc('can_access_mobile_app'),
      // A RPC existente chama a categoria histórica de quota de `gemini`.
      // É apenas uma chave no banco; o provedor executado aqui é Caramel.
      supabase.rpc('consume_edge_quota', { p_scope: 'gemini', p_limit: 30, p_window_seconds: 600 }),
    ]);
    if (canAccess !== true) return json({ error: 'Acesso não provisionado pelo RH' }, 403);
    if (withinQuota !== true) return json({ error: 'Limite temporário de IA atingido' }, 429);

    if (action === 'generateContent') {
      if (!TEXT_MODELS.has(body.model)) return json({ error: 'model not allowed' }, 400);
      if (!Array.isArray(body.contents) || body.contents.length === 0 || body.contents.length > 100) {
        return json({ error: 'contents is invalid for generateContent' }, 400);
      }
      try {
        return json(await generateContent(body.model, body.contents, body.generationConfig));
      } catch (error) {
        console.error('Caramel generateContent failed:', error);
        return json({ error: 'O Caramel está temporariamente indisponível', code: 'CARAMEL_UNAVAILABLE' }, 502);
      }
    }

    if (body.model !== 'caramelo-embed') return json({ error: 'model not allowed' }, 400);
    if (typeof body.content !== 'string' || body.content.length === 0 || body.content.length > 32_000) {
      return json({ error: 'content is invalid for embedContent' }, 400);
    }
    try {
      const response = await caramelFetch('/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${CARAMELO_API_KEY}`,
        },
        body: JSON.stringify({ model: 'caramelo-embed', input: body.content, dimensions: 768 }),
      });
      if (!response.ok) throw new Error(`Caramel embeddings HTTP ${response.status}`);
      const data = await response.json();
      const values = data?.data?.[0]?.embedding;
      if (!Array.isArray(values)) throw new Error('Caramel embeddings sem vetor');
      return json({ embedding: { values }, provider: 'caramel', model: 'caramelo-embed' });
    } catch (error) {
      console.error('Caramel embedContent failed:', error);
      return json({ error: 'Busca semântica temporariamente indisponível', code: 'CARAMEL_EMBED_UNAVAILABLE' }, 502);
    }
  } catch (error) {
    console.error('Caramel proxy unhandled error:', error);
    return json({ error: 'Erro interno no serviço Caramel' }, 500);
  }
}
