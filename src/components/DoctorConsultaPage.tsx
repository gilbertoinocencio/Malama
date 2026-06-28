import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useWebRTC } from '../hooks/useWebRTC';
import { VideoStream } from './VideoStream';
import { supabase } from '../services/supabase';
import { generatePrescriptionPDF, savePrescription, signPrescriptionPDF } from '../lib/prescription';
import { generateConsultationBriefing } from '../lib/briefing';
import { clinicalNoteService, appointmentChatService } from '../services/doctorPortalService';
import { AIReportFeedback } from './doctor/AIReportFeedback';
import { AppointmentChatPanel } from './doctor/AppointmentChatPanel';
import { PatientExamPanel } from './doctor/PatientExamPanel';
import { PatientInfoPanel } from './doctor/PatientInfoPanel';
import type { ClinicalNote, ClinicalNoteFormData } from '../types/doctorPortal';
import toast from 'react-hot-toast';
import {
  Minimize2, Maximize2, Mic, MicOff, Video, VideoOff,
  PhoneOff, User, FileText, Brain, Paperclip, MessageSquare,
  Stethoscope, Target, X, Save, CheckCircle, ChevronDown, ChevronUp,
  Activity, ClipboardList, Weight, Clock, AlertTriangle,
} from 'lucide-react';

interface DoctorConsultaPageProps {
  consultationId: string;
  roomId: string;
  patientId: string;
  doctorId: string;
  doctorName: string;
  doctorCrm: string;
  doctorSpecialty: string;
  doctorHasCertificate: boolean;
  patientName: string;
  onEnd: () => void;
}

type TabKey = 'info' | 'clinical' | 'notes' | 'briefing' | 'exams' | 'chat';

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'info',     label: 'Paciente',  icon: <User className="w-3.5 h-3.5" /> },
  { key: 'clinical', label: 'Análise',   icon: <Stethoscope className="w-3.5 h-3.5" /> },
  { key: 'notes',    label: 'Notas',     icon: <FileText className="w-3.5 h-3.5" /> },
  { key: 'briefing', label: 'IA',        icon: <Brain className="w-3.5 h-3.5" /> },
  { key: 'exams',    label: 'Exames',    icon: <Paperclip className="w-3.5 h-3.5" /> },
  { key: 'chat',     label: 'Chat',      icon: <MessageSquare className="w-3.5 h-3.5" /> },
];

const EMPTY_FORM: ClinicalNoteFormData = {
  chief_complaint: '', history_illness: '', relevant_history: '',
  physical_exam: '', diagnosis: '', plan: '', free_text: '',
  weight_kg: '', height_cm: '', blood_pressure_sys: '', blood_pressure_dia: '',
  heart_rate: '', waist_cm: '',
};

