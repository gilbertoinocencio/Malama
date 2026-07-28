import React, { useEffect, useState } from 'react';
import { useParams, useOutletContext, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, User } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { DoctorConsultaPage } from '../../components/DoctorConsultaPage';
import { PsiConsultaPage } from '../../components/PsiConsultaPage';
import type { Doctor } from '../../types/doctorPortal';

// A sala da consulta abre 15 min antes do horário agendado.
// Antes disso o médico só acessa o PERFIL do paciente (dados), não a sala.
// Depois de 30 min sem iniciar, a consulta expira (vira no-show) e a sala
// não abre mais — mesmos limites de src/lib/consultationWindow.ts.
const JOIN_WINDOW_BEFORE_MS = 15 * 60_000;
const EXPIRES_AFTER_MS = 30 * 60_000;

interface ConsultationData {
  id: string;
  room_id: string;
  patient_id: string;
  doctor_id: string;
  patient_name: string;
  scheduled_at: string | null;
  duration_minutes: number | null;
  status: string;
}

export const ConsultationRoom: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { doctor } = useOutletContext<{ doctor: Doctor }>();
  const navigate = useNavigate();
  const [consultation, setConsultation] = useState<ConsultationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!id || !doctor) return;

    const load = async () => {
      const { data, error } = await supabase
        .from('consultations')
        .select('id, room_id, patient_id, doctor_id, scheduled_at, duration_minutes, status')
        .eq('id', id)
        .eq('doctor_id', doctor.id)
        .single();

      if (error || !data) {
        setError('Consulta não encontrada.');
        setLoading(false);
        return;
      }

      // Buscar nome do paciente
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', data.patient_id)
        .single();

      setConsultation({
        ...data,
        patient_name: profile?.display_name || 'Paciente',
      });
      setLoading(false);
    };

    load();
  }, [id, doctor]);

  // Recalcula a janela a cada 30s para liberar a sala automaticamente na hora
  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white" />
      </div>
    );
  }

  if (error || !consultation) {
    return (
      <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-white text-lg mb-6">{error || 'Consulta não encontrada.'}</p>
          <button
            onClick={() => navigate('/medico/agenda')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#7d4a3c] hover:bg-[#623a2f] text-white rounded-lg font-medium transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar à agenda
          </button>
        </div>
      </div>
    );
  }

  // Gate de horário/status: a sala (vídeo) só abre 15 min antes do agendado
  // e fecha 30 min depois se a consulta não iniciou. in_progress/completed
  // passam direto (retomar/rever); cancelled e no_show nunca abrem a sala.
  const scheduledMs = consultation.scheduled_at ? new Date(consultation.scheduled_at).getTime() : null;
  const windowStartMs = scheduledMs != null ? scheduledMs - JOIN_WINDOW_BEFORE_MS : null;
  const tooEarly =
    consultation.status === 'scheduled' &&
    windowStartMs != null &&
    nowMs < windowStartMs;
  const expired =
    consultation.status === 'scheduled' &&
    scheduledMs != null &&
    nowMs > scheduledMs + EXPIRES_AFTER_MS;
  const blockedStatus =
    consultation.status === 'cancelled' ? 'Consulta cancelada' :
    consultation.status === 'no_show'   ? 'Paciente não compareceu' :
    expired                             ? 'Consulta expirada' : null;

  if (blockedStatus) {
    const startsAt = scheduledMs != null
      ? new Date(scheduledMs).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
      : null;
    return (
      <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center p-4">
        <div className="max-w-sm w-full text-center">
          <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-5">
            <Clock className="w-8 h-8 text-white/70" />
          </div>
          <h1 className="text-white text-xl font-bold mb-2">{blockedStatus}</h1>
          <p className="text-white/60 text-sm mb-6">
            {expired || consultation.status === 'no_show'
              ? <>O paciente <span className="text-white/90 font-semibold">{consultation.patient_name}</span> não entrou na consulta{startsAt ? ` de ${startsAt}` : ''}. A sala foi encerrada e o paciente foi orientado a remarcar.</>
              : <>Esta consulta com <span className="text-white/90 font-semibold">{consultation.patient_name}</span>{startsAt ? ` (${startsAt})` : ''} foi cancelada. A sala de vídeo não está disponível.</>}
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => navigate(`/medico/paciente/${consultation.patient_id}`)}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#7d4a3c] hover:bg-[#623a2f] text-white rounded-lg font-medium transition"
            >
              <User className="w-4 h-4" />
              Ver perfil do paciente
            </button>
            <button
              onClick={() => navigate('/medico/agenda')}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/15 text-white rounded-lg font-medium transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar à agenda
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (tooEarly) {
    const opensAt = new Date(scheduledMs! - JOIN_WINDOW_BEFORE_MS).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    });
    const startsAt = new Date(scheduledMs!).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    });
    return (
      <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center p-4">
        <div className="max-w-sm w-full text-center">
          <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-5">
            <Clock className="w-8 h-8 text-white/70" />
          </div>
          <h1 className="text-white text-xl font-bold mb-2">Sala ainda não disponível</h1>
          <p className="text-white/60 text-sm mb-1">
            A sala da consulta com <span className="text-white/90 font-semibold">{consultation.patient_name}</span> abre 15 min antes do horário.
          </p>
          <p className="text-white/60 text-sm mb-6">
            Disponível a partir de <span className="text-white/90 font-semibold">{opensAt}</span> · consulta às {startsAt}.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => navigate(`/medico/paciente/${consultation.patient_id}`)}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#7d4a3c] hover:bg-[#623a2f] text-white rounded-lg font-medium transition"
            >
              <User className="w-4 h-4" />
              Ver perfil do paciente
            </button>
            <button
              onClick={() => navigate('/medico/agenda')}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/15 text-white rounded-lg font-medium transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar à agenda
            </button>
          </div>
        </div>
      </div>
    );
  }

  // O gate de horário acima vale para os dois; só o painel lateral muda.
  if (doctor.tipo_profissional === 'psicologo') {
    return (
      <PsiConsultaPage
        consultationId={consultation.id}
        roomId={consultation.room_id}
        patientId={consultation.patient_id}
        doctorId={consultation.doctor_id}
        patientName={consultation.patient_name}
        onEnd={() => navigate('/medico/agenda')}
      />
    );
  }

  return (
    <DoctorConsultaPage
      consultationId={consultation.id}
      roomId={consultation.room_id}
      patientId={consultation.patient_id}
      doctorId={consultation.doctor_id}
      doctorName={doctor.name}
      doctorCrm={`${doctor.crm}/${doctor.crm_state}`}
      doctorSpecialty={doctor.specialty_custom || doctor.specialty}
      doctorHasCertificate={!!doctor.icp_certificate_url}
      patientName={consultation.patient_name}
      onEnd={() => navigate('/medico/agenda')}
    />
  );
};
