// =====================================================
// Malama — Sala de atendimento do psicólogo
//
// Reaproveita o que já existe e funciona: o hook useWebRTC e o VideoStream
// são exatamente os mesmos da sala do médico. O gate de horário (abre 15 min
// antes, expira 30 min depois) fica em ConsultationRoom e serve os dois.
//
// O que muda é o painel lateral: sem receita, sem exames, sem métricas
// clínicas, sem chat. No lugar entram evolução da sessão, notas
// interprofissionais e o registro de risco.
//
// ⚠️ SINCRONIA: o ciclo de vida da consulta (in_progress ao conectar,
// ended_at ao encerrar, completed ao finalizar) é o mesmo de
// DoctorConsultaPage. Não extraí para um hook comum porque isso exigiria
// refatorar um fluxo de vídeo em produção que não tenho como testar
// ponta a ponta. Se mudar a máquina de estados lá, mudar aqui também.
// =====================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useWebRTC } from '../hooks/useWebRTC';
import { VideoStream } from './VideoStream';
import { supabase } from '../services/supabase';
import toast from 'react-hot-toast';
import {
  Minimize2, Maximize2, Mic, MicOff, Video, VideoOff, PhoneOff,
  NotebookPen, Users2, ShieldAlert, Activity, Save, CheckCircle,
  Phone, AlertTriangle, Info,
} from 'lucide-react';
import {
  psychologyService,
  type PsiContexto, type NotaVisibilidade,
  type CriseNivel, type PsiContatoEmergencia,
} from '../services/psychologyService';

interface PsiConsultaPageProps {
  consultationId: string;
  roomId: string;
  patientId: string;
  doctorId: string;
  patientName: string;
  onEnd: () => void;
}

type TabKey = 'contexto' | 'evolucao' | 'notas' | 'risco';

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'contexto', label: 'Contexto', icon: <Activity className="w-3.5 h-3.5" /> },
  { key: 'evolucao', label: 'Evolução', icon: <NotebookPen className="w-3.5 h-3.5" /> },
  { key: 'notas',    label: 'Notas',    icon: <Users2 className="w-3.5 h-3.5" /> },
  { key: 'risco',    label: 'Risco',    icon: <ShieldAlert className="w-3.5 h-3.5" /> },
];

const NIVEL_LABEL: Record<CriseNivel, string> = {
  ideacao: 'Ideação sem plano',
  plano: 'Ideação com plano',
  tentativa_recente: 'Tentativa recente',
  outro: 'Outro',
};

const fieldCls =
  'w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-100 ' +
  'placeholder:text-stone-500 focus:ring-1 focus:ring-green-500 focus:border-green-500';

