/**
 * Adaptador do frontend para os modelos Caramel via Edge Function.
 * Mantém uma superfície pequena, compatível com os usos antigos do SDK, sem
 * expor a chave do Caramel no aplicativo.
 */
import { supabase } from '../services/supabase';

export const CARAMEL_AUTO_MODEL = 'caramelo-auto';
export const CARAMEL_FAST_MODEL = 'caramelo-baixinho';
export const CARAMEL_DEEP_MODEL = 'caramelo-fenomeno';
export const CARAMEL_EMBED_MODEL = 'caramelo-embed';

const FRIENDLY_UNAVAILABLE_MESSAGE =
  'A Malama está demorando mais que o normal para responder. Tente novamente em instantes.';

async function callCaramel(body: object): Promise<any> {
  const { data, error } = await supabase.functions.invoke('caramel-proxy', { body });
  if (error) {
    console.error('[Caramel] Edge Function error:', error);
    throw new Error(FRIENDLY_UNAVAILABLE_MESSAGE);
  }
  if (data?.error) {
    console.error('[Caramel] API error:', data.code || data.error);
    throw new Error(data.code === 'CARAMEL_UNAVAILABLE' ? FRIENDLY_UNAVAILABLE_MESSAGE : data.error);
  }
  return data;
}

let warmupStarted = false;

/** Acorda o serviço Caramel em background no começo da sessão. */
export function warmCaramel(): void {
  if (warmupStarted) return;
  warmupStarted = true;
  void callCaramel({ action: 'warmup' }).catch(() => {
    // Uma chamada real ainda poderá tentar novamente. Warm-up nunca bloqueia a UI.
    warmupStarted = false;
  });
}

class CaramelGenerateContentResponse {
  candidates: any[];
  private readonly value: string;

  constructor(data: { candidates?: any[]; text?: string }) {
    this.candidates = data.candidates || [];
    this.value = data.text || '';
  }

  text(): string {
    return this.value;
  }
}

class CaramelGenerateContentResult {
  response: CaramelGenerateContentResponse;
  idRequisicao: string | null;
  model: string | null;

  constructor(data: any) {
    this.response = new CaramelGenerateContentResponse(data);
    this.idRequisicao = data?.idRequisicao ?? null;
    this.model = data?.model ?? null;
  }
}

export function enviarFeedback(
  idRequisicao: string | null | undefined,
  avaliacao: 'positivo' | 'negativo',
  comentario?: string,
): void {
  if (!idRequisicao) return;
  void supabase.functions.invoke('caramel-proxy', {
    body: { action: 'feedback', id_requisicao: idRequisicao, avaliacao, comentario },
  }).catch(() => {});
}

export function enviarCorrecao(
  idRequisicao: string | null | undefined,
  tarefa: string,
  original: Record<string, unknown>,
  corrigido: Record<string, unknown>,
  camposAlterados?: string[],
): void {
  if (!idRequisicao) return;
  void supabase.functions.invoke('caramel-proxy', {
    body: {
      action: 'correcao',
      id_requisicao: idRequisicao,
      tarefa,
      original,
      corrigido,
      campos_alterados: camposAlterados,
    },
  }).catch(() => {});
}

class CaramelChat {
  constructor(
    private readonly modelName: string,
    private readonly generationConfig: any,
    private readonly history: any[],
  ) {}

  async sendMessage(message: string | any[]): Promise<CaramelGenerateContentResult> {
    const userParts = Array.isArray(message)
      ? message.map(item => typeof item === 'string' ? { text: item } : item)
      : [{ text: message }];
    const data = await callCaramel({
      action: 'generateContent',
      model: this.modelName,
      generationConfig: this.generationConfig,
      contents: [...this.history, { role: 'user', parts: userParts }],
    });
    return new CaramelGenerateContentResult(data);
  }
}

class CaramelModel {
  constructor(
    private readonly modelName: string,
    private readonly generationConfig?: any,
  ) {}

  async generateContent(promptOrContents: string | any[]): Promise<CaramelGenerateContentResult> {
    let contents: any[];
    if (typeof promptOrContents === 'string') {
      contents = [{ role: 'user', parts: [{ text: promptOrContents }] }];
    } else if (Array.isArray(promptOrContents)) {
      contents = [{
        role: 'user',
        parts: promptOrContents.map(item => {
          if (typeof item === 'string') return { text: item };
          if (item?.inlineData) return { inlineData: item.inlineData };
          return item;
        }),
      }];
    } else {
      contents = [promptOrContents];
    }
    const data = await callCaramel({
      action: 'generateContent',
      model: this.modelName,
      generationConfig: this.generationConfig,
      contents,
    });
    return new CaramelGenerateContentResult(data);
  }

  startChat(options: { history?: any[] }): CaramelChat {
    return new CaramelChat(this.modelName, this.generationConfig, options.history || []);
  }

  async embedContent(content: string): Promise<{ embedding: { values: number[] } }> {
    return callCaramel({ action: 'embedContent', model: this.modelName, content });
  }
}

export class CaramelAI {
  getGenerativeModel(config: { model: string; generationConfig?: any }): CaramelModel {
    return new CaramelModel(config.model, config.generationConfig);
  }
}
