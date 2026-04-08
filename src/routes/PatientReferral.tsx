// =====================================================
// NURA — Página de Indicação de Paciente
// =====================================================

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doctorService } from '../services/doctorPortalService';
import { NuraLogo } from '../components/NuraLogo';

type DoctorPreview = {
  id: string;
  name: string;
  specialty: string;
  specialty_custom?: string | null;
  photo_url: string | null;
  bio: string | null;
};

export const PatientReferral: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState<DoctorPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!token) { setNotFound(true); setLoading(false); return; }

    doctorService.getDoctorByReferralToken(token).then(data => {
      if (!data) setNotFound(true);
      else setDoctor(data as DoctorPreview);
    }).finally(() => setLoading(false));
  }, [token]);

  const handleSignUp = () => {
    if (token) localStorage.setItem('nura_referral_token', token);
    navigate('/cadastro');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
        <div className="w-8 h-8 rounded-full border-4 border-[#2ECC71] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#F8F9FA] p-6 text-center">
        <NuraLogo size="md" />
        <h1 className="text-xl font-semibold text-gray-800 mt-4">Link inválido ou expirado</h1>
        <p className="text-gray-500 text-sm max-w-sm">
          Este link de indicação não é válido. Peça ao seu médico um novo link.
        </p>
      </div>
    );
  }

  const specialty = doctor?.specialty === 'Outro' && doctor?.specialty_custom
    ? doctor.specialty_custom
    : doctor?.specialty;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1A1A1A] to-[#2d2d2d] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-10">
          <NuraLogo size="lg" />
        </div>

        {/* Card do médico */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <p className="text-sm text-gray-500 text-center mb-4">Seu médico te convidou para o Nura</p>

          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-[#2ECC71] flex-shrink-0 flex items-center justify-center overflow-hidden">
              {doctor?.photo_url ? (
                <img src={doctor.photo_url} alt={doctor.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-white text-2xl font-semibold">{doctor?.name.charAt(0)}</span>
              )}
            </div>
            <div>
              <p className="font-semibold text-gray-800 text-lg">{doctor?.name}</p>
              <p className="text-sm text-[#2ECC71]">{specialty}</p>
            </div>
          </div>

          {doctor?.bio && (
            <p className="text-sm text-gray-600 leading-relaxed border-t border-gray-100 pt-4">
              {doctor.bio}
            </p>
          )}
        </div>

        {/* Benefícios */}
        <div className="bg-white/10 rounded-2xl p-5 mb-6 text-white space-y-3">
          <h2 className="font-semibold text-base mb-1">O que você vai encontrar no Nura:</h2>
          {[
            'Acompanhamento nutricional personalizado',
            'Registro de sintomas e bem-estar',
            'Histórico de consultas e prescrições',
            'Comunicação direta com seu médico',
          ].map(item => (
            <div key={item} className="flex items-start gap-2 text-sm">
              <span className="text-[#2ECC71] mt-0.5">✓</span>
              <span>{item}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={handleSignUp}
          className="w-full py-4 bg-[#2ECC71] hover:bg-[#27ae60] text-white font-semibold rounded-xl text-base transition"
        >
          Criar minha conta gratuita
        </button>
        <p className="text-center text-white/50 text-xs mt-3">
          Já tem conta? <a href="/login" className="text-[#2ECC71] hover:underline">Entrar</a>
        </p>
      </div>
    </div>
  );
};
