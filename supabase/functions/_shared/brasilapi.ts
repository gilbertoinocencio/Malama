// =====================================================
// Malama — Consulta de CNPJ via BrasilAPI
//
// Endpoint público, sem token (https://brasilapi.com.br/api/cnpj/v1/{cnpj}).
// Usado no cadastro (create-rh-user, self-register-empresa) e no resync
// (empresa-cnpj-resync, manual ou em lote pelo cron). Nenhum dos dois
// fluxos de cadastro deve deixar uma falha aqui travar o onboarding: por
// isso `sincronizarCnpj` nunca lança — sempre resolve, e quem chama decide
// se quer aguardar ou disparar em paralelo com o resto do cadastro.
// =====================================================

const BRASILAPI_TIMEOUT_MS = 10_000;

export type SyncStatus =
  | 'ok' | 'erro_invalido' | 'erro_nao_encontrado' | 'erro_timeout' | 'erro';

export type SincronizarCnpjResultado = {
  status: SyncStatus;
  erro?: string;
};

/** Mesmo algoritmo de dígito verificador que existia só dentro de
 *  self-register-empresa — centralizado aqui para não duplicar entre os
 *  dois fluxos de cadastro e o resync. */
export function cnpjValido(cnpj: string): boolean {
  if (!/^\d{14}$/.test(cnpj) || /^(\d)\1{13}$/.test(cnpj)) return false;
  const digito = (base: string) => {
    let soma = 0;
    let peso = base.length - 7;
    for (const n of base) {
      soma += Number(n) * peso;
      peso = peso === 2 ? 9 : peso - 1;
    }
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  const base = cnpj.slice(0, 12);
  return Number(cnpj[12]) === digito(base) && Number(cnpj[13]) === digito(base + cnpj[12]);
}

type BuscaResultado =
  | { ok: true; bruto: Record<string, unknown> }
  | { ok: false; motivo: 'nao_encontrado' | 'timeout' | 'erro'; detalhe: string };

async function buscarCnpjNaBrasilApiUmaVez(cnpjLimpo: string): Promise<BuscaResultado> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), BRASILAPI_TIMEOUT_MS);
  try {
    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`, {
      signal: controller.signal,
    });
    if (response.status === 404) {
      return { ok: false, motivo: 'nao_encontrado', detalhe: 'CNPJ não encontrado na Receita Federal.' };
    }
    if (!response.ok) {
      return { ok: false, motivo: 'erro', detalhe: `BrasilAPI HTTP ${response.status}: ${(await response.text()).slice(0, 300)}` };
    }
    const bruto = await response.json();
    return { ok: true, bruto };
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return { ok: false, motivo: 'timeout', detalhe: 'Tempo esgotado ao consultar a BrasilAPI.' };
    }
    return { ok: false, motivo: 'erro', detalhe: err instanceof Error ? err.message : 'Erro desconhecido' };
  } finally {
    clearTimeout(timeout);
  }
}

/** Um retry automático, só para timeout/erro de rede — CNPJ não encontrado
 *  não se resolve tentando de novo. */
async function buscarCnpjNaBrasilApi(cnpjLimpo: string): Promise<BuscaResultado> {
  const primeira = await buscarCnpjNaBrasilApiUmaVez(cnpjLimpo);
  if (primeira.ok || primeira.motivo === 'nao_encontrado') return primeira;
  return buscarCnpjNaBrasilApiUmaVez(cnpjLimpo);
}

type Socio = { nome: string; qualificacao: string | null };
type CnaeSecundario = { codigo: string; descricao: string | null };
type Endereco = {
  logradouro: string | null; numero: string | null; complemento: string | null;
  bairro: string | null; cep: string | null; municipio: string | null; uf: string | null;
};

type DadosParseados = {
  razao_social: string | null;
  nome_fantasia: string | null;
  natureza_juridica: string | null;
  cnae_principal_codigo: string | null;
  cnae_principal_descricao: string | null;
  cnaes_secundarios: CnaeSecundario[];
  situacao_cadastral: string | null;
  situacao_cadastral_data: string | null;
  data_abertura: string | null;
  porte: string | null;
  opcao_simples: boolean | null;
  opcao_simples_data: string | null;
  socios: Socio[];
  endereco: Endereco | null;
};

const texto = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);
const data = (v: unknown): string | null => {
  // BrasilAPI devolve datas como "YYYY-MM-DD" ou null — repassa direto.
  const s = texto(v);
  return s && /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null;
};
/** Código CNAE chega como número — usar para casar com cnae_grau_risco. */
const codigoCnae = (v: unknown): string | null =>
  typeof v === 'number' ? String(v).padStart(7, '0') : texto(v);

function parseDadosCnpj(bruto: Record<string, unknown>): DadosParseados {
  const cnaesSecundarios = Array.isArray(bruto.cnaes_secundarios)
    ? (bruto.cnaes_secundarios as Array<Record<string, unknown>>)
        .map(c => ({ codigo: codigoCnae(c.codigo) ?? '', descricao: texto(c.descricao) }))
        .filter(c => c.codigo)
    : [];

  const socios = Array.isArray(bruto.qsa)
    ? (bruto.qsa as Array<Record<string, unknown>>)
        .map(s => ({
          nome: texto(s.nome_socio) ?? '',
          qualificacao: texto(s.qualificacao_socio),
        }))
        .filter(s => s.nome)
    : [];

  const temEndereco = bruto.logradouro || bruto.municipio || bruto.uf || bruto.cep;
  const endereco: Endereco | null = temEndereco ? {
    logradouro: texto(bruto.logradouro),
    numero: texto(bruto.numero),
    complemento: texto(bruto.complemento),
    bairro: texto(bruto.bairro),
    cep: texto(bruto.cep),
    municipio: texto(bruto.municipio),
    uf: texto(bruto.uf),
  } : null;

  return {
    razao_social: texto(bruto.razao_social),
    nome_fantasia: texto(bruto.nome_fantasia),
    natureza_juridica: texto(bruto.natureza_juridica),
    cnae_principal_codigo: codigoCnae(bruto.cnae_fiscal),
    cnae_principal_descricao: texto(bruto.cnae_fiscal_descricao),
    cnaes_secundarios: cnaesSecundarios,
    situacao_cadastral: texto(bruto.descricao_situacao_cadastral),
    situacao_cadastral_data: data(bruto.data_situacao_cadastral),
    data_abertura: data(bruto.data_inicio_atividade),
    porte: texto(bruto.porte),
    opcao_simples: typeof bruto.opcao_pelo_simples === 'boolean' ? bruto.opcao_pelo_simples : null,
    opcao_simples_data: data(bruto.data_opcao_pelo_simples),
    socios,
    endereco,
  };
}

type SupabaseAdminLike = {
  from: (table: string) => {
    upsert: (row: Record<string, unknown>, opts: { onConflict: string }) => Promise<{ error: unknown }>;
  };
};

/**
 * Orquestra a sincronização de uma empresa: busca na BrasilAPI, parseia,
 * grava em `empresa_dados_cnpj`. NUNCA lança — falha vira `sync_status` de
 * erro na própria linha, para o cadastro/resync que chamou continuar sem
 * travar. `synced_at` só avança em sucesso; `ultima_tentativa_em` sempre
 * avança (é a base do backoff do lote noturno).
 */
export async function sincronizarCnpj(
  supabaseAdmin: SupabaseAdminLike,
  empresaId: string,
  cnpj: string,
): Promise<SincronizarCnpjResultado> {
  const cnpjLimpo = cnpj.replace(/\D/g, '');
  const agora = new Date().toISOString();

  if (!cnpjValido(cnpjLimpo)) {
    const resultado: SincronizarCnpjResultado = { status: 'erro_invalido', erro: 'CNPJ com formato inválido.' };
    const { error } = await supabaseAdmin.from('empresa_dados_cnpj').upsert({
      empresa_id: empresaId,
      sync_status: resultado.status,
      sync_erro: resultado.erro,
      ultima_tentativa_em: agora,
    }, { onConflict: 'empresa_id' });
    if (error) console.error('[brasilapi] falha ao gravar erro_invalido:', error);
    return resultado;
  }

  const busca = await buscarCnpjNaBrasilApi(cnpjLimpo);

  if (!busca.ok) {
    const status: SyncStatus = busca.motivo === 'nao_encontrado' ? 'erro_nao_encontrado'
      : busca.motivo === 'timeout' ? 'erro_timeout' : 'erro';
    const resultado: SincronizarCnpjResultado = { status, erro: busca.detalhe };
    const { error } = await supabaseAdmin.from('empresa_dados_cnpj').upsert({
      empresa_id: empresaId,
      sync_status: status,
      sync_erro: busca.detalhe,
      ultima_tentativa_em: agora,
    }, { onConflict: 'empresa_id' });
    if (error) console.error(`[brasilapi] falha ao gravar ${status}:`, error);
    return resultado;
  }

  const parseado = parseDadosCnpj(busca.bruto);
  const { error } = await supabaseAdmin.from('empresa_dados_cnpj').upsert({
    empresa_id: empresaId,
    ...parseado,
    dados_brutos: busca.bruto,
    sync_status: 'ok',
    sync_erro: null,
    synced_at: agora,
    ultima_tentativa_em: agora,
  }, { onConflict: 'empresa_id' });

  if (error) {
    console.error('[brasilapi] falha ao gravar sync ok:', error);
    return { status: 'erro', erro: 'Consulta OK, mas falhou ao salvar no banco.' };
  }
  return { status: 'ok' };
}
