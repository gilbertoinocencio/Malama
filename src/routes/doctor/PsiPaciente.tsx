// =====================================================
// Malama — Portal do psicólogo · Perfil do paciente
//
// Quatro abas: Contexto (o que aconteceu desde a última sessão), Anamnese,
// Notas da equipe e Evoluções.
//
// Tudo que aparece aqui vem das RPCs psi_* — o psicólogo não lê tabela de
// paciente diretamente. Não há peso, macro, refeição, exame nem composição
// corporal em lugar nenhum desta tela: variação de peso entra só como
// percentual, porque é critério de humor e de transtorno alimentar.
// =====================================================

import React, { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useOutletContext } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import {
  ArrowLeft, AlertTriangle, ClipboardList, NotebookPen, Users2, Activity,
  Moon, Smile, Phone, ShieldAlert, Plus, X, Info, Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  psychologyService,
  type PsiContexto, type PsiAnamnese, type PsiEvolucao,
  type NotaEquipe, type NotaVisibilidade, type CriseEvento, type CriseNivel,
  type PsiContatoEmergencia, type Srq20Aplicacao,
} from '../../services/psychologyService';
import { CORTE_REFERENCIA, CORTE_FAIXA, ITEM_RISCO } from '../../services/srq20';
import type { Doctor } from '../../types/doctorPortal';

const GRID = '#e1e0d9';
const AXIS = '#c3c2b7';
const MUTED = '#898781';
const BRAND = '#7d4a3c';

const fmtDate = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString('pt-BR') : '—';
const fmtDateTime = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  }) : '—';

const inputCls =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white ' +
  'focus:ring-2 focus:ring-[#7d4a3c] focus:border-transparent';

type Aba = 'contexto' | 'anamnese' | 'notas' | 'evolucoes';

const ABAS: { k: Aba; label: string; icon: React.ReactNode }[] = [
  { k: 'contexto',  label: 'Contexto',  icon: <Activity className="w-4 h-4" /> },
  { k: 'anamnese',  label: 'Anamnese',  icon: <ClipboardList className="w-4 h-4" /> },
  { k: 'notas',     label: 'Notas da equipe', icon: <Users2 className="w-4 h-4" /> },
  { k: 'evolucoes', label: 'Evoluções', icon: <NotebookPen className="w-4 h-4" /> },
];

const NIVEL_LABEL: Record<CriseNivel, string> = {
  ideacao: 'Ideação sem plano',
  plano: 'Ideação com plano',
  tentativa_recente: 'Tentativa recente',
  outro: 'Outro',
};