export const DoctorConsultaPage: React.FC<DoctorConsultaPageProps> = ({
  consultationId, roomId, patientId, doctorId, doctorName, doctorCrm, doctorSpecialty,
  doctorHasCertificate, patientName, onEnd,
}) => {
  const [videoMinimized, setVideoMinimized] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [tab, setTab] = useState<TabKey>('info');

  // Notas rápidas
  const [notes, setNotes] = useState('');

  // Paciente
  const [patientData, setPatientData] = useState<any>(null);

  // Briefing IA
  const [briefing, setBriefing] = useState('');
  const [briefingReportId, setBriefingReportId] = useState<string | null>(null);
  const [briefingLoading, setBriefingLoading] = useState(false);

  // Análise clínica
  const [clinicalForm, setClinicalForm] = useState<ClinicalNoteFormData>(EMPTY_FORM);
  const [existingNote, setExistingNote] = useState<ClinicalNote | null>(null);
  const [noteHistory, setNoteHistory] = useState<any[]>([]);
  const [clinicalLoading, setClinicalLoading] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  // Encerramento — callEnded = vídeo encerrado mas análise ainda pendente
  const [endingCall, setEndingCall] = useState(false);
  const [callEnded, setCallEnded] = useState(false);

  // Trava de tempo: só pode finalizar após scheduled_at + duration_minutes
  const [scheduleUnlockMs, setScheduleUnlockMs] = useState<number | null>(null);
  const [canComplete, setCanComplete] = useState(false);

  // Modais de ação
  const [showGoalsModal, setShowGoalsModal] = useState(false);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [goalAdjust, setGoalAdjust] = useState({ calories: '', protein: '', carbs: '', fat: '', fiber: '', water: '', meals: '', notes: '' });
  const [goalsLastUpdated, setGoalsLastUpdated] = useState<string | null>(null);
  const [prescription, setPrescription] = useState({ medication: '', dosage: '', instructions: '' });
  const [pfxPassword, setPfxPassword] = useState('');
  const [signingError, setSigningError] = useState('');
  const [saving, setSaving] = useState(false);
  const [actionMsg, setActionMsg] = useState('');

  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const {
    localStream, remoteStream, connectionState,
    startCall, endCall, toggleMute, toggleCamera,
    isMuted, isCameraOff, error,
  } = useWebRTC({
    roomId, role: 'doctor',
    onConnected: () => {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
      supabase.from('consultations')
        .update({ status: 'in_progress', started_at: new Date().toISOString() })
        .eq('id', consultationId);
    },
    onDisconnected: () => { if (timerRef.current) clearInterval(timerRef.current); },
  });

  // Abrir canal de chat assim que a página da consulta carrega
  useEffect(() => {
    appointmentChatService.openChat(consultationId, 48).catch(() => {/* já existe */});
  }, [consultationId]);

  // Trava de tempo: busca scheduled_at + duration_minutes e recalcula a cada 30s
  useEffect(() => {
    supabase.from('consultations')
      .select('scheduled_at, duration_minutes')
      .eq('id', consultationId)
      .single()
      .then(({ data }) => {
        if (data?.scheduled_at && data?.duration_minutes != null) {
          setScheduleUnlockMs(new Date(data.scheduled_at).getTime() + data.duration_minutes * 60_000);
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

  // Carregar dados do paciente
  useEffect(() => {
    supabase.from('profiles').select('*').eq('id', patientId).single()
      .then(({ data }) => { if (data) setPatientData(data); });
  }, [patientId]);

  // Carregar notas rápidas salvas
  useEffect(() => {
    supabase.from('consultations').select('notes').eq('id', consultationId).single()
      .then(({ data }) => { if (data?.notes) setNotes(data.notes); });
  }, [consultationId]);

  // Carregar prontuário da consulta atual + histórico do paciente
  useEffect(() => {
    setClinicalLoading(true);
    Promise.all([
      clinicalNoteService.getByConsultation(consultationId),
      supabase
        .from('clinical_notes')
        .select('*')
        .eq('patient_id', patientId)
        .neq('consultation_id', consultationId)
        .eq('is_draft', false)
        .order('finalized_at', { ascending: false })
        .limit(10),
    ]).then(([note, { data: history }]) => {
      if (note) {
        setExistingNote(note);
        setClinicalForm({
          chief_complaint:    note.chief_complaint    ?? '',
          history_illness:    note.history_illness    ?? '',
          relevant_history:   note.relevant_history   ?? '',
          physical_exam:      note.physical_exam      ?? '',
          diagnosis:          note.diagnosis          ?? '',
          plan:               note.plan               ?? '',
          free_text:          note.free_text          ?? '',
          weight_kg:          note.weight_kg    != null ? String(note.weight_kg)          : '',
          height_cm:          note.height_cm    != null ? String(note.height_cm)          : '',
          blood_pressure_sys: note.blood_pressure_sys != null ? String(note.blood_pressure_sys) : '',
          blood_pressure_dia: note.blood_pressure_dia != null ? String(note.blood_pressure_dia) : '',
          heart_rate:         note.heart_rate   != null ? String(note.heart_rate)         : '',
          waist_cm:           note.waist_cm     != null ? String(note.waist_cm)           : '',
        });
      }
      setNoteHistory(history || []);
    }).finally(() => setClinicalLoading(false));
  }, [consultationId, patientId]);

  const saveNotes = useCallback((value: string) => {
    if (notesTimer.current) clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(async () => {
      await supabase.from('consultations').update({ notes: value }).eq('id', consultationId);
    }, 1000);
  }, [consultationId]);

  const handleNotesChange = (v: string) => { setNotes(v); saveNotes(v); };

  const setField = useCallback(<K extends keyof ClinicalNoteFormData>(key: K) => (v: string) => {
    setClinicalForm(f => ({ ...f, [key]: v }));
  }, []);

  const handleSaveDraft = async () => {
    setSavingDraft(true);
    try {
      const note = await clinicalNoteService.upsert(consultationId, doctorId, patientId, clinicalForm);
      setExistingNote(note);
      toast.success('Rascunho salvo');
    } catch {
      toast.error('Erro ao salvar rascunho');
    } finally {
      setSavingDraft(false);
    }
  };

  const handleFinalize = async () => {
    if (!clinicalForm.diagnosis?.trim()) {
      toast.error('Preencha o campo Diagnóstico antes de finalizar');
      return;
    }
    if (callEnded && !canComplete) {
      const unlockStr = scheduleUnlockMs
        ? new Date(scheduleUnlockMs).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        : null;
      toast.error(unlockStr ? `Consulta só pode ser encerrada após ${unlockStr}` : 'Aguarde o fim do horário agendado');
      return;
    }
    setFinalizing(true);
    try {
      const note     = await clinicalNoteService.upsert(consultationId, doctorId, patientId, clinicalForm);
      const finalized = await clinicalNoteService.finalize(note.id);
      setExistingNote(finalized);
      // Abre o chat pós-consulta de 20 dias (silencia se já existir)
      try { await appointmentChatService.openChat(consultationId, 48); } catch { /* já aberto */ }

      if (callEnded) {
        // Chamada já encerrada — marcar consulta como completa e sair
        await supabase.from('consultations')
          .update({ status: 'completed' })
          .eq('id', consultationId);
        toast.success('Consulta finalizada com sucesso!');
        onEnd();
      } else {
        toast.success('Análise clínica finalizada e salva no histórico');
      }
    } catch {
      toast.error('Erro ao finalizar análise clínica');
    } finally {
      setFinalizing(false);
    }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    return `${m}:${(s % 60).toString().padStart(2, '0')}`;
  };

  const handleEndCall = async () => {
    // Encerra o vídeo imediatamente — sem gate
    setEndingCall(true);
    endCall();
    if (timerRef.current) clearInterval(timerRef.current);
    setEndingCall(false);

    // Registra fim da chamada e força aba de análise clínica
    await supabase.from('consultations')
      .update({ ended_at: new Date().toISOString() })
      .eq('id', consultationId);

    setCallEnded(true);
    setTab('clinical');
    toast('Preencha a análise clínica para finalizar a consulta.', { icon: '📋', duration: 5000 });
  };

  const handleGenerateBriefing = async () => {
    setBriefingLoading(true);
    try {
      const { text, reportId } = await generateConsultationBriefing(patientId);
      setBriefing(text);
      setBriefingReportId(reportId);
    }
    catch { setBriefing('Erro ao gerar briefing. Tente novamente.'); }
    finally { setBriefingLoading(false); }
  };

  const openGoalsModal = async () => {
    // Pré-preenche com os valores atuais do perfil
    setGoalAdjust({
      calories: patientData?.target_calories?.toString() || '',
      protein:  patientData?.target_protein?.toString()  || '',
      carbs:    patientData?.target_carbs?.toString()    || '',
      fat:      patientData?.target_fat?.toString()      || '',
      fiber:    patientData?.target_fiber?.toString()    || '',
      water:    patientData?.water_goal_ml?.toString()   || '',
      meals:    patientData?.meals_per_day?.toString()   || '',
      notes:    '',
    });
    // Busca a data da última atualização feita por algum médico
    const { data } = await supabase
      .from('doctor_plan_adjustments')
      .select('applied_at')
      .eq('patient_id', patientId)
      .order('applied_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setGoalsLastUpdated(data?.applied_at ?? null);
    setShowGoalsModal(true);
  };

  const handleSaveGoals = async () => {
    setSaving(true);
    try {
      const toInt = (v: string) => v ? parseInt(v) : null;

      // 1. Registrar ajuste no histórico
      await supabase.from('doctor_plan_adjustments').insert({
        consultation_id: consultationId, doctor_id: doctorId, patient_id: patientId,
        calorie_goal: toInt(goalAdjust.calories),
        protein_goal: toInt(goalAdjust.protein),
        notes: goalAdjust.notes || null,
        applied_at: new Date().toISOString(),
      });

      // 2. Atualizar perfil do paciente com os novos objetivos
      const profileUpdate: Record<string, number> = {};
      if (goalAdjust.calories) profileUpdate.target_calories    = parseInt(goalAdjust.calories);
      if (goalAdjust.protein)  profileUpdate.target_protein     = parseInt(goalAdjust.protein);
      if (goalAdjust.carbs)    profileUpdate.target_carbs       = parseInt(goalAdjust.carbs);
      if (goalAdjust.fat)      profileUpdate.target_fat         = parseInt(goalAdjust.fat);
      if (goalAdjust.fiber)    profileUpdate.target_fiber       = parseInt(goalAdjust.fiber);
      if (goalAdjust.water)    profileUpdate.water_goal_ml      = parseInt(goalAdjust.water);
      if (goalAdjust.meals)    profileUpdate.meals_per_day      = parseInt(goalAdjust.meals);
      if (Object.keys(profileUpdate).length > 0) {
        await supabase.from('profiles').update(profileUpdate).eq('id', patientId);
      }

      // 3. Notificar o paciente em tempo real
      await supabase.channel(`patient:${patientId}`).send({
        type: 'broadcast',
        event: 'goals_updated',
        payload: {
          calorie_goal: toInt(goalAdjust.calories),
          protein_goal: toInt(goalAdjust.protein),
          carbs_goal:   toInt(goalAdjust.carbs),
          fat_goal:     toInt(goalAdjust.fat),
          fiber_goal:   toInt(goalAdjust.fiber),
          water_goal:   toInt(goalAdjust.water),
          meals_goal:   toInt(goalAdjust.meals),
          doctor_name:  doctorName,
        },
      });

      // Reflectir localmente no patientData para não precisar recarregar
      if (Object.keys(profileUpdate).length > 0) {
        setPatientData((prev: any) => ({ ...prev, ...profileUpdate }));
      }

      setShowGoalsModal(false);
      setGoalsLastUpdated(new Date().toISOString());
      setActionMsg('Metas ajustadas!');
      setTimeout(() => setActionMsg(''), 3000);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao ajustar metas');
    } finally {
      setSaving(false);
    }
  };

  const handleEmitPrescription = async () => {
    if (!prescription.medication || !prescription.dosage) return;
    setSaving(true);
    try {
      const issuedAt = new Date();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 90);

      let pdfBlob = await generatePrescriptionPDF({
        doctorName,
        doctorCRM: doctorCrm,
        doctorSpecialty,
        patientName: patientData?.display_name || patientName,
        medication: prescription.medication,
        dosage: prescription.dosage,
        instructions: prescription.instructions,
        issuedAt,
        expiresAt,
      });

      // Assinar com certificado ICP-Brasil do médico, se cadastrado
      if (doctorHasCertificate) {
        if (!pfxPassword) {
          setSigningError('Digite a senha do seu certificado ICP-Brasil');
          setSaving(false);
          return;
        }
        try {
          pdfBlob = await signPrescriptionPDF(pdfBlob, doctorId, pfxPassword);
          setSigningError('');
        } catch (e: any) {
          setSigningError(e.message ?? 'Senha incorreta ou certificado inválido');
          setSaving(false);
          return;
        }
      }

      await savePrescription({
        consultationId, doctorId, patientId, pdfBlob,
        medication: prescription.medication,
        dosage: prescription.dosage,
        instructions: prescription.instructions,
      });

      // Download automático para o médico
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receita_${prescription.medication.replace(/\s+/g, '_')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      // Notificar paciente no banco (visível em Minhas Consultas / sino)
      await supabase.from('patient_notifications').insert({
        user_id: patientId,
        type: 'prescription_issued',
        title: 'Nova receita disponível',
        body: `Dr. ${doctorName} emitiu uma receita para ${prescription.medication}. Acesse Minhas Consultas para baixar.`,
        data: { medication: prescription.medication, consultation_id: consultationId },
      });

      // Notificar em tempo real se paciente estiver na videochamada
      await supabase.channel(`patient:${patientId}`).send({
        type: 'broadcast',
        event: 'prescription_issued',
        payload: { medication: prescription.medication, doctor_name: doctorName },
      });

      setShowPrescriptionModal(false);
      setActionMsg('Receita emitida!');
      setTimeout(() => setActionMsg(''), 3000);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao emitir receita');
    } finally {
      setSaving(false);
    }
  };

  const bmi = patientData?.weight && patientData?.height
    ? (patientData.weight / Math.pow(patientData.height / 100, 2)).toFixed(1) : '—';
  const connColor = connectionState === 'connected' ? 'text-green-400'
    : connectionState === 'connecting' ? 'text-yellow-400' : 'text-red-400';
  const connLabel = connectionState === 'connected' ? 'Conectado'
    : connectionState === 'connecting' ? 'Conectando...'
    : connectionState === 'idle' ? 'Aguardando' : 'Desconectado';

  return (
    <div className="fixed inset-0 bg-background-dark flex overflow-hidden z-50">

      {/* ── VIDEO AREA ── */}
      {!videoMinimized ? (
        <div className="flex flex-col" style={{ width: '55%', minWidth: 320 }}>
          <div className="flex-1 relative bg-black">
            {remoteStream ? (
              <VideoStream stream={remoteStream} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-white">
                <div className="w-24 h-24 rounded-full bg-[#2E2C2A] flex items-center justify-center mb-4">
                  <User className="w-12 h-12 text-stone-400" />
                </div>
                <p className="text-lg font-semibold">{patientName}</p>
                <p className={`text-sm mt-1 ${connColor}`}>{connLabel}</p>
              </div>
            )}
            {localStream && (
              <div className="absolute bottom-4 left-4 w-32 h-24 rounded-xl overflow-hidden border-2 border-white/20 shadow-xl">
                <VideoStream stream={localStream} muted mirror className="w-full h-full object-cover" />
              </div>
            )}
            {connectionState === 'connected' && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/60 text-white text-sm font-mono px-3 py-1 rounded-full">
                ⏱ {formatTime(elapsed)}
              </div>
            )}
            <button onClick={() => setVideoMinimized(true)}
              className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 text-white rounded-lg transition"
              title="Minimizar vídeo">
              <Minimize2 className="w-4 h-4" />
            </button>
            {error && (
              <div className="absolute top-14 left-4 right-4 bg-red-500/90 text-white text-sm px-3 py-2 rounded-lg">{error}</div>
            )}
          </div>
          <div className="bg-surface-dark px-6 py-3 flex items-center justify-center gap-4">
            {connectionState === 'idle' ? (
              <button onClick={startCall}
                className="px-6 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-full font-bold text-sm flex items-center gap-2">
                <Video className="w-4 h-4" /> Iniciar chamada
              </button>
            ) : (
              <>
                <CtrlBtn icon={isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />} active={!isMuted} onClick={toggleMute} />
                <CtrlBtn icon={isCameraOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />} active={!isCameraOff} onClick={toggleCamera} />
                <button onClick={handleEndCall} disabled={endingCall}
                  className="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-full font-bold text-sm flex items-center gap-2 disabled:opacity-60">
                  {endingCall
                    ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Verificando...</>
                    : <><PhoneOff className="w-4 h-4" /> Encerrar</>}
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        /* PiP */
        <div className="absolute bottom-6 left-6 z-50 w-48 h-36 rounded-xl overflow-hidden border-2 border-white/20 shadow-2xl bg-black">
          {remoteStream
            ? <VideoStream stream={remoteStream} className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center"><User className="w-8 h-8 text-stone-500" /></div>
          }
          {localStream && (
            <div className="absolute bottom-2 right-2 w-14 h-10 rounded-lg overflow-hidden border border-white/20">
              <VideoStream stream={localStream} muted mirror className="w-full h-full object-cover" />
            </div>
          )}
          <div className="absolute top-2 left-2 right-2 flex items-center justify-between">
            <span className={`text-xs font-mono bg-black/60 px-1.5 py-0.5 rounded ${connColor}`}>
              {connectionState === 'connected' ? formatTime(elapsed) : connLabel}
            </span>
            <button onClick={() => setVideoMinimized(false)} className="p-1 bg-black/60 hover:bg-black/80 text-white rounded" title="Expandir">
              <Maximize2 className="w-3 h-3" />
            </button>
          </div>
          <button onClick={handleEndCall} disabled={endingCall}
            className="absolute bottom-2 left-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full disabled:opacity-60" title="Encerrar">
            {endingCall
              ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin block" />
              : <PhoneOff className="w-3 h-3" />}
          </button>
        </div>
      )}

      {/* ── PATIENT PANEL ── */}
      <div className="flex flex-col bg-surface-dark border-l border-white/8 overflow-hidden" style={{ flex: 1 }}>

        {/* Header */}
        <div className="px-4 py-3 border-b border-white/8 flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-full bg-[#3C3A38] flex items-center justify-center shrink-0">
            {patientData?.photo_url
              ? <img src={patientData.photo_url} className="w-full h-full rounded-full object-cover" alt="" />
              : <User className="w-4 h-4 text-stone-300" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm truncate">{patientName}</p>
            <p className="text-stone-400 text-xs">IMC {bmi} · {patientData?.weight || '—'} kg · {patientData?.height || '—'} cm</p>
          </div>
          {/* Timer / status — sempre visível no painel do paciente */}
          <div className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-bold tabular-nums ${
            connectionState === 'connected'
              ? 'bg-green-900/40 text-green-400'
              : connectionState === 'connecting'
              ? 'bg-yellow-900/40 text-yellow-400'
              : 'bg-[#2E2C2A] text-stone-400'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
              connectionState === 'connected' ? 'bg-green-400 animate-pulse' :
              connectionState === 'connecting' ? 'bg-yellow-400 animate-pulse' :
              'bg-stone-500'
            }`} />
            {connectionState === 'connected' ? formatTime(elapsed) : connLabel}
          </div>
          {patientData?.glp1_mode && (
            <span className="shrink-0 px-2 py-0.5 bg-green-900/40 rounded-full text-xs text-green-400">
              💊 {patientData.glp1_medication}
            </span>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/8 shrink-0 overflow-x-auto">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold whitespace-nowrap transition-colors border-b-2 ${
                tab === t.key ? 'text-green-400 border-green-400' : 'text-stone-400 border-transparent hover:text-stone-200'
              }`}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* Banner pós-chamada: análise obrigatória para sair */}
        {callEnded && existingNote?.is_draft !== false && (
          <div className="shrink-0 flex items-center gap-2 px-4 py-2.5 bg-amber-500/10 border-b border-amber-500/30">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <p className="text-xs text-amber-300 font-medium">
              Videochamada encerrada — preencha e finalize a análise clínica para sair.
            </p>
          </div>
        )}

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto">

          {/* ── PACIENTE ── */}
          {tab === 'info' && (
            <PatientInfoPanel
              patientId={patientId}
              doctorId={doctorId}
              doctorName={doctorName}
              patientData={patientData}
              onPatientUpdated={(updated) => setPatientData(updated)}
            />
          )}

          {/* ── ANÁLISE CLÍNICA ── */}
          {tab === 'clinical' && (
            <div className="flex flex-col">
              {clinicalLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <>
                  {/* Status badge */}
                  <div className="px-4 pt-4 pb-2">
                    {existingNote?.is_draft === false ? (
                      <div className="flex items-center gap-2 px-3 py-2 bg-green-900/30 border border-green-700 rounded-lg">
                        <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                        <div>
                          <p className="text-xs font-semibold text-green-400">Análise finalizada</p>
                          <p className="text-[11px] text-green-600">
                            {existingNote.finalized_at
                              ? new Date(existingNote.finalized_at).toLocaleString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                              : ''}
                          </p>
                        </div>
                      </div>
                    ) : existingNote?.is_draft ? (
                      <div className="flex items-center gap-2 px-3 py-2 bg-yellow-900/20 border border-yellow-700/40 rounded-lg">
                        <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0" />
                        <p className="text-xs text-yellow-400">Rascunho — não visível no histórico</p>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 px-3 py-2 bg-[#2E2C2A] rounded-lg">
                        <FileText className="w-4 h-4 text-stone-400 shrink-0" />
                        <p className="text-xs text-stone-400">Nova análise clínica para esta consulta</p>
                      </div>
                    )}
                  </div>

                  {/* Form */}
                  <div className="px-4 pb-2 space-y-2">
                    <CSection title="Métricas" icon={<Weight className="w-3.5 h-3.5" />} defaultOpen>
                      <div className="grid grid-cols-2 gap-2">
                        <CInput label="Peso (kg)"      value={clinicalForm.weight_kg}          onChange={setField('weight_kg')}          type="number" />
                        <CInput label="Altura (cm)"    value={clinicalForm.height_cm}          onChange={setField('height_cm')}          type="number" />
                        <CInput label="PA Sistólica"   value={clinicalForm.blood_pressure_sys} onChange={setField('blood_pressure_sys')} type="number" />
                        <CInput label="PA Diastólica"  value={clinicalForm.blood_pressure_dia} onChange={setField('blood_pressure_dia')} type="number" />
                        <CInput label="FC (bpm)"       value={clinicalForm.heart_rate}         onChange={setField('heart_rate')}         type="number" />
                        <CInput label="Cintura (cm)"   value={clinicalForm.waist_cm}           onChange={setField('waist_cm')}           type="number" />
                      </div>
                    </CSection>

                    <CSection title="Anamnese" icon={<Stethoscope className="w-3.5 h-3.5" />} defaultOpen>
                      <CTextArea label="Queixa principal"          value={clinicalForm.chief_complaint}  onChange={setField('chief_complaint')}  placeholder="Motivo da consulta..." />
                      <CTextArea label="História da doença atual"  value={clinicalForm.history_illness}  onChange={setField('history_illness')}  placeholder="Evolução, início dos sintomas..." />
                      <CTextArea label="Antecedentes relevantes"   value={clinicalForm.relevant_history} onChange={setField('relevant_history')} placeholder="Comorbidades, medicamentos, histórico familiar..." />
                    </CSection>

                    <CSection title="Exame Físico" icon={<Activity className="w-3.5 h-3.5" />}>
                      <CTextArea label="Achados" value={clinicalForm.physical_exam} onChange={setField('physical_exam')} placeholder="Achados do exame físico..." rows={3} />
                    </CSection>

                    <CSection title="Diagnóstico e Plano *" icon={<ClipboardList className="w-3.5 h-3.5" />} defaultOpen>
                      <CTextArea label="Diagnóstico / CID-10" value={clinicalForm.diagnosis} onChange={setField('diagnosis')} placeholder="Hipótese diagnóstica..." />
                      <CTextArea label="Plano terapêutico"    value={clinicalForm.plan}      onChange={setField('plan')}      placeholder="Conduta, encaminhamentos, metas..." rows={3} />
                    </CSection>

                    <CSection title="Observações livres" icon={<FileText className="w-3.5 h-3.5" />}>
                      <CTextArea label="" value={clinicalForm.free_text} onChange={setField('free_text')} placeholder="Notas extras, orientações particulares..." rows={3} />
                    </CSection>
                  </div>

                  {/* Botões */}
                  <div className="px-4 pb-4 space-y-1.5 sticky bottom-0 bg-surface-dark pt-2 border-t border-white/8">
                    <div className="flex gap-2">
                      <button onClick={handleSaveDraft} disabled={savingDraft}
                        className="flex items-center gap-1.5 px-3 py-2 bg-[#2E2C2A] hover:bg-[#3C3A38] text-white text-xs font-semibold rounded-lg disabled:opacity-50 transition">
                        <Save className="w-3.5 h-3.5" />
                        {savingDraft ? 'Salvando...' : 'Salvar rascunho'}
                      </button>
                      <button onClick={handleFinalize} disabled={finalizing || existingNote?.is_draft === false || (callEnded && !canComplete)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg disabled:opacity-50 transition">
                        <CheckCircle className="w-3.5 h-3.5" />
                        {finalizing
                          ? 'Finalizando...'
                          : existingNote?.is_draft === false
                          ? 'Já finalizada'
                          : callEnded && !canComplete
                          ? 'Consulta em andamento…'
                          : callEnded
                          ? 'Finalizar e sair'
                          : 'Finalizar e salvar no histórico'}
                      </button>
                    </div>
                    {callEnded && !canComplete && scheduleUnlockMs && (
                      <p className="text-[11px] text-center text-amber-400">
                        Encerramento disponível após {new Date(scheduleUnlockMs).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </div>

                  {/* Histórico de análises anteriores */}
                  {noteHistory.length > 0 && (
                    <div className="px-4 pb-6">
                      <div className="flex items-center gap-2 mb-3">
                        <Clock className="w-4 h-4 text-stone-400" />
                        <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide">
                          Histórico — {noteHistory.length} consulta{noteHistory.length !== 1 ? 's' : ''} anterior{noteHistory.length !== 1 ? 'es' : ''}
                        </p>
                      </div>
                      <div className="space-y-3">
                        {noteHistory.map(note => (
                          <HistoryNoteCard key={note.id} note={note} />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── NOTAS RÁPIDAS ── */}
          {tab === 'notes' && (
            <div className="p-4 h-full flex flex-col">
              <p className="text-xs text-stone-400 mb-2">Auto-salvo · Visível apenas para você</p>
              <textarea value={notes} onChange={e => handleNotesChange(e.target.value)}
                placeholder="Anotações da consulta..."
                className="flex-1 w-full min-h-[200px] bg-[#2E2C2A] text-white text-sm rounded-xl p-3
                           resize-none focus:outline-none focus:ring-1 focus:ring-green-500 placeholder-stone-600" />
            </div>
          )}

          {/* ── BRIEFING IA ── */}
          {tab === 'briefing' && (
            <div className="p-4">
              {!briefing ? (
                <div className="flex flex-col items-center py-10 gap-3">
                  <span className="text-4xl">🧠</span>
                  <p className="text-stone-400 text-sm text-center max-w-xs">
                    Resumo clínico gerado por IA com base nos dados do paciente
                  </p>
                  <button onClick={handleGenerateBriefing} disabled={briefingLoading}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50">
                    {briefingLoading ? 'Gerando...' : 'Gerar briefing'}
                  </button>
                </div>
              ) : (
                <div>
                  <div className="text-stone-200 text-xs leading-relaxed whitespace-pre-wrap">{briefing}</div>
                  <button onClick={handleGenerateBriefing} disabled={briefingLoading}
                    className="mt-3 text-xs text-green-400 hover:text-green-300 disabled:opacity-50">
                    {briefingLoading ? 'Regenerando...' : '↻ Regenerar'}
                  </button>
                  {briefingReportId && (
                    <div className="mt-4 rounded-xl bg-white p-3">
                      <AIReportFeedback reportId={briefingReportId} doctorId={doctorId} aiContent={briefing} />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── EXAMES ── */}
          {tab === 'exams' && (
            <div className="p-4">
              <PatientExamPanel doctorId={doctorId} patientId={patientId} />
            </div>
          )}

          {/* ── CHAT ── */}
          {tab === 'chat' && (
            <div className="p-4">
              <AppointmentChatPanel doctorId={doctorId} patientId={patientId} patientName={patientName} />
            </div>
          )}
        </div>

        {/* Actions bar */}
        <div className="p-3 border-t border-white/8 space-y-1.5 shrink-0">
          {actionMsg && <p className="text-xs text-green-400 text-center mb-1">{actionMsg}</p>}
          <div className="grid grid-cols-2 gap-1.5">
            <ActionBtn icon={<Target className="w-3.5 h-3.5" />}      label="Ajustar metas"  onClick={openGoalsModal} />
            <ActionBtn icon={<Stethoscope className="w-3.5 h-3.5" />} label="Emitir receita" onClick={() => setShowPrescriptionModal(true)} />
          </div>
        </div>
      </div>

      {/* ── MODAIS ── */}
      {showGoalsModal && (
        <FloatingModal title="Ajustar metas do paciente" onClose={() => setShowGoalsModal(false)} className="max-w-md">
          {/* Origem dos valores */}
          <div className="flex items-center gap-1.5 -mt-1 mb-1">
            {goalsLastUpdated ? (
              <p className="text-[11px] text-amber-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Atualizado por médico em{' '}
                {new Date(goalsLastUpdated).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                {' às '}
                {new Date(goalsLastUpdated).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            ) : (
              <p className="text-[11px] text-blue-400 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Metas definidas no onboarding
              </p>
            )}
          </div>
          <div className="overflow-y-auto max-h-[65vh] space-y-3 pr-0.5">

            {/* Energia */}
            <div>
              <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-wide mb-1.5">Energia</p>
              <ModalInput type="number" label="Calorias (kcal/dia)" value={goalAdjust.calories}
                onChange={v => setGoalAdjust(p => ({ ...p, calories: v }))} placeholder={patientData?.target_calories?.toString() || '1800'} />
            </div>

            {/* Macros */}
            <div>
              <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-wide mb-1.5">Macronutrientes</p>
              <div className="grid grid-cols-2 gap-2">
                <ModalInput type="number" label="Proteína (g/dia)" value={goalAdjust.protein}
                  onChange={v => setGoalAdjust(p => ({ ...p, protein: v }))} placeholder={patientData?.target_protein?.toString() || '120'} />
                <ModalInput type="number" label="Carboidratos (g/dia)" value={goalAdjust.carbs}
                  onChange={v => setGoalAdjust(p => ({ ...p, carbs: v }))} placeholder={patientData?.target_carbs?.toString() || '200'} />
                <ModalInput type="number" label="Gorduras (g/dia)" value={goalAdjust.fat}
                  onChange={v => setGoalAdjust(p => ({ ...p, fat: v }))} placeholder={patientData?.target_fat?.toString() || '60'} />
                <ModalInput type="number" label="Fibras (g/dia)" value={goalAdjust.fiber}
                  onChange={v => setGoalAdjust(p => ({ ...p, fiber: v }))} placeholder={patientData?.target_fiber?.toString() || '25'} />
              </div>
            </div>

            {/* Hábitos */}
            <div>
              <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-wide mb-1.5">Hábitos</p>
              <div className="grid grid-cols-2 gap-2">
                <ModalInput type="number" label="Água (ml/dia)" value={goalAdjust.water}
                  onChange={v => setGoalAdjust(p => ({ ...p, water: v }))} placeholder={patientData?.water_goal_ml?.toString() || '2500'} />
                <ModalInput type="number" label="Refeições/dia" value={goalAdjust.meals}
                  onChange={v => setGoalAdjust(p => ({ ...p, meals: v }))} placeholder={patientData?.meals_per_day?.toString() || '4'} />
              </div>
            </div>

            {/* Observação */}
            <div>
              <label className="block text-xs text-stone-400 mb-1">Observação / justificativa</label>
              <textarea value={goalAdjust.notes} onChange={e => setGoalAdjust(p => ({ ...p, notes: e.target.value }))}
                placeholder="Ex: redução calórica por estagnação de peso..."
                className="w-full bg-[#2E2C2A] text-white rounded-lg p-3 text-sm resize-none h-16 focus:outline-none focus:ring-1 focus:ring-green-500 placeholder-stone-600" />
            </div>
          </div>

          <button onClick={handleSaveGoals} disabled={saving}
            className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold text-sm disabled:opacity-50 transition">
            {saving ? 'Salvando...' : 'Aplicar ajustes'}
          </button>
        </FloatingModal>
      )}

      {showPrescriptionModal && (
        <FloatingModal title="Emitir receita digital" onClose={() => {
          setShowPrescriptionModal(false);
          setPfxPassword('');
          setSigningError('');
        }}>
          <ModalInput label="Medicamento" value={prescription.medication}
            onChange={v => setPrescription(p => ({ ...p, medication: v }))} placeholder="Ex: Ozempic 0,5mg" />
          <ModalInput label="Posologia" value={prescription.dosage}
            onChange={v => setPrescription(p => ({ ...p, dosage: v }))} placeholder="Ex: 1x semana, via subcutânea" />
          <div>
            <label className="block text-xs text-stone-400 mb-1">Instruções adicionais</label>
            <textarea value={prescription.instructions} onChange={e => setPrescription(p => ({ ...p, instructions: e.target.value }))}
              placeholder="Instruções ao paciente..."
              className="w-full bg-[#2E2C2A] text-white rounded-lg p-3 text-sm resize-none h-20 focus:outline-none focus:ring-1 focus:ring-green-500" />
          </div>

          {/* Assinatura ICP-Brasil */}
          {doctorHasCertificate ? (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs text-green-400">
                <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                Certificado ICP-Brasil cadastrado — receita terá validade jurídica
              </div>
              <ModalInput
                type="password"
                label="Senha do certificado (.pfx)"
                value={pfxPassword}
                onChange={setPfxPassword}
                placeholder="Senha do seu e-CRM / e-CPF"
              />
              {signingError && (
                <p className="text-xs text-red-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 shrink-0" />{signingError}
                </p>
              )}
            </div>
          ) : (
            <div className="flex items-start gap-2 p-3 bg-amber-900/20 border border-amber-700/40 rounded-lg">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-400">
                Sem certificado ICP-Brasil — receita não terá validade jurídica nas farmácias.
                Cadastre em <span className="font-semibold">Configurações</span>.
              </p>
            </div>
          )}

          <button onClick={handleEmitPrescription} disabled={saving || !prescription.medication || !prescription.dosage}
            className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold text-sm disabled:opacity-50 transition">
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {doctorHasCertificate ? 'Assinando e gerando PDF...' : 'Gerando PDF...'}
              </span>
            ) : 'Emitir e baixar PDF'}
          </button>
        </FloatingModal>
      )}
    </div>
  );
};

// ── Sub-components ──────────────────────────────

const CtrlBtn: React.FC<{ icon: React.ReactNode; active: boolean; onClick: () => void }> = ({ icon, active, onClick }) => (
  <button onClick={onClick}
    className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
      active ? 'bg-[#3C3A38] hover:bg-[#4A4846] text-white' : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
    }`}>
    {icon}
  </button>
);

const ActionBtn: React.FC<{ icon: React.ReactNode; label: string; onClick: () => void }> = ({ icon, label, onClick }) => (
  <button onClick={onClick}
    className="flex items-center justify-center gap-1.5 py-2 bg-[#2E2C2A] hover:bg-[#3C3A38] text-white rounded-lg text-xs font-semibold transition-colors">
    {icon}{label}
  </button>
);

const InfoRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex justify-between text-xs">
    <span className="text-stone-400">{label}</span>
    <span className="text-white font-medium">{value}</span>
  </div>
);

const FloatingModal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode; className?: string }> = ({ title, onClose, children, className = '' }) => (
  <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-10 p-4">
    <div className={`bg-surface-dark rounded-2xl w-full p-5 shadow-xl space-y-3 max-w-sm ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-white font-bold text-sm">{title}</h3>
        <button onClick={onClose} className="text-stone-400 hover:text-white p-1"><X className="w-4 h-4" /></button>
      </div>
      {children}
    </div>
  </div>
);

const ModalInput: React.FC<{ label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }> = ({ label, value, onChange, placeholder, type = 'text' }) => (
  <div>
    <label className="block text-xs text-stone-400 mb-1">{label}</label>
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="w-full bg-[#2E2C2A] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 placeholder-stone-600" />
  </div>
);

// Seção colapsável do formulário clínico
const CSection: React.FC<{ title: string; icon: React.ReactNode; defaultOpen?: boolean; children: React.ReactNode }> = ({ title, icon, defaultOpen = false, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-white/10 rounded-xl overflow-hidden">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-[#2E2C2A] hover:bg-[#3C3A38] transition text-left">
        <div className="flex items-center gap-2 text-xs font-semibold text-stone-200">{icon}{title}</div>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-stone-400" /> : <ChevronDown className="w-3.5 h-3.5 text-stone-400" />}
      </button>
      {open && <div className="p-3 space-y-2 bg-surface-dark">{children}</div>}
    </div>
  );
};

const CInput: React.FC<{ label: string; value: string; onChange: (v: string) => void; type?: string }> = ({ label, value, onChange, type = 'text' }) => (
  <div>
    <label className="block text-[10px] text-stone-400 mb-1">{label}</label>
    <input type={type} value={value} onChange={e => onChange(e.target.value)}
      className="w-full bg-[#2E2C2A] text-white rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-green-500 border border-white/10" />
  </div>
);

const CTextArea: React.FC<{ label: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }> = ({ label, value, onChange, placeholder, rows = 2 }) => (
  <div>
    {label && <label className="block text-[10px] text-stone-400 mb-1">{label}</label>}
    <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
      className="w-full bg-[#2E2C2A] text-white rounded-lg px-2.5 py-1.5 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-green-500 placeholder-stone-600 border border-white/10" />
  </div>
);

// Card de nota histórica (consultas anteriores)
const HistoryNoteCard: React.FC<{ note: any }> = ({ note }) => {
  const [expanded, setExpanded] = useState(false);
  const date = note.finalized_at
    ? new Date(note.finalized_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

  return (
    <div className="border border-white/10 rounded-xl overflow-hidden">
      <button type="button" onClick={() => setExpanded(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-[#2E2C2A] hover:bg-[#3C3A38] transition text-left">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-white">{date}</p>
            {note.diagnosis && (
              <p className="text-[10px] text-stone-400 truncate max-w-[180px]">{note.diagnosis}</p>
            )}
          </div>
        </div>
        {expanded ? <ChevronUp className="w-3.5 h-3.5 text-stone-400" /> : <ChevronDown className="w-3.5 h-3.5 text-stone-400" />}
      </button>

      {expanded && (
        <div className="p-3 bg-surface-dark space-y-2 text-xs">
          {/* Métricas */}
          {(note.weight_kg || note.blood_pressure_sys || note.heart_rate) && (
            <div className="flex flex-wrap gap-2 pb-2 border-b border-white/8">
              {note.weight_kg       && <Pill label="Peso"  value={`${note.weight_kg} kg`} />}
              {note.blood_pressure_sys && <Pill label="PA"  value={`${note.blood_pressure_sys}/${note.blood_pressure_dia} mmHg`} />}
              {note.heart_rate      && <Pill label="FC"    value={`${note.heart_rate} bpm`} />}
              {note.waist_cm        && <Pill label="Cintura" value={`${note.waist_cm} cm`} />}
            </div>
          )}
          {note.chief_complaint  && <HistRow label="Queixa"       value={note.chief_complaint} />}
          {note.history_illness  && <HistRow label="HDA"          value={note.history_illness} />}
          {note.relevant_history && <HistRow label="Antecedentes" value={note.relevant_history} />}
          {note.physical_exam    && <HistRow label="Exame físico" value={note.physical_exam} />}
          {note.diagnosis        && <HistRow label="Diagnóstico"  value={note.diagnosis} />}
          {note.plan             && <HistRow label="Plano"        value={note.plan} />}
          {note.free_text        && <HistRow label="Obs."         value={note.free_text} />}
        </div>
      )}
    </div>
  );
};

const Pill: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <span className="px-2 py-0.5 bg-[#2E2C2A] rounded-full text-[10px] text-stone-300">
    <span className="text-stone-500">{label}: </span>{value}
  </span>
);

const HistRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <p className="text-[10px] text-stone-400 uppercase tracking-wide">{label}</p>
    <p className="text-stone-200 whitespace-pre-wrap leading-relaxed">{value}</p>
  </div>
);

export default DoctorConsultaPage;
