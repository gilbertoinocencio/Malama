// =====================================================
// Malama — Ciclo de vida da consulta na sala de vídeo
//
// POR QUE ESTE HOOK EXISTE
// A sala do médico (DoctorConsultaPage) e a do psicólogo (PsiConsultaPage)
// tinham a MESMA máquina de estados copiada: cronômetro ancorado no horário
// agendado, in_progress ao conectar, ended_at ao encerrar, completed ao
// finalizar. O comentário no topo da sala do psicólogo dizia, com todas as
// letras, que não dava para extrair sem refatorar um fluxo de vídeo em
// produção — e as duas cópias já tinham divergido:
//
//   - a trava de duração (não encerrar antes do fim do horário agendado)
//     existia só na sala do médico. Sessão de psicologia podia ser fechada
//     no minuto 2 valendo repasse cheio;
//   - nenhuma das duas realizava o crédito, porque escreviam status direto
//     na tabela em vez de passar pelo serviço (e a RLS barrava o serviço de
//     qualquer jeito). Isso agora é trigger no banco.
//
// O que muda de tela para tela é o painel lateral e o pré-requisito de
// finalização (prontuário médico x evolução da sessão); o ciclo de vida não.
// Ele mora aqui.
// =====================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../services/supabase';

export interface ConsultationLifecycle {
  /** Segundos decorridos, contados do horário agendado. */
  elapsed: number;
  /** mm:ss para o cabeçalho da sala. */
  elapsedLabel: string;
  /** true depois que o profissional encerrou a chamada de vídeo. */
  callEnded: boolean;
  /** Momento (ms) em que o encerramento libera; null se a consulta não tem horário. */
  scheduleUnlockMs: number | null;
  /** false enquanto o horário agendado não terminou. */
  canComplete: boolean;
  /** Passar em onConnected do useWebRTC. */
  handleConnected: () => void;
  /** Passar em onDisconnected do useWebRTC. */
  handleDisconnected: () => void;
  /** Registra o fim da chamada (ended_at). Chamar depois de endCall(). */
  markCallEnded: () => Promise<void>;
  /** Conclui a consulta. O crédito vira 'realizada' por trigger no banco. */
  markCompleted: () => Promise<void>;
}

export function useConsultationLifecycle(consultationId: string): ConsultationLifecycle {
  const [elapsed, setElapsed] = useState(0);
  const [callEnded, setCallEnded] = useState(false);
  const [scheduleUnlockMs, setScheduleUnlockMs] = useState<number | null>(null);
  const [canComplete, setCanComplete] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Âncora do cronômetro: o tempo conta a partir do horário agendado, não da
  // entrada na sala — o profissional pode entrar até 15 min antes.
  const scheduledAtMsRef = useRef<number | null>(null);

  useEffect(() => {
    supabase
      .from('consultations')
      .select('scheduled_at, duration_minutes')
      .eq('id', consultationId)
      .single()
      .then(({ data }) => {
        if (data?.scheduled_at) {
          scheduledAtMsRef.current = new Date(data.scheduled_at).getTime();
        }
        if (data?.scheduled_at && data?.duration_minutes != null) {
          setScheduleUnlockMs(
            new Date(data.scheduled_at).getTime() + data.duration_minutes * 60_000,
          );
        } else {
          setCanComplete(true); // sem horário definido → sem trava
        }
      });
  }, [consultationId]);

  useEffect(() => {
    if (scheduleUnlockMs == null) return;
    const check = () => setCanComplete(Date.now() >= scheduleUnlockMs);
    check();
    const id = setInterval(check, 30_000);
    return () => clearInterval(id);
  }, [scheduleUnlockMs]);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const handleConnected = useCallback(() => {
    const tick = () => {
      const anchor = scheduledAtMsRef.current;
      // Antes do horário agendado o cronômetro fica em 00:00.
      if (anchor != null) setElapsed(Math.max(0, Math.floor((Date.now() - anchor) / 1000)));
      else setElapsed(e => e + 1);
    };
    tick();
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(tick, 1000);

    supabase
      .from('consultations')
      .update({ status: 'in_progress', started_at: new Date().toISOString() })
      .eq('id', consultationId)
      .then(undefined, () => { /* reconexão repete o update; sem efeito colateral */ });
  }, [consultationId]);

  const handleDisconnected = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const markCallEnded = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    await supabase
      .from('consultations')
      .update({ ended_at: new Date().toISOString() })
      .eq('id', consultationId);
    setCallEnded(true);
  }, [consultationId]);

  const markCompleted = useCallback(async () => {
    const { error } = await supabase
      .from('consultations')
      .update({ status: 'completed' })
      .eq('id', consultationId);
    if (error) throw error;
  }, [consultationId]);

  const elapsedLabel =
    `${Math.floor(elapsed / 60).toString().padStart(2, '0')}:${(elapsed % 60).toString().padStart(2, '0')}`;

  return {
    elapsed, elapsedLabel, callEnded, scheduleUnlockMs, canComplete,
    handleConnected, handleDisconnected, markCallEnded, markCompleted,
  };
}
