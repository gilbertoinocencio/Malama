const CARAMELO_API_URL = (Deno.env.get('CARAMELO_API_URL') ?? '').replace(/\/$/, '');
const CARAMELO_API_KEY = Deno.env.get('CARAMELO_API_KEY') ?? '';
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? '';

const CARAMEL_CLINICAL_MODEL = 'caramelo-fenomeno';
const CLAUDE_FALLBACK_MODEL = 'claude-sonnet-4-6';
const REQUEST_TIMEOUT_MS = 45_000;

export interface ClinicalAiResult {
  text: string;
  provider: 'caramel' | 'anthropic';
  model: string;
  fallbackUsed: boolean;
  usage: {
    inputTokens: number | null;
    outputTokens: number | null;
  };
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function generateWithCaramel(prompt: string, maxTokens: number): Promise<ClinicalAiResult> {
  if (!CARAMELO_API_URL || !CARAMELO_API_KEY) {
    throw new Error('Caramel não configurado');
  }

  const response = await fetchWithTimeout(`${CARAMELO_API_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${CARAMELO_API_KEY}`,
    },
    body: JSON.stringify({
      model: CARAMEL_CLINICAL_MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: Math.min(Math.max(maxTokens, 1), 4096),
      enable_thinking: false,
    }),
  });

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 300);
    throw new Error(`Caramel HTTP ${response.status}: ${detail}`);
  }

  const data = await response.json();
  const rawContent = data?.choices?.[0]?.message?.content;
  const text = typeof rawContent === 'string'
    ? rawContent
    : Array.isArray(rawContent)
      ? rawContent.map((part: { text?: string }) => part?.text ?? '').join('')
      : '';
  if (text.trim().length < 80) throw new Error('Caramel devolveu resposta clínica incompleta');

  return {
    text: text.trim(),
    provider: 'caramel',
    model: CARAMEL_CLINICAL_MODEL,
    fallbackUsed: false,
    usage: {
      inputTokens: Number.isFinite(data?.usage?.prompt_tokens) ? data.usage.prompt_tokens : null,
      outputTokens: Number.isFinite(data?.usage?.completion_tokens) ? data.usage.completion_tokens : null,
    },
  };
}

async function generateWithClaude(prompt: string, maxTokens: number): Promise<ClinicalAiResult> {
  if (!ANTHROPIC_API_KEY) throw new Error('Fallback Claude não configurado');

  const response = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: CLAUDE_FALLBACK_MODEL,
      max_tokens: Math.min(Math.max(maxTokens, 1), 4096),
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 300);
    throw new Error(`Claude HTTP ${response.status}: ${detail}`);
  }

  const data = await response.json();
  const text = Array.isArray(data?.content)
    ? data.content.map((part: { type?: string; text?: string }) => part?.type === 'text' ? part.text ?? '' : '').join('')
    : '';
  if (text.trim().length < 80) throw new Error('Claude devolveu resposta clínica incompleta');

  return {
    text: text.trim(),
    provider: 'anthropic',
    model: CLAUDE_FALLBACK_MODEL,
    fallbackUsed: true,
    usage: {
      inputTokens: Number.isFinite(data?.usage?.input_tokens) ? data.usage.input_tokens : null,
      outputTokens: Number.isFinite(data?.usage?.output_tokens) ? data.usage.output_tokens : null,
    },
  };
}

/** Caramel is always attempted first; Claude is used only after a technical failure. */
export async function generateClinicalText(prompt: string, maxTokens: number): Promise<ClinicalAiResult> {
  try {
    return await generateWithCaramel(prompt, maxTokens);
  } catch (caramelError) {
    console.warn('Caramel clinical generation failed; trying Claude fallback:', caramelError);
    return generateWithClaude(prompt, maxTokens);
  }
}
