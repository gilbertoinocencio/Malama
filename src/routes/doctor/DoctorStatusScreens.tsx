// =====================================================
// Malama — Telas de Status do Médico
// =====================================================

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, AlertTriangle } from 'lucide-react';

// Médico com cadastro em análise
export const DoctorPending: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#FDFBF9] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg p-12 text-center max-w-md">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-yellow-100 flex items-center justify-center">
          <Clock className="w-10 h-10 text-yellow-600" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Cadastro em análise ⏳</h1>
        
        <p className="text-gray-600 mb-8">
          Seu cadastro está sendo analisado pela equipe Malama. Você receberá um email quando for aprovado.
        </p>

        <button
          onClick={() => navigate('/medico')}
          className="px-8 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition"
        >
          Voltar ao login
        </button>
      </div>
    </div>
  );
};

// Médico com conta suspensa
export const DoctorSuspended: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#FDFBF9] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg p-12 text-center max-w-md">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
          <AlertTriangle className="w-10 h-10 text-red-600" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Conta suspensa</h1>
        
        <p className="text-gray-600 mb-8">
          Entre em contato com o suporte: <a href="mailto:suporte@Malama.app" className="text-[#7d4a3c] hover:underline">suporte@Malama.app</a>
        </p>
      </div>
    </div>
  );
};
