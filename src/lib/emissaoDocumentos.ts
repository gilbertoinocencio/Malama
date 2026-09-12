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
  type AceiteVigente, type ComplianceDoc, type DossieMedida, type PlanoAcao, type RelatorioEmitido,
  type RhComplianceMetricas, type RhRelatorioJss, type RhRelatorioPsicossocial,
} from '../services/empresaService';
import type { RhFechamentoCiclo } from '../services/rhAgentService';
import { generateCompliancePDF, type ModulosContratados } from './complianceDoc';
import { generateJssReportPDF } from './jssReportDoc';
import { generatePsychosocialReportPDF } from './psychosocialReportDoc';
import { gerarDossieMedidaPDF } from './dossieMedidaPdf';
import { gerarFechamentoCicloPDF } from './fechamentoCicloPdf';
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

/** Reemissão: lê o snapshot e reproduz o PDF idêntico ao arquivado.
 *  Um despacho só, por tipo — a lista de Documentos não sabe o que cada
 *  documento é por dentro, e não precisa saber. */
export async function reemitirRelatorioPsicossocial(item: RelatorioEmitido): Promise<void> {
  try {
    const registro = await rhService.getRelatorioEmitido(item.id);
    const base = {
      numeroDoc: item.numero_doc,
      emitidoEm: new Date(item.emitido_em),
      hash: item.hash_verificacao,
      emitidoPorNome: item.emitido_por_nome,
      emitidoPorEmail: registro?.emitido_por_email ?? null,
    };

    if (item.tipo === 'medida') {
      const payload = registro?.payload as { dossie: DossieMedida; aceite: AceiteVigente | null } | undefined;
      if (!payload?.dossie) { toast.error('Não foi possível ler o registro deste documento.'); return; }
      gerarDossieMedidaPDF(payload.dossie, { ...base, aceite: payload.aceite ?? null });
      return;
    }
    if (item.tipo === 'ciclo') {
      const payload = registro?.payload as
        | { fechamento: RhFechamentoCiclo; empresa: { nome: string; cnpj: string | null }; aceite: AceiteVigente | null }
        | undefined;
      if (!payload?.fechamento) { toast.error('Não foi possível ler o registro deste documento.'); return; }
      gerarFechamentoCicloPDF(payload.fechamento, {
        ...base, aceite: payload.aceite ?? null,
        empresaNome: payload.empresa?.nome ?? '—', empresaCnpj: payload.empresa?.cnpj ?? null,
      });
      return;
    }

    const payload = registro?.payload as
      | { relatorio: RhRelatorioJss | RhRelatorioPsicossocial; planos: PlanoAcao[]; aceite: AceiteVigente | null }
      | undefined;
    if (!payload?.relatorio) {
      toast.error('Não foi possível ler o registro deste documento.');
      return;
    }
    const meta = { ...base, aceite: payload.aceite ?? null, planos: payload.planos ?? [] };
    if (item.tipo === 'jss') generateJssReportPDF(payload.relatorio as RhRelatorioJss, meta);
    else generatePsychosocialReportPDF(payload.relatorio as RhRelatorioPsicossocial, meta);
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Erro ao reemitir o documento.');
  }
}

// ── Dossiê da medida ───────────────────────────────────

/**
 * Emite e registra o dossiê de UMA medida (tipo 'medida', MAL-MED). O
 * período do registro vai da criação da medida até hoje: é o intervalo que
 * o documento cobre. Conclusão não é pré-requisito — o dossiê registra o
 * estado atual, e pode ser emitido de novo quando ele mudar.
 */
export async function emitirDossieMedida(planoId: string, emissor: Emissor): Promise<boolean> {
  try {
    const dossie = await rhService.getDossieMedida(planoId);
    if (!dossie?.medida) {
      toast.error('Não foi possível montar o dossiê desta medida.');
      return false;
    }
    const aceite = await rhService.getAceiteVigente();
    const payload = { dossie, aceite };
    const hash = await hashDocumento(payload);
    const hoje = new Date().toISOString().slice(0, 10);
    const res = await rhService.registrarRelatorio({
      tipo: 'medida',
      periodoInicio: String(dossie.medida.created_at).slice(0, 10),
      periodoFim: hoje,
      payload,
      hash,
    });
    if (!res.ok || !res.numero_doc) {
      toast.error(res.error || 'Não foi possível registrar a emissão. O dossiê não foi gerado.');
      return false;
    }
    gerarDossieMedidaPDF(dossie, {
      numeroDoc: res.numero_doc,
      emitidoEm: new Date(),
      hash,
      emitidoPorNome: res.emitido_por_nome ?? emissor.nome,
      emitidoPorEmail: res.emitido_por_email ?? emissor.email,
      aceite,
    });
    toast.success(`Dossiê ${res.numero_doc} emitido e registrado.`);
    return true;
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Erro ao gerar o dossiê.');
    return false;
  }
}

// ── Registro de fechamento de ciclo ────────────────────

/**
 * Emite e registra o fechamento de um ciclo (tipo 'ciclo', MAL-CIC). O
 * snapshot é o objeto calculado pela Edge Function — o mesmo que a tela
 * mostrou — mais a identificação da empresa.
 */
export async function emitirFechamentoCiclo(
  fechamento: RhFechamentoCiclo,
  empresa: { nome: string; cnpj: string | null },
  emissor: Emissor,
): Promise<boolean> {
  try {
    const aceite = await rhService.getAceiteVigente();
    const payload = { fechamento, empresa, aceite };
    const hash = await hashDocumento(payload);
    const inicio = fechamento.anterior?.janela_fim ?? fechamento.campanha.janela_inicio ?? fechamento.campanha.janela_fim;
    const res = await rhService.registrarRelatorio({
      tipo: 'ciclo',
      periodoInicio: String(inicio).slice(0, 10),
      periodoFim: String(fechamento.campanha.janela_fim).slice(0, 10),
      payload,
      hash,
    });
    if (!res.ok || !res.numero_doc) {
      toast.error(res.error || 'Não foi possível registrar a emissão. O registro não foi gerado.');
      return false;
    }
    gerarFechamentoCicloPDF(fechamento, {
      numeroDoc: res.numero_doc,
      emitidoEm: new Date(),
      hash,
      emitidoPorNome: res.emitido_por_nome ?? emissor.nome,
      emitidoPorEmail: res.emitido_por_email ?? emissor.email,
      aceite,
      empresaNome: empresa.nome,
      empresaCnpj: empresa.cnpj,
    });
    toast.success(`Registro ${res.numero_doc} emitido e registrado.`);
    return true;
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Erro ao gerar o registro do ciclo.');
    return false;
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
