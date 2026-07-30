// =====================================================
// Malama — Ingestão de eventos SST (portal do RH)
//
// O empresa_id nunca vem do cliente: todas as RPCs o resolvem a partir de
// rh_usuarios com auth.uid(). Mesmo padrão de rh_lancar_afastamento.
// =====================================================

import { supabase } from './supabase';
import { paraIngestao, type AfastamentoCanonico } from '../lib/esocialSst';

export interface LoteIngestao {
  id: string;
  arquivo: string | null;
  eventos_lidos: number;
  eventos_gravados: number;
  eventos_repetidos: number;
  fora_da_base: number;
  sem_destino: number;
  created_at: string;
}

export interface CoberturaCpf {
  total: number;
  com_cpf: number;
  sem_cpf: number;
}

export interface ResultadoIngestao {
  ok: boolean;
  error?: string;
  lote_id?: string;
  gravados?: number;
  repetidos?: number;
  fora_da_base?: number;
  descartados?: number;
  sem_destino?: number;
  /** Presente quando o mesmo arquivo já havia sido importado. */
  lote_anterior?: string;
}

export interface ResultadoVinculoCpf {
  ok: boolean;
  error?: string;
  vinculados?: number;
  email_nao_encontrado?: number;
  cpf_invalido?: number;
  cpf_duplicado?: number;
}

/** Quantos colaboradores já têm CPF — a ingestão depende dessa chave. */
export async function getCoberturaCpf(): Promise<CoberturaCpf | null> {
  const { data, error } = await supabase.rpc('rh_cobertura_cpf');
  if (error) throw error;
  return (data as CoberturaCpf | null) ?? null;
}

export async function getLotes(limite = 20): Promise<LoteIngestao[]> {
  const { data, error } = await supabase.rpc('rh_lotes_ingestao', { p_limite: limite });
  if (error) throw error;
  return (data as LoteIngestao[] | null) ?? [];
}

/**
 * Envia os afastamentos lidos do XML.
 *
 * Só CPF, data, capítulo e dias atravessam — `paraIngestao` descarta o CID
 * completo e o código de motivo antes de sair do navegador.
 */
export async function ingerirAfastamentos(params: {
  afastamentos: AfastamentoCanonico[];
  arquivo: string;
  arquivoHash: string | null;
  eventosLidos: number;
  semDestino: number;
}): Promise<ResultadoIngestao> {
  const { data, error } = await supabase.rpc('rh_ingerir_afastamentos', {
    p_eventos: paraIngestao(params.afastamentos),
    p_arquivo: params.arquivo,
    p_arquivo_hash: params.arquivoHash,
    p_sem_destino: params.semDestino,
    p_eventos_lidos: params.eventosLidos,
  });
  if (error) throw error;
  return (data as ResultadoIngestao) ?? { ok: false, error: 'Resposta vazia do servidor.' };
}

/** Vincula CPFs em lote, casando por e-mail do colaborador. */
export async function vincularCpfs(
  pares: { email: string; cpf: string }[],
): Promise<ResultadoVinculoCpf> {
  const { data, error } = await supabase.rpc('rh_vincular_cpfs', { p_pares: pares });
  if (error) throw error;
  return (data as ResultadoVinculoCpf) ?? { ok: false, error: 'Resposta vazia do servidor.' };
}

/**
 * Lê texto colado ou CSV simples de "email;cpf" (aceita vírgula ou tab).
 * Ignora cabeçalho e linha em branco. Erro de linha é devolvido para a tela
 * mostrar, em vez de sumir.
 */
export function parsearParesCpf(texto: string): {
  pares: { email: string; cpf: string }[];
  invalidas: number;
} {
  const pares: { email: string; cpf: string }[] = [];
  let invalidas = 0;

  for (const linha of texto.split(/\r?\n/)) {
    const bruta = linha.trim();
    if (!bruta) continue;

    const campos = bruta.split(/[;,\t]/).map(c => c.trim());
    if (campos.length < 2) { invalidas += 1; continue; }

    // Aceita as duas ordens: quem exporta do RH costuma pôr CPF primeiro.
    const comArroba = campos.findIndex(c => c.includes('@'));
    if (comArroba === -1) { invalidas += 1; continue; } // provável cabeçalho

    const email = campos[comArroba].toLowerCase();
    const cpf = (campos.find((c, i) => i !== comArroba && /\d/.test(c)) ?? '')
      .replace(/\D/g, '');

    if (cpf.length !== 11) { invalidas += 1; continue; }
    pares.push({ email, cpf });
  }

  return { pares, invalidas };
}
