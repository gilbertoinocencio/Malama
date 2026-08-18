// =====================================================
// Malama — Emissão dos documentos do RH, num lugar só
//
// Cada documento nascia na tela em que o dado dele estava: o relatório de
// evidência no Compliance, o WHO-5 e o JSS na Saúde Mental. Com a aba
// Documentos reunindo tudo, a orquestração passaria a existir em dois
// lugares — e é justamente ela que carrega o que dá valor probatório:
// registrar ANTES de gerar, selar o snapshot e usar o número devolvido pelo
// servidor. Duas cópias divergem na primeira correção, e a divergência
// aparece como dois documentos com o mesmo número ou com selo diferente.
//
// Aqui não há regra de negócio nova: é a mesma sequência que já rodava,
// extraída para ter um dono.
// =====================================================

import toast from 'react-hot-toast';
import {
  rhService,
  type AceiteVigente, type ComplianceDoc, type PlanoAcao, type RelatorioEmitido,
  type RhComplianceMetricas, type RhRelatorioJss, type RhRelatorioPsicossocial,
} from '../services/empresaService';
import { generateCompliancePDF, type ModulosContratados } from './complianceDoc';
import { generateJssReportPDF } from './jssReportDoc';
import { generatePsychosocialReportPDF } from './psychosocialReportDoc';
import { hashDocumento } from './hashDocumento';

/** Quem está emitindo — vai impresso no documento. */
export type Emissor = { nome: string | null; email: string | null };

// ── Relatórios psicossociais (WHO-5 e JSS) ─────────────

export type TipoRelatorio = 'jss' | 'who5';

/**
 * Emite e REGISTRA um relatório psicossocial.
 *
 * A ordem importa: monta o snapshot, calcula o selo, registra no servidor e
 * só então gera o PDF com o número devolvido. Se o registro falhar, nenhum
 * arquivo sai — documento de evidência não registrado é exatamente o que a
 * outra parte ataca como produzido para o processo.
 */
export async function emitirRelatorioPsicossocial(
  tipo: TipoRelatorio,
  relatorio: RhRelatorioJss | RhRelatorioPsicossocial,
  emissor: Emissor,
): Promise<boolean> {
  try {
    // O plano de ação entra no mesmo documento: diagnóstico sem medida de
    // controle registra que a empresa sabia do risco e não agiu.
    const planos = await rhService.getPlanosAcao();
    const aceite = await rhService.getAceiteVigente();
    const payload = { relatorio, planos, aceite };
    const hash = await hashDocumento(payload);

    const res = await rhService.registrarRelatorio({
      tipo,
      periodoInicio: relatorio.periodo_inicio,
      periodoFim: relatorio.periodo_fim,
      payload,
      hash,
    });
    if (!res.ok || !res.numero_doc) {
      toast.error(res.error || 'Não foi possível registrar a emissão. O relatório não foi gerado.');
      return false;
    }

    const meta = {
      numeroDoc: res.numero_doc,
      emitidoEm: new Date(),
      hash,
      emitidoPorNome: res.emitido_por_nome ?? emissor.nome,
      emitidoPorEmail: res.emitido_por_email ?? emissor.email,
      aceite,
      planos,
    };
    if (tipo === 'jss') generateJssReportPDF(relatorio as RhRelatorioJss, meta);
    else generatePsychosocialReportPDF(relatorio as RhRelatorioPsicossocial, meta);

    toast.success(`Relatório ${res.numero_doc} emitido e registrado.`);
    return true;
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Erro ao gerar relatório.');
    return false;
  }
}

/** Reemissão: lê o snapshot e reproduz o PDF idêntico ao arquivado. */
export async function reemitirRelatorioPsicossocial(item: RelatorioEmitido): Promise<void> {
  try {
    const registro = await rhService.getRelatorioEmitido(item.id);
    const payload = registro?.payload as
      | { relatorio: RhRelatorioJss | RhRelatorioPsicossocial; planos: PlanoAcao[]; aceite: AceiteVigente | null }
      | undefined;
    if (!payload?.relatorio) {
      toast.error('Não foi possível ler o registro deste documento.');
      return;
    }
    const meta = {
      numeroDoc: item.numero_doc,
      emitidoEm: new Date(item.emitido_em),
      hash: item.hash_verificacao,
      emitidoPorNome: item.emitido_por_nome,
      emitidoPorEmail: registro?.emitido_por_email ?? null,
      aceite: payload.aceite ?? null,
      planos: payload.planos ?? [],
    };
    if (item.tipo === 'jss') generateJssReportPDF(payload.relatorio as RhRelatorioJss, meta);
    else generatePsychosocialReportPDF(payload.relatorio as RhRelatorioPsicossocial, meta);
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Erro ao reemitir o documento.');
  }
}

