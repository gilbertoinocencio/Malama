// =====================================================
// Malama — Portal do RH · Definir nova senha
//
// Destino do link enviado por "Esqueci minha senha". O link do Supabase
// chega de duas formas conforme a versão do template de e-mail, e as duas
// precisam funcionar:
//   • `?token_hash=...&type=recovery` — trocado aqui via verifyOtp. É o único
//     formato que sobrevive a abrir o e-mail em outro navegador.
//   • `?code=...` ou tokens no hash — o próprio cliente troca sozinho
//     (detectSessionInUrl), e aqui só esperamos a sessão aparecer.
//
// A sessão de recuperação é uma sessão real: quem abre este link está
// logado. Por isso, no fim, quem não for RH é deslogado — o link não vira
// porta de entrada no portal.
// =====================================================

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { KeyRound, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { MalamaLogo } from '../../components/MalamaLogo';

type Estado = 'verificando' | 'pronto' | 'invalido';

export const RhNovaSenha: React.FC = () => {
  const navigate = useNavigate();
  const [estado, setEstado] = useState<Estado>('verificando');
  const [nova, setNova] = useState('');
  const [confirma, setConfirma] = useState('');
  const [visivel, setVisivel] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    let vivo = true;

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (!vivo) return;
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') setEstado('pronto');
    });

    (async () => {
      const query = new URLSearchParams(window.location.search);
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const erroLink = query.get('error_description') ?? hash.get('error_description');
      if (erroLink) { if (vivo) setEstado('invalido'); return; }

      const tokenHash = query.get('token_hash') ?? hash.get('token_hash');
      if (tokenHash) {
        const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' });
        if (vivo) setEstado(error ? 'invalido' : 'pronto');
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (!vivo) return;
      if (data.session) { setEstado('pronto'); return; }

      // O `?code=` é trocado pelo cliente de forma assíncrona: uma segunda
      // olhada evita declarar o link inválido antes da troca terminar.
      setTimeout(async () => {
        const { data: segunda } = await supabase.auth.getSession();
        if (!vivo) return;
        setEstado(segunda.session ? 'pronto' : 'invalido');
      }, 1500);
    })();

    return () => { vivo = false; sub.subscription.unsubscribe(); };
  }, []);

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nova.length < 8) { toast.error('A senha precisa ter ao menos 8 caracteres.'); return; }
    if (nova !== confirma) { toast.error('A confirmação não confere com a nova senha.'); return; }

    setSalvando(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: nova });
      if (error) { toast.error(error.message); return; }

      const { data: { user } } = await supabase.auth.getUser();
      if (user?.app_metadata?.role === 'rh') {
        toast.success('Senha redefinida. Bem-vindo de volta.');
        navigate('/rh/dashboard');
      } else {
        await supabase.auth.signOut();
        toast.success('Senha redefinida. Entre com a nova senha.');
        navigate('/rh');
      }
    } finally {
      setSalvando(false);
    }
  };

  const campo = 'w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#7d4a3c] focus:border-transparent text-gray-900';

  return (
    <div className="min-h-screen bg-[#FDFBF9] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <MalamaLogo size="xl" />
          <p className="text-gray-600 mt-3 text-sm tracking-wide uppercase">Portal do RH</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8">
          {estado === 'verificando' && (
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7d4a3c]" />
              <p className="text-sm text-gray-500">Validando o link...</p>
            </div>
          )}

          {estado === 'invalido' && (
            <div className="text-center py-4">
              <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
              <h2 className="text-lg font-semibold text-gray-800 mb-1">Link expirado ou já usado</h2>
              <p className="text-sm text-gray-500 mb-5">
                Os links de recuperação valem por tempo limitado e só podem ser usados uma vez.
                Peça um novo na tela de login.
              </p>
              <button
                onClick={() => navigate('/rh')}
                className="w-full py-3 bg-[#7d4a3c] hover:bg-[#623a2f] text-white rounded-lg font-medium transition"
              >
                Voltar ao login
              </button>
            </div>
          )}

          {estado === 'pronto' && (
            <>
              <h2 className="text-xl font-semibold text-gray-800 mb-1">Definir nova senha</h2>
              <p className="text-sm text-gray-500 mb-6">
                Escolha uma senha nova para acessar o portal.
              </p>

              <form onSubmit={handleSalvar} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nova senha</label>
                  <input
                    type={visivel ? 'text' : 'password'} value={nova} onChange={e => setNova(e.target.value)}
                    autoComplete="new-password" placeholder="Mínimo 8 caracteres" className={campo}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Repita a nova senha</label>
                  <input
                    type={visivel ? 'text' : 'password'} value={confirma} onChange={e => setConfirma(e.target.value)}
                    autoComplete="new-password" className={campo}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setVisivel(v => !v)}
                  className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#7d4a3c] transition"
                >
                  {visivel ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  {visivel ? 'Ocultar senha' : 'Mostrar senha'}
                </button>

                <button
                  type="submit" disabled={salvando}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-[#7d4a3c] hover:bg-[#623a2f] text-white rounded-lg font-medium transition disabled:opacity-50"
                >
                  <KeyRound className="w-4 h-4" />
                  {salvando ? 'Salvando...' : 'Salvar nova senha'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
