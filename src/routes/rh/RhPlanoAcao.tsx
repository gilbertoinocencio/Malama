// =====================================================
// Malama — Portal do RH · Plano de ação (NR-1 / GRO)
//
// Fecha o ciclo: identificar → avaliar → CONTROLAR → verificar.
// A tela é um quadro único (PlanoAcaoKanban): ações gerais e jornadas de
// liderança convivem no mesmo kanban — deixaram de ser abas separadas
// porque criavam o mesmo tipo de registro por dois caminhos diferentes.
// O documento que a fiscalização lê ("Ver lista completa") é gerado a
// partir dos mesmos dados, não é mais uma tela de cadastro manual.
// =====================================================

import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ClipboardList, AlertTriangle, CheckCircle2, Clock, CalendarClock, X, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { PlanoAcaoKanban } from '../../components/rh/PlanoAcaoKanban';
import {
  rhService,
  type PlanoAcao, type PlanoFator, type PlanoNivel, type RhPlanosResumo, type SetorEmpresa,
} from '../../services/empresaService';
import { FATOR_LABEL, NIVEL_LABEL, STATUS_INFO } from '../../lib/planoAcaoLabels';
import { useRhJornada } from '../../contexts/RhJornadaContext';

const iso = (d: Date) => d.toISOString().slice(0, 10);
const fmtDate = (d: string | null) =>
  d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '—';

const FATORES_VALIDOS: PlanoFator[] = ['demanda', 'controle', 'apoio', 'assedio', 'jornada', 'reconhecimento', 'outro'];
const NIVEIS_VALIDOS: PlanoNivel[] = ['fonte', 'organizacional', 'individual'];