// ─── Modal de registro de crise ────────────────────────
const ModalCrise: React.FC<{
  patientId: string;
  doctorId: string;
  onFechar: () => void;
  onRegistrado: () => void;
}> = ({ patientId, doctorId, onFechar, onRegistrado }) => {
  const [nivel, setNivel] = useState<CriseNivel>('ideacao');
  const [acoes, setAcoes] = useState('');
  const [contatoAcionado, setContatoAcionado] = useState(false);
  const [encaminhamento, setEncaminhamento] = useState('');
  const [salvando, setSalvando] = useState(false);

  const submeter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acoes.trim()) { toast.error('Descreva a conduta adotada.'); return; }
    setSalvando(true);
    try {
      const res = await psychologyService.registrarCrise({
        patient_id: patientId,
        psychologist_id: doctorId,
        consultation_id: null,
        nivel,
        acoes_tomadas: acoes.trim(),
        contato_acionado: contatoAcionado,
        encaminhamento: encaminhamento.trim() || null,
      });
      if (!res.ok) { toast.error(res.error || 'Não foi possível registrar.'); return; }
      toast.success('Registro salvo.');
      onRegistrado();
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onFechar} />
      <form
        onSubmit={submeter}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col"
      >
        <div className="bg-[#1A1A1A] px-6 py-4 flex items-center justify-between flex-shrink-0">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <ShieldAlert className="w-5 h-5" /> Registro de episódio de risco
          </h2>
          <button type="button" onClick={onFechar} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          <p className="text-xs text-gray-500 leading-snug bg-amber-50 border border-amber-100 rounded-lg p-3">
            Este é o registro da <strong>sua</strong> conduta. O sistema não aciona ninguém
            automaticamente: quebra de sigilo por risco à vida é decisão clínica sua, e um
            gatilho automático transformaria falso positivo em quebra indevida.
          </p>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nível</label>
            <select
              value={nivel} onChange={e => setNivel(e.target.value as CriseNivel)}
              className={inputCls}
            >
              {(Object.keys(NIVEL_LABEL) as CriseNivel[]).map(n => (
                <option key={n} value={n}>{NIVEL_LABEL[n]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Conduta adotada</label>
            <textarea
              required rows={4} value={acoes} onChange={e => setAcoes(e.target.value)}
              className={inputCls}
              placeholder="O que foi avaliado, o que foi combinado, o que foi orientado."
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox" checked={contatoAcionado}
              onChange={e => setContatoAcionado(e.target.checked)}
              className="w-4 h-4 rounded accent-[#7d4a3c]"
            />
            <span className="text-sm text-gray-700">Contato de emergência foi acionado</span>
          </label>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Encaminhamento <span className="font-normal text-gray-400">— opcional</span>
            </label>
            <input
              value={encaminhamento} onChange={e => setEncaminhamento(e.target.value)}
              className={inputCls} placeholder="CAPS, psiquiatra, emergência, rede própria..."
            />
          </div>
        </div>

        <div className="p-6 pt-0 flex gap-3">
          <button
            type="button" onClick={onFechar}
            className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition"
          >
            Cancelar
          </button>
          <button
            type="submit" disabled={salvando}
            className="flex-1 py-2.5 bg-[#7d4a3c] hover:bg-[#623a2f] text-white text-sm font-semibold rounded-xl transition disabled:opacity-60"
          >
            {salvando ? 'Salvando...' : 'Registrar'}
          </button>
        </div>
      </form>
    </div>
  );
};

// ─── Página ────────────────────────────────────────────
export const PsiPaciente: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { doctor } = useOutletContext<{ doctor: Doctor }>();

  const [aba, setAba] = useState<Aba>('contexto');
  const [ctx, setCtx] = useState<PsiContexto | null>(null);
  const [anamnese, setAnamnese] = useState<PsiAnamnese | null>(null);
  const [notas, setNotas] = useState<NotaEquipe[]>([]);
  const [evolucoes, setEvolucoes] = useState<PsiEvolucao[]>([]);
  const [crises, setCrises] = useState<CriseEvento[]>([]);
  const [srq, setSrq] = useState<Srq20Aplicacao[]>([]);
  const [loading, setLoading] = useState(true);

  const [contato, setContato] = useState<PsiContatoEmergencia | null>(null);
  const [mostrarCrise, setMostrarCrise] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    const [c, a, n, e, cr, s] = await Promise.all([
      psychologyService.getContexto(id),
      psychologyService.getAnamnese(id),
      psychologyService.getNotasEquipe(id),
      psychologyService.getEvolucoes(id),
      psychologyService.getCrises(id),
      psychologyService.getSrq20(id),
    ]);
    setCtx(c); setAnamnese(a); setNotas(n); setEvolucoes(e); setCrises(cr); setSrq(s);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7d4a3c]" />
      </div>
    );
  }

  if (!ctx) {
    return (
      <div className="bg-white rounded-xl shadow p-10 text-center">
        <AlertTriangle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-600 font-medium">Paciente não disponível.</p>
        <p className="text-gray-400 text-sm mt-1">
          Você só acessa o perfil de pessoas que atende.
        </p>
        <Link to="/medico/psi/pacientes" className="inline-block mt-4 text-sm text-[#7d4a3c] hover:underline">
          Voltar
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        to="/medico/psi/pacientes"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition"
      >
        <ArrowLeft className="w-4 h-4" /> Pacientes
      </Link>

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">{ctx.paciente.nome ?? 'Paciente'}</h1>
          <p className="text-sm text-gray-500">
            {ctx.paciente.idade ? `${ctx.paciente.idade} anos · ` : ''}
            {ctx.sessoes?.realizadas ?? 0} sessões
            {ctx.sessoes?.ultima ? ` · última em ${fmtDate(ctx.sessoes.ultima)}` : ''}
          </p>
        </div>
        <button
          onClick={() => setMostrarCrise(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 text-sm font-semibold rounded-lg transition"
        >
          <ShieldAlert className="w-4 h-4" /> Registrar risco
        </button>
      </div>

      {/* Abas */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1 -mb-px overflow-x-auto">
          {ABAS.map(t => (
            <button
              key={t.k} onClick={() => setAba(t.k)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition ${
                aba === t.k
                  ? 'border-[#7d4a3c] text-[#7d4a3c]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.icon}{t.label}
            </button>
          ))}
        </nav>
      </div>

      {aba === 'contexto' && (
        <AbaContexto
          ctx={ctx}
          crises={crises}
          srq={srq}
          contato={contato}
          onRevelarContato={async () => {
            const c = await psychologyService.getContatoEmergencia(id!);
            if (!c || (!c.nome && !c.telefone)) {
              toast('O paciente ainda não cadastrou contato de emergência.', { icon: 'ℹ️' });
              return;
            }
            setContato(c);
          }}
        />
      )}

      {aba === 'anamnese' && (
        <AbaAnamnese
          patientId={id!}
          doctorId={doctor.id}
          anamnese={anamnese}
          onSalvo={load}
        />
      )}

      {aba === 'notas' && (
        <AbaNotas
          patientId={id!}
          doctorId={doctor.id}
          notas={notas}
          onMudou={load}
        />
      )}

      {aba === 'evolucoes' && <AbaEvolucoes evolucoes={evolucoes} />}

      {mostrarCrise && (
        <ModalCrise
          patientId={id!}
          doctorId={doctor.id}
          onFechar={() => setMostrarCrise(false)}
          onRegistrado={() => { setMostrarCrise(false); load(); }}
        />
      )}
    </div>
  );
};

// ─── Aba: contexto ─────────────────────────────────────
const AbaContexto: React.FC<{
  ctx: PsiContexto;
  crises: CriseEvento[];
  srq: Srq20Aplicacao[];
  contato: PsiContatoEmergencia | null;
  onRevelarContato: () => void;
}> = ({ ctx, crises, srq, contato, onRevelarContato }) => {
  const checkins = ctx.checkins ?? [];
  const ultimos14 = checkins.slice(-14);

  const media = (vals: (number | null)[]) => {
    const v = vals.filter((x): x is number => x != null);
    return v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10 : null;
  };

  const humorMedio = media(ultimos14.map(c => c.humor));
  const sonoMedio = media(ultimos14.map(c => c.sono_horas));
  const minutosSemana = ctx.atividade?.length
    ? ctx.atividade[ctx.atividade.length - 1].minutos : null;

  const who5Serie = (ctx.who5 ?? []).map(w => ({
    mes: new Date(w.mes + 'T00:00:00').toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
    score: w.score,
  }));

  return (
    <div className="space-y-6">
      {/* Alertas — regra determinística, não interpretação */}
      {ctx.alertas?.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <p className="text-sm font-semibold text-amber-900">Sinais desde a última sessão</p>
          </div>
          <ul className="space-y-1">
            {ctx.alertas.map(a => (
              <li key={a.codigo} className="text-sm text-amber-800 leading-snug">• {a.texto}</li>
            ))}
          </ul>
          <p className="text-[11px] text-amber-700 mt-2 leading-snug">
            São sinalizadores calculados por regra fixa sobre dados registrados — não são
            avaliação clínica nem sugestão de diagnóstico.
          </p>
        </div>
      )}

      {/* Números do período */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
            <Smile className="w-4 h-4" />
          </div>
          <p className="text-2xl font-bold text-gray-800">{humorMedio ?? '—'}</p>
          <p className="text-xs text-gray-500 mt-1">Humor médio (14d)</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
            <Moon className="w-4 h-4" />
          </div>
          <p className="text-2xl font-bold text-gray-800">{sonoMedio ? `${sonoMedio}h` : '—'}</p>
          <p className="text-xs text-gray-500 mt-1">Sono médio (14d)</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
            <Activity className="w-4 h-4" />
          </div>
          <p className="text-2xl font-bold text-gray-800">{minutosSemana ?? '—'}</p>
          <p className="text-xs text-gray-500 mt-1">Min. ativos (semana)</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <p className="text-2xl font-bold text-gray-800">
            {ctx.peso_variacao_pct != null ? `${ctx.peso_variacao_pct > 0 ? '+' : ''}${ctx.peso_variacao_pct}%` : '—'}
          </p>
          <p className="text-xs text-gray-500 mt-1">Variação de peso (90d)</p>
        </div>
      </div>

      {/* WHO-5 — série única, sem legenda: o título nomeia a série */}
      <div className="bg-white rounded-xl shadow p-5">
        <h2 className="font-semibold text-gray-800 mb-1">Índice de bem-estar (WHO-5)</h2>
        <p className="text-sm text-gray-500 mb-4">
          Autorrelato mensal, 0 a 100. A linha marca 50 — abaixo dela, bem-estar reduzido.
        </p>
        {who5Serie.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-6 text-center text-sm text-gray-400">
            Sem respostas registradas ainda.
          </div>
        ) : (
          <div className="h-56 -ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={who5Serie} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
                <CartesianGrid stroke={GRID} strokeDasharray="0" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: MUTED }}
                       tickLine={false} axisLine={{ stroke: AXIS }} />
                <YAxis domain={[0, 100]} tickCount={5} width={36}
                       tick={{ fontSize: 11, fill: MUTED }}
                       tickLine={false} axisLine={{ stroke: AXIS }} />
                <ReferenceLine y={50} stroke={AXIS} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #eee' }}
                  labelStyle={{ color: '#52514e' }}
                />
                <Line type="monotone" dataKey="score" stroke={BRAND} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Check-ins recentes — gêmeo em tabela do que os cards resumem */}
      {ultimos14.length > 0 && (
        <div className="bg-white rounded-xl shadow p-5">
          <h2 className="font-semibold text-gray-800 mb-3">Check-ins recentes</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 border-b border-gray-100">
                  <th className="text-left font-medium py-2">Data</th>
                  <th className="text-right font-medium py-2">Humor</th>
                  <th className="text-right font-medium py-2">Energia</th>
                  <th className="text-right font-medium py-2 hidden sm:table-cell">Motivação</th>
                  <th className="text-right font-medium py-2">Sono</th>
                  <th className="text-right font-medium py-2 hidden sm:table-cell">Qualidade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {[...ultimos14].reverse().map(c => (
                  <tr key={c.data}>
                    <td className="py-1.5 text-gray-500 text-xs">{fmtDate(c.data)}</td>
                    <td className="py-1.5 text-right tabular-nums text-gray-800">{c.humor ?? '—'}</td>
                    <td className="py-1.5 text-right tabular-nums text-gray-500">{c.energia ?? '—'}</td>
                    <td className="py-1.5 text-right tabular-nums text-gray-500 hidden sm:table-cell">{c.motivacao ?? '—'}</td>
                    <td className="py-1.5 text-right tabular-nums text-gray-800">
                      {c.sono_horas != null ? `${c.sono_horas}h` : '—'}
                    </td>
                    <td className="py-1.5 text-right tabular-nums text-gray-500 hidden sm:table-cell">{c.sono_qualidade ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SRQ-20 — histórico de aplicações, visível a quem assumir o caso */}
      {srq.length > 0 && (
        <div className="bg-white rounded-xl shadow p-5">
          <h2 className="font-semibold text-gray-800 mb-1">SRQ-20 aplicado</h2>
          <p className="text-sm text-gray-500 mb-3">
            Rastreio de transtornos mentais comuns. Escore de 0 a 20.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 border-b border-gray-100">
                  <th className="text-left font-medium py-2">Data</th>
                  <th className="text-right font-medium py-2">Escore</th>
                  <th className="text-left font-medium py-2 pl-4">Item de ideação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {srq.map(a => (
                  <tr key={a.id}>
                    <td className="py-2 text-gray-500 text-xs">{fmtDateTime(a.created_at)}</td>
                    <td className={`py-2 text-right font-bold tabular-nums ${
                      a.score >= CORTE_REFERENCIA ? 'text-amber-600' : 'text-gray-800'
                    }`}>
                      {a.score}
                    </td>
                    <td className="py-2 pl-4">
                      {a.item_risco
                        ? <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600">
                            <ShieldAlert className="w-3.5 h-3.5" /> Afirmativo
                          </span>
                        : <span className="text-xs text-gray-400">Negativo</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400 mt-3 leading-snug">
            Rastreio, não diagnóstico. O ponto de corte varia na literatura brasileira
            ({CORTE_FAIXA}); {CORTE_REFERENCIA} é o mais citado. "Item de ideação" refere-se a{' '}
            <em>{ITEM_RISCO.texto}</em>
          </p>
        </div>
      )}

      {/* Contato de emergência — revelado por ato deliberado */}
      <div className="bg-white rounded-xl shadow p-5">
        <div className="flex items-center gap-2 mb-1">
          <Phone className="w-5 h-5 text-[#7d4a3c]" />
          <h2 className="font-semibold text-gray-800">Contato de emergência</h2>
        </div>
        {contato ? (
          <p className="text-sm text-gray-700 mt-2">
            <strong>{contato.nome ?? '—'}</strong>
            {contato.relacao ? ` (${contato.relacao})` : ''} · {contato.telefone ?? '—'}
          </p>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-3">
              Fica oculto por padrão. Revele quando houver necessidade clínica.
            </p>
            <button
              onClick={onRevelarContato}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition"
            >
              Ver contato
            </button>
          </>
        )}
      </div>

      {/* Histórico de risco */}
      {crises.length > 0 && (
        <div className="bg-white rounded-xl shadow p-5">
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert className="w-5 h-5 text-red-500" />
            <h2 className="font-semibold text-gray-800">Episódios de risco registrados</h2>
          </div>
          <div className="space-y-3">
            {crises.map(c => (
              <div key={c.id} className="border-l-2 border-red-200 pl-3">
                <p className="text-xs text-gray-400">
                  {fmtDateTime(c.created_at)} · {NIVEL_LABEL[c.nivel]}
                  {c.contato_acionado && ' · contato acionado'}
                </p>
                <p className="text-sm text-gray-700 leading-snug mt-0.5">{c.acoes_tomadas}</p>
                {c.encaminhamento && (
                  <p className="text-xs text-gray-500 mt-0.5">Encaminhamento: {c.encaminhamento}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Aba: anamnese ─────────────────────────────────────
const CAMPOS: { k: keyof PsiAnamnese; label: string; rows: number; hint?: string }[] = [
  { k: 'queixa_inicial', label: 'Queixa inicial', rows: 3 },
  { k: 'diagnosticos_previos', label: 'Diagnósticos prévios', rows: 2 },
  { k: 'medicacoes_psiquiatricas', label: 'Medicações psiquiátricas em uso', rows: 2 },
  { k: 'psicoterapia_anterior', label: 'Psicoterapia anterior', rows: 2, hint: 'Quando, por quanto tempo, como terminou.' },
  { k: 'historico_familiar', label: 'Histórico familiar', rows: 2 },
  { k: 'uso_substancias', label: 'Uso de substâncias', rows: 2 },
  { k: 'rede_apoio', label: 'Rede de apoio', rows: 2 },
];

const AbaAnamnese: React.FC<{
  patientId: string;
  doctorId: string;
  anamnese: PsiAnamnese | null;
  onSalvo: () => void;
}> = ({ patientId, doctorId, anamnese, onSalvo }) => {
  const [form, setForm] = useState<Partial<PsiAnamnese>>(anamnese ?? {});
  const [salvando, setSalvando] = useState(false);

  const set = <K extends keyof PsiAnamnese>(k: K, v: PsiAnamnese[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  const salvar = async () => {
    setSalvando(true);
    try {
      const res = await psychologyService.salvarAnamnese(patientId, doctorId, form);
      if (!res.ok) { toast.error(res.error || 'Não foi possível salvar.'); return; }
      toast.success('Anamnese salva.');
      onSalvo();
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow p-5 space-y-4">
      <div>
        <h2 className="font-semibold text-gray-800">Anamnese</h2>
        <p className="text-sm text-gray-500">
          História factual do paciente. Diferente das evoluções, é lida por{' '}
          <strong>qualquer psicólogo</strong> que o atenda — é o que evita a pessoa recontar tudo
          numa eventual troca de profissional.
        </p>
      </div>

      {CAMPOS.map(c => (
        <div key={c.k}>
          <label className="block text-xs font-medium text-gray-600 mb-1">{c.label}</label>
          <textarea
            rows={c.rows}
            value={(form[c.k] as string) ?? ''}
            onChange={e => set(c.k, e.target.value as any)}
            className={inputCls}
          />
          {c.hint && <p className="text-xs text-gray-400 mt-1">{c.hint}</p>}
        </div>
      ))}

      <div className="border-t border-gray-100 pt-4">
        <label className="flex items-center gap-2 cursor-pointer mb-2">
          <input
            type="checkbox"
            checked={form.historico_tentativa === true}
            onChange={e => set('historico_tentativa', e.target.checked)}
            className="w-4 h-4 rounded accent-[#7d4a3c]"
          />
          <span className="text-sm font-medium text-gray-700">
            Histórico de tentativa de suicídio
          </span>
        </label>
        {form.historico_tentativa && (
          <textarea
            rows={2}
            value={form.historico_tentativa_obs ?? ''}
            onChange={e => set('historico_tentativa_obs', e.target.value)}
            className={inputCls}
            placeholder="Quando, contexto, acompanhamento posterior."
          />
        )}
        <p className="text-xs text-gray-400 mt-1.5">
          Campo separado de propósito: muda conduta desde a primeira sessão e não pode ficar
          diluído em texto livre.
        </p>
      </div>

      <button
        onClick={salvar} disabled={salvando}
        className="px-5 py-2.5 bg-[#7d4a3c] hover:bg-[#623a2f] text-white text-sm font-semibold rounded-lg transition disabled:opacity-50"
      >
        {salvando ? 'Salvando...' : 'Salvar anamnese'}
      </button>

      {anamnese?.updated_at && (
        <p className="text-xs text-gray-400">
          Última atualização em {fmtDateTime(anamnese.updated_at)}.
        </p>
      )}
    </div>
  );
};

// ─── Aba: notas da equipe ──────────────────────────────
const VISIBILIDADES: { v: NotaVisibilidade; label: string; quem: string }[] = [
  { v: 'equipe_clinica', label: 'Equipe clínica',
    quem: 'Será lida pelo médico e por psicólogos que atendem este paciente.' },
  { v: 'psicologia', label: 'Só psicologia',
    quem: 'Será lida apenas por psicólogos que atendem este paciente. O médico não vê.' },
];

const AbaNotas: React.FC<{
  patientId: string;
  doctorId: string;
  notas: NotaEquipe[];
  onMudou: () => void;
}> = ({ patientId, doctorId, notas, onMudou }) => {
  const [visibilidade, setVisibilidade] = useState<NotaVisibilidade>('equipe_clinica');
  const [texto, setTexto] = useState('');
  const [salvando, setSalvando] = useState(false);

  const escolhida = VISIBILIDADES.find(v => v.v === visibilidade)!;

  const criar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!texto.trim()) return;
    setSalvando(true);
    try {
      const res = await psychologyService.criarNotaEquipe(
        patientId, doctorId, visibilidade, texto.trim(),
      );
      if (!res.ok) { toast.error(res.error || 'Não foi possível salvar.'); return; }
      setTexto('');
      toast.success('Nota compartilhada.');
      onMudou();
    } finally {
      setSalvando(false);
    }
  };

  const excluir = async (n: NotaEquipe) => {
    if (!confirm('Excluir esta nota?')) return;
    const res = await psychologyService.excluirNotaEquipe(n.id);
    if (!res.ok) { toast.error(res.error || 'Não foi possível excluir.'); return; }
    onMudou();
  };

  return (
    <div className="space-y-6">
      <form onSubmit={criar} className="bg-white rounded-xl shadow p-5 space-y-3">
        <div>
          <h2 className="font-semibold text-gray-800">Nova nota</h2>
          <p className="text-sm text-gray-500">
            Isto <strong>não</strong> é o seu prontuário — é o que você quer que outro profissional
            saiba. O que você anota sobre a sessão vai na aba Evoluções, e não sai de lá.
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Quem vai ler</label>
          <div className="flex flex-wrap gap-1.5">
            {VISIBILIDADES.map(v => (
              <button
                key={v.v} type="button" onClick={() => setVisibilidade(v.v)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition ${
                  visibilidade === v.v
                    ? 'border-[#7d4a3c] bg-[#7d4a3c] text-white'
                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
          {/* O aviso de audiência fica visível ANTES de escrever, de propósito */}
          <p className="text-xs text-[#7d4a3c] mt-2 font-medium">{escolhida.quem}</p>
        </div>

        <textarea
          rows={3} value={texto} onChange={e => setTexto(e.target.value)}
          className={inputCls}
          placeholder="Ex.: relata insônia e cefaleia frequentes; vale checar interação com a medicação em uso."
        />

        <button
          type="submit" disabled={salvando || !texto.trim()}
          className="inline-flex items-center gap-1.5 px-5 py-2 bg-[#7d4a3c] hover:bg-[#623a2f] text-white text-sm font-semibold rounded-lg transition disabled:opacity-50"
        >
          <Plus className="w-4 h-4" /> {salvando ? 'Salvando...' : 'Compartilhar'}
        </button>
      </form>

      {notas.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-8 text-center text-sm text-gray-400">
          Nenhuma nota compartilhada sobre este paciente ainda.
        </div>
      ) : (
        <div className="space-y-2">
          {notas.map(n => (
            <div key={n.id} className="bg-white rounded-xl shadow p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      n.visibilidade === 'psicologia'
                        ? 'bg-[#7d4a3c]/10 text-[#7d4a3c]'
                        : 'bg-blue-50 text-blue-700'
                    }`}>
                      {n.visibilidade === 'psicologia' ? 'Só psicologia' : 'Equipe clínica'}
                    </span>
                    <span className="text-xs text-gray-400">{fmtDateTime(n.created_at)}</span>
                  </div>
                  <p className="text-sm text-gray-700 leading-snug">{n.texto}</p>
                </div>
                {n.author_doctor_id === doctorId && (
                  <button
                    onClick={() => excluir(n)} title="Excluir"
                    className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition flex-shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-start gap-2 text-xs text-gray-400 px-1">
        <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
        <span>
          Notas não são editáveis depois de criadas — outro profissional pode já tê-las usado na
          conduta. Para corrigir, apague e escreva uma nova.
        </span>
      </div>
    </div>
  );
};

// ─── Aba: evoluções ────────────────────────────────────
const AbaEvolucoes: React.FC<{ evolucoes: PsiEvolucao[] }> = ({ evolucoes }) => (
  <div className="space-y-4">
    <div className="flex items-start gap-2 text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-lg p-3">
      <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
      <span>
        Estas são <strong>as suas</strong> evoluções. Nenhum outro profissional as lê — nem outro
        psicólogo, nem o médico, nem a empresa. O registro da sessão é feito dentro da sala de
        atendimento.
      </span>
    </div>

    {evolucoes.length === 0 ? (
      <div className="bg-white rounded-xl shadow p-8 text-center text-sm text-gray-400">
        Nenhuma evolução registrada ainda.
      </div>
    ) : (
      evolucoes.map(e => (
        <div key={e.id} className="bg-white rounded-xl shadow p-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-gray-400">{fmtDateTime(e.created_at)}</span>
            {e.is_draft && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700">
                Rascunho
              </span>
            )}
          </div>
          {e.queixa && (
            <p className="text-sm text-gray-700 mb-1.5">
              <span className="text-gray-400">Queixa:</span> {e.queixa}
            </p>
          )}
          {e.evolucao && <p className="text-sm text-gray-700 leading-snug mb-1.5">{e.evolucao}</p>}
          {e.plano && (
            <p className="text-sm text-gray-600 leading-snug">
              <span className="text-gray-400">Plano:</span> {e.plano}
            </p>
          )}
          {e.observacoes && (
            <p className="text-xs text-gray-500 mt-2 bg-gray-50 rounded-lg px-2.5 py-1.5 leading-snug">
              {e.observacoes}
            </p>
          )}
        </div>
      ))
    )}
  </div>
);
