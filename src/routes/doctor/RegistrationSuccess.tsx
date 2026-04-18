// =====================================================
// Malama — Tela de Sucesso do Cadastro
// =====================================================

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock } from 'lucide-react';

export const RegistrationSuccess: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#FDFBF9] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg p-12 text-center max-w-md">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[#9c5d4b]/10 flex items-center justify-center">
          <Clock className="w-10 h-10 text-[#9c5d4b]" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Cadastro enviado com sucesso! ⏳</h1>
        
        <p className="text-gray-600 mb-8">
          Você receberá um email quando seu cadastro for aprovado pela equipe Malama.
        </p>

        <button
          onClick={() => navigate('/medico')}
          className="px-8 py-3 bg-[#9c5d4b] hover:bg-[#7a4839] text-white rounded-lg font-medium transition"
        >
          Voltar ao login
        </button>
      </div>
    </div>
  );
};
