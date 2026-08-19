import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Building2, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';

type Modos = { compliance: boolean; mental: boolean; metabolico: boolean };

const input = 'mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-[#7d4a3c] focus:ring-2 focus:ring-[#7d4a3c]/15';

export const EmpresaSelfSignup: React.FC = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    empresa: '', cnpj: '', num_colaboradores: '', nome: '', cargo: '', email: '', telefone: '', senha: '',
    aceiteTermos: false, aceitePrivacidade: false,
  });
  const [modos, setModos] = useState<Modos>({ compliance: false, mental: false, metabolico: false });
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  const alterar = (campo: keyof typeof form, valor: string | boolean) =>
    setForm(atual => ({ ...atual, [campo]: valor }));

  const enviar = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!modos.compliance && !modos.mental && !modos.metabolico) {
      setErro('Selecione pelo menos uma solução para a empresa.');
      return;
    }
    setErro('');
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('self-register-empresa', {
        body: { ...form, modos },
      });
      if (error) {
        const resposta = (error as { context?: Response }).context;
        const detalhe = resposta ? await resposta.json().catch(() => null) : null;
        throw new Error(detalhe?.error ?? error.message);
      }
      if (data?.error) throw new Error(data.error);

      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: form.email.trim(), password: form.senha,
      });
      if (loginError) throw new Error('Sua conta foi criada, mas não foi possível entrar agora. Use o Portal do RH para acessar.');
      navigate('/rh/dashboard');
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível concluir o cadastro.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#FDFBF9] px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <Link to="/empresas" className="inline-flex items-center gap-2 text-sm font-medium text-[#7d4a3c] hover:underline">
          <ArrowLeft className="h-4 w-4" /> Voltar para Malama Empresas
        </Link>

        <div className="mt-7 rounded-3xl bg-[#1a1a1a] px-6 py-8 text-white sm:px-10">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-white/10 p-3"><Building2 className="h-6 w-6" /></div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#d2a97a]">Malama Empresas</p>
              <h1 className="mt-2 font-serif text-3xl font-light sm:text-4xl">Crie o espaço da sua empresa</h1>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/70">
                Sem pagamento agora. Você já entra no portal para organizar os dados do RH; a liberação dos serviços acontece depois da ativação comercial.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={enviar} className="mt-6 space-y-6 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5 sm:p-9">
          <section>
            <h2 className="text-lg font-semibold text-gray-900">Empresa</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-gray-700 sm:col-span-2">Nome da empresa *
                <input required value={form.empresa} onChange={e => alterar('empresa', e.target.value)} className={input} placeholder="Acme S.A." autoComplete="organization" />
              </label>
              <label className="text-sm font-medium text-gray-700">CNPJ *
                <input required value={form.cnpj} onChange={e => alterar('cnpj', e.target.value)} className={input} placeholder="00.000.000/0001-00" inputMode="numeric" autoComplete="off" />
              </label>
              <label className="text-sm font-medium text-gray-700">Número de colaboradores *
                <select required value={form.num_colaboradores} onChange={e => alterar('num_colaboradores', e.target.value)} className={input}>
                  <option value="">Selecione</option><option value="Até 50">Até 50</option><option value="51 a 200">51 a 200</option><option value="201 a 500">201 a 500</option><option value="Acima de 500">Acima de 500</option>
                </select>
              </label>
            </div>
          </section>

          <section className="border-t border-gray-100 pt-6">
            <h2 className="text-lg font-semibold text-gray-900">Responsável pelo portal</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-gray-700">Nome completo *
                <input required value={form.nome} onChange={e => alterar('nome', e.target.value)} className={input} autoComplete="name" />
              </label>
              <label className="text-sm font-medium text-gray-700">Cargo *
                <input required value={form.cargo} onChange={e => alterar('cargo', e.target.value)} className={input} placeholder="Gerente de RH" />
              </label>
              <label className="text-sm font-medium text-gray-700">E-mail corporativo *
                <input required type="email" value={form.email} onChange={e => alterar('email', e.target.value)} className={input} autoComplete="email" />
              </label>
              <label className="text-sm font-medium text-gray-700">Telefone / WhatsApp *
                <input required type="tel" value={form.telefone} onChange={e => alterar('telefone', e.target.value)} className={input} autoComplete="tel" />
              </label>
              <label className="text-sm font-medium text-gray-700 sm:col-span-2">Crie uma senha *
                <input required minLength={8} type="password" value={form.senha} onChange={e => alterar('senha', e.target.value)} className={input} autoComplete="new-password" placeholder="Ao menos 8 caracteres" />
              </label>
            </div>
          </section>

          <section className="border-t border-gray-100 pt-6">
            <h2 className="text-lg font-semibold text-gray-900">Soluções de interesse *</h2>
            <p className="mt-1 text-sm text-gray-500">Você pode escolher mais de uma.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {([
                ['compliance', 'Modo Compliance', 'Ciclo e evidências para a NR-1.'],
                ['mental', 'Modo Mental', 'Cuidado psicológico e saúde mental.'],
                ['metabolico', 'Modo Metabólico', 'Cuidado metabólico e bem-estar.'],
              ] as [keyof Modos, string, string][]).map(([id, titulo, descricao]) => (
                <label key={id} className={`cursor-pointer rounded-2xl border p-4 transition ${modos[id] ? 'border-[#7d4a3c] bg-[#7d4a3c]/5' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input type="checkbox" checked={modos[id]} onChange={e => setModos(atual => ({ ...atual, [id]: e.target.checked }))} className="sr-only" />
                  <span className="flex gap-2"><CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${modos[id] ? 'text-[#7d4a3c]' : 'text-gray-300'}`} /><span><span className="block text-sm font-semibold text-gray-800">{titulo}</span><span className="mt-1 block text-xs leading-relaxed text-gray-500">{descricao}</span></span></span>
                </label>
              ))}
            </div>
          </section>

          <section className="border-t border-gray-100 pt-6 space-y-3">
            <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-gray-600"><input required type="checkbox" checked={form.aceiteTermos} onChange={e => alterar('aceiteTermos', e.target.checked)} className="mt-1 h-4 w-4 rounded border-gray-300 accent-[#7d4a3c]" />Li e aceito os <a href="/termos-de-uso" target="_blank" rel="noreferrer" className="font-medium text-[#7d4a3c] underline">Termos de Uso</a>.</label>
            <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-gray-600"><input required type="checkbox" checked={form.aceitePrivacidade} onChange={e => alterar('aceitePrivacidade', e.target.checked)} className="mt-1 h-4 w-4 rounded border-gray-300 accent-[#7d4a3c]" />Li a <a href="/privacidade" target="_blank" rel="noreferrer" className="font-medium text-[#7d4a3c] underline">Política de Privacidade</a> e autorizo o tratamento dos dados para criar e administrar a conta.</label>
          </section>

          {erro && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</p>}
          <button disabled={loading} type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#7d4a3c] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#623a2f] disabled:opacity-60">
            {loading ? 'Criando conta...' : 'Criar e acessar o portal'} <ArrowRight className="h-4 w-4" />
          </button>
          <p className="flex items-center justify-center gap-2 text-center text-xs text-gray-500"><ShieldCheck className="h-4 w-4 text-[#7d4a3c]" />Nenhuma cobrança será criada nesta etapa.</p>
        </form>
      </div>
    </main>
  );
};
