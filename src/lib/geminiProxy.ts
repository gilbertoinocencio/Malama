/**
 * Frontend adapter that routes all Gemini calls through the gemini-proxy Edge Function.
 * Drop-in replacement for `new GoogleGenerativeAI(apiKey)` — no API key on the client.
 *
 * Usage:
 *   import { GeminiProxy } from '../lib/geminiProxy';
 *   const genAI = new GeminiProxy();
 *   const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash', generationConfig });
 *   const result = await model.generateContent(prompt);
 *   const text = result.response.text();
 */

import { supabase } from '../services/supabase';

// ── Proxy transport ────────────────────────────────────────────────────────────

async function callProxy(body: object): Promise<any> {
  const { data, error } = await supabase.functions.invoke('gemini-proxy', { body });
  if (error) throw new Error(`gemini-proxy: ${error.message}`);
  if (data?.error) throw new Error(`gemini-proxy: ${data.error}`);
  return data;
}

// ── Response wrappers (mimic SDK surface used in this project) ────────────────

class ProxyGenerateContentResponse {
  candidates: any[];
  private _text: string;

  constructor(data: { candidates?: any[]; text?: string }) {
    this.candidates = data.candidates || [];
    this._text = data.text || '';
  }

  text(): string {
    return this._text;
  }
}

class ProxyGenerateContentResult {
  response: ProxyGenerateContentResponse;
  /** Id da requisição no Caramel — use com `enviarFeedback` para casar o
   *  sinal de qualidade com a decisão de roteamento do Telê. */
  idRequisicao: string | null;

  constructor(data: any) {
    this.response = new ProxyGenerateContentResponse(data);
    this.idRequisicao = data?.idRequisicao ?? null;
  }
}

/**
 * Envia um sinal de qualidade (👍/👎) para a requisição correspondente.
 * Fire-and-forget: nunca lança nem bloqueia a UI — feedback é telemetria,
 * não função do produto. Vira dado de treino do Telê (roteador do Caramel).
 */
export function enviarFeedback(
  idRequisicao: string | null | undefined,
  avaliacao: 'positivo' | 'negativo',
  comentario?: string,
): void {
  if (!idRequisicao) return;
  void supabase.functions
    .invoke('gemini-proxy', {
      body: { action: 'feedback', id_requisicao: idRequisicao, avaliacao, comentario },
    })
    .catch(() => {});
}

/**
 * Registra uma CORREÇÃO do usuário sobre uma saída da IA — o par
 * (o que a IA respondeu, o que era certo). Sinal muito mais rico que o 👍/👎:
 * permite medir o viés do modelo (ex.: superestima calorias em 18%) e virar
 * exemplo few-shot para a tarefa acertar mais. Fire-and-forget.
 */
export function enviarCorrecao(
  idRequisicao: string | null | undefined,
  tarefa: string,
  original: Record<string, unknown>,
  corrigido: Record<string, unknown>,
  camposAlterados?: string[],
): void {
  if (!idRequisicao) return;
  void supabase.functions
    .invoke('gemini-proxy', {
      body: {
        action: 'correcao',
        id_requisicao: idRequisicao,
        tarefa,
        original,
        corrigido,
        campos_alterados: camposAlterados,
      },
    })
    .catch(() => {});
}

// ── Chat session ──────────────────────────────────────────────────────────────

class ProxyChat {
  private modelName: string;
  private generationConfig?: any;
  private history: any[];

  constructor(modelName: string, generationConfig: any, history: any[]) {
    this.modelName = modelName;
    this.generationConfig = generationConfig;
    this.history = [...(history || [])];
  }

  async sendMessage(message: string | any[]): Promise<ProxyGenerateContentResult> {
    const userParts = Array.isArray(message)
      ? message.map(m => (typeof m === 'string' ? { text: m } : m))
      : [{ text: message as string }];

    const contents = [
      ...this.history,
      { role: 'user', parts: userParts },
    ];

    const data = await callProxy({
      action: 'generateContent',
      model: this.modelName,
      generationConfig: this.generationConfig,
      contents,
    });

    return new ProxyGenerateContentResult(data);
  }
}

// ── Model ─────────────────────────────────────────────────────────────────────

class ProxyModel {
  private modelName: string;
  private generationConfig?: any;

  constructor(modelName: string, generationConfig?: any) {
    this.modelName = modelName;
    this.generationConfig = generationConfig;
  }

  async generateContent(promptOrContents: string | any[]): Promise<ProxyGenerateContentResult> {
    let contents: any[];

    if (typeof promptOrContents === 'string') {
      contents = [{ role: 'user', parts: [{ text: promptOrContents }] }];
    } else if (Array.isArray(promptOrContents)) {
      // SDK format: [string, { inlineData: {...} }, ...]
      const parts = promptOrContents.map(item => {
        if (typeof item === 'string') return { text: item };
        if (item?.inlineData) return { inlineData: item.inlineData };
        return item;
      });
      contents = [{ role: 'user', parts }];
    } else {
      contents = [promptOrContents];
    }

    const data = await callProxy({
      action: 'generateContent',
      model: this.modelName,
      generationConfig: this.generationConfig,
      contents,
    });

    return new ProxyGenerateContentResult(data);
  }

  startChat(options: { history?: any[] }): ProxyChat {
    return new ProxyChat(this.modelName, this.generationConfig, options.history || []);
  }

  async embedContent(content: string): Promise<{ embedding: { values: number[] } }> {
    const data = await callProxy({
      action: 'embedContent',
      model: this.modelName,
      content,
    });
    return data;
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export class GeminiProxy {
  getGenerativeModel(config: { model: string; generationConfig?: any }): ProxyModel {
    return new ProxyModel(config.model, config.generationConfig);
  }
}