// ── Relatório de evidência do programa (subsídio ao PGR) ──

/** Número sequencial do dia. O servidor não numera este documento, então a
 *  contagem sai do histórico já carregado — passar `emitidosHoje` errado
 *  produz número repetido. */
export const numeroRelatorioEvidencia = (jaEmitidos: number): string => {
  const hoje = new Date();
  const ymd = `${hoje.getFullYear()}${String(hoje.getMonth() + 1).padStart(2, '0')}${String(hoje.getDate()).padStart(2, '0')}`;
  return `MAL-PGR-${ymd}-${String(jaEmitidos + 1).padStart(3, '0')}`;
};

export async function emitirRelatorioEvidencia(p: {
  metricas: RhComplianceMetricas;
  modulos: ModulosContratados;
  /** Quantos já existem — define o sequencial do número. */
  jaEmitidos: number;
  emissor: Emissor;
}): Promise<boolean> {
  const { metricas, modulos, jaEmitidos, emissor } = p;
  try {
    const numero = numeroRelatorioEvidencia(jaEmitidos);
    const emitidoEm = new Date();
    const hoje = emitidoEm.toISOString().slice(0, 10);
    const aceite = await rhService.getAceiteVigente();

    const snapshot = {
      empresa_id: metricas.empresa_id,
      periodo_inicio: metricas.data_inicio,
      periodo_fim: hoje,
      colaboradores_elegiveis: metricas.colaboradores_elegiveis,
      colaboradores_ativos: metricas.colaboradores_ativos,
      consultas_realizadas: metricas.consultas_realizadas,
      numero_doc: numero,
      // Entram no selo de propósito: os módulos definem O QUE o documento
      // declara, então mudar de plano tem que mudar o hash.
      modo_mental: modulos.mental,
      modo_metabolico: modulos.metabolico,
      consultas_psicologo: metricas.consultas_psicologo,
      consultas_medico: metricas.consultas_medico,
    };
    const hash = await hashDocumento(snapshot);

    // Registra ANTES de gerar, pelo mesmo motivo do relatório psicossocial.
    await rhService.saveComplianceDoc({
      ...snapshot,
      emitido_por_nome: emissor.nome,
      hash_verificacao: hash,
    });

    generateCompliancePDF({
      empresaNome: metricas.nome,
      empresaCnpj: metricas.cnpj,
      dataInicio: metricas.data_inicio,
      periodoFim: hoje,
      colaboradoresElegiveis: metricas.colaboradores_elegiveis,
      colaboradoresAtivos: metricas.colaboradores_ativos,
      consultasRealizadas: metricas.consultas_realizadas,
      numeroDoc: numero,
      emitidoEm,
      hash,
      emitidoPorNome: emissor.nome,
      emitidoPorEmail: emissor.email,
      aceite,
      modulos,
      consultasPsicologo: metricas.consultas_psicologo,
      consultasMedico: metricas.consultas_medico,
    });
    toast.success(`Documento ${numero} gerado e registrado.`);
    return true;
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Erro ao gerar documento.');
    return false;
  }
}

/** Reemissão a partir do REGISTRO — nunca dos números de hoje. */
export function reemitirRelatorioEvidencia(d: ComplianceDoc, metricas: RhComplianceMetricas): void {
  generateCompliancePDF({
    empresaNome: metricas.nome,
    empresaCnpj: metricas.cnpj,
    dataInicio: d.periodo_inicio,
    periodoFim: d.periodo_fim ?? d.emitido_em.slice(0, 10),
    colaboradoresElegiveis: d.colaboradores_elegiveis,
    colaboradoresAtivos: d.colaboradores_ativos,
    consultasRealizadas: d.consultas_realizadas,
    numeroDoc: d.numero_doc,
    emitidoEm: new Date(d.emitido_em),
    // Documentos anteriores à migração 20260841 não têm selo nem emissor
    // gravados: o PDF diz isso em vez de inventar.
    hash: d.hash_verificacao ?? 'NAO REGISTRADO',
    emitidoPorNome: d.emitido_por_nome,
    emitidoPorEmail: null,
    aceite: null,
    // Módulos do REGISTRO, não os de hoje. Documento anterior à 20260845
    // não tem esse dado: fica indefinido e o gerador reproduz o texto do
    // programa completo, que é como ele saiu na época.
    modulos: d.modo_mental == null && d.modo_metabolico == null
      ? undefined
      : { mental: !!d.modo_mental, metabolico: !!d.modo_metabolico },
    consultasPsicologo: d.consultas_psicologo,
    consultasMedico: d.consultas_medico,
  });
}
