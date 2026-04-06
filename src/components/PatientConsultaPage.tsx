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
  const [goalsUpdate, setGoalsUpdate] = useState<{ calorie_goal?: number; protein_goal?: number; doctor_name?: string } | null>(null);
  const [showGoalsToast, setShowGoalsToast] = useState(false);
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
    const { data: { user } } = supabase.auth as any;
    const userId = user?.id;
    if (!userId) return;

    const channel = supabase
      .channel(`patient:${userId}`)
      .on('broadcast', { event: 'goals_updated' }, ({ payload }) => {
        setGoalsUpdate(payload);
        setShowGoalsToast(true);
        setTimeout(() => setShowGoalsToast(false), 6000);
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
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
    <div className="fixed inset-0 bg-black flex flex-col overflow-hidden z-50">
      {/* Remote video (fullscreen) */}
      <div className="flex-1 relative">
        {remoteStream ? (
          <VideoStream stream={remoteStream} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-white bg-gray-900">
            <div className="w-20 h-20 rounded-full bg-gray-700 flex items-center justify-center mb-3">
              <span className="material-symbols-outlined text-4xl text-gray-400">person</span>
            </div>
            <p className="text-base font-semibold">{doctorName}</p>
            <p className={`text-sm mt-1 ${connectionColor}`}>{connectionLabel}</p>
            {connectionState === 'connecting' && (
              <div className="mt-3 w-8 h-8 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
            )}
          </div>
        )}

        {/* Self view - small corner */}
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

        {/* Timer */}
        {connectionState === 'connected' && (
          <div className="absolute top-12 left-1/2 -translate-x-1/2 bg-black/60 text-white text-sm font-mono px-3 py-1 rounded-full">
            ⏱ {formatTime(elapsed)}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="absolute top-12 left-4 right-4 bg-red-500/90 text-white text-sm px-3 py-2 rounded-xl text-center">
            {error}
          </div>
        )}

        {/* Doctor message */}
        <div className="absolute top-4 left-4 right-20">
          <p className="text-white text-sm font-semibold drop-shadow">{doctorName}</p>
        </div>

        {/* Goals updated toast */}
        {showGoalsToast && goalsUpdate && (
          <div className="absolute top-16 left-4 right-4 bg-green-600/95 text-white px-4 py-3 rounded-2xl shadow-xl">
            <p className="font-semibold text-sm">✅ Suas metas foram atualizadas!</p>
            <p className="text-xs mt-0.5 opacity-90">
              Dr. {goalsUpdate.doctor_name || 'Médico'} ajustou{' '}
              {goalsUpdate.calorie_goal ? `calorias para ${goalsUpdate.calorie_goal}kcal` : ''}
              {goalsUpdate.calorie_goal && goalsUpdate.protein_goal ? ' e ' : ''}
              {goalsUpdate.protein_goal ? `proteína para ${goalsUpdate.protein_goal}g` : ''}
            </p>
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
