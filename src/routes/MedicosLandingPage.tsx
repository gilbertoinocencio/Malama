// =====================================================
// Malama — Landing Page Para Médicos (/medicos)
// =====================================================

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MalamaLogo } from '../components/MalamaLogo';
import {
  Menu,
  X,
  ArrowRight,
  Calendar,
  Monitor,
  RefreshCw,
  TrendingUp,
  ClipboardList,
  Zap,
  Bot,
  PiggyBank,
  MessageCircle,
  CheckCircle,
  ChevronRight,
} from 'lucide-react';
import { supabase } from '../services/supabase';

const UF_LIST = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS',
  'MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC',
  'SP','SE','TO',
];

const BENEFITS = [
  {
    icon: Calendar,
    title: 'Flexibilidade de agenda',
    body: 'Você define seus próprios horários. Sem plantão, sem escala, sem obrigações fixas.',
  },
  {
    icon: Monitor,
    title: 'Home office real',
    body: 'Atendimento 100% via teleconsulta integrada à plataforma. Sem consultório, sem deslocamento.',
  },
  {
    icon: RefreshCw,
    title: 'Recorrência garantida',
    body: 'Seus pacientes retornam todo mês — diferente do modelo de consulta avulsa sem continuidade.',
  },
  {
    icon: TrendingUp,
    title: 'Renda previsível',
    body: 'Acompanhamento contínuo gera uma base de pacientes estável e renda recorrente previsível.',
  },
  {
    icon: ClipboardList,
    title: 'Diferencial clínico único',
    body: 'Acesse o histórico nutricional completo do paciente antes de cada consulta. Nenhuma outra plataforma oferece isso.',
  },
  {
    icon: Zap,
    title: 'Consultas mais ágeis',
    body: 'Você já entra na consulta sabendo exatamente a demanda do paciente. Sem perguntas básicas, direto ao ponto.',
  },
  {
    icon: Bot,
    title: 'Suporte IA 24/7',
    body: 'Nossa agente nutricional acompanha o paciente entre as consultas e entrega um briefing completo para você antes de cada sessão.',
  },
  {
    icon: PiggyBank,
    title: 'Economia real',
    body: 'Atenda de casa sem precisar de consultório, secretária ou agência de marketing. O paciente chega até você.',
  },
  {
    icon: MessageCircle,
    title: 'Chat pós-consulta',
    body: 'Canal de chat aberto por 20 dias após a consulta, sem precisar compartilhar seu contato particular.',
  },
];

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

