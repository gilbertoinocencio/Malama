// =====================================================
// Malama — Fechamento de ciclo
//
// A fase "Ler" do trilho, em três blocos e na ordem em que devem ser lidos:
//   1. O que mudou — com a comparabilidade sazonal ANTES das setas.
//   2. O que foi feito no meio — medidas do intervalo e o que se observou
//      nas que tinham linha de base.
//   3. Próximo passo — um botão só: "Entendi, fechar ciclo".
//
// Os números vêm prontos do briefing (fechamento_ciclo, calculado na Edge
// Function). Esta tela não recalcula nada: o copiloto e o PDF do ciclo
// mostram exatamente o mesmo. Sem nota, sem pontuação, sem ranking de setor
// — é uma fase concluída, não um placar.
// =====================================================

import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDownRight, ArrowRight, ArrowUpRight, CheckCircle2, ClipboardList, Download,
  Flag, Info, Minus, Sparkles, TrendingUp,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { rhAgentService, type RhFechamentoCiclo, type RhDirecaoFechamento } from '../../services/rhAgentService';
import { rhService, type PsychosocialCampanha } from '../../services/empresaService';
import { emitirFechamentoCiclo } from '../../lib/emissaoDocumentos';
import { NIVEL_LABEL, RESULTADO_CLS, RESULTADO_LABEL, STATUS_INFO } from '../../lib/planoAcaoLabels';
import { useRhAccess } from '../../contexts/RhAccessContext';
import { useRhJornada } from '../../contexts/RhJornadaContext';
import { proximoPasso } from '../../lib/rhJornada';
import { abrirCopilotoCom } from './RhCopilot';

const fmt = (iso: string | null | undefined) => {
  if (!iso) return '—';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
};

const DIRECAO: Record<RhDirecaoFechamento, { label: string; cls: string; Icon: React.ElementType }> = {
  melhorou: { label: 'melhorou', cls: 'text-emerald-700 bg-emerald-50 border-emerald-200', Icon: ArrowUpRight },
  piorou: { label: 'piorou', cls: 'text-red-700 bg-red-50 border-red-200', Icon: ArrowDownRight },
  estavel: { label: 'sem variação relevante', cls: 'text-gray-600 bg-gray-50 border-gray-200', Icon: Minus },
  sem_par: { label: 'sem par para comparar', cls: 'text-gray-500 bg-gray-50 border-gray-200', Icon: Minus },
};

