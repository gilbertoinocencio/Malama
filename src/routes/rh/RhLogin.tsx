// =====================================================
// Malama — Login do Portal do RH (empresas B2B)
// Credenciais criadas pelo super admin na criação da empresa.
//
// A recuperação de senha manda o link para o e-mail de acesso e cai em
// /rh/nova-senha. A resposta é sempre a mesma, com ou sem conta no endereço
// digitado: dizer "não existe conta com esse e-mail" entregaria a quem
// estivesse fora quais empresas são clientes.
// =====================================================

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { supabase } from '../../services/supabase';
import { MalamaLogo } from '../../components/MalamaLogo';

export const RhLogin: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [modo, setModo] = useState<'login' | 'recuperar'>('login');
  const [enviado, setEnviado] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw authError;

      const { data: { user } } = await supabase.auth.getUser();
      if (user?.app_metadata?.role !== 'rh') {
        setError('Acesso não autorizado. Use as credenciais de RH fornecidas pela Malama.');
        await supabase.auth.signOut();
        return;
      }

      navigate('/rh/dashboard');
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login');
      toast.error('Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  const handleRecuperar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) { setError('Informe o e-mail de acesso.'); return; }
    setLoading(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/rh/nova-senha`,
      });
      // Só erro de infraestrutura (limite de envios, e-mail malformado) volta
      // aqui — endereço sem conta responde sucesso, e é assim que deve ser.
      if (resetError) { setError(resetError.message); return; }
      setEnviado(true);
    } finally {
      setLoading(false);
    }
  };

  const voltarAoLogin = () => {
    setModo('login');
    setEnviado(false);
    setError('');
  };

  const campo = 'w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#7d4a3c] focus:border-transparent text-gray-900';

  if (modo === 'recuperar') {
    return (
      <div className="min-h-screen bg-[#FDFBF9] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <MalamaLogo size="xl" />
            <p className="text-gray-600 mt-3 text-sm tracking-wide uppercase">Portal do RH</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-8">
            {enviado ? (
              <>
                <h2 className="text-xl font-semibold text-gray-800 mb-1">Verifique seu e-mail</h2>
                <p className="text-sm text-gray-500 mb-6">
                  Se houver uma conta em <span className="font-medium text-gray-700">{email}</span>,
                  enviamos um link para criar uma senha nova. Ele vale por tempo limitado e só
                  funciona uma vez — se não chegar em alguns minutos, confira o spam.
                </p>
                <button
                  onClick={voltarAoLogin}
                  className="w-full py-3 bg-[#7d4a3c] hover:bg-[#623a2f] text-white rounded-lg font-medium transition"
                >
                  Voltar ao login
                </button>
              </>
            ) : (
              <>
                <h2 className="text-xl font-semibold text-gray-800 mb-1">Recuperar senha</h2>
                <p className="text-sm text-gray-500 mb-6">
                  Informe o e-mail de acesso ao portal e enviaremos um link para definir uma senha nova.
                </p>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
                )}

                <form onSubmit={handleRecuperar} className="space-y-4">
                  <div>
                    <label htmlFor="rh-recuperar-email" className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                    <input
                      id="rh-recuperar-email"
                      type="email" value={email} onChange={e => setEmail(e.target.value)} required
                      autoComplete="username" className={campo}
                    />
                  </div>

                  <button
                    type="submit" disabled={loading}
                    className="w-full py-3 bg-[#7d4a3c] hover:bg-[#623a2f] text-white rounded-lg font-medium transition disabled:opacity-50"
                  >
                    {loading ? 'Enviando...' : 'Enviar link de recuperação'}
                  </button>
                </form>

                <button
                  onClick={voltarAoLogin}
                  className="w-full mt-4 text-sm text-gray-500 hover:text-[#7d4a3c] transition"
                >
                  Voltar ao login
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF9] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <MalamaLogo size="xl" />
          <p className="text-gray-600 mt-3 text-sm tracking-wide uppercase">Portal do RH</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-1">Entrar</h2>
          <p className="text-sm text-gray-500 mb-6">Gerencie o acesso dos seus colaboradores ao benefício Malama.</p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
          )}

          {/* Os rótulos precisam de `htmlFor` casando com o `id` do campo:
              sem isso o leitor de tela anuncia "caixa de edição" sem dizer
              qual, e clicar no texto não foca o campo. O `autoComplete`
              também faltava, então gerenciador de senha não preenchia nem
              oferecia salvar — num portal de acesso esporádico, é o que
              transforma "esqueci a senha" em chamado de suporte. */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="rh-login-email" className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
              <input
                id="rh-login-email"
                type="email" value={email} onChange={e => setEmail(e.target.value)} required
                autoComplete="username"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#7d4a3c] focus:border-transparent text-gray-900"
              />
            </div>

            <div>
              <label htmlFor="rh-login-senha" className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
              <input
                id="rh-login-senha"
                type="password" value={password} onChange={e => setPassword(e.target.value)} required
                autoComplete="current-password"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#7d4a3c] focus:border-transparent text-gray-900"
              />
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full py-3 bg-[#7d4a3c] hover:bg-[#623a2f] text-white rounded-lg font-medium transition disabled:opacity-50"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <button
            type="button"
            onClick={() => { setModo('recuperar'); setError(''); setPassword(''); }}
            className="w-full mt-4 text-sm text-gray-500 hover:text-[#7d4a3c] transition"
          >
            Esqueci minha senha
          </button>
        </div>
      </div>
    </div>
  );
};
