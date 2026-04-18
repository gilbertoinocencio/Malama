// =====================================================
// Malama — Sala de Consulta (Placeholder)
// =====================================================

import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { Video, ArrowLeft } from 'lucide-react';

export const ConsultationRoom: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center p-4">
      <div className="text-center">
        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gray-800 flex items-center justify-center">
          <Video className="w-12 h-12 text-[#9c5d4b]" />
        </div>

        <h1 className="text-2xl font-bold text-white mb-2">Videochamada</h1>
        <p className="text-gray-400 mb-8">Em implementação</p>

        <p className="text-sm text-gray-500 mb-8 max-w-md">
          A funcionalidade de videochamada estará disponível em breve.
          Enquanto isso, use meios de contato alternativos com seus pacientes.
        </p>

        <Link
          to="/medico/dashboard"
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#9c5d4b] hover:bg-[#7a4839] text-white rounded-lg font-medium transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao dashboard
        </Link>
      </div>
    </div>
  );
};
