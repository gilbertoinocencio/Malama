// =====================================================
// Malama — Landing Page para Empresas (/empresas)
// Benefício corporativo B2B. Segue o design system Malama.
// =====================================================

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MalamaLogo } from '../components/MalamaLogo';
import {
  Menu,
  X,
  ArrowRight,
  CheckCircle,
  TrendingDown,
  HeartPulse,
  Wallet,
  Salad,
  Stethoscope,
  Syringe,
  ShieldCheck,
  Building2,
  UserPlus,
  Smartphone,
} from 'lucide-react';
import { supabase } from '../services/supabase';

const PROBLEMAS = [
  {
    icon: TrendingDown,
    title: 'Absenteísmo crescente',
    body: 'Afastamentos e queda de produtividade ligados à saúde têm custo direto na operação da empresa.',
  },
  {
    icon: HeartPulse,
    title: 'Doenças metabólicas',
    body: 'Obesidade, diabetes e hipertensão avançam na força de trabalho e pressionam os indicadores de saúde.',
  },
  {
    icon: Wallet,
    title: 'Plano de saúde mais caro',
    body: 'A sinistralidade sobe ano após ano e o reajuste do plano vira uma despesa cada vez mais difícil de prever.',
  },
];

const SOLUCAO = [
  {
    icon: Salad,
    title: 'Nutrição inteligente',
    body: 'Acompanhamento nutricional contínuo com IA e registro de refeições — hábitos melhores no dia a dia do colaborador.',
  },
  {
    icon: Stethoscope,
    title: 'Telemedicina integrada',
    body: 'Consultas online com médicos parceiros, com histórico nutricional completo antes de cada atendimento.',
  },
  {
    icon: Syringe,
    title: 'Protocolo GLP-1',
    body: 'Acompanhamento seguro de tratamentos para emagrecimento, com suporte clínico dedicado.',
  },
];

const DIFERENCIAIS = [
  {
    icon: ShieldCheck,
    title: 'Benefício que engaja',
    body: 'Saúde e estética caminham juntas — um benefício que o colaborador realmente usa, não só mais uma apólice na gaveta.',
  },
  {
    icon: HeartPulse,
    title: 'Cuidado contínuo',
    body: 'Diferente de consultas avulsas, o acompanhamento é mensal e recorrente: resultados que se sustentam no tempo.',
  },
  {
    icon: Wallet,
    title: 'Previsível para o RH',
    body: 'Preço por assento ativo, fatura mensal simples. Você controla exatamente quem tem acesso e quanto custa.',
  },
];

const COMO_FUNCIONA = [
  { icon: Building2, step: '01', title: 'A empresa contrata', body: 'Definimos juntos o valor por assento e o número de colaboradores elegíveis.' },
  { icon: UserPlus, step: '02', title: 'O RH cadastra', body: 'Pelo painel exclusivo do RH, basta inserir os e-mails dos colaboradores.' },
  { icon: Smartphone, step: '03', title: 'O colaborador acessa', body: 'Cada colaborador recebe acesso completo ao app, como qualquer usuário Malama.' },
];

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

