import React, { useEffect, useState } from 'react';
import { useParams, useOutletContext, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { DoctorConsultaPage } from '../../components/DoctorConsultaPage';
import type { Doctor } from '../../types/doctorPortal';

interface ConsultationData {
  id: string;
  room_id: string;
  patient_id: string;
  doctor_id: string;
  patient_name: string;
}

export const ConsultationRoom: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { doctor } = useOutletContext<{ doctor: Doctor }>();
  const navigate = useNavigate();
  const [consultation, setConsultation] = useState<ConsultationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !doctor) return;

    const load = async () => {
      const { data, error } = await supabase
        .from('consultations')
        .select('id, room_id, patient_id, doctor_id')
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

  return (
    <DoctorConsultaPage
      consultationId={consultation.id}
      roomId={consultation.room_id}
      patientId={consultation.patient_id}
      doctorId={consultation.doctor_id}
      doctorName={doctor.name}
      doctorCrm={`${doctor.crm}/${doctor.crm_state}`}
      doctorSpecialty={doctor.specialty_custom || doctor.specialty}
      patientName={consultation.patient_name}
      onEnd={() => navigate('/medico/agenda')}
    />
  );
};
