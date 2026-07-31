import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { MalamaLogo } from '../../components/MalamaLogo';

/**
 * Compatibilidade para links antigos. Tokens de convite nunca mais sao usados
 * como senha: contas novas recebem por e-mail um link do Supabase para definir
 * a propria senha.
 */
export const InfluencerInvite: React.FC = () => (
  <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center p-6">
    <div className="w-full max-w-md text-center">
      <div className="flex justify-center mb-8"><MalamaLogo size="lg" /></div>
      <div className="bg-[#1A1A1A] border border-white/10 rounded-2xl p-8">
        <ShieldCheck className="w-12 h-12 text-[#2ECC71] mx-auto mb-4" />
        <h1 className="text-white text-xl font-bold">Convite atualizado por seguranca</h1>
        <p className="text-gray-400 text-sm mt-3">
          Este link antigo foi invalidado. Use o e-mail mais recente enviado pelo Malama
          para definir sua senha, ou solicite uma nova mensagem ao administrador.
        </p>
        <Link
          to="/influencer/login"
          className="block w-full mt-6 py-3 bg-[#2ECC71] hover:bg-[#27ae60] text-white font-bold rounded-xl"
        >
          Ir para o login
        </Link>
      </div>
    </div>
  </div>
);
