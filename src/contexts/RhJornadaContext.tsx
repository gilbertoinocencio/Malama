// =====================================================
// Malama — Estado compartilhado da jornada do RH
//
// Carrega UMA vez, no layout, o que a jornada precisa e serve para todas as
// abas: a faixa do cabeçalho, o guia do dashboard, o ritmo do ciclo e o
// dossiê do PGR. Antes cada tela buscava por conta própria e o dashboard
// era o único lugar que sabia "qual é o próximo passo".
//
// A lista de colaboradores mora aqui porque o dashboard a edita e a jornada
// a conta: duas cópias divergiam assim que alguém adicionava alguém.
// =====================================================

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  rhService,
  type DocumentoLegal, type EmpresaColaborador, type LiderancaCiclo,
  type PlanoAcao, type PsychosocialCampanha, type RhEmpresa, type RhUsuarioEquipe,
  type RhPermissao,
} from '../services/empresaService';
import { useRhAccess } from './RhAccessContext';
import type { DadosJornada } from '../lib/rhJornada';

type JornadaValue = {
  empresa: RhEmpresa | null;
  colaboradores: EmpresaColaborador[];
  setores: string[];
  campanhas: PsychosocialCampanha[];
  ciclos: LiderancaCiclo[];
  planos: PlanoAcao[];
  documentos: DocumentoLegal[];
  usuariosEquipe: RhUsuarioEquipe[];
  loading: boolean;
  /** Alguma leitura falhou: o que está na tela pode estar desatualizado. */
  parcial: boolean;
  /** Dados prontos para as funções puras de `lib/rhJornada`. */
  dados: DadosJornada;
  recarregar: () => Promise<void>;
  /** O dashboard faz atualização otimista da lista (setor, psi, remoção). */
  setColaboradores: React.Dispatch<React.SetStateAction<EmpresaColaborador[]>>;
};

const RhJornadaContext = createContext<JornadaValue | null>(null);

/** Leitura auxiliar: distingue "veio vazio" de "não consegui ler". Sem isso,
 *  falha de rede virava lista vazia e a jornada regredia para o passo 1. */
type Leitura<T> = { ok: boolean; dados: T[] };
const opcional = <T,>(p: Promise<T[]>): Promise<Leitura<T>> =>
  p.then(dados => ({ ok: true, dados })).catch(() => ({ ok: false, dados: [] as T[] }));
/** Chamada que nem foi feita (sem permissão) — ausência não é falha. */
const vazio = <T,>(): Promise<Leitura<T>> => Promise.resolve({ ok: true, dados: [] as T[] });

export const RhJornadaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { acesso } = useRhAccess();
  // Derivado de `acesso`, e não do `can` do contexto de acesso: aquele é uma
  // função nova a cada render do layout, o que faria este provider recarregar
  // o painel inteiro a cada troca de aba.
  const can = useCallback(
    (p: RhPermissao) => acesso.principal || acesso.permissoes.includes(p),
    [acesso],
  );
  const [empresa, setEmpresa] = useState<RhEmpresa | null>(null);
  const [colaboradores, setColaboradores] = useState<EmpresaColaborador[]>([]);
  const [setores, setSetores] = useState<string[]>([]);
  const [campanhas, setCampanhas] = useState<PsychosocialCampanha[]>([]);
  const [ciclos, setCiclos] = useState<LiderancaCiclo[]>([]);
  const [planos, setPlanos] = useState<PlanoAcao[]>([]);
  const [documentos, setDocumentos] = useState<DocumentoLegal[]>([]);
  const [usuariosEquipe, setUsuariosEquipe] = useState<RhUsuarioEquipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [parcial, setParcial] = useState(false);

  const recarregar = useCallback(async () => {
    setLoading(true);
    try {
      const emp = await rhService.getMyEmpresa();
      setEmpresa(emp);
      if (!emp) { setParcial(false); return; }

      const [colabs, sets, camps, cics, plans, docs, equipe] = await Promise.all([
        can('colaboradores') ? opcional(rhService.getColaboradores(emp.id)) : vazio<EmpresaColaborador>(),
        opcional(rhService.getSetores()),
        // Compliance também lê campanhas e medidas: são elas que compõem o
        // dossiê do PGR. Sem isso o dossiê afirmaria "nenhuma medida" para
        // quem simplesmente não tinha buscado a lista.
        can('saude_mental') || can('compliance')
          ? opcional(rhService.getCampanhas()) : vazio<PsychosocialCampanha>(),
        can('plano_acao') ? opcional(rhService.getLiderancaCiclos()) : vazio<LiderancaCiclo>(),
        can('plano_acao') || can('compliance')
          ? opcional(rhService.getPlanosAcao()) : vazio<PlanoAcao>(),
        // A ciência automática vem antes da leitura, senão o documento
        // recém-registrado ainda apareceria como pendente nesta carga.
        can('empresa')
          ? opcional(rhService.registrarCiencia().catch(() => {}).then(() => rhService.getDocumentos()))
          : vazio<DocumentoLegal>(),
        acesso.principal ? opcional(rhService.getUsuariosEquipe()) : vazio<RhUsuarioEquipe>(),
      ]);

      // Leitura que falhou não sobrescreve o estado: preferimos dado velho a
      // dado errado, porque a jornada dá instrução a partir daqui.
      if (colabs.ok) setColaboradores(colabs.dados);
      if (sets.ok) setSetores(sets.dados.map(s => s.setor));
      if (camps.ok) setCampanhas(camps.dados);
      if (cics.ok) setCiclos(cics.dados);
      if (plans.ok) setPlanos(plans.dados);
      if (docs.ok) setDocumentos(docs.dados);
      if (equipe.ok) setUsuariosEquipe(equipe.dados);
      setParcial(![colabs, sets, camps, cics, plans, docs, equipe].every(r => r.ok));
    } catch (err) {
      console.error('[jornada] falha ao carregar:', err);
      setParcial(true);
    } finally {
      setLoading(false);
    }
  }, [acesso.principal, can]);

  useEffect(() => { recarregar(); }, [recarregar]);

  const dados: DadosJornada = useMemo(() => ({
    empresaAtiva: empresa?.status === 'ativa',
    nSetores: setores.length,
    nColaboradores: colaboradores.length,
    campanhas,
    ciclos,
    planos,
    documentos,
    pode: {
      colaboradores: can('colaboradores'),
      saudeMental: can('saude_mental'),
      planoAcao: can('plano_acao'),
      empresa: can('empresa'),
      importar: can('importar'),
      // Espelha o gate de leitura acima: o dossiê só pode afirmar "não foi
      // feito" sobre o que este usuário de fato consegue enxergar.
      veCampanhas: can('saude_mental') || can('compliance'),
      vePlanos: can('plano_acao') || can('compliance'),
    },
  }), [empresa, setores, colaboradores, campanhas, ciclos, planos, documentos, can]);

  const value: JornadaValue = {
    empresa, colaboradores, setores, campanhas, ciclos, planos, documentos,
    usuariosEquipe, loading, parcial, dados, recarregar, setColaboradores,
  };

  return <RhJornadaContext.Provider value={value}>{children}</RhJornadaContext.Provider>;
};

export const useRhJornada = () => {
  const value = useContext(RhJornadaContext);
  if (!value) throw new Error('useRhJornada precisa estar dentro de RhJornadaProvider');
  return value;
};
