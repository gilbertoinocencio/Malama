// =====================================================
// NURA — Login do Médico
// =====================================================

import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { supabase } from '../../services/supabase';
import { doctorService } from '../../services/doctorPortalService';
import { NuraLogo } from '../../components/NuraLogo';

export const DoctorLogin: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError) throw authError;

      // Verificar status do médico
      const doctor = await doctorService.getOwnDoctorProfile();

      if (!doctor) {
        setError('Médico não encontrado. Faça seu cadastro primeiro.');
        await supabase.auth.signOut();
        return;
      }

      if (doctor.status === 'pending') {
        navigate('/medico/em-analise');
        return;
      }

      if (doctor.status === 'suspended') {
        navigate('/medico/conta-suspensa');
        return;
      }

      if (doctor.status === 'approved') {
        const from = location.state?.from?.pathname || '/medico/dashboard';
        navigate(from, { replace: true });
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login');
      toast.error('Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <NuraLogo size="xl" />
          <p className="text-gray-600 mt-3 text-sm tracking-wide uppercase">Portal do Médico</p>
        </div>

        {/* Formulário */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Entrar</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#2ECC71] focus:border-transparent"
                placeholder="seu@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#2ECC71] focus:border-transparent"
                placeholder="Sua senha"
                required
              />
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                className="text-sm text-[#2ECC71] hover:underline"
                onClick={() => toast('Funcionalidade em desenvolvimento', { icon: '🔧' })}
              >
                Esqueci minha senha
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#2ECC71] hover:bg-[#27ae60] text-white rounded-lg font-medium transition disabled:opacity-50"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Novo no Nura?{' '}
              <button
                onClick={() => navigate('/medico/cadastro')}
                className="text-[#2ECC71] hover:underline font-medium"
              >
                Quero me cadastrar →
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