const Seta: React.FC<{ direcao: RhDirecaoFechamento }> = ({ direcao }) => {
  const d = DIRECAO[direcao];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${d.cls}`}>
      <d.Icon className="h-3 w-3" /> {d.label}
    </span>
  );
};

const Bloco: React.FC<{ numero: number; titulo: string; Icon: React.ElementType; children: React.ReactNode }> = ({ numero, titulo, Icon, children }) => (
  <section className="rounded-xl border border-gray-100 bg-gray-50/60 p-4">
    <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-800">
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#7d4a3c] text-[11px] font-bold text-white">{numero}</span>
      <Icon className="h-4 w-4 text-[#7d4a3c]" /> {titulo}
    </h4>
    <div className="mt-3">{children}</div>
  </section>
);

export const FechamentoCiclo: React.FC<{
  campanhas: PsychosocialCampanha[];
  /** Depois de "Entendi, fechar ciclo": a tela recarrega as campanhas. */
  onLido: () => Promise<void> | void;
}> = ({ campanhas, onLido }) => {
  const { acesso } = useRhAccess();
  const jornada = useRhJornada();
  const [fechamento, setFechamento] = useState<RhFechamentoCiclo | null>(null);
  const [loading, setLoading] = useState(false);
  const [fechando, setFechando] = useState(false);
  const [emitindo, setEmitindo] = useState(false);
  const [empresa, setEmpresa] = useState<{ nome: string; cnpj: string | null } | null>(null);

  const temEncerrada = campanhas.some(c => c.status === 'encerrada');

  const carregar = useCallback(async () => {
    if (!temEncerrada) { setFechamento(null); return; }
    setLoading(true);
    try {
      const briefing = await rhAgentService.obterBriefing();
      setFechamento(briefing.fechamento_ciclo ?? null);
    } catch {
      setFechamento(null);
    } finally {
      setLoading(false);
    }
  }, [temEncerrada]);

  useEffect(() => { void carregar(); }, [carregar]);

  if (!temEncerrada || (!loading && !fechamento)) return null;

  const fecharCiclo = async () => {
    if (!fechamento) return;
    setFechando(true);
    const res = await rhService.marcarCicloLido(fechamento.campanha.id);
    setFechando(false);
    if (!res.ok) { toast.error(res.error || 'Não foi possível registrar a leitura.'); return; }
    toast.success('Ciclo fechado. O próximo passo já está no Início.');
    setFechamento(f => f ? { ...f, pendente: false, campanha: { ...f.campanha, leitura_registrada_em: new Date().toISOString() } } : f);
    await onLido();
    await jornada.recarregar();
  };

  const emitir = async () => {
    if (!fechamento) return;
    setEmitindo(true);
    try {
      let emp = empresa;
      if (!emp) {
        const perfil = await rhService.getEmpresaPerfil();
        emp = { nome: perfil?.nome ?? '—', cnpj: perfil?.cnpj ?? null };
        setEmpresa(emp);
      }
      await emitirFechamentoCiclo(fechamento, emp, { nome: acesso.nome, email: acesso.email });
    } finally {
      setEmitindo(false);
    }
  };

  // O passo que vem DEPOIS da leitura: calculado com a leitura já marcada,
  // para o RH ver aonde o botão leva antes de clicar.
  const passoSeguinte = fechamento ? proximoPasso({
    ...jornada.dados,
    campanhas: jornada.dados.campanhas.map(c =>
      c.id === fechamento.campanha.id ? { ...c, leitura_registrada_em: c.leitura_registrada_em ?? new Date().toISOString() } : c),
  }) : null;

  return (
    <div id="fechamento" className="scroll-mt-6 rounded-xl bg-white p-5 shadow">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-base font-semibold text-gray-800">
            <Flag className="h-4 w-4 text-[#7d4a3c]" />
            {fechamento ? `Fechamento do ciclo de ${fechamento.campanha.instrumento_nome.toLowerCase()}` : 'Fechamento do ciclo'}
          </h3>
          {fechamento && (
            <p className="mt-1 text-xs text-gray-500">
              {fmt(fechamento.campanha.janela_inicio)} a {fmt(fechamento.campanha.janela_fim)} · {fechamento.campanha.n_respondentes} de {fechamento.campanha.n_convidados} respostas
              {fechamento.anterior && <> · comparado com {fmt(fechamento.anterior.janela_inicio)} a {fmt(fechamento.anterior.janela_fim)}</>}
            </p>
          )}
        </div>
        {fechamento && !fechamento.pendente && (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-semibold text-green-700">
            <CheckCircle2 className="h-3.5 w-3.5" /> Ciclo lido{fechamento.campanha.leitura_registrada_em ? ` em ${fmt(fechamento.campanha.leitura_registrada_em)}` : ''}
          </span>
        )}
      </div>

      {loading && !fechamento && <p className="mt-4 text-sm text-gray-400">Montando a leitura do ciclo…</p>}

      {fechamento && (
        <div className="mt-4 space-y-3">
          <p className="rounded-lg border border-[#7d4a3c]/15 bg-[#7d4a3c]/5 px-3 py-2 text-sm leading-relaxed text-gray-700">{fechamento.resumo}</p>

          {/* 1 · O que mudou */}
          <Bloco numero={1} titulo="O que mudou" Icon={TrendingUp}>
            {fechamento.anterior ? (
              <p className="mb-3 flex items-start gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span><span className="font-semibold">Antes de ler as setas:</span> {fechamento.comparabilidade_texto}.</span>
              </p>
            ) : (
              <p className="mb-3 text-xs leading-relaxed text-gray-500">Primeiro ciclo deste instrumento: sem par para comparar. Ele vira a linha de base do próximo.</p>
            )}
            <ul className="space-y-2">
              {fechamento.indicadores.map(i => (
                <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-100 bg-white px-3 py-2">
                  <span className="text-sm text-gray-800">{i.label}</span>
                  <span className="flex items-center gap-2 text-xs text-gray-600">
                    {i.direcao === 'sem_par'
                      ? <span className="tabular-nums">{i.atual ?? 'abaixo do piso'}</span>
                      : <span className="tabular-nums">{i.anterior} → <span className="font-semibold text-gray-800">{i.atual}</span> ({i.delta! > 0 ? '+' : ''}{i.delta})</span>}
                    <Seta direcao={i.direcao} />
                  </span>
                </li>
              ))}
            </ul>
            {fechamento.setores.length > 0 && (
              <details className="mt-3 group">
                <summary className="cursor-pointer list-none text-xs font-semibold text-[#7d4a3c]">
                  Por setor ({fechamento.setores.length}{fechamento.setores_suprimidos > 0 ? ` + ${fechamento.setores_suprimidos} abaixo do piso` : ''})
                </summary>
                <ul className="mt-2 space-y-1.5">
                  {fechamento.setores.map(s => (
                    <li key={s.setor} className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-gray-700">
                      <span>{s.setor}</span>
                      <span className="flex items-center gap-2">
                        {s.suprimido
                          ? <span className="text-gray-400">abaixo do piso</span>
                          : s.direcao === 'sem_par'
                            ? <span className="tabular-nums">{s.atual}</span>
                            : <span className="tabular-nums">{s.anterior} → <span className="font-semibold">{s.atual}</span></span>}
                        {!s.suprimido && <Seta direcao={s.direcao} />}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-[11px] text-gray-400">Setores não são comparados entre si — cada um contra o próprio ciclo anterior.</p>
              </details>
            )}
          </Bloco>

          {/* 2 · O que foi feito no meio */}
          <Bloco numero={2} titulo="O que foi feito no meio" Icon={ClipboardList}>
            {fechamento.medidas_no_intervalo.length === 0 ? (
              <p className="text-xs leading-relaxed text-gray-500">
                Nenhuma medida registrada no intervalo. Se algo foi feito e não está no plano, vale registrar agora — é o que liga a leitura à ação.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {fechamento.medidas_no_intervalo.map(m => {
                  const st = STATUS_INFO[m.status as keyof typeof STATUS_INFO];
                  return (
                    <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-100 bg-white px-3 py-2 text-xs">
                      <span className="text-gray-800">{m.medida} <span className="text-gray-400">· {m.setor ?? 'toda a empresa'} · {NIVEL_LABEL[m.nivel_controle as keyof typeof NIVEL_LABEL] ?? m.nivel_controle}</span></span>
                      {st && <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${st.cls}`}>{st.label}{m.concluida_em ? ` ${fmt(m.concluida_em)}` : ''}</span>}
                    </li>
                  );
                })}
              </ul>
            )}
            {fechamento.resultados.length > 0 && (
              <div className="mt-3 space-y-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Medidas com linha de base</p>
                {fechamento.resultados.slice(0, 6).map(r => (
                  <div key={`${r.plano_acao_id}:${r.indicador}`} className={`rounded-lg border px-3 py-2 text-xs ${RESULTADO_CLS[r.classificacao]}`}>
                    <p className="font-semibold">{RESULTADO_LABEL[r.classificacao]}{r.medida ? ` · ${r.medida}` : ''}</p>
                    <p className="mt-0.5 leading-relaxed opacity-90">{r.narrativa}</p>
                  </div>
                ))}
              </div>
            )}
          </Bloco>

          {/* 3 · Próximo passo */}
          <Bloco numero={3} titulo="Próximo passo" Icon={ArrowRight}>
            {passoSeguinte && (
              <p className="text-sm leading-relaxed text-gray-700">
                <span className="font-semibold text-gray-800">{passoSeguinte.titulo}.</span> {passoSeguinte.descricao}
              </p>
            )}
            {fechamento.proximo_pico && (
              <p className="mt-2 text-xs leading-relaxed text-gray-500">Próximo pico previsto: {fechamento.proximo_pico}. Medir fora dele dá linha de base; medir dentro e fora mostra a diferença.</p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              {fechamento.pendente ? (
                <button
                  type="button"
                  onClick={() => void fecharCiclo()}
                  disabled={fechando}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#7d4a3c] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#623a2f] disabled:opacity-50"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> {fechando ? 'Fechando…' : 'Entendi, fechar ciclo'}
                </button>
              ) : passoSeguinte?.destino ? (
                <Link to={passoSeguinte.destino} className="inline-flex items-center gap-1.5 rounded-lg bg-[#7d4a3c] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#623a2f]">
                  {passoSeguinte.acao} <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              ) : null}
              <button
                type="button"
                onClick={() => abrirCopilotoCom('Como foi este ciclo comparado ao anterior?')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#7d4a3c]/30 bg-white px-3 py-2 text-xs font-semibold text-[#7d4a3c] transition hover:bg-[#7d4a3c]/5"
              >
                <Sparkles className="h-3.5 w-3.5" /> Perguntar ao copiloto
              </button>
              <button
                type="button"
                onClick={() => void emitir()}
                disabled={emitindo}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
              >
                <Download className="h-3.5 w-3.5" /> {emitindo ? 'Gerando…' : 'Registrar em PDF'}
              </button>
            </div>
          </Bloco>
        </div>
      )}
    </div>
  );
};
