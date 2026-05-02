// =====================================================
// Malama — Landing Page Principal (Quiet Luxury)
// =====================================================

import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { MalamaLogo } from '../components/MalamaLogo';
import {
  Menu,
  X,
  ArrowRight,
  Star,
  Activity,
  Heart,
  Droplets,
  ChevronRight,
  CheckCircle,
} from 'lucide-react';
import { supabase } from '../services/supabase';

// Animações
const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.2 }
  }
};

const LandingPage: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { scrollYProgress } = useScroll();
  const heroY = useTransform(scrollYProgress, [0, 1], ['0%', '50%']);

  const [patientForm, setPatientForm] = useState({ nome: '', email: '', objetivo: '' });
  const [patientSubmitted, setPatientSubmitted] = useState(false);
  const [patientLoading, setPatientLoading] = useState(false);
  const [patientErro, setPatientErro] = useState('');

  const origem = (() => {
    const p = new URLSearchParams(window.location.search);
    return p.get('origem') || p.get('utm_source') || null;
  })();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setIsMenuOpen(false);
    }
  };

  const handlePatientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientForm.nome || !patientForm.email || !patientForm.objetivo) {
      setPatientErro('Preencha todos os campos.');
      return;
    }
    setPatientLoading(true);
    setPatientErro('');
    const { error } = await supabase.from('patient_leads').insert({ ...patientForm, origem });
    setPatientLoading(false);
    if (error) {
      setPatientErro('Não foi possível salvar. Tente novamente.');
    } else {
      setPatientSubmitted(true);
    }
  };

  return (
    <div className="min-h-screen bg-Malama-bg text-Malama-main overflow-hidden font-sans selection:bg-Malama-petrol selection:text-white">
      {/* ==================== HEADER ==================== */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 border-b border-transparent ${
        scrolled ? 'bg-Malama-bg/80 backdrop-blur-xl border-Malama-border/50 py-4' : 'bg-transparent py-6'
      }`}>
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="relative z-10 flex items-center gap-2">
              <MalamaLogo size="sm" />
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-10">
              <button
                onClick={() => scrollToSection('a-abordagem')}
                className="text-sm font-medium tracking-wide text-Malama-muted hover:text-Malama-petrol transition-colors"
              >
                A Abordagem
              </button>
              <button
                onClick={() => scrollToSection('como-funciona')}
                className="text-sm font-medium tracking-wide text-Malama-muted hover:text-Malama-petrol transition-colors"
              >
                Como Funciona
              </button>
              <Link
                to="/medicos"
                className="text-sm font-medium tracking-wide text-Malama-muted hover:text-Malama-petrol transition-colors"
              >
                Para Médicos
              </Link>
            </nav>

            {/* CTA Buttons */}
            <div className="hidden md:flex items-center gap-6">
              <Link
                to="/entrar"
                className="text-sm font-medium text-Malama-main hover:text-Malama-petrol transition-colors"
              >
                Entrar
              </Link>
              <Link
                to="/entrar?signup=true"
                className="relative overflow-hidden group bg-Malama-main text-white px-7 py-2.5 rounded-full text-sm font-medium transition-all"
              >
                <span className="relative z-10">Começar Jornada</span>
                <div className="absolute inset-0 h-full w-full bg-Malama-petrol transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500 ease-out"></div>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden relative z-10 p-2 text-Malama-main"
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-full left-0 right-0 bg-Malama-bg border-b border-Malama-border/50 shadow-2xl py-8 px-6 flex flex-col gap-6"
            >
              <button
                onClick={() => scrollToSection('a-abordagem')}
                className="text-left text-xl font-serif text-Malama-main"
              >
                A Abordagem
              </button>
              <button
                onClick={() => scrollToSection('como-funciona')}
                className="text-left text-xl font-serif text-Malama-main"
              >
                Como Funciona
              </button>
              <Link
                to="/medicos"
                onClick={() => setIsMenuOpen(false)}
                className="text-left text-xl font-serif text-Malama-main"
              >
                Para Médicos
              </Link>
              <div className="h-px bg-Malama-border my-2"></div>
              <Link to="/entrar" className="text-lg font-medium text-Malama-main">Entrar</Link>
              <Link to="/entrar?signup=true" className="inline-block bg-Malama-main text-white px-6 py-3 rounded-full text-center font-medium mt-2">
                Começar Jornada
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ==================== HERO SECTION ==================== */}
      <section className="relative min-h-screen flex items-center pt-24 pb-12 px-6 md:px-12 max-w-[1400px] mx-auto">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center w-full">
          
          {/* Hero Text */}
          <motion.div 
            className="lg:col-span-6 z-10"
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
          >
            <motion.div variants={fadeInUp} className="mb-6 flex items-center gap-3">
              <div className="h-px w-8 bg-Malama-petrol"></div>
              <span className="text-xs font-semibold tracking-widest uppercase text-Malama-petrol">Nutrição Inteligente</span>
            </motion.div>
            
            <motion.div variants={fadeInUp} className="mb-8">
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-serif leading-[1.1] text-Malama-main">
                Alimente seu <br />
                <span className="italic text-Malama-petrol font-light">fluxo natural</span>
              </h1>
            </motion.div>

            <motion.p variants={fadeInUp} className="text-lg text-Malama-muted mb-10 max-w-lg leading-relaxed font-light">
              Uma abordagem elegante para sua saúde. O Malama combina precisão clínica com inteligência artificial para esculpir uma rotina que respeita o seu tempo e o seu corpo.
            </motion.p>

            <motion.div variants={fadeInUp} className="flex flex-wrap items-center gap-6">
              <Link
                to="/entrar?signup=true"
                className="group flex items-center gap-4 bg-Malama-petrol text-white px-8 py-4 rounded-full font-medium transition-transform hover:scale-105"
              >
                Explorar Malama
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <div className="flex items-center gap-4 text-sm font-medium text-Malama-main">
                <div className="flex -space-x-3">
                  <div className="w-10 h-10 rounded-full border-2 border-Malama-bg overflow-hidden"><img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80" alt="User" /></div>
                  <div className="w-10 h-10 rounded-full border-2 border-Malama-bg overflow-hidden"><img src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=100&q=80" alt="User" /></div>
                  <div className="w-10 h-10 rounded-full border-2 border-Malama-bg bg-Malama-main text-white flex items-center justify-center text-xs">+2k</div>
                </div>
                <div>
                  <div className="flex text-Malama-petrol mb-1"><Star className="w-3 h-3 fill-current" /><Star className="w-3 h-3 fill-current" /><Star className="w-3 h-3 fill-current" /><Star className="w-3 h-3 fill-current" /><Star className="w-3 h-3 fill-current" /></div>
                  <span className="text-xs text-Malama-muted">Membros Premium</span>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Hero Image (Animated) */}
          <motion.div 
            className="lg:col-span-6 relative h-[60vh] lg:h-[80vh] w-full rounded-2xl overflow-hidden"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.div 
              className="absolute inset-0 w-full h-full"
              style={{ y: heroY }}
            >
              <img 
                src="https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&q=80&w=2000" 
                alt="Lifestyle saudável" 
                className="w-full h-[120%] object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-Malama-main/40 to-transparent"></div>
            </motion.div>

            {/* Floating Widget */}
            <motion.div 
              className="absolute bottom-8 left-8 right-8 bg-white/90 backdrop-blur-xl p-6 rounded-2xl border border-white/20 shadow-2xl"
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.8, ease: "easeOut" }}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="font-serif font-medium text-Malama-main">Análise Diária</span>
                <span className="text-xs bg-Malama-petrol/10 text-Malama-petrol px-3 py-1 rounded-full font-medium tracking-wide">Em Sintonia</span>
              </div>
              <div className="h-1.5 w-full bg-Malama-bg rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-Malama-petrol"
                  initial={{ width: 0 }}
                  animate={{ width: "75%" }}
                  transition={{ delay: 1.2, duration: 1.5, ease: "easeOut" }}
                ></motion.div>
              </div>
            </motion.div>
          </motion.div>

        </div>
      </section>

      {/* ==================== A ABORDAGEM (DIFERENCIAIS) ==================== */}
      <section id="a-abordagem" className="py-32 px-6 md:px-12 bg-white">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end mb-20 gap-8">
            <div className="max-w-2xl">
              <h2 className="text-4xl md:text-5xl font-serif text-Malama-main mb-6">
                A arte de viver bem,<br />
                <span className="italic text-Malama-petrol">apoiada pela ciência.</span>
              </h2>
              <p className="text-lg text-Malama-muted font-light">
                Não acreditamos em dietas restritivas. Acreditamos em sintonia fina. 
                Uma convergência de especialistas de alto nível e inteligência artificial preditiva.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Activity,
                title: 'Adaptação Preditiva',
                desc: 'Nossa IA analisa sua biometria e rotina, ajustando seus macros sutilmente antes mesmo que você perceba a necessidade.',
                img: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=800'
              },
              {
                icon: Heart,
                title: 'Acompanhamento Premium',
                desc: 'Conecte-se com nossa rede curada de endocrinologistas e nutricionistas, tudo em um ambiente digital impecável.',
                img: 'https://images.unsplash.com/photo-1605280263929-1c42952ee4e4?auto=format&fit=crop&q=80&w=800'
              },
              {
                icon: Droplets,
                title: 'Sintonia Diária',
                desc: 'Rastreamento minimalista que foca no que importa. Sem contagem obsessiva, apenas o fluxo natural do seu corpo.',
                img: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=800'
              }
            ].map((feature, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.8, delay: i * 0.2 }}
                className="group"
              >
                <div className="overflow-hidden rounded-2xl mb-8 h-80 relative">
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors duration-500 z-10"></div>
                  <motion.img 
                    src={feature.img} 
                    alt={feature.title}
                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                  />
                  <div className="absolute top-4 left-4 z-20 w-12 h-12 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-Malama-main">
                    <feature.icon className="w-5 h-5" />
                  </div>
                </div>
                <h3 className="text-2xl font-serif text-Malama-main mb-3">{feature.title}</h3>
                <p className="text-Malama-muted font-light leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== COMO FUNCIONA (NARRATIVA) ==================== */}
      <section id="como-funciona" className="py-32 px-6 md:px-12 bg-Malama-petrol text-white">
        <div className="max-w-[1400px] mx-auto">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            
            <motion.div 
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <h2 className="text-4xl md:text-5xl font-serif mb-12">
                Sua evolução,<br /> <span className="italic font-light opacity-80">sem atritos.</span>
              </h2>

              <div className="space-y-12">
                {[
                  { step: '01', title: 'O Diagnóstico', desc: 'Sua jornada começa com uma análise detalhada. O Malama entende seu metabolismo, rotina e preferências como nenhum outro.' },
                  { step: '02', title: 'O Algoritmo', desc: 'A inteligência artificial desenha um plano perfeito, não apenas para seus objetivos, mas para a realidade dos seus dias.' },
                  { step: '03', title: 'A Transformação', desc: 'Acompanhe seu progresso em um painel elegante, com suporte de especialistas reais a um toque de distância.' }
                ].map((item, i) => (
                  <div key={i} className="flex gap-6 group">
                    <div className="text-2xl font-serif opacity-40 group-hover:opacity-100 transition-opacity text-Malama-bg">{item.step}</div>
                    <div>
                      <h3 className="text-xl font-medium mb-2">{item.title}</h3>
                      <p className="text-white/70 font-light leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-16">
                <Link
                  to="/entrar?signup=true"
                  className="inline-flex items-center gap-4 border border-white/30 px-8 py-4 rounded-full font-medium transition-all hover:bg-white hover:text-Malama-petrol"
                >
                  Iniciar Avaliação
                </Link>
              </div>
            </motion.div>

            <motion.div 
              className="relative h-[800px] rounded-3xl overflow-hidden hidden lg:block"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1 }}
            >
              <img 
                src="https://images.unsplash.com/photo-1505252585461-04db1eb84625?auto=format&fit=crop&q=80&w=1000" 
                alt="Preparação" 
                className="w-full h-full object-cover"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ==================== TESTIMONIALS ==================== */}
      <section className="py-32 px-6 md:px-12 bg-Malama-bg">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <div className="text-Malama-petrol mb-8">
              <Star className="w-6 h-6 inline-block mx-1 fill-current" />
              <Star className="w-6 h-6 inline-block mx-1 fill-current" />
              <Star className="w-6 h-6 inline-block mx-1 fill-current" />
              <Star className="w-6 h-6 inline-block mx-1 fill-current" />
              <Star className="w-6 h-6 inline-block mx-1 fill-current" />
            </div>
            
            <h3 className="text-3xl md:text-4xl font-serif text-Malama-main leading-relaxed mb-12 italic">
              "O Malama não parece um aplicativo de dieta. Parece um concierge particular para minha saúde. É silencioso, elegante e incrivelmente eficaz."
            </h3>

            <div className="flex items-center justify-center gap-4">
              <div className="w-12 h-12 rounded-full overflow-hidden">
                <img src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=100&q=80" alt="Isabella C." />
              </div>
              <div className="text-left">
                <div className="font-medium text-Malama-main">Isabella C.</div>
                <div className="text-sm text-Malama-muted">Diretora Criativa</div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ==================== LISTA DE ESPERA — PACIENTES ==================== */}
      <section id="lista-espera-pacientes" className="py-24 px-6 md:px-12 bg-white">
        <div className="max-w-[1400px] mx-auto">
          <div className="max-w-xl mx-auto text-center">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
              variants={staggerContainer}
            >
              <motion.div variants={fadeInUp} className="mb-4 flex items-center justify-center gap-3">
                <div className="h-px w-8 bg-Malama-petrol" />
                <span className="text-xs font-semibold tracking-widest uppercase text-Malama-petrol">Em breve</span>
                <div className="h-px w-8 bg-Malama-petrol" />
              </motion.div>

              <motion.h2
                variants={fadeInUp}
                className="font-serif text-4xl md:text-5xl font-light leading-tight mb-4 text-Malama-main"
              >
                Seja o primeiro a saber
              </motion.h2>

              <motion.p variants={fadeInUp} className="text-Malama-muted mb-10 leading-relaxed">
                A Malama está chegando. Entre na lista de espera e garanta acesso prioritário quando abrirmos as vagas.
              </motion.p>

              {patientSubmitted ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center gap-4 py-10"
                >
                  <div className="w-14 h-14 rounded-full bg-Malama-petrol/10 flex items-center justify-center">
                    <CheckCircle className="w-7 h-7 text-Malama-petrol" />
                  </div>
                  <h3 className="font-serif text-2xl font-light">Você está na lista!</h3>
                  <p className="text-Malama-muted text-sm max-w-xs">
                    Avisaremos quando sua vaga estiver disponível.
                  </p>
                </motion.div>
              ) : (
                <motion.form
                  variants={fadeInUp}
                  onSubmit={handlePatientSubmit}
                  className="flex flex-col gap-4 text-left"
                >
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold tracking-wide text-Malama-muted uppercase">Nome</label>
                    <input
                      type="text"
                      value={patientForm.nome}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPatientForm({ ...patientForm, nome: e.target.value })}
                      placeholder="Seu nome completo"
                      className="w-full px-4 py-3.5 rounded-xl border border-Malama-border bg-Malama-bg text-Malama-main placeholder:text-Malama-muted/50 focus:outline-none focus:border-Malama-petrol transition-colors text-sm"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold tracking-wide text-Malama-muted uppercase">E-mail</label>
                    <input
                      type="email"
                      value={patientForm.email}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPatientForm({ ...patientForm, email: e.target.value })}
                      placeholder="seu@email.com"
                      className="w-full px-4 py-3.5 rounded-xl border border-Malama-border bg-Malama-bg text-Malama-main placeholder:text-Malama-muted/50 focus:outline-none focus:border-Malama-petrol transition-colors text-sm"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold tracking-wide text-Malama-muted uppercase">Objetivo principal</label>
                    <select
                      value={patientForm.objetivo}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setPatientForm({ ...patientForm, objetivo: e.target.value })}
                      className="w-full px-4 py-3.5 rounded-xl border border-Malama-border bg-Malama-bg text-Malama-main focus:outline-none focus:border-Malama-petrol transition-colors text-sm appearance-none cursor-pointer"
                    >
                      <option value="">Selecione seu objetivo</option>
                      <option value="perda_peso">Perda de peso</option>
                      <option value="ganho_muscular">Ganho muscular</option>
                      <option value="saude_longevidade">Saúde e longevidade</option>
                      <option value="condicao_clinica">Condição clínica</option>
                      <option value="acompanhamento_glp1">Acompanhamento GLP-1</option>
                      <option value="outro">Outro</option>
                    </select>
                  </div>

                  {patientErro && (
                    <p className="text-sm text-red-500">{patientErro}</p>
                  )}

                  <button
                    type="submit"
                    disabled={patientLoading}
                    className="mt-2 w-full group inline-flex items-center justify-center gap-3 bg-Malama-main text-white px-8 py-4 rounded-full font-medium text-base hover:bg-Malama-petrol transition-colors duration-300 disabled:opacity-60"
                  >
                    {patientLoading ? 'Enviando...' : 'Entrar na lista de espera'}
                    {!patientLoading && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
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

      {/* ==================== FOOTER MINIMALISTA ==================== */}
      <footer className="bg-Malama-main text-white py-20 px-6 md:px-12">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end gap-12 mb-20">
            <div>
              <div className="mb-8">
                <MalamaLogo size="sm" />
              </div>
              <h2 className="text-3xl md:text-4xl font-serif text-white/90 max-w-md">
                Eleve sua experiência de bem-estar.
              </h2>
            </div>
            <div className="flex gap-4">
               <Link
                to="/entrar?signup=true"
                className="bg-white text-Malama-main px-8 py-4 rounded-full font-medium transition-transform hover:scale-105"
              >
                Criar Conta
              </Link>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8 border-t border-white/10 pt-12 text-sm text-white/50">
            <div>
              <p>&copy; {new Date().getFullYear()} Malama. Todos os direitos reservados.</p>
            </div>
            <div className="flex gap-8 md:justify-center">
              <Link to="/medico" className="hover:text-white transition-colors">Portal do Médico</Link>
              <Link to="/admin" className="hover:text-white transition-colors">Admin</Link>
            </div>
            <div className="flex gap-8 md:justify-end">
              <a href="#" className="hover:text-white transition-colors">Termos</a>
              <a href="#" className="hover:text-white transition-colors">Privacidade</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export { LandingPage };