export const RhPlanoAcao: React.FC = () => {
  const { empresa } = useRhJornada();
  const parametrosIniciais = new URLSearchParams(window.location.search);
  const [itens, setItens] = useState<PlanoAcao[]>([]);
  const [resumo, setResumo] = useState<RhPlanosResumo | null>(null);
  const [setores, setSetores] = useState<SetorEmpresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [verLista, setVerLista] = useState(false);

  const abrirNovaJornada = parametrosIniciais.get('nova') === '1';
  const setorInicial = parametrosIniciais.get('setor');
  const cicloInicial = parametrosIniciais.get('ciclo');

  // Deep link do Copiloto do RH: abre a "Nova ação" já preenchida para o RH
  // revisar e confirmar — a IA nunca grava sozinha (ver rh-agent-prompt.ts).
  const abrirNovaAcao = parametrosIniciais.get('novaAcao') === '1';
  const fatorParam = parametrosIniciais.get('fator');
  const nivelParam = parametrosIniciais.get('nivel');
  const novaAcaoFatorInicial = FATORES_VALIDOS.includes(fatorParam as PlanoFator) ? (fatorParam as PlanoFator) : null;
  const novaAcaoNivelInicial = NIVEIS_VALIDOS.includes(nivelParam as PlanoNivel) ? (nivelParam as PlanoNivel) : null;
  const novaAcaoRiscoInicial = parametrosIniciais.get('risco');
  const novaAcaoMedidaInicial = parametrosIniciais.get('medida');
  // Vínculo com o ciclo de medição. Só existe quando a medida veio de uma
  // leitura concreta; ausente, a medida é criada sem linha de base.
  const novaAcaoHipoteseInicial = parametrosIniciais.get('hipotese');

  const load = useCallback(async () => {
    const fim = new Date();
    const inicio = new Date();
    inicio.setMonth(inicio.getMonth() - 6);
    try {
      const [i, r, s] = await Promise.all([
        rhService.getPlanosAcao(),
        rhService.getPlanosResumo(iso(inicio), iso(fim)),
        rhService.getSetores(),
      ]);
      setItens(i); setResumo(r); setSetores(s);
    } catch {
      toast.error('Erro ao carregar o plano de ação.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7d4a3c]" />
      </div>
    );
  }

  const lacunas = resumo?.setores_sem_acao_na_fonte ?? [];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow p-5">
        <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-[#7d4a3c]" />
            <h2 className="font-semibold text-gray-800">Plano de ação</h2>
          </div>
          <button
            onClick={() => setVerLista(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-50 transition"
          >
            Ver lista completa
          </button>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          As medidas de controle dos riscos identificados, com responsável, prazo e evidência de
          execução — as que nasceram da conversa com a liderança e as que você adiciona direto no
          quadro. É esse conjunto que a fiscalização lê.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-gray-800">{resumo?.total ?? 0}</p>
            <p className="text-xs text-gray-500 mt-1">Itens</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
              <Clock className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold text-gray-800">{resumo?.abertas ?? 0}</p>
            <p className="text-xs text-gray-500 mt-1">Em aberto</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold text-green-600">{resumo?.concluidas ?? 0}</p>
            <p className="text-xs text-gray-500 mt-1">Concluídas</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
              <CalendarClock className="w-4 h-4" />
            </div>
            <p className={`text-2xl font-bold ${(resumo?.atrasadas ?? 0) > 0 ? 'text-red-500' : 'text-gray-800'}`}>
              {resumo?.atrasadas ?? 0}
            </p>
            <p className="text-xs text-gray-500 mt-1">Fora do prazo</p>
          </div>
        </div>
      </div>

      {/* ── Alerta: risco de fonte tratado só no indivíduo ── */}
      {lacunas.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-amber-900 mb-1">
              Risco ocupacional sem medida sobre a fonte
            </p>
            <p className="text-amber-800 leading-snug">
              {lacunas.join(', ')} {lacunas.length === 1 ? 'está classificado' : 'estão classificados'}{' '}
              como risco ocupacional na matriz, mas não {lacunas.length === 1 ? 'tem' : 'têm'} nenhuma
              medida <strong>na fonte</strong> ou <strong>organizacional</strong> registrada.
            </p>
            <p className="text-amber-700 text-xs mt-1.5 leading-snug">
              A NR-1 trabalha com hierarquia de controle: cuidado individual é a última camada, não
              substituto de agir sobre a organização do trabalho. Um relatório que documenta o risco
              sem medida na fonte é, na prática, registro de que a empresa sabia e não agiu.
            </p>
          </div>
        </div>
      )}

      <PlanoAcaoKanban
        setores={setores}
        abrirNovo={abrirNovaJornada}
        setorInicial={setorInicial}
        cicloFoco={cicloInicial}
        novaAcaoInicial={abrirNovaAcao}
        novaAcaoSetorInicial={setorInicial}
        novaAcaoFatorInicial={novaAcaoFatorInicial}
        novaAcaoRiscoInicial={novaAcaoRiscoInicial}
        novaAcaoMedidaInicial={novaAcaoMedidaInicial}
        novaAcaoNivelInicial={novaAcaoNivelInicial}
        novaAcaoHipoteseInicial={novaAcaoHipoteseInicial}
      />

      <div className="flex items-start gap-2 text-xs text-gray-400 px-1">
        <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
        <span>
          Concluir um item exige descrever a evidência de execução — item marcado como feito sem
          nada que comprove é pior que item em aberto num documento que vai ao PGR. O plano de ação
          é da empresa; a Malama registra e organiza, sem assumir a responsabilidade técnica do
          PGR/PCMSO nem das decisões de gestão.
        </span>
      </div>

      {verLista && (
        <ListaCompletaModal
          itens={itens}
          empresaNome={empresa?.nome}
          onFechar={() => { setVerLista(false); void load(); }}
        />
      )}
    </div>
  );
};

// ── Documento para fiscalização: somente leitura, gerado do mesmo dado do
// quadro. Sem cadastro aqui — quem registra é o kanban. ──
const ListaCompletaModal: React.FC<{
  itens: PlanoAcao[];
  empresaNome?: string | null;
  onFechar: () => void;
}> = ({ itens, empresaNome, onFechar }) => {
  // A regra de impressão em index.css esconde o app inteiro e revela só o
  // `.print-alvo`. Ela é travada por esta classe no body porque, solta, faria
  // qualquer Ctrl+P do produto sair em branco. Marcando enquanto o modal está
  // aberto, o Ctrl+P do navegador imprime o documento igual ao botão.
  useEffect(() => {
    document.body.classList.add('imprimindo-documento');
    return () => document.body.classList.remove('imprimindo-documento');
  }, []);

  // Portal: o documento precisa ser irmão do #root para que a impressão possa
  // esconder o app inteiro sem esconder ele junto. Ver o bloco @media print
  // em index.css.
  return createPortal(
    <div className="print-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" onMouseDown={onFechar}>
      <div
        className="print-alvo max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-2xl bg-white shadow-xl"
        onMouseDown={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b p-5 print:hidden">
          <div>
            <h3 className="font-bold text-gray-900">Lista completa do plano de ação</h3>
            <p className="mt-0.5 text-xs text-gray-500">{itens.length} item(ns) · gerada a partir dos registros do quadro, sem edição aqui.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => window.print()} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50">Imprimir</button>
            <button onClick={onFechar} aria-label="Fechar"><X className="h-5 w-5 text-gray-400" /></button>
          </div>
        </div>

        {/* Cabeçalho só do papel: impresso, o documento perdia empresa, data e
            contagem — e sem isso não dá para saber a que ele se refere. */}
        <div className="hidden print:block border-b border-gray-300 pb-2 mb-3">
          <p className="text-base font-bold text-gray-900">Plano de ação — riscos psicossociais (NR-1)</p>
          <p className="text-xs text-gray-600">
            {empresaNome ? `${empresaNome} · ` : ''}{itens.length} item(ns) · emitido em {new Date().toLocaleDateString('pt-BR')}
          </p>
        </div>

        <div className="overflow-x-auto p-5 print:overflow-visible print:p-0">
          {/* `break-words` é herdado por todas as células: com table-fixed, uma
              palavra só que não caiba na coluna (— "Organizacional" —) vaza por
              cima do texto vizinho em vez de quebrar. */}
          <table className="w-full min-w-[980px] table-fixed break-words text-left text-sm print:min-w-0">
            {/* Sem larguras declaradas o navegador dava a mesma faixa para
                "Nível" e para "Risco / medida", que carrega duas frases: o
                status quebrava em duas linhas e a medida virava uma coluna
                estreita e ilegível. */}
            <colgroup>
              <col style={{ width: '9%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '11%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '25%' }} />
              <col style={{ width: '11%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '8%' }} />
            </colgroup>
            <thead>
              <tr className="border-b text-xs uppercase tracking-wide text-gray-400">
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Setor</th>
                <th className="py-2 pr-3">Fator</th>
                <th className="py-2 pr-3">Nível</th>
                <th className="py-2 pr-3">Risco / medida</th>
                <th className="py-2 pr-3">Responsável</th>
                <th className="py-2 pr-3">Prazo</th>
                <th className="py-2 pr-3">Evidência</th>
                <th className="py-2 pr-3">Origem</th>
              </tr>
            </thead>
            <tbody>
              {itens.map(it => (
                <tr key={it.id} className="border-b border-gray-100 align-top">
                  <td className="py-2 pr-3">
                    <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_INFO[it.status].cls}`}>{STATUS_INFO[it.status].label}</span>
                    {it.atrasada && <span className="mt-1 inline-block whitespace-nowrap rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-600">Fora do prazo</span>}
                  </td>
                  <td className="py-2 pr-3 text-gray-700">{it.setor ?? 'Toda a empresa'}</td>
                  <td className="py-2 pr-3 text-gray-700">{FATOR_LABEL[it.fator]}</td>
                  <td className="py-2 pr-3 text-gray-700">{NIVEL_LABEL[it.nivel_controle]}</td>
                  <td className="py-2 pr-3 text-gray-700">
                    <p>{it.risco_descricao}</p>
                    <p className="mt-0.5 text-gray-500"><span className="text-gray-400">Medida:</span> {it.medida}</p>
                  </td>
                  <td className="py-2 pr-3 text-gray-700">{it.responsavel}</td>
                  <td className="py-2 pr-3 text-gray-700">
                    <span className="whitespace-nowrap">{fmtDate(it.prazo)}</span>
                    {it.concluida_em && <><br /><span className="text-xs text-gray-400">concluída em {fmtDate(it.concluida_em)}</span></>}
                  </td>
                  <td className="py-2 pr-3 text-gray-700">{it.evidencia ?? '—'}</td>
                  {/* O setor já é a coluna ao lado: repetir aqui só fazia a
                      coluna estourar. O nome volta quando a jornada é de um
                      setor diferente do que a ação atinge. */}
                  <td className="py-2 pr-3 text-gray-700">
                    {!it.lideranca_setor
                      ? 'Geral'
                      : it.lideranca_setor === it.setor
                        ? 'Liderança'
                        : `Liderança · ${it.lideranca_setor}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {itens.length === 0 && <p className="py-8 text-center text-sm text-gray-400">Nenhum item no plano ainda.</p>}
        </div>
      </div>
    </div>,
    document.body,
  );
};