export const MedicosLandingPage: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  const [form, setForm] = useState({
    nome: '',
    crm: '',
    crm_uf: '',
    especialidade: '',
    email: '',
    modalidade: '',
  });

  const searchParams = new URLSearchParams(window.location.search);
  const origem = searchParams.get('origem') || searchParams.get('utm_source') || null;

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome || !form.crm || !form.crm_uf || !form.especialidade || !form.email || !form.modalidade) {
      setErro('Preencha todos os campos.');
      return;
    }
    setLoading(true);
    setErro('');
    const { error } = await supabase.from('doctor_leads').insert({
      ...form,
      origem,
    });
    setLoading(false);
    if (error) {
      setErro('Não foi possível salvar. Tente novamente.');
    } else {
      setSubmitted(true);
    }
  };

  const scrollToForm = () => {
    document.getElementById('lista-espera')?.scrollIntoView({ behavior: 'smooth' });
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
              <MalamaLogo size="sm" />
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-10">
              <Link to="/" className="text-sm font-medium tracking-wide text-Malama-muted hover:text-Malama-petrol transition-colors">
                A Plataforma
              </Link>
              <button
                onClick={scrollToForm}
                className="text-sm font-medium tracking-wide text-Malama-petrol border-b border-Malama-petrol/40"
              >
                Para Médicos
              </button>
            </nav>

            <div className="hidden md:flex items-center gap-6">
              <Link to="/entrar" className="text-sm font-medium text-Malama-main hover:text-Malama-petrol transition-colors">
                Entrar
              </Link>
              <Link
                to="/entrar?signup=true"
                className="relative overflow-hidden group bg-Malama-main text-white px-7 py-2.5 rounded-full text-sm font-medium transition-all"
              >
                <span className="relative z-10">Começar Jornada</span>
                <div className="absolute inset-0 h-full w-full bg-Malama-petrol transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500 ease-out" />
              </Link>
            </div>

            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden relative z-10 p-2 text-Malama-main"
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
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
                Para Médicos
              </button>
              <div className="h-px bg-Malama-border my-2" />
              <Link to="/entrar" onClick={() => setIsMenuOpen(false)} className="text-lg font-medium text-Malama-main">Entrar</Link>
              <Link
                to="/entrar?signup=true"
                className="inline-block bg-Malama-main text-white px-6 py-3 rounded-full text-center font-medium mt-2"
              >
                Começar Jornada
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ==================== HERO ==================== */}
      <section className="relative min-h-screen flex items-center pt-28 pb-16 px-6 md:px-12">
        <div className="max-w-[1400px] mx-auto w-full">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="max-w-3xl"
          >
            <motion.div variants={fadeInUp} className="mb-6 flex items-center gap-3">
              <div className="h-px w-8 bg-Malama-petrol" />
              <span className="text-xs font-semibold tracking-widest uppercase text-Malama-petrol">Para Médicos</span>
            </motion.div>

            <motion.h1
              variants={fadeInUp}
              className="font-serif text-5xl md:text-7xl lg:text-8xl font-light leading-[0.95] tracking-tight text-Malama-main mb-8"
            >
              Atenda de casa.
              <br />
              <span className="text-Malama-petrol italic">Ganhe com</span>
              <br />
              recorrência.
            </motion.h1>

            <motion.p
              variants={fadeInUp}
              className="text-lg md:text-xl text-Malama-muted font-light leading-relaxed max-w-xl mb-10"
            >
              Na Malama você define seus horários, atende 100% online e constrói uma carteira de pacientes que retorna todo mês — com histórico nutricional completo e suporte de IA antes de cada consulta.
            </motion.p>

            <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={scrollToForm}
                className="group inline-flex items-center gap-3 bg-Malama-main text-white px-8 py-4 rounded-full font-medium text-base hover:bg-Malama-petrol transition-colors duration-300"
              >
                Quero fazer parte
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <Link
                to="/medico/cadastro"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-full border border-Malama-border text-Malama-main font-medium text-base hover:border-Malama-petrol hover:text-Malama-petrol transition-colors duration-300"
              >
                Já tenho conta
                <ChevronRight className="w-4 h-4" />
              </Link>
            </motion.div>
          </motion.div>
        </div>

        {/* Decorative background */}
        <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute top-1/3 right-0 w-[600px] h-[600px] rounded-full bg-Malama-petrol-light opacity-40 blur-3xl translate-x-1/2" />
          <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] rounded-full bg-Malama-petrol/5 blur-3xl" />
        </div>
      </section>

      {/* ==================== BENEFÍCIOS ==================== */}
      <section className="py-24 px-6 md:px-12 bg-Malama-main text-white">
        <div className="max-w-[1400px] mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={staggerContainer}
          >
            <motion.div variants={fadeInUp} className="mb-4 flex items-center gap-3">
              <div className="h-px w-8 bg-Malama-petrol" />
              <span className="text-xs font-semibold tracking-widest uppercase text-Malama-petrol">Por que a Malama</span>
            </motion.div>

            <motion.h2
              variants={fadeInUp}
              className="font-serif text-4xl md:text-5xl font-light leading-tight mb-16 max-w-2xl"
            >
              Tudo que um médico moderno precisa para <span className="text-Malama-petrol italic">trabalhar melhor</span>
            </motion.h2>

            <motion.div
              variants={staggerContainer}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {BENEFITS.map((b, i) => (
                <motion.div
                  key={i}
                  variants={fadeInUp}
                  className="group p-7 rounded-2xl border border-white/10 hover:border-Malama-petrol/40 hover:bg-white/5 transition-all duration-300"
                >
                  <div className="w-11 h-11 rounded-xl bg-Malama-petrol/15 flex items-center justify-center mb-5 group-hover:bg-Malama-petrol/25 transition-colors">
                    <b.icon className="w-5 h-5 text-Malama-petrol" />
                  </div>
                  <h3 className="font-medium text-white text-base mb-2">{b.title}</h3>
                  <p className="text-sm text-white/60 leading-relaxed font-light">{b.body}</p>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ==================== SOCIAL PROOF ==================== */}
      <section className="py-20 px-6 md:px-12 bg-Malama-petrol-light">
        <div className="max-w-[1400px] mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={staggerContainer}
            className="grid md:grid-cols-3 gap-8 text-center"
          >
            {[
              { valor: '100%', label: 'Online — sem consultório físico' },
              { valor: 'Mensal', label: 'Retorno garantido dos pacientes' },
              { valor: '20 dias', label: 'Chat aberto pós-consulta' },
            ].map((item, i) => (
              <motion.div key={i} variants={fadeInUp} className="py-8">
                <div className="font-serif text-5xl md:text-6xl text-Malama-petrol font-light mb-3">{item.valor}</div>
                <div className="text-Malama-muted text-sm font-medium">{item.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ==================== FORMULÁRIO DE LISTA DE ESPERA ==================== */}
      <section id="lista-espera" className="py-24 px-6 md:px-12">
        <div className="max-w-[1400px] mx-auto">
          <div className="max-w-2xl mx-auto">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
              variants={staggerContainer}
            >
              <motion.div variants={fadeInUp} className="mb-4 flex items-center gap-3">
                <div className="h-px w-8 bg-Malama-petrol" />
                <span className="text-xs font-semibold tracking-widest uppercase text-Malama-petrol">Lista de espera</span>
              </motion.div>

              <motion.h2
                variants={fadeInUp}
                className="font-serif text-4xl md:text-5xl font-light leading-tight mb-4"
              >
                Entre para a lista de espera
              </motion.h2>

              <motion.p variants={fadeInUp} className="text-Malama-muted mb-12 leading-relaxed">
                Estamos abrindo vagas para médicos parceiros. Preencha abaixo e entraremos em contato quando sua vaga estiver disponível.
              </motion.p>

              {submitted ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center gap-4 py-16 text-center"
                >
                  <div className="w-16 h-16 rounded-full bg-Malama-petrol/10 flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-Malama-petrol" />
                  </div>
                  <h3 className="font-serif text-3xl font-light">Recebemos seu cadastro!</h3>
                  <p className="text-Malama-muted max-w-sm">
                    Em breve entraremos em contato com mais detalhes sobre o processo de credenciamento.
                  </p>
                </motion.div>
              ) : (
                <motion.form
                  variants={fadeInUp}
                  onSubmit={handleSubmit}
                  className="flex flex-col gap-5"
                >
                  {/* Nome */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold tracking-wide text-Malama-muted uppercase">Nome completo</label>
                    <input
                      type="text"
                      name="nome"
                      value={form.nome}
                      onChange={handleChange}
                      placeholder="Dr. Ana Souza"
                      className="w-full px-4 py-3.5 rounded-xl border border-Malama-border bg-white text-Malama-main placeholder:text-Malama-muted/50 focus:outline-none focus:border-Malama-petrol transition-colors text-sm"
                    />
                  </div>

                  {/* CRM + UF */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold tracking-wide text-Malama-muted uppercase">CRM</label>
                      <input
                        type="text"
                        name="crm"
                        value={form.crm}
                        onChange={handleChange}
                        placeholder="123456"
                        className="w-full px-4 py-3.5 rounded-xl border border-Malama-border bg-white text-Malama-main placeholder:text-Malama-muted/50 focus:outline-none focus:border-Malama-petrol transition-colors text-sm"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold tracking-wide text-Malama-muted uppercase">UF</label>
                      <select
                        name="crm_uf"
                        value={form.crm_uf}
                        onChange={handleChange}
                        className="w-full px-4 py-3.5 rounded-xl border border-Malama-border bg-white text-Malama-main focus:outline-none focus:border-Malama-petrol transition-colors text-sm appearance-none cursor-pointer"
                      >
                        <option value="">Estado</option>
                        {UF_LIST.map(uf => (
                          <option key={uf} value={uf}>{uf}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Especialidade */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold tracking-wide text-Malama-muted uppercase">Especialidade</label>
                    <input
                      type="text"
                      name="especialidade"
                      value={form.especialidade}
                      onChange={handleChange}
                      placeholder="Ex: Endocrinologia, Nutrologia, Clínica Médica"
                      className="w-full px-4 py-3.5 rounded-xl border border-Malama-border bg-white text-Malama-main placeholder:text-Malama-muted/50 focus:outline-none focus:border-Malama-petrol transition-colors text-sm"
                    />
                  </div>

                  {/* Email */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold tracking-wide text-Malama-muted uppercase">E-mail profissional</label>
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="ana.souza@clinica.com"
                      className="w-full px-4 py-3.5 rounded-xl border border-Malama-border bg-white text-Malama-main placeholder:text-Malama-muted/50 focus:outline-none focus:border-Malama-petrol transition-colors text-sm"
                    />
                  </div>

                  {/* Modalidade */}
                  <div className="flex flex-col gap-2.5">
                    <label className="text-xs font-semibold tracking-wide text-Malama-muted uppercase">Modalidade de atendimento</label>
                    <div className="flex flex-wrap gap-3">
                      {[
                        { value: 'online', label: 'Online' },
                        { value: 'presencial', label: 'Presencial' },
                        { value: 'hibrido', label: 'Híbrido' },
                      ].map(opt => (
                        <label
                          key={opt.value}
                          className={`flex items-center gap-2 px-5 py-3 rounded-full border cursor-pointer text-sm font-medium transition-all ${
                            form.modalidade === opt.value
                              ? 'border-Malama-petrol bg-Malama-petrol text-white'
                              : 'border-Malama-border bg-white text-Malama-main hover:border-Malama-petrol'
                          }`}
                        >
                          <input
                            type="radio"
                            name="modalidade"
                            value={opt.value}
                            checked={form.modalidade === opt.value}
                            onChange={handleChange}
                            className="sr-only"
                          />
                          {opt.label}
                        </label>
                      ))}
                    </div>
                  </div>

                  {erro && (
                    <p className="text-sm text-red-500">{erro}</p>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="mt-2 w-full group inline-flex items-center justify-center gap-3 bg-Malama-main text-white px-8 py-4 rounded-full font-medium text-base hover:bg-Malama-petrol transition-colors duration-300 disabled:opacity-60"
                  >
                    {loading ? 'Enviando...' : 'Garantir minha vaga'}
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
              <Link to="/medico" className="hover:text-Malama-petrol transition-colors">Portal do Médico</Link>
              <Link to="/" className="hover:text-Malama-petrol transition-colors">Para Pacientes</Link>
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
