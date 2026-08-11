// =====================================================
// Malama Empresas — formulário de captação das landings B2B
//
// FONTE ÚNICA do formulário. Estava embutido na landing metabólica; virou
// componente quando nasceu a segunda landing, porque um campo novo copiado
// em duas telas vira campo esquecido em uma delas.
//
// `origem` marca de qual landing o lead veio — é o que separa "quero cuidar
// do metabolismo do time" de "preciso cumprir a NR-1", duas conversas
// comerciais diferentes. A coluna é opcional no banco de propósito: ver
// o fallback em `enviar`.
// =====================================================

import React, { useState } from 'react';
import { motion, type Variants } from 'framer-motion';
import { ArrowRight, CheckCircle } from 'lucide-react';
import { supabase } from '../../services/supabase';

export type LeadOrigem = 'metabolico' | 'mental';

type Props = {
  origem: LeadOrigem;
  /** Texto do botão — muda com a promessa da página. */
  ctaLabel: string;
  variants?: Variants;
};

const inputCls =
  'w-full px-4 py-3.5 rounded-xl border border-Malama-border bg-white text-Malama-main ' +
  'placeholder:text-Malama-muted/50 focus:outline-none focus:border-Malama-petrol transition-colors text-sm';

const labelCls = 'text-xs font-semibold tracking-wide text-Malama-muted uppercase';

export const EmpresaLeadForm: React.FC<Props> = ({ origem, ctaLabel, variants }) => {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  const [form, setForm] = useState({
    nome: '', cargo: '', empresa: '', cnpj: '', email: '',
    num_colaboradores: '', telefone: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const enviar = async () => {
    const { error } = await supabase.from('empresa_leads').insert({ ...form, origem });
    if (!error) return null;

    // A migração que cria `origem` roda à mão no SQL Editor (padrão do
    // projeto), então pode estar atrasada em relação a este deploy. Perder
    // um lead por causa disso é caro demais: se a coluna não existir,
    // regrava sem ela. PGRST204 = coluna ausente no schema cache.
    const colunaFaltando = error.code === 'PGRST204' || /origem/i.test(error.message ?? '');
    if (!colunaFaltando) return error;

    const retry = await supabase.from('empresa_leads').insert({ ...form });
    return retry.error;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome || !form.empresa || !form.email || !form.num_colaboradores) {
      setErro('Preencha todos os campos obrigatórios.');
      return;
    }
    setLoading(true);
    setErro('');
    const error = await enviar();
    setLoading(false);
    if (error) setErro('Não foi possível enviar. Tente novamente.');
    else setSubmitted(true);
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-5 py-16 text-center"
      >
        <div className="w-16 h-16 rounded-full bg-Malama-petrol/10 flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-Malama-petrol" />
        </div>
        <h3 className="font-serif text-3xl font-light text-Malama-main">Recebemos o seu contato!</h3>
        <p className="text-Malama-muted max-w-sm leading-relaxed">
          Nosso time vai entrar em contato em breve para apresentar uma proposta personalizada.
          Fique de olho no seu e-mail.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.form variants={variants} onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className={labelCls}>Seu nome *</label>
          <input type="text" name="nome" value={form.nome} onChange={handleChange}
            placeholder="Maria Oliveira" className={inputCls} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelCls}>Cargo</label>
          <input type="text" name="cargo" value={form.cargo} onChange={handleChange}
            placeholder="Gerente de RH" className={inputCls} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelCls}>Empresa *</label>
          <input type="text" name="empresa" value={form.empresa} onChange={handleChange}
            placeholder="Nome da empresa" className={inputCls} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelCls}>CNPJ</label>
          <input type="text" name="cnpj" value={form.cnpj} onChange={handleChange}
            placeholder="00.000.000/0001-00" className={inputCls} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelCls}>E-mail corporativo *</label>
        <input type="email" name="email" value={form.email} onChange={handleChange}
          placeholder="maria@empresa.com" className={inputCls} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className={labelCls}>Número de colaboradores *</label>
          <select name="num_colaboradores" value={form.num_colaboradores} onChange={handleChange}
            className={`${inputCls} appearance-none cursor-pointer`}>
            <option value="">Selecione</option>
            <option value="Até 50">Até 50</option>
            <option value="50 a 200">50 a 200</option>
            <option value="200 a 500">200 a 500</option>
            <option value="Acima de 500">Acima de 500</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelCls}>Telefone / WhatsApp</label>
          <input type="tel" name="telefone" value={form.telefone} onChange={handleChange}
            placeholder="(11) 90000-0000" className={inputCls} />
        </div>
      </div>

      {erro && <p className="text-sm text-red-500">{erro}</p>}

      <button type="submit" disabled={loading}
        className="mt-2 w-full group inline-flex items-center justify-center gap-3 bg-Malama-main text-white px-8 py-4 rounded-full font-medium text-base hover:bg-Malama-petrol transition-colors duration-300 disabled:opacity-60">
        {loading ? 'Enviando...' : ctaLabel}
        {!loading && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
      </button>

      <p className="text-xs text-center text-Malama-muted/60">
        Seus dados são usados apenas para contato. Sem spam.
      </p>
    </motion.form>
  );
};
