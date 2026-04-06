import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useWebRTC } from '../hooks/useWebRTC';
import { VideoStream } from './VideoStream';
import { supabase } from '../services/supabase';
import { generatePrescriptionPDF, savePrescription } from '../lib/prescription';
import { generateConsultationBriefing } from '../lib/briefing';

interface DoctorConsultaPageProps {
  consultationId: string;
  roomId: string;
  patientId: string;
  doctorId: string;
  patientName: string;
  onEnd: () => void;
}

type TabKey = 'info' | 'notes' | 'briefing';

export const DoctorConsultaPage: React.FC<DoctorConsultaPageProps> = ({
  consultationId,
  roomId,
  patientId,
  doctorId,
  patientName,
  onEnd,
}) => {
  const [elapsed, setElapsed] = useState(0);
  const [tab, setTab] = useState<TabKey>('info');
  const [notes, setNotes] = useState('');
  const [patientData, setPatientData] = useState<any>(null);
  const [briefing, setBriefing] = useState('');
  const [briefingLoading, setBriefingLoading] = useState(false);
  const [showGoalsModal, setShowGoalsModal] = useState(false);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [goalAdjust, setGoalAdjust] = useState({ calories: '', protein: '', notes: '' });
  const [prescription, setPrescription] = useState({ medication: '', dosage: '', instructions: '' });
  const [postMessage, setPostMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [actionMsg, setActionMsg] = useState('');

  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { localStream, remoteStream, connectionState, startCall, endCall, toggleMute, toggleCamera, isMuted, isCameraOff, error } =
    useWebRTC({
      roomId,
      role: 'doctor',
      onConnected: () => {
        // Start timer
        timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
        // Update consultation status
        supabase.from('consultations').update({ status: 'in_progress', started_at: new Date().toISOString() }).eq('id', consultationId);
      },
      onDisconnected: () => {
        if (timerRef.current) clearInterval(timerRef.current);
      },
    });

  // Load patient data
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('profiles').select('*').eq('id', patientId).single();
      if (data) setPatientData(data);
    };
    load();
  }, [patientId]);

  // Load saved notes
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('consultations').select('notes').eq('id', consultationId).single();
      if (data?.notes) setNotes(data.notes);
    };
    load();
  }, [consultationId]);

  // Auto-save notes with debounce
  const saveNotes = useCallback(
    (value: string) => {
      if (notesTimer.current) clearTimeout(notesTimer.current);
      notesTimer.current = setTimeout(async () => {
        await supabase.from('consultations').update({ notes: value }).eq('id', consultationId);
      }, 1000);
    },
    [consultationId]
  );

  const handleNotesChange = (v: string) => {
    setNotes(v);
    saveNotes(v);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  const handleEndCall = async () => {
    endCall();
    if (timerRef.current) clearInterval(timerRef.current);
    await supabase.from('consultations').update({ status: 'completed', ended_at: new Date().toISOString() }).eq('id', consultationId);
    onEnd();
  };

  const handleGenerateBriefing = async () => {
    setBriefingLoading(true);
    try {
      const text = await generateConsultationBriefing(patientId);
      setBriefing(text);
    } catch (err) {
      setBriefing('Erro ao gerar briefing. Verifique sua conexão e tente novamente.');
    } finally {
      setBriefingLoading(false);
    }
  };

  const handleSaveGoals = async () => {
    setSaving(true);
    try {
      await supabase.from('doctor_plan_adjustments').insert({
        consultation_id: consultationId,
        doctor_id: doctorId,
        patient_id: patientId,
        calorie_goal: goalAdjust.calories ? parseInt(goalAdjust.calories) : null,
        protein_goal: goalAdjust.protein ? parseInt(goalAdjust.protein) : null,
        notes: goalAdjust.notes || null,
        applied_at: new Date().toISOString(),
      });
      // Realtime notify patient
      await supabase.channel(`patient:${patientId}`).send({
        type: 'broadcast',
        event: 'goals_updated',
        payload: {
          calorie_goal: goalAdjust.calories ? parseInt(goalAdjust.calories) : null,
          protein_goal: goalAdjust.protein ? parseInt(goalAdjust.protein) : null,
          doctor_name: 'Médico',
        },
      });
      setShowGoalsModal(false);
      setActionMsg('Metas ajustadas com sucesso!');
      setTimeout(() => setActionMsg(''), 3000);
    } catch (err) {
      console.error(err);
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

      const pdfBlob = await generatePrescriptionPDF({
        doctorName: 'Dr. Médico',
        doctorCRM: 'CRM—',
        doctorSpecialty: 'Endocrinologista',
        patientName: patientData?.display_name || patientName,
        medication: prescription.medication,
        dosage: prescription.dosage,
        instructions: prescription.instructions,
        issuedAt,
        expiresAt,
      });

      await savePrescription({
        consultationId,
        doctorId,
        patientId,
        pdfBlob,
        medication: prescription.medication,
        dosage: prescription.dosage,
        instructions: prescription.instructions,
      });

      // Trigger download for doctor
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receita_${prescription.medication.replace(/\s+/g, '_')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      setShowPrescriptionModal(false);
      setActionMsg('Receita emitida e salva!');
      setTimeout(() => setActionMsg(''), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleSendMessage = async () => {
    if (!postMessage.trim()) return;
    setSaving(true);
    try {
      const visibleUntil = new Date();
      visibleUntil.setDate(visibleUntil.getDate() + 7);
      await supabase.from('doctor_messages').insert({
        consultation_id: consultationId,
        doctor_id: doctorId,
        patient_id: patientId,
        message: postMessage,
        visible_until: visibleUntil.toISOString(),
      });
      setShowMessageModal(false);
      setPostMessage('');
      setActionMsg('Mensagem enviada ao paciente!');
      setTimeout(() => setActionMsg(''), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const bmi =
    patientData?.weight && patientData?.height
      ? (patientData.weight / Math.pow(patientData.height / 100, 2)).toFixed(1)
      : '—';

  const connectionColor =
    connectionState === 'connected' ? 'text-green-400' :
    connectionState === 'connecting' ? 'text-yellow-400' : 'text-red-400';

  const connectionLabel =
    connectionState === 'connected' ? 'Conectado' :
    connectionState === 'connecting' ? 'Conectando...' :
    connectionState === 'idle' ? 'Aguardando' : 'Desconectado';

  return (
    <div className="fixed inset-0 bg-gray-900 flex overflow-hidden z-50">
      {/* Left: Video Area */}
      <div className="flex-1 relative flex flex-col min-w-0">
        {/* Remote video */}
        <div className="flex-1 relative bg-black">
          {remoteStream ? (
            <VideoStream stream={remoteStream} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-white">
              <div className="w-24 h-24 rounded-full bg-gray-700 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-5xl text-gray-400">person</span>
              </div>
              <p className="text-lg font-semibold">{patientName}</p>
              <p className={`text-sm mt-1 ${connectionColor}`}>{connectionLabel}</p>
            </div>
          )}

          {/* Self view */}
          {localStream && (
            <div className="absolute bottom-4 left-4 w-32 h-24 rounded-xl overflow-hidden border-2 border-white/20 shadow-xl">
              <VideoStream stream={localStream} muted mirror className="w-full h-full object-cover" />
            </div>
          )}

          {/* Timer */}
          {connectionState === 'connected' && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/60 text-white text-sm font-mono px-3 py-1 rounded-full">
              ⏱ {formatTime(elapsed)}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="absolute top-4 left-4 right-4 bg-red-500/90 text-white text-sm px-3 py-2 rounded-lg">
              {error}
            </div>
          )}
        </div>

        {/* Controls bar */}
        <div className="bg-gray-800 px-6 py-3 flex items-center justify-center gap-4">
          {connectionState === 'idle' ? (
            <button
              onClick={startCall}
              className="px-6 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-full font-bold text-sm transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">videocam</span>
              Iniciar chamada
            </button>
          ) : (
            <>
              <ControlBtn icon={isMuted ? 'mic_off' : 'mic'} active={!isMuted} onClick={toggleMute} />
              <ControlBtn icon={isCameraOff ? 'videocam_off' : 'videocam'} active={!isCameraOff} onClick={toggleCamera} />
              <button
                onClick={handleEndCall}
                className="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-full font-bold text-sm transition-colors flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-lg">call_end</span>
                Encerrar
              </button>
            </>
          )}
        </div>
      </div>

      {/* Right: Patient Panel */}
      <div className="w-80 bg-gray-800 flex flex-col border-l border-gray-700">
        {/* Patient header */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-gray-300">person</span>
            </div>
            <div>
              <p className="text-white font-semibold text-sm">{patientName}</p>
              <p className="text-gray-400 text-xs">IMC {bmi} · {patientData?.weight || '—'}kg</p>
            </div>
          </div>
          {patientData?.glp1_mode && (
            <div className="mt-2 px-2 py-1 bg-green-900/40 rounded-lg text-xs text-green-400">
              💊 {patientData.glp1_medication} — {patientData.glp1_phase === 'start' ? 'Início' : patientData.glp1_phase === 'adjust' ? 'Ajuste' : 'Manutenção'}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          {(['info', 'notes', 'briefing'] as TabKey[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${
                tab === t ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {t === 'info' ? 'Paciente' : t === 'notes' ? 'Notas' : 'Briefing IA'}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-4">
          {tab === 'info' && (
            <div className="space-y-3">
              <InfoRow label="Idade" value={`${patientData?.age || '—'} anos`} />
              <InfoRow label="Gênero" value={patientData?.gender === 'male' ? 'Masculino' : patientData?.gender === 'female' ? 'Feminino' : '—'} />
              <InfoRow label="Peso" value={`${patientData?.weight || '—'} kg`} />
              <InfoRow label="Altura" value={`${patientData?.height || '—'} cm`} />
              <InfoRow label="Meta cal." value={`${patientData?.target_calories || '—'} kcal`} />
              <InfoRow label="Meta prot." value={`${patientData?.target_protein || '—'} g`} />
              {patientData?.glp1_main_concern && (
                <InfoRow label="Preocupação" value={patientData.glp1_main_concern} />
              )}
              {patientData?.glp1_weekly_checkins?.length > 0 && (
                <div>
                  <p className="text-xs text-gray-400 mb-1">Último check-in</p>
                  <div className="flex flex-wrap gap-1">
                    {(patientData.glp1_weekly_checkins.slice(-1)[0]?.symptoms || []).map((s: string) => (
                      <span key={s} className="px-1.5 py-0.5 bg-gray-700 rounded text-xs text-gray-300">{s}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'notes' && (
            <div className="h-full">
              <p className="text-xs text-gray-400 mb-2">Auto-salvo • Visível apenas para você</p>
              <textarea
                value={notes}
                onChange={(e) => handleNotesChange(e.target.value)}
                placeholder="Anotações da consulta..."
                className="w-full h-48 bg-gray-700 text-white text-sm rounded-xl p-3 resize-none focus:outline-none focus:ring-1 focus:ring-green-500 placeholder-gray-500"
              />
            </div>
          )}

          {tab === 'briefing' && (
            <div>
              {!briefing ? (
                <div className="flex flex-col items-center py-8 gap-3">
                  <span className="text-4xl">🧠</span>
                  <p className="text-gray-400 text-sm text-center">Gere um resumo do paciente com IA antes da consulta</p>
                  <button
                    onClick={handleGenerateBriefing}
                    disabled={briefingLoading}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors"
                  >
                    {briefingLoading ? 'Gerando...' : 'Gerar briefing'}
                  </button>
                </div>
              ) : (
                <div>
                  <div className="text-gray-200 text-xs leading-relaxed whitespace-pre-wrap">{briefing}</div>
                  <button
                    onClick={handleGenerateBriefing}
                    disabled={briefingLoading}
                    className="mt-3 text-xs text-green-400 hover:text-green-300 disabled:opacity-50"
                  >
                    {briefingLoading ? 'Regenerando...' : '↻ Regenerar'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="p-4 space-y-2 border-t border-gray-700">
          {actionMsg && (
            <p className="text-xs text-green-400 text-center mb-1">{actionMsg}</p>
          )}
          <button
            onClick={() => setShowGoalsModal(true)}
            className="w-full py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">tune</span>
            Ajustar metas
          </button>
          <button
            onClick={() => setShowPrescriptionModal(true)}
            className="w-full py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">description</span>
            Emitir receita
          </button>
          <button
            onClick={() => setShowMessageModal(true)}
            className="w-full py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">chat</span>
            Mensagem pós-consulta
          </button>
        </div>
      </div>

      {/* Goals Modal */}
      {showGoalsModal && (
        <Modal title="Ajustar metas do paciente" onClose={() => setShowGoalsModal(false)}>
          <div className="space-y-3">
            <ModalInput label="Meta calórica (kcal/dia)" value={goalAdjust.calories} onChange={(v) => setGoalAdjust((p) => ({ ...p, calories: v }))} placeholder={patientData?.target_calories?.toString() || '1800'} />
            <ModalInput label="Meta proteína (g/dia)" value={goalAdjust.protein} onChange={(v) => setGoalAdjust((p) => ({ ...p, protein: v }))} placeholder={patientData?.target_protein?.toString() || '120'} />
            <div>
              <label className="block text-xs text-gray-400 mb-1">Observação</label>
              <textarea
                value={goalAdjust.notes}
                onChange={(e) => setGoalAdjust((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Justificativa do ajuste..."
                className="w-full bg-gray-700 text-white rounded-lg p-3 text-sm resize-none h-20 focus:outline-none focus:ring-1 focus:ring-green-500"
              />
            </div>
            <button
              onClick={handleSaveGoals}
              disabled={saving}
              className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold text-sm disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Aplicar ajustes'}
            </button>
          </div>
        </Modal>
      )}

      {/* Prescription Modal */}
      {showPrescriptionModal && (
        <Modal title="Emitir receita digital" onClose={() => setShowPrescriptionModal(false)}>
          <div className="space-y-3">
            <ModalInput label="Medicamento" value={prescription.medication} onChange={(v) => setPrescription((p) => ({ ...p, medication: v }))} placeholder="Ex: Ozempic 0,5mg" />
            <ModalInput label="Posologia" value={prescription.dosage} onChange={(v) => setPrescription((p) => ({ ...p, dosage: v }))} placeholder="Ex: 1x semana, via subcutânea" />
            <div>
              <label className="block text-xs text-gray-400 mb-1">Instruções</label>
              <textarea
                value={prescription.instructions}
                onChange={(e) => setPrescription((p) => ({ ...p, instructions: e.target.value }))}
                placeholder="Instruções adicionais ao paciente..."
                className="w-full bg-gray-700 text-white rounded-lg p-3 text-sm resize-none h-20 focus:outline-none focus:ring-1 focus:ring-green-500"
              />
            </div>
            <button
              onClick={handleEmitPrescription}
              disabled={saving || !prescription.medication || !prescription.dosage}
              className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold text-sm disabled:opacity-50"
            >
              {saving ? 'Gerando PDF...' : 'Emitir e baixar PDF'}
            </button>
          </div>
        </Modal>
      )}

      {/* Message Modal */}
      {showMessageModal && (
        <Modal title="Mensagem pós-consulta" onClose={() => setShowMessageModal(false)}>
          <div className="space-y-3">
            <p className="text-xs text-gray-400">Visível no app do paciente por 7 dias</p>
            <textarea
              value={postMessage}
              onChange={(e) => setPostMessage(e.target.value)}
              placeholder="Escreva uma mensagem para o paciente..."
              className="w-full bg-gray-700 text-white rounded-lg p-3 text-sm resize-none h-28 focus:outline-none focus:ring-1 focus:ring-green-500"
            />
            <button
              onClick={handleSendMessage}
              disabled={saving || !postMessage.trim()}
              className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold text-sm disabled:opacity-50"
            >
              {saving ? 'Enviando...' : 'Enviar mensagem'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

// Sub-components
const ControlBtn: React.FC<{ icon: string; active: boolean; onClick: () => void }> = ({ icon, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
      active ? 'bg-gray-600 hover:bg-gray-500 text-white' : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
    }`}
  >
    <span className="material-symbols-outlined text-lg">{icon}</span>
  </button>
);

const InfoRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex justify-between text-xs">
    <span className="text-gray-400">{label}</span>
    <span className="text-white font-medium">{value}</span>
  </div>
);

const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => (
  <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-10 p-4">
    <div className="bg-gray-800 rounded-2xl w-full max-w-sm p-5 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-bold text-sm">{title}</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-white">
          <span className="material-symbols-outlined text-lg">close</span>
        </button>
      </div>
      {children}
    </div>
  </div>
);

const ModalInput: React.FC<{ label: string; value: string; onChange: (v: string) => void; placeholder?: string }> = ({ label, value, onChange, placeholder }) => (
  <div>
    <label className="block text-xs text-gray-400 mb-1">{label}</label>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 placeholder-gray-500"
    />
  </div>
);

export default DoctorConsultaPage;