export const PsiConsultaPage: React.FC<PsiConsultaPageProps> = ({
  consultationId, roomId, patientId, doctorId, patientName, onEnd,
}) => {
  const [videoMinimized, setVideoMinimized] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [tab, setTab] = useState<TabKey>('contexto');
  const [callEnded, setCallEnded] = useState(false);
  const [endingCall, setEndingCall] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // O cronômetro conta a partir do horário agendado, não da entrada na sala —
  // o profissional pode entrar até 15 min antes.
  const scheduledAtMsRef = useRef<number | null>(null);

  // Evolução (prontuário)
  const [noteId, setNoteId] = useState<string | null>(null);
  const [queixa, setQueixa] = useState('');
  const [evolucao, setEvolucao] = useState('');
  const [plano, setPlano] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [salvoEm, setSalvoEm] = useState<string | null>(null);
  const autosave = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Contexto
  const [ctx, setCtx] = useState<PsiContexto | null>(null);

  // Notas interprofissionais
  const [notaVis, setNotaVis] = useState<NotaVisibilidade>('equipe_clinica');
  const [notaTexto, setNotaTexto] = useState('');

  // Risco
  const [contato, setContato] = useState<PsiContatoEmergencia | null>(null);
  const [criseNivel, setCriseNivel] = useState<CriseNivel>('ideacao');
  const [criseAcoes, setCriseAcoes] = useState('');
  const [criseContato, setCriseContato] = useState(false);
  const [criseEncaminhamento, setCriseEncaminhamento] = useState('');

  const {
    localStream, remoteStream, connectionState,
    startCall, endCall, toggleMute, toggleCamera,
    isMuted, isCameraOff, error,
  } = useWebRTC({
    roomId,
    role: 'doctor',
    onConnected: () => {
      const tick = () => {
        const anchor = scheduledAtMsRef.current;
        if (anchor != null) setElapsed(Math.max(0, Math.floor((Date.now() - anchor) / 1000)));
        else setElapsed(e => e + 1);
      };
      tick();
      timerRef.current = setInterval(tick, 1000);
      supabase.from('consultations')
        .update({ status: 'in_progress', started_at: new Date().toISOString() })
        .eq('id', consultationId);
    },
    onDisconnected: () => { if (timerRef.current) clearInterval(timerRef.current); },
  });

  useEffect(() => {
    supabase.from('consultations')
      .select('scheduled_at')
      .eq('id', consultationId)
      .single()
      .then(({ data }) => {
        if (data?.scheduled_at) scheduledAtMsRef.current = new Date(data.scheduled_at).getTime();
      });
  }, [consultationId]);

  // Contexto e rascunho de evolução desta consulta
  useEffect(() => {
    psychologyService.getContexto(patientId).then(setCtx);

    psychologyService.getEvolucoes(patientId).then(list => {
      const desta = list.find(e => e.consultation_id === consultationId);
      if (desta) {
        setNoteId(desta.id);
        setQueixa(desta.queixa ?? '');
        setEvolucao(desta.evolucao ?? '');
        setPlano(desta.plano ?? '');
        setObservacoes(desta.observacoes ?? '');
      }
    });
  }, [patientId, consultationId]);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const salvarEvolucao = useCallback(async (finalizar = false) => {
    setSalvando(true);
    try {
      const res = await psychologyService.salvarEvolucao({
        ...(noteId ? { id: noteId } : {}),
        consultation_id: consultationId,
        psychologist_id: doctorId,
        patient_id: patientId,
        queixa, evolucao, plano, observacoes,
        is_draft: !finalizar,
      } as any);
      if (!res.ok) { toast.error(res.error || 'Não foi possível salvar.'); return false; }
      if (res.id) setNoteId(res.id);
      setSalvoEm(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
      return true;
    } finally {
      setSalvando(false);
    }
  }, [noteId, consultationId, doctorId, patientId, queixa, evolucao, plano, observacoes]);

  // Autosave em rascunho: o profissional escreve durante o atendimento e não
  // deveria perder texto se a conexão cair.
  useEffect(() => {
    if (!queixa && !evolucao && !plano && !observacoes) return;
    if (autosave.current) clearTimeout(autosave.current);
    autosave.current = setTimeout(() => { salvarEvolucao(false); }, 4000);
    return () => { if (autosave.current) clearTimeout(autosave.current); };
  }, [queixa, evolucao, plano, observacoes, salvarEvolucao]);

  const fmtTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const handleEndCall = async () => {
    setEndingCall(true);
    endCall();
    if (timerRef.current) clearInterval(timerRef.current);
    setEndingCall(false);
    await supabase.from('consultations')
      .update({ ended_at: new Date().toISOString() })
      .eq('id', consultationId);
    setCallEnded(true);
    setTab('evolucao');
    toast('Registre a evolução para finalizar o atendimento.', { icon: '📝', duration: 5000 });
  };

  const finalizar = async () => {
    if (!evolucao.trim()) {
      toast.error('Descreva a evolução da sessão antes de finalizar.');
      setTab('evolucao');
      return;
    }
    const ok = await salvarEvolucao(true);
    if (!ok) return;
    await supabase.from('consultations')
      .update({ status: 'completed' })
      .eq('id', consultationId);
    toast.success('Atendimento finalizado.');
    onEnd();
  };

  const criarNota = async () => {
    if (!notaTexto.trim()) return;
    const res = await psychologyService.criarNotaEquipe(
      patientId, doctorId, notaVis, notaTexto.trim(), consultationId,
    );
    if (!res.ok) { toast.error(res.error || 'Não foi possível salvar.'); return; }
    setNotaTexto('');
    toast.success('Nota compartilhada.');
  };

  const registrarCrise = async () => {
    if (!criseAcoes.trim()) { toast.error('Descreva a conduta adotada.'); return; }
    const res = await psychologyService.registrarCrise({
      patient_id: patientId,
      psychologist_id: doctorId,
      consultation_id: consultationId,
      nivel: criseNivel,
      acoes_tomadas: criseAcoes.trim(),
      contato_acionado: criseContato,
      encaminhamento: criseEncaminhamento.trim() || null,
    });
    if (!res.ok) { toast.error(res.error || 'Não foi possível registrar.'); return; }
    setCriseAcoes(''); setCriseEncaminhamento(''); setCriseContato(false);
    toast.success('Registro de risco salvo.');
  };

  return (
    <div className="min-h-screen bg-[#1A1A1A] flex flex-col">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-stone-800">
        <div className="min-w-0">
          <p className="text-white font-semibold truncate">{patientName}</p>
          <p className="text-xs text-stone-400">
            {connectionState === 'connected' ? 'Conectado'
              : callEnded ? 'Chamada encerrada' : 'Aguardando o paciente...'}
          </p>
        </div>
        <div className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-bold tabular-nums bg-stone-800 text-stone-300">
          <span>{fmtTime(elapsed)}</span>
        </div>
      </div>

      {error && (
        <div className="mx-4 mt-3 flex items-start gap-2 text-xs text-red-300 bg-red-950/40 border border-red-900 rounded-lg p-2.5">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Vídeo */}
      {!callEnded && (
        <div className={`relative mx-4 mt-3 rounded-xl overflow-hidden bg-black ${
          videoMinimized ? 'h-24' : 'h-64 sm:h-80'
        }`}>
          {remoteStream
            ? <VideoStream stream={remoteStream} className="w-full h-full object-cover" />
            : (
              <div className="w-full h-full flex flex-col items-center justify-center text-stone-500">
                <Video className="w-8 h-8 mb-2" />
                <p className="text-xs">Aguardando o paciente entrar</p>
                {!localStream && (
                  <button
                    onClick={startCall}
                    className="mt-3 px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold rounded-lg transition"
                  >
                    Entrar na sala
                  </button>
                )}
              </div>
            )}

          {localStream && (
            <div className="absolute bottom-2 right-2 w-24 h-32 rounded-lg overflow-hidden border border-stone-700">
              <VideoStream stream={localStream} muted mirror className="w-full h-full object-cover" />
            </div>
          )}

          <button
            onClick={() => setVideoMinimized(v => !v)}
            className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 text-white hover:bg-black/70 transition"
          >
            {videoMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </button>
        </div>
      )}

      {/* Controles */}
      {!callEnded && localStream && (
        <div className="flex items-center justify-center gap-3 py-3">
          <button onClick={toggleMute}
            className={`p-3 rounded-full transition ${isMuted ? 'bg-red-600 text-white' : 'bg-stone-800 text-stone-300 hover:bg-stone-700'}`}>
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
          <button onClick={toggleCamera}
            className={`p-3 rounded-full transition ${isCameraOff ? 'bg-red-600 text-white' : 'bg-stone-800 text-stone-300 hover:bg-stone-700'}`}>
            {isCameraOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
          </button>
          <button onClick={handleEndCall} disabled={endingCall}
            className="p-3 rounded-full bg-red-600 hover:bg-red-500 text-white transition disabled:opacity-50">
            <PhoneOff className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Abas */}
      <div className="px-4 border-b border-stone-800">
        <nav className="flex gap-1 -mb-px overflow-x-auto">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 whitespace-nowrap transition ${
                tab === t.key ? 'text-green-400 border-green-400' : 'text-stone-400 border-transparent hover:text-stone-200'
              }`}>
              {t.icon}{t.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex-1 p-4 space-y-4">
        {/* ── Contexto ── */}
        {tab === 'contexto' && (
          <>
            {ctx?.alertas?.length ? (
              <div className="bg-amber-950/30 border border-amber-900/50 rounded-xl p-3">
                <p className="text-xs font-semibold text-amber-300 mb-1.5">
                  Sinais desde a última sessão
                </p>
                <ul className="space-y-1">
                  {ctx.alertas.map(a => (
                    <li key={a.codigo} className="text-xs text-amber-200/90 leading-snug">• {a.texto}</li>
                  ))}
                </ul>
                <p className="text-[10px] text-amber-200/50 mt-1.5 leading-snug">
                  Sinalizadores por regra fixa sobre dados registrados — não são avaliação clínica.
                </p>
              </div>
            ) : (
              <p className="text-xs text-stone-500">Nenhum sinalizador no período.</p>
            )}

            {ctx && (
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'WHO-5', valor: ctx.who5?.length ? ctx.who5[ctx.who5.length - 1].score : null },
                  { label: 'Sessões', valor: ctx.sessoes?.realizadas ?? 0 },
                  { label: 'Faltas', valor: ctx.sessoes?.faltas ?? 0 },
                ].map(c => (
                  <div key={c.label} className="bg-stone-900 rounded-lg p-3 text-center">
                    <p className="text-xl font-bold text-stone-100">{c.valor ?? '—'}</p>
                    <p className="text-[10px] text-stone-500 mt-0.5">{c.label}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Evolução (prontuário — só o autor lê) ── */}
        {tab === 'evolucao' && (
          <>
            <div className="flex items-start gap-2 text-[11px] text-stone-500 bg-stone-900 rounded-lg p-2.5">
              <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <span>
                Esta evolução é <strong>sua</strong>. Nenhum outro profissional a lê — nem outro
                psicólogo, nem o médico, nem a empresa.
              </span>
            </div>

            {[
              { label: 'Queixa de hoje', v: queixa, set: setQueixa, rows: 2 },
              { label: 'Evolução da sessão', v: evolucao, set: setEvolucao, rows: 6 },
              { label: 'Plano e combinados', v: plano, set: setPlano, rows: 3 },
              { label: 'Observações', v: observacoes, set: setObservacoes, rows: 2 },
            ].map(f => (
              <div key={f.label}>
                <label className="block text-xs text-stone-400 mb-1">{f.label}</label>
                <textarea
                  rows={f.rows} value={f.v}
                  onChange={e => f.set(e.target.value)}
                  className={fieldCls}
                />
              </div>
            ))}

            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={() => salvarEvolucao(false)} disabled={salvando}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 text-sm font-medium rounded-lg transition disabled:opacity-50"
              >
                <Save className="w-4 h-4" /> Salvar rascunho
              </button>
              <button
                onClick={finalizar} disabled={salvando}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold rounded-lg transition disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4" /> Finalizar atendimento
              </button>
              {salvoEm && <span className="text-[11px] text-stone-500">Salvo às {salvoEm}</span>}
            </div>
          </>
        )}

        {/* ── Notas interprofissionais ── */}
        {tab === 'notas' && (
          <>
            <div>
              <label className="block text-xs text-stone-400 mb-1.5">Quem vai ler</label>
              <div className="flex gap-1.5 flex-wrap">
                {([
                  ['equipe_clinica', 'Equipe clínica'],
                  ['psicologia', 'Só psicologia'],
                ] as [NotaVisibilidade, string][]).map(([v, label]) => (
                  <button
                    key={v} onClick={() => setNotaVis(v)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition ${
                      notaVis === v
                        ? 'border-green-500 bg-green-600 text-white'
                        : 'border-stone-700 text-stone-300 hover:bg-stone-800'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {/* Audiência dita ANTES de escrever — sem isso o profissional
                  escreve como se fosse privado e vaza. */}
              <p className="text-[11px] text-green-400 mt-2 font-medium">
                {notaVis === 'equipe_clinica'
                  ? 'Será lida pelo médico e por psicólogos que atendem este paciente.'
                  : 'Será lida apenas por psicólogos que atendem este paciente. O médico não vê.'}
              </p>
            </div>

            <textarea
              rows={4} value={notaTexto} onChange={e => setNotaTexto(e.target.value)}
              className={fieldCls}
              placeholder="Ex.: relata insônia e cefaleia frequentes; vale checar interação com a medicação em uso."
            />
            <button
              onClick={criarNota} disabled={!notaTexto.trim()}
              className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold rounded-lg transition disabled:opacity-40"
            >
              Compartilhar
            </button>
          </>
        )}

        {/* ── Risco ── */}
        {tab === 'risco' && (
          <>
            <div className="bg-stone-900 rounded-xl p-3">
              <p className="text-xs font-semibold text-stone-200 mb-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" /> Contato de emergência
              </p>
              {contato ? (
                <p className="text-sm text-stone-300">
                  <strong>{contato.nome ?? '—'}</strong>
                  {contato.relacao ? ` (${contato.relacao})` : ''} · {contato.telefone ?? '—'}
                </p>
              ) : (
                <button
                  onClick={async () => {
                    const c = await psychologyService.getContatoEmergencia(patientId);
                    if (!c || (!c.nome && !c.telefone)) {
                      toast('O paciente ainda não cadastrou contato de emergência.', { icon: 'ℹ️' });
                      return;
                    }
                    setContato(c);
                  }}
                  className="mt-1 px-3 py-1.5 border border-stone-700 rounded-lg text-xs text-stone-300 hover:bg-stone-800 transition"
                >
                  Ver contato
                </button>
              )}
            </div>

            <div className="bg-amber-950/30 border border-amber-900/50 rounded-xl p-3">
              <p className="text-[11px] text-amber-200/90 leading-snug">
                O sistema <strong>não aciona ninguém</strong>. Quebra de sigilo por risco à vida é
                decisão clínica sua. Este formulário registra a conduta adotada — protege o
                paciente na continuidade do cuidado e você na demonstração do que foi feito.
              </p>
            </div>

            <div>
              <label className="block text-xs text-stone-400 mb-1">Nível</label>
              <select
                value={criseNivel} onChange={e => setCriseNivel(e.target.value as CriseNivel)}
                className={fieldCls}
              >
                {(Object.keys(NIVEL_LABEL) as CriseNivel[]).map(n => (
                  <option key={n} value={n}>{NIVEL_LABEL[n]}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-stone-400 mb-1">Conduta adotada</label>
              <textarea
                rows={4} value={criseAcoes} onChange={e => setCriseAcoes(e.target.value)}
                className={fieldCls}
                placeholder="O que foi avaliado, combinado e orientado."
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox" checked={criseContato}
                onChange={e => setCriseContato(e.target.checked)}
                className="w-4 h-4 rounded accent-green-600"
              />
              <span className="text-sm text-stone-300">Contato de emergência foi acionado</span>
            </label>

            <div>
              <label className="block text-xs text-stone-400 mb-1">Encaminhamento (opcional)</label>
              <input
                value={criseEncaminhamento} onChange={e => setCriseEncaminhamento(e.target.value)}
                className={fieldCls} placeholder="CAPS, psiquiatra, emergência, rede própria..."
              />
            </div>

            <button
              onClick={registrarCrise}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-semibold rounded-lg transition"
            >
              Registrar
            </button>
          </>
        )}
      </div>
    </div>
  );
};
