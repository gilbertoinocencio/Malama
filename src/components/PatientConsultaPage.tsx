import React, { useEffect, useState } from 'react';
import { useWebRTC } from '../hooks/useWebRTC';
import { VideoStream } from './VideoStream';
import { supabase } from '../services/supabase';

interface PatientConsultaPageProps {
  consultationId: string;
  roomId: string;
  doctorName: string;
  onEnd: () => void;
}

export const PatientConsultaPage: React.FC<PatientConsultaPageProps> = ({
  consultationId,
  roomId,
  doctorName,
  onEnd,
}) => {
  const [elapsed, setElapsed] = useState(0);
  const [goalsUpdate, setGoalsUpdate] = useState<{
    calorie_goal?: number; protein_goal?: number; carbs_goal?: number;
    fat_goal?: number; fiber_goal?: number; water_goal?: number; meals_goal?: number;
    doctor_name?: string;
  } | null>(null);
  const [showGoalsToast, setShowGoalsToast] = useState(false);
  const [rxToast, setRxToast] = useState<{ medication: string; doctor_name: string } | null>(null);
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const {
    localStream,
    remoteStream,
    connectionState,
    startCall,
    endCall,
    toggleMute,
    toggleCamera,
    isMuted,
    isCameraOff,
    error,
  } = useWebRTC({
    roomId,
    role: 'patient',
    onConnected: () => {
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    },
    onDisconnected: () => {
      if (timerRef.current) clearInterval(timerRef.current);
    },
  });

  // Auto-start call on mount
  useEffect(() => {
    startCall();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Subscribe to real-time goals updates from doctor
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    supabase.auth.getSession().then(({ data }) => {
      const userId = data.session?.user?.id;
      if (!userId || cancelled) return;

      channel = supabase
        .channel(`patient:${userId}`)
        .on('broadcast', { event: 'goals_updated' }, ({ payload }) => {
          setGoalsUpdate(payload);
          setShowGoalsToast(true);
          setTimeout(() => setShowGoalsToast(false), 6000);
        })
        .on('broadcast', { event: 'prescription_issued' }, ({ payload }) => {
          setRxToast(payload);
          setTimeout(() => setRxToast(null), 10000);
        })
        .subscribe();
    });

    return () => {
      cancelled = true;
      channel?.unsubscribe();
    };
  }, []);

  const handleEnd = async () => {
    endCall();
    if (timerRef.current) clearInterval(timerRef.current);
    await supabase
      .from('consultations')
      .update({ ended_at: new Date().toISOString() })
      .eq('id', consultationId);
    onEnd();
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  const connectionColor =
    connectionState === 'connected'
      ? 'text-green-400'
      : connectionState === 'connecting'
      ? 'text-yellow-400'
      : 'text-red-400';

  const connectionLabel =
    connectionState === 'connected'
      ? 'Conectado'
      : connectionState === 'connecting'
      ? 'Conectando...'
      : connectionState === 'idle'
      ? 'Aguardando médico...'
      : 'Desconectado';

  return (
    <div className="fixed inset-0 bg-black flex flex-col overflow-hidden z-50 pt-safe">

      {/* ── Barra de status + timer (sempre visível) ── */}
      <div className="shrink-0 bg-black/70 backdrop-blur-sm px-4 py-2.5 flex items-center justify-between z-10">
        {/* Médico */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-gray-300 text-base">stethoscope</span>
          </div>
          <span className="text-white text-sm font-semibold truncate max-w-[140px]">{doctorName}</span>
        </div>

        {/* Timer central */}
        <div className="flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              connectionState === 'connected' ? 'bg-Malama-neon animate-pulse' :
              connectionState === 'connecting' ? 'bg-yellow-400 animate-pulse' :
              'bg-red-400'
            }`}
          />
          <span className="text-white font-mono text-base font-bold tabular-nums tracking-wider">
            {connectionState === 'connected' ? formatTime(elapsed) : connectionLabel}
          </span>
        </div>

        {/* Placeholder direito para simetria */}
        <div className="w-24" />
      </div>

      {/* Remote video */}
      <div className="flex-1 relative">
        {remoteStream ? (
          <VideoStream stream={remoteStream} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-white bg-gray-900">
            <div className="w-20 h-20 rounded-full bg-gray-700 flex items-center justify-center mb-3">
              <span className="material-symbols-outlined text-4xl text-gray-400">person</span>
            </div>
            <p className="text-base font-semibold">{doctorName}</p>
            {connectionState === 'connecting' && (
              <div className="mt-3 w-8 h-8 border-2 border-Malama-neon border-t-transparent rounded-full animate-spin" />
            )}
          </div>
        )}

        {/* Self view */}
        {localStream && (
          <div className="absolute bottom-4 right-4 w-24 h-32 rounded-2xl overflow-hidden border-2 border-white/20 shadow-xl">
            <VideoStream stream={localStream} muted mirror className="w-full h-full object-cover" />
            {isCameraOff && (
              <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                <span className="material-symbols-outlined text-gray-400">videocam_off</span>
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="absolute top-4 left-4 right-4 bg-red-500/90 text-white text-sm px-3 py-2 rounded-xl text-center">
            {error}
          </div>
        )}

        {/* Prescription issued toast */}
        {rxToast && (
          <div className="absolute top-4 left-4 right-4 bg-blue-600/95 text-white px-4 py-3 rounded-2xl shadow-xl">
            <p className="font-semibold text-sm">📋 Nova receita disponível!</p>
            <p className="text-xs mt-0.5 opacity-90">
              Dr. {rxToast.doctor_name} emitiu uma receita para{' '}
              <span className="font-semibold">{rxToast.medication}</span>.
            </p>
            <p className="text-xs mt-1 opacity-75">Acesse Minhas Consultas para baixar o PDF.</p>
          </div>
        )}

        {/* Goals updated toast */}
        {showGoalsToast && goalsUpdate && (
          <div className="absolute top-4 left-4 right-4 bg-green-600/95 text-white px-4 py-3 rounded-2xl shadow-xl">
            <p className="font-semibold text-sm">✅ Suas metas foram atualizadas!</p>
            <p className="text-xs mt-1 opacity-90">
              Dr. {goalsUpdate.doctor_name || 'Médico'} ajustou seus objetivos:
            </p>
            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs opacity-90">
              {goalsUpdate.calorie_goal && <span>🔥 {goalsUpdate.calorie_goal} kcal</span>}
              {goalsUpdate.protein_goal && <span>🥩 {goalsUpdate.protein_goal}g proteína</span>}
              {goalsUpdate.carbs_goal   && <span>🌾 {goalsUpdate.carbs_goal}g carbs</span>}
              {goalsUpdate.fat_goal     && <span>🥑 {goalsUpdate.fat_goal}g gordura</span>}
              {goalsUpdate.fiber_goal   && <span>🥦 {goalsUpdate.fiber_goal}g fibras</span>}
              {goalsUpdate.water_goal   && <span>💧 {goalsUpdate.water_goal}ml água</span>}
              {goalsUpdate.meals_goal   && <span>🍽 {goalsUpdate.meals_goal} refeições</span>}
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-black/80 px-6 py-5 flex items-center justify-center gap-6 safe-area-pb">
        <MobileControlBtn
          icon={isMuted ? 'mic_off' : 'mic'}
          label={isMuted ? 'Mudo' : 'Microfone'}
          active={!isMuted}
          onClick={toggleMute}
        />
        <button
          onClick={handleEnd}
          className="w-16 h-16 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center shadow-lg transition-colors"
        >
          <span className="material-symbols-outlined text-white text-3xl">call_end</span>
        </button>
        <MobileControlBtn
          icon={isCameraOff ? 'videocam_off' : 'videocam'}
          label={isCameraOff ? 'Câmera off' : 'Câmera'}
          active={!isCameraOff}
          onClick={toggleCamera}
        />
      </div>
    </div>
  );
};

const MobileControlBtn: React.FC<{
  icon: string;
  label: string;
  active: boolean;
  onClick: () => void;
}> = ({ icon, label, active, onClick }) => (
  <button onClick={onClick} className="flex flex-col items-center gap-1">
    <div
      className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
        active ? 'bg-gray-700' : 'bg-red-500/30'
      }`}
    >
      <span className={`material-symbols-outlined text-xl ${active ? 'text-white' : 'text-red-400'}`}>
        {icon}
      </span>
    </div>
    <span className="text-white text-xs">{label}</span>
  </button>
);

export default PatientConsultaPage;