export const EmpresasLandingPage: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  const [form, setForm] = useState({
    nome: '',
    empresa: '',
    email: '',
    num_colaboradores: '',
  });

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome || !form.empresa || !form.email || !form.num_colaboradores) {
      setErro('Preencha todos os campos.');
      return;
    }
    setLoading(true);
    setErro('');
    const { error } = await supabase.from('empresa_leads').insert({ ...form });
    setLoading(false);
    if (error) {
      setErro('Não foi possível enviar. Tente novamente.');
    } else {
      setSubmitted(true);
    }
  };

  const scrollToForm = () => {
    document.getElementById('contato')?.scrollIntoView({ behavior: 'smooth' });
    setIsMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-Malama-bg text-Malama-main overflow-hidden font-sans selection:bg-Malama-petrol selection:text-white">

      {/* ==================== HEADER ==================== */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 border-b border-transparent ${
        scrolled ? 'bg-Malama-bg/80 backdrop-blur-xl border-Malama-border/50 py-4' : 'bg-transparent py-6'
      }`}>
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          <div className="flex items-center justify-between">
            <Link to="/" className="relative z-10 flex items-center gap-2">
              <img src="/malama-logo-transparent.png" alt="Malama Logo" className="h-[190px] w-auto max-w-none object-contain -my-[70px]" />
            </Link>

            <nav className="hidden md:flex items-center gap-10">
              <Link to="/" className="text-sm font-medium tracking-wide text-Malama-muted hover:text-Malama-petrol transition-colors">
                A Plataforma
              </Link>
              <button
                onClick={scrollToForm}
                className="text-sm font-medium tracking-wide text-Malama-petrol border-b border-Malama-petrol/40"
              >
                Para Empresas
              </button>
            </nav>

            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden relative z-10 p-2 text-Malama-main"
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-full left-0 right-0 bg-Malama-bg border-b border-Malama-border/50 shadow-2xl py-8 px-6 flex flex-col gap-6"
            >
              <Link to="/" onClick={() => setIsMenuOpen(false)} className="text-left text-xl font-serif text-Malama-main">
                A Plataforma
              </Link>
              <button onClick={scrollToForm} className="text-left text-xl font-serif text-Malama-petrol">
                Para Empresas
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ==================== HERO ==================== */}
      <section className="relative min-h-screen flex items-center pt-28 pb-16 px-6 md:px-12">
        <div className="max-w-[1400px] mx-auto w-full">
          <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="max-w-3xl">
            <motion.div variants={fadeInUp} className="mb-6 flex items-center gap-3">
              <div className="h-px w-8 bg-Malama-petrol" />
              <span className="text-xs font-semibold tracking-widest uppercase text-Malama-petrol">Malama para Empresas</span>
            </motion.div>

            <motion.h1
              variants={fadeInUp}
              className="font-serif text-5xl md:text-7xl lg:text-8xl font-light leading-[0.95] tracking-tight text-Malama-main mb-8"
            >
              Saúde que
              <br />
              <span className="text-Malama-petrol italic">gera retorno</span>
              <br />
              para a sua empresa.
            </motion.h1>

            <motion.p
              variants={fadeInUp}
              className="text-lg md:text-xl text-Malama-muted font-light leading-relaxed max-w-xl mb-10"
            >
              Ofereça nutrição inteligente, telemedicina e acompanhamento de saúde como benefício corporativo. Colaboradores mais saudáveis, menos absenteísmo e custos de saúde sob controle.
            </motion.p>

            <motion.div variants={fadeInUp}>
              <button
                onClick={scrollToForm}
                className="group inline-flex items-center gap-3 bg-Malama-main text-white px-8 py-4 rounded-full font-medium text-base hover:bg-Malama-petrol transition-colors duration-300"
              >
                Falar com o time
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </motion.div>
          </motion.div>
        </div>

        <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute top-1/3 right-0 w-[600px] h-[600px] rounded-full bg-Malama-petrol-light opacity-40 blur-3xl translate-x-1/2" />
          <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] rounded-full bg-Malama-petrol/5 blur-3xl" />
        </div>
      </section>

      {/* ==================== PROBLEMA ==================== */}
      <section className="py-24 px-6 md:px-12 bg-Malama-petrol-light">
        <div className="max-w-[1400px] mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-100px' }} variants={staggerContainer}>
            <motion.div variants={fadeInUp} className="mb-4 flex items-center gap-3">
              <div className="h-px w-8 bg-Malama-petrol" />
              <span className="text-xs font-semibold tracking-widest uppercase text-Malama-petrol">O desafio</span>
            </motion.div>
            <motion.h2 variants={fadeInUp} className="font-serif text-4xl md:text-5xl font-light leading-tight mb-16 max-w-2xl text-Malama-main">
              A saúde dos colaboradores impacta <span className="text-Malama-petrol italic">diretamente o resultado</span>
            </motion.h2>

            <motion.div variants={staggerContainer} className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {PROBLEMAS.map((p, i) => (
                <motion.div key={i} variants={fadeInUp} className="p-7 rounded-2xl bg-white border border-Malama-border">
                  <div className="w-11 h-11 rounded-xl bg-Malama-petrol/10 flex items-center justify-center mb-5">
                    <p.icon className="w-5 h-5 text-Malama-petrol" />
                  </div>
                  <h3 className="font-medium text-Malama-main text-base mb-2">{p.title}</h3>
                  <p className="text-sm text-Malama-muted leading-relaxed font-light">{p.body}</p>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ==================== SOLUÇÃO ==================== */}
      <section className="py-24 px-6 md:px-12 bg-Malama-main text-white">
        <div className="max-w-[1400px] mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-100px' }} variants={staggerContainer}>
            <motion.div variants={fadeInUp} className="mb-4 flex items-center gap-3">
              <div className="h-px w-8 bg-Malama-petrol" />
              <span className="text-xs font-semibold tracking-widest uppercase text-Malama-petrol">A solução</span>
            </motion.div>
            <motion.h2 variants={fadeInUp} className="font-serif text-4xl md:text-5xl font-light leading-tight mb-16 max-w-2xl">
              Um benefício de saúde <span className="text-Malama-petrol italic">completo e integrado</span>
            </motion.h2>

            <motion.div variants={staggerContainer} className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {SOLUCAO.map((s, i) => (
                <motion.div key={i} variants={fadeInUp} className="group p-7 rounded-2xl border border-white/10 hover:border-Malama-petrol/40 hover:bg-white/5 transition-all duration-300">
                  <div className="w-11 h-11 rounded-xl bg-Malama-petrol/15 flex items-center justify-center mb-5 group-hover:bg-Malama-petrol/25 transition-colors">
                    <s.icon className="w-5 h-5 text-Malama-petrol" />
                  </div>
                  <h3 className="font-medium text-white text-base mb-2">{s.title}</h3>
                  <p className="text-sm text-white/60 leading-relaxed font-light">{s.body}</p>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ==================== DIFERENCIAIS ==================== */}
      <section className="py-24 px-6 md:px-12">
        <div className="max-w-[1400px] mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-100px' }} variants={staggerContainer}>
            <motion.div variants={fadeInUp} className="mb-4 flex items-center gap-3">
              <div className="h-px w-8 bg-Malama-petrol" />
              <span className="text-xs font-semibold tracking-widest uppercase text-Malama-petrol">Por que a Malama</span>
            </motion.div>
            <motion.h2 variants={fadeInUp} className="font-serif text-4xl md:text-5xl font-light leading-tight mb-16 max-w-2xl text-Malama-main">
              Mais que um benefício — um <span className="text-Malama-petrol italic">cuidado que fica</span>
            </motion.h2>

            <motion.div variants={staggerContainer} className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {DIFERENCIAIS.map((d, i) => (
                <motion.div key={i} variants={fadeInUp} className="p-7 rounded-2xl bg-white border border-Malama-border hover:border-Malama-petrol/40 transition-colors">
                  <div className="w-11 h-11 rounded-xl bg-Malama-petrol/10 flex items-center justify-center mb-5">
                    <d.icon className="w-5 h-5 text-Malama-petrol" />
                  </div>
                  <h3 className="font-medium text-Malama-main text-base mb-2">{d.title}</h3>
                  <p className="text-sm text-Malama-muted leading-relaxed font-light">{d.body}</p>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ==================== COMO FUNCIONA ==================== */}
      <section className="py-24 px-6 md:px-12 bg-Malama-petrol-light">
        <div className="max-w-[1400px] mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-100px' }} variants={staggerContainer}>
            <motion.div variants={fadeInUp} className="mb-4 flex items-center gap-3">
              <div className="h-px w-8 bg-Malama-petrol" />
              <span className="text-xs font-semibold tracking-widest uppercase text-Malama-petrol">Como funciona</span>
            </motion.div>
            <motion.h2 variants={fadeInUp} className="font-serif text-4xl md:text-5xl font-light leading-tight mb-16 max-w-2xl text-Malama-main">
              Simples de implementar, <span className="text-Malama-petrol italic">fácil de gerenciar</span>
            </motion.h2>

            <motion.div variants={staggerContainer} className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {COMO_FUNCIONA.map((c, i) => (
                <motion.div key={i} variants={fadeInUp} className="p-8 rounded-2xl bg-white border border-Malama-border relative">
                  <span className="absolute top-6 right-7 font-serif text-4xl text-Malama-petrol/20">{c.step}</span>
                  <div className="w-12 h-12 rounded-xl bg-Malama-petrol/10 flex items-center justify-center mb-5">
                    <c.icon className="w-6 h-6 text-Malama-petrol" />
                  </div>
                  <h3 className="font-medium text-Malama-main text-lg mb-2">{c.title}</h3>
                  <p className="text-sm text-Malama-muted leading-relaxed font-light">{c.body}</p>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ==================== CONTATO ==================== */}
      <section id="contato" className="py-24 px-6 md:px-12">
        <div className="max-w-[1400px] mx-auto">
          <div className="max-w-2xl mx-auto">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} variants={staggerContainer}>
              <motion.div variants={fadeInUp} className="mb-4 flex items-center gap-3">
                <div className="h-px w-8 bg-Malama-petrol" />
                <span className="text-xs font-semibold tracking-widest uppercase text-Malama-petrol">Fale conosco</span>
              </motion.div>

              <motion.h2 variants={fadeInUp} className="font-serif text-4xl md:text-5xl font-light leading-tight mb-4 text-Malama-main">
                Leve a Malama para a sua equipe
              </motion.h2>

              <motion.p variants={fadeInUp} className="text-Malama-muted mb-12 leading-relaxed">
                Conte um pouco sobre a sua empresa e montamos uma proposta sob medida, com valor por assento negociado de acordo com o seu time.
              </motion.p>

              {submitted ? (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-5 py-16 text-center">
                  <div className="w-16 h-16 rounded-full bg-Malama-petrol/10 flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-Malama-petrol" />
                  </div>
                  <h3 className="font-serif text-3xl font-light text-Malama-main">Recebemos o seu contato!</h3>
                  <p className="text-Malama-muted max-w-sm leading-relaxed">
                    Nosso time vai entrar em contato em breve para entender as necessidades da sua empresa. Fique de olho no seu e-mail.
                  </p>
                </motion.div>
              ) : (
                <motion.form variants={fadeInUp} onSubmit={handleSubmit} className="flex flex-col gap-5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold tracking-wide text-Malama-muted uppercase">Seu nome</label>
                    <input
                      type="text" name="nome" value={form.nome} onChange={handleChange}
                      placeholder="Maria Oliveira"
                      className="w-full px-4 py-3.5 rounded-xl border border-Malama-border bg-white text-Malama-main placeholder:text-Malama-muted/50 focus:outline-none focus:border-Malama-petrol transition-colors text-sm"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold tracking-wide text-Malama-muted uppercase">Empresa</label>
                    <input
                      type="text" name="empresa" value={form.empresa} onChange={handleChange}
                      placeholder="Nome da empresa"
                      className="w-full px-4 py-3.5 rounded-xl border border-Malama-border bg-white text-Malama-main placeholder:text-Malama-muted/50 focus:outline-none focus:border-Malama-petrol transition-colors text-sm"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold tracking-wide text-Malama-muted uppercase">E-mail corporativo</label>
                    <input
                      type="email" name="email" value={form.email} onChange={handleChange}
                      placeholder="maria@empresa.com"
                      className="w-full px-4 py-3.5 rounded-xl border border-Malama-border bg-white text-Malama-main placeholder:text-Malama-muted/50 focus:outline-none focus:border-Malama-petrol transition-colors text-sm"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold tracking-wide text-Malama-muted uppercase">Número de colaboradores</label>
                    <input
                      type="text" name="num_colaboradores" value={form.num_colaboradores} onChange={handleChange}
                      placeholder="Ex: 50, 200, 1000+"
                      className="w-full px-4 py-3.5 rounded-xl border border-Malama-border bg-white text-Malama-main placeholder:text-Malama-muted/50 focus:outline-none focus:border-Malama-petrol transition-colors text-sm"
                    />
                  </div>

                  {erro && <p className="text-sm text-red-500">{erro}</p>}

                  <button
                    type="submit" disabled={loading}
                    className="mt-2 w-full group inline-flex items-center justify-center gap-3 bg-Malama-main text-white px-8 py-4 rounded-full font-medium text-base hover:bg-Malama-petrol transition-colors duration-300 disabled:opacity-60"
                  >
                    {loading ? 'Enviando...' : 'Quero uma proposta'}
                    {!loading && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                  </button>

                  <p className="text-xs text-center text-Malama-muted/60">
                    Seus dados são usados apenas para contato. Sem spam.
                  </p>
                </motion.form>
              )}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ==================== FOOTER ==================== */}
      <footer className="border-t border-Malama-border py-12 px-6 md:px-12">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex flex-col items-center md:items-start gap-2">
              <MalamaLogo size="sm" />
              <p className="text-xs text-Malama-muted">Nutrição inteligente para uma vida em fluxo</p>
            </div>
            <div className="flex items-center gap-6 text-xs text-Malama-muted">
              <a href="#" className="hover:text-Malama-petrol transition-colors">Termos</a>
              <a href="#" className="hover:text-Malama-petrol transition-colors">Privacidade</a>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-Malama-border/50 text-center text-xs text-Malama-muted/60">
            © {new Date().getFullYear()} Malama. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
};
