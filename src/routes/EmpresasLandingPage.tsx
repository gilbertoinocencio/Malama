// =====================================================
// Malama Empresas — Landing Page B2B (/empresas)
// =====================================================

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MalamaLogo } from '../components/MalamaLogo';
import {
  Menu, X, ArrowRight, CheckCircle,
  Stethoscope, Syringe, Salad, BarChart2,
  Building2, UserPlus, Smartphone,
  ShieldCheck, Zap, Layers, Leaf,
  Heart, ShoppingBag, Award, Star,
  Phone, Briefcase, FileText,
} from 'lucide-react';
import { supabase } from '../services/supabase';

// ─── Animações ─────────────────────────────────────────
const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
};
const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

// ─── Dados ─────────────────────────────────────────────
const HERO_BULLETS = [
  { stat: '15,8%', text: 'do custo da folha de pagamento das empresas é consumido pelo plano de saúde — o segundo maior gasto, atrás apenas dos salários.', fonte: 'Mercer Marsh Benefícios — 32ª Pesquisa de Benefícios Corporativos' },
  { stat: 'R$709', text: 'é o custo médio mensal por vida no Brasil — subindo acima da inflação geral a cada ano, sem teto de reajuste pela ANS.', fonte: 'Mercer Marsh Benefícios — 32ª Pesquisa de Benefícios Corporativos' },
  { stat: '4×', text: 'de retorno: cada dólar investido em prevenção economiza quatro em sinistralidade e absenteísmo.', fonte: 'Organização Mundial da Saúde — OMS' },
];

const HERO_CARD = [
  { stat: '62,6%', label: 'da população adulta do Brasil está acima do peso ideal', fonte: 'Ministério da Saúde — Vigitel 2024' },
  { stat: '25,7%', label: 'em obesidade clínica — 1 em cada 4 funcionários', fonte: 'Ministério da Saúde — Vigitel 2024' },
  { stat: '31,7%', label: 'de obesidade na faixa 45–54 anos — a mais produtiva', fonte: 'Ministério da Saúde — Vigitel 2024' },
];

const CENARIO_CARDS = [
  { stat: '62,6%', titulo: 'Acima do Peso', corpo: 'Dados oficiais do Ministério da Saúde apontam que mais de 60% da população adulta está com excesso de peso. A maior concentração de obesidade está justamente nas faixas etárias mais produtivas — de 35 a 54 anos. Esses colaboradores geram as maiores despesas assistenciais e sofrem de presenteísmo crônico.', fonte: 'Ministério da Saúde — Vigitel 2024' },
  { stat: '20/80', titulo: 'A Regra dos 20/80', corpo: 'A maioria dos contratos de saúde corporativa tem 80% dos custos concentrados em 20% dos casos — colaboradores com obesidade severa, diabetes ou hipertensão sem acompanhamento que geram internações de alto custo. Controlar esse grupo é o caminho mais direto para achatar o reajuste anual do seu plano. A obesidade custa ao Brasil mais de R$70 bilhões por ano.', fonte: 'IESS — Instituto de Estudos de Saúde Suplementar' },
  { stat: '–30%', titulo: 'O Gargalo dos Benefícios Passivos', corpo: 'Colaboradores ativos fisicamente reduzem em até 30% o uso de prontos-socorros — mas isso só acontece quando têm base metabólica para se engajar. Oferecer academia para quem está metabolicamente esgotado não gera retorno. O Malama é o passo zero — o que faz o investimento da sua empresa em wellness finalmente funcionar.', fonte: 'Harvard Business Review / dados de engajamento de plataformas de wellness corporativo' },
];

const SOLUCAO_ITEMS = [
  { n: '01', icon: Stethoscope, titulo: 'Telemedicina Especializada — Nutrólogos e Endocrinologistas', corpo: 'Consultas diretas pelo app com médicos especialistas em metabolismo. Sem filas, sem guias — focados em resolver a raiz da fadiga e do ganho de peso.' },
  { n: '02', icon: Syringe, titulo: 'Gestão Segura de Tratamentos GLP-1', corpo: 'O acompanhamento médico é indispensável para colaboradores que utilizam análogos de semaglutida. Dosagem correta, prevenção de efeitos colaterais e consolidação de hábitos para evitar o efeito sanfona.' },
  { n: '03', icon: Salad, titulo: 'Plano Nutricional Clínico Supervisionado', corpo: 'Prescrições alimentares reais e individualizadas voltadas para o ganho de energia no trabalho e otimização metabólica — sem contagem obsessiva de calorias.' },
  { n: '04', icon: BarChart2, titulo: 'Métricas de Impacto para o RH', corpo: 'Relatórios gerenciais anônimos, em total conformidade com a LGPD, que comprovam a evolução da saúde da empresa, redução de fatores de risco e o Retorno sobre o Investimento.' },
];

const IMPACTO_METRICAS = [
  { stat: '–74%', label: 'Redução de absenteísmo prolongado', fonte: 'ABQV' },
  { stat: '–25%', label: 'Custo assistencial do grupo de risco', fonte: 'IESS' },
  { stat: '–30%', label: 'Capacidade produtiva afetada pelo presenteísmo', fonte: 'Harvard Business Review' },
  { stat: '–25%', label: 'Redução do custo assistencial geral', fonte: 'IESS / Mercer' },
  { stat: '4×', label: 'ROI em prevenção de saúde', fonte: 'OMS' },
];

const FINANCEIRO_CARDS = [
  { stat: 'R$200bi', titulo: 'Presenteísmo', corpo: 'Perdidos por ano no Brasil. O custo do presenteísmo pode superar R$200 bilhões segundo o IBEF-SP. As empresas têm em média 32% de índice de presenteísmo — colaboradores que estão presentes mas entregam bem abaixo do potencial por fadiga, dor crônica ou disfunção metabólica.', fonte: 'IBEF-SP / Vittude — Censo de Saúde Mental 2025 / Harvard Business Review', destaque: false },
  { stat: '15,3%', titulo: 'Sinistralidade', corpo: 'Inflação médica anual no Brasil. A inflação médica (VCMH) cresce consistentemente acima do IPCA. Sem gestão ativa da saúde do time, esse percentual se acumula sobre a fatura do plano a cada renovação — compondo um custo que dobra em 5 anos.', fonte: 'ANS / IESS — Variação dos Custos Médico-Hospitalares', destaque: true },
  { stat: '74%', titulo: 'Absenteísmo', corpo: 'Mais afastamentos prolongados. Colaboradores com obesidade e desregulação metabólica registram 74% mais faltas acima de 7 dias — por pressão alta, fadiga crônica e diabetes tipo 2. Cada afastamento gera custo direto e sobrecarrega o time.', fonte: 'ABQV — Associação Brasileira de Qualidade de Vida', destaque: false },
];

const PROPOSITO_FLOW = [
  { icon: Heart, texto: 'Colaborador recupera a saúde e perde 1 kg no app' },
  { icon: BarChart2, texto: 'O Malama consolida os resultados da sua empresa no mês' },
  { icon: ShoppingBag, texto: 'Toneladas de alimentos são doadas a quem precisa' },
  { icon: Star, texto: 'Sua marca ganha uma história real de ESG para contar ao mercado' },
];

const COMO_FUNCIONA = [
  { icon: Building2, step: '01', title: 'Empresa contrata', body: 'Definimos juntos o número de assentos e o modelo de benefício. Um contrato direto, sem burocracia — e sem intermediários entre a Malama e o seu RH.' },
  { icon: UserPlus, step: '02', title: 'RH cadastra', body: 'O RH acessa um painel simples e insere os e-mails dos colaboradores elegíveis. O acesso é liberado automaticamente — sem necessidade de suporte técnico.' },
  { icon: Smartphone, step: '03', title: 'Colaborador acessa', body: 'O colaborador recebe um convite, cria sua conta e inicia a jornada de cuidado imediatamente. Mesmo app, mesma experiência, mesmo resultado.' },
];

const DIFERENCIAIS = [
  { icon: ShieldCheck, titulo: 'Ação Médica Direta, Não Apenas Wellness', corpo: 'Não somos um app de contagem de calorias, de lembrete de água ou meditação guiada. O Malama coloca endocrinologistas e nutrólogos na linha de frente para atuar clinicamente na saúde do time — com prescrição, acompanhamento e evolução documentada.' },
  { icon: Zap, titulo: 'Pioneiros na Gestão Corporativa de GLP-1', corpo: 'O uso de canetas de emagrecimento explodiu de forma desorientada. O Malama oferece a única estrutura médica que garante que o tratamento do seu colaborador seja seguro, eficaz e economicamente sustentável — sem efeito sanfona, sem abandono.' },
  { icon: Layers, titulo: 'Modelo Flexível — Benefício Integral ou Coparticipação', corpo: 'Acompanhando o movimento das grandes corporações, o Malama se adapta ao modelo da sua empresa. No formato de coparticipação, o custo corporativo diminui com o colaborador participando do restante via desconto em folha.' },
  { icon: Leaf, titulo: 'Indicadores de Saúde Vinculados ao ESG', corpo: 'Transformamos a perda de peso clínica em segurança alimentar coletiva — unindo o pilar "S" de sustentabilidade ao benefício de saúde mais desejado do mercado. Cada quilo perdido vira dado ESG reportável e história de employer branding.' },
];

// ─── Componente ─────────────────────────────────────────
export const EmpresasLandingPage: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  const [form, setForm] = useState({
    nome: '', cargo: '', empresa: '', cnpj: '', email: '',
    num_colaboradores: '', telefone: '',
  });

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
    if (!form.nome || !form.empresa || !form.email || !form.num_colaboradores) {
      setErro('Preencha todos os campos obrigatórios.');
      return;
    }
    setLoading(true);
    setErro('');
    const { error } = await supabase.from('empresa_leads').insert({ ...form });
    setLoading(false);
    if (error) { setErro('Não foi possível enviar. Tente novamente.'); }
    else { setSubmitted(true); }
  };

  const scrollToForm = () => {
    document.getElementById('contato')?.scrollIntoView({ behavior: 'smooth' });
    setIsMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-Malama-bg text-Malama-main overflow-hidden font-sans selection:bg-Malama-petrol selection:text-white">

      {/* ==================== HEADER ==================== */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 border-b border-transparent ${scrolled ? 'bg-Malama-bg/80 backdrop-blur-xl border-Malama-border/50 py-4' : 'bg-transparent py-6'}`}>
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          <div className="flex items-center justify-between">
            <Link to="/" className="relative z-10 flex items-center gap-2">
              <img src="/malama-logo-transparent.png" alt="Malama" className="h-[190px] w-auto max-w-none object-contain -my-[70px]" />
            </Link>
            <nav className="hidden md:flex items-center gap-10">
              <Link to="/" className="text-sm font-medium tracking-wide text-Malama-muted hover:text-Malama-petrol transition-colors">A Plataforma</Link>
              <button onClick={scrollToForm} className="text-sm font-medium tracking-wide text-Malama-petrol border-b border-Malama-petrol/40">Para Empresas</button>
            </nav>
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden relative z-10 p-2 text-Malama-main">
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="absolute top-full left-0 right-0 bg-Malama-bg border-b border-Malama-border/50 shadow-2xl py-8 px-6 flex flex-col gap-6">
              <Link to="/" onClick={() => setIsMenuOpen(false)} className="text-xl font-serif text-Malama-main">A Plataforma</Link>
              <button onClick={scrollToForm} className="text-left text-xl font-serif text-Malama-petrol">Para Empresas</button>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ==================== HERO ==================== */}
      <section className="relative min-h-screen flex items-center pt-32 pb-16 px-6 md:px-12">
        <div className="max-w-[1400px] mx-auto w-full">
          <motion.div initial="hidden" animate="visible" variants={staggerContainer}
            className="grid lg:grid-cols-[1fr_420px] gap-12 items-center">

            {/* Coluna esquerda */}
            <div>
              <motion.div variants={fadeInUp} className="mb-6 flex items-center gap-3">
                <div className="h-px w-8 bg-Malama-petrol" />
                <span className="text-xs font-semibold tracking-widest uppercase text-Malama-petrol">Malama Empresas</span>
              </motion.div>

              <motion.h1 variants={fadeInUp}
                className="font-serif text-4xl md:text-6xl lg:text-7xl font-light leading-[1.02] tracking-tight text-Malama-main mb-6">
                Colaboradores com<br />
                mais energia.<br />
                <span className="text-Malama-petrol italic">Seu segundo maior custo</span><br />
                sob controle.
              </motion.h1>

              <motion.p variants={fadeInUp} className="text-base md:text-lg text-Malama-muted font-light leading-relaxed max-w-xl mb-10">
                A primeira plataforma corporativa que integra medicina metabólica especializada, nutrição clínica e gestão de GLP-1 — transformando a saúde do seu time em economia real e impacto social mensurável.
              </motion.p>

              <motion.div variants={fadeInUp} className="space-y-5 mb-10">
                {HERO_BULLETS.map((b, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <span className="flex-shrink-0 font-serif text-2xl font-light text-Malama-petrol w-16 text-right leading-tight">{b.stat}</span>
                    <div>
                      <p className="text-sm text-Malama-main leading-snug">{b.text}</p>
                      <p className="text-xs text-Malama-muted/60 mt-0.5">{b.fonte}</p>
                    </div>
                  </div>
                ))}
              </motion.div>

              <motion.div variants={fadeInUp}>
                <button onClick={scrollToForm}
                  className="group inline-flex items-center gap-3 bg-Malama-main text-white px-8 py-4 rounded-full font-medium text-base hover:bg-Malama-petrol transition-colors duration-300">
                  Falar com um especialista
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </motion.div>
            </div>

            {/* Card lateral */}
            <motion.div variants={fadeInUp}
              className="bg-Malama-main rounded-3xl p-8 space-y-6">
              <p className="text-xs font-semibold tracking-widest uppercase text-Malama-petrol">Realidade do seu time</p>
              {HERO_CARD.map((c, i) => (
                <div key={i} className={i < HERO_CARD.length - 1 ? 'pb-5 border-b border-white/10' : ''}>
                  <p className="font-serif text-5xl font-light text-white mb-1">{c.stat}</p>
                  <p className="text-sm text-white/70 leading-snug">{c.label}</p>
                  <p className="text-xs text-white/30 mt-1">{c.fonte}</p>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>

        <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute top-1/3 right-0 w-[600px] h-[600px] rounded-full bg-Malama-petrol-light opacity-50 blur-3xl translate-x-1/2" />
          <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] rounded-full bg-Malama-petrol/5 blur-3xl" />
        </div>
      </section>

      {/* ==================== O CENÁRIO ATUAL ==================== */}
      <section className="py-24 px-6 md:px-12 bg-Malama-main text-white">
        <div className="max-w-[1400px] mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-100px' }} variants={staggerContainer}>
            <motion.div variants={fadeInUp} className="mb-4 flex items-center gap-3">
              <div className="h-px w-8 bg-Malama-petrol" />
              <span className="text-xs font-semibold tracking-widest uppercase text-Malama-petrol">O cenário atual</span>
            </motion.div>
            <motion.h2 variants={fadeInUp} className="font-serif text-4xl md:text-5xl font-light leading-tight mb-4 max-w-2xl">
              O custo invisível de não cuidar do <span className="text-Malama-petrol italic">metabolismo do seu time</span>
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-white/60 mb-14 max-w-xl leading-relaxed">
              A obesidade e o sedentarismo não afetam apenas o bem-estar: eles inflacionam o plano de saúde e drenam a capacidade produtiva da sua força de trabalho.
            </motion.p>

            <motion.div variants={staggerContainer} className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {CENARIO_CARDS.map((c, i) => (
                <motion.div key={i} variants={fadeInUp}
                  className="group p-7 rounded-2xl border border-white/10 hover:border-Malama-petrol/40 hover:bg-white/5 transition-all duration-300">
                  <p className="font-serif text-5xl font-light text-Malama-petrol mb-3">{c.stat}</p>
                  <h3 className="font-semibold text-white text-base mb-3">{c.titulo}</h3>
                  <p className="text-sm text-white/60 leading-relaxed font-light">{c.corpo}</p>
                  <p className="text-xs text-white/25 mt-4">{c.fonte}</p>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ==================== A SOLUÇÃO ==================== */}
      <section className="py-24 px-6 md:px-12 bg-Malama-petrol-light">
        <div className="max-w-[1400px] mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-100px' }} variants={staggerContainer}>
            <motion.div variants={fadeInUp} className="mb-4 flex items-center gap-3">
              <div className="h-px w-8 bg-Malama-petrol" />
              <span className="text-xs font-semibold tracking-widest uppercase text-Malama-petrol">A solução</span>
            </motion.div>
            <motion.h2 variants={fadeInUp} className="font-serif text-4xl md:text-5xl font-light leading-tight mb-4 max-w-2xl text-Malama-main">
              Reabilitação metabólica e <span className="text-Malama-petrol italic">alta performance profissional</span>
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-Malama-muted mb-14 max-w-xl leading-relaxed">
              O Malama entrega o acompanhamento clínico que seu colaborador precisa para recuperar a saúde, perder peso e ganhar energia — em uma jornada digital contínua.
            </motion.p>

            <div className="grid lg:grid-cols-[1fr_360px] gap-10">
              <motion.div variants={staggerContainer} className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {SOLUCAO_ITEMS.map((s, i) => (
                  <motion.div key={i} variants={fadeInUp}
                    className="bg-white rounded-2xl p-6 border border-Malama-border hover:border-Malama-petrol/30 transition-colors">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="font-serif text-3xl text-Malama-petrol/30">{s.n}</span>
                      <div className="w-9 h-9 rounded-lg bg-Malama-petrol/10 flex items-center justify-center">
                        <s.icon className="w-4 h-4 text-Malama-petrol" />
                      </div>
                    </div>
                    <h3 className="font-semibold text-Malama-main text-sm mb-2 leading-snug">{s.titulo}</h3>
                    <p className="text-xs text-Malama-muted leading-relaxed">{s.corpo}</p>
                  </motion.div>
                ))}
              </motion.div>

              {/* Card de impacto */}
              <motion.div variants={fadeInUp} className="bg-Malama-main rounded-2xl p-7 flex flex-col justify-between">
                <div>
                  <p className="text-xs font-semibold tracking-widest uppercase text-Malama-petrol mb-6">Impacto comprovado</p>
                  <div className="space-y-5">
                    {IMPACTO_METRICAS.map((m, i) => (
                      <div key={i} className={i < IMPACTO_METRICAS.length - 1 ? 'pb-5 border-b border-white/10' : ''}>
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="text-sm text-white/70 flex-1 leading-snug">{m.label}</p>
                          <span className="font-serif text-2xl font-light text-Malama-petrol flex-shrink-0">{m.stat}</span>
                        </div>
                        <p className="text-xs text-white/25 mt-0.5">{m.fonte}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-white/40 mt-6 leading-relaxed border-t border-white/10 pt-5">
                  Uma única diária de internação por complicação metabólica custa ao seu plano muito mais do que o acompanhamento anual de dezenas de colaboradores no Malama.
                </p>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ==================== O ARGUMENTO FINANCEIRO ==================== */}
      <section className="py-24 px-6 md:px-12">
        <div className="max-w-[1400px] mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-100px' }} variants={staggerContainer}>
            <motion.div variants={fadeInUp} className="mb-4 flex items-center gap-3">
              <div className="h-px w-8 bg-Malama-petrol" />
              <span className="text-xs font-semibold tracking-widest uppercase text-Malama-petrol">O argumento financeiro</span>
            </motion.div>
            <motion.h2 variants={fadeInUp} className="font-serif text-4xl md:text-5xl font-light leading-tight mb-4 max-w-2xl text-Malama-main">
              O Malama não é um custo.<br />
              <span className="text-Malama-petrol italic">É uma contenção de gastos e reajustes.</span>
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-Malama-muted mb-14 max-w-xl leading-relaxed">
              Planos corporativos não têm teto de reajuste fixado pela ANS. O aumento é calculado sobre a sinistralidade do ano anterior — e pode facilmente ultrapassar 20% quando a saúde do time está sem gestão.
            </motion.p>

            <motion.div variants={staggerContainer} className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {FINANCEIRO_CARDS.map((c, i) => (
                <motion.div key={i} variants={fadeInUp}
                  className={`rounded-2xl p-7 border ${c.destaque ? 'bg-Malama-petrol text-white border-Malama-petrol' : 'bg-white border-Malama-border'}`}>
                  <p className={`font-serif text-5xl font-light mb-3 ${c.destaque ? 'text-white' : 'text-Malama-petrol'}`}>{c.stat}</p>
                  <h3 className={`font-semibold text-base mb-3 ${c.destaque ? 'text-white' : 'text-Malama-main'}`}>{c.titulo}</h3>
                  <p className={`text-sm leading-relaxed ${c.destaque ? 'text-white/80' : 'text-Malama-muted'}`}>{c.corpo}</p>
                  <p className={`text-xs mt-4 ${c.destaque ? 'text-white/40' : 'text-Malama-muted/50'}`}>{c.fonte}</p>
                </motion.div>
              ))}
            </motion.div>

            {/* Exemplo prático */}
            <motion.div variants={fadeInUp}
              className="bg-Malama-petrol-light border border-Malama-border rounded-2xl p-7">
              <p className="text-xs font-semibold tracking-wide text-Malama-petrol uppercase mb-5">Exemplo prático</p>
              <div className="grid md:grid-cols-[1fr_auto_1fr] gap-4 items-center">
                <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-center">
                  <p className="text-xs text-red-500 font-medium uppercase tracking-wide mb-1">Sem gestão ativa</p>
                  <p className="font-serif text-3xl font-light text-red-600">R$6,9M</p>
                  <p className="text-xs text-red-400 mt-1">R$6M × 15% de reajuste</p>
                </div>
                <div className="text-center text-Malama-muted font-medium text-sm">vs.</div>
                <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
                  <p className="text-xs text-green-600 font-medium uppercase tracking-wide mb-1">Com Malama</p>
                  <p className="font-serif text-3xl font-light text-green-700">R$4,8M</p>
                  <p className="text-xs text-green-500 mt-1">redução de 20–25% no custo assistencial</p>
                </div>
              </div>
              <p className="text-xs text-Malama-muted/60 mt-4 text-center">Cálculo baseado nos índices ANS/IESS e faixas de redução publicadas por Mercer e IESS</p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ==================== PROPÓSITO ==================== */}
      <section className="py-24 px-6 md:px-12 bg-Malama-main text-white">
        <div className="max-w-[1400px] mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-100px' }} variants={staggerContainer}>
            <div className="max-w-3xl mx-auto text-center">
              <motion.div variants={fadeInUp} className="mb-4 flex items-center justify-center gap-3">
                <div className="h-px w-8 bg-Malama-petrol" />
                <span className="text-xs font-semibold tracking-widest uppercase text-Malama-petrol">Propósito que transforma</span>
                <div className="h-px w-8 bg-Malama-petrol" />
              </motion.div>
              <motion.h2 variants={fadeInUp} className="font-serif text-4xl md:text-5xl font-light leading-tight mb-4">
                Cada quilo perdido <span className="text-Malama-petrol italic">alimenta quem tem fome.</span>
              </motion.h2>
              <motion.p variants={fadeInUp} className="text-white/60 mb-14 leading-relaxed">
                Saúde individual que gera impacto social real. A cada 1 kg eliminado por um colaborador dentro da plataforma, o Malama realiza a doação de 1 kg de alimento para instituições de combate à fome parceiras da sua empresa.
              </motion.p>
            </div>

            {/* Fluxo */}
            <motion.div variants={staggerContainer}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              {PROPOSITO_FLOW.map((f, i) => (
                <motion.div key={i} variants={fadeInUp} className="relative text-center">
                  <div className="w-14 h-14 rounded-full bg-Malama-petrol/20 flex items-center justify-center mx-auto mb-4">
                    <f.icon className="w-6 h-6 text-Malama-petrol" />
                  </div>
                  <span className="font-serif text-4xl text-white/10 absolute -top-2 left-1/2 -translate-x-1/2 select-none">0{i + 1}</span>
                  <p className="text-sm text-white/70 leading-snug">{f.texto}</p>
                </motion.div>
              ))}
            </motion.div>

            {/* Selo ESG */}
            <motion.div variants={fadeInUp} className="flex justify-center">
              <div className="inline-flex items-center gap-3 border border-Malama-petrol/40 rounded-full px-6 py-3 bg-Malama-petrol/10">
                <Leaf className="w-4 h-4 text-Malama-petrol" />
                <span className="text-sm text-white font-medium">ESG</span>
                <span className="text-white/30">·</span>
                <span className="text-sm text-white/60">Impacto mensurável</span>
                <span className="text-white/30">·</span>
                <span className="text-sm text-white/60">Pilar Social</span>
                <span className="text-white/30">·</span>
                <span className="text-sm text-white/60">Employer Branding</span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ==================== CERTIFICADO ==================== */}
      <section className="py-24 px-6 md:px-12 bg-Malama-petrol-light">
        <div className="max-w-[1400px] mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-100px' }} variants={staggerContainer}>
            <div className="max-w-3xl mx-auto">
              <motion.div variants={fadeInUp} className="mb-4 flex items-center gap-3">
                <div className="h-px w-8 bg-Malama-petrol" />
                <span className="text-xs font-semibold tracking-widest uppercase text-Malama-petrol">Transparência e evidência</span>
              </motion.div>
              <motion.h2 variants={fadeInUp} className="font-serif text-4xl md:text-5xl font-light leading-tight mb-4 text-Malama-main">
                O impacto do seu time transformado <span className="text-Malama-petrol italic">em dados de sustentabilidade</span>
              </motion.h2>
              <motion.p variants={fadeInUp} className="text-Malama-muted mb-12 leading-relaxed">
                Mensalmente, o RH recebe um Certificado de Impacto auditável, pronto para integrar relatórios ESG, murais internos e ações de atração de talentos.
              </motion.p>

              {/* Mockup do certificado */}
              <motion.div variants={fadeInUp}
                className="bg-white border border-Malama-border rounded-2xl shadow-lg overflow-hidden">
                {/* Header do certificado */}
                <div className="bg-Malama-main px-8 py-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Award className="w-5 h-5 text-Malama-petrol" />
                    <span className="text-white font-medium text-sm tracking-wide">Certificado de Impacto — Malama Empresas</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-Malama-petrol" />
                    <span className="text-Malama-petrol text-xs font-medium">Auditável</span>
                  </div>
                </div>

                {/* Corpo */}
                <div className="p-8">
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-Malama-bg rounded-xl p-4">
                      <p className="text-xs text-Malama-muted uppercase tracking-wide mb-1">Empresa parceira</p>
                      <p className="font-semibold text-Malama-main">[Nome da Empresa] S.A.</p>
                    </div>
                    <div className="bg-Malama-bg rounded-xl p-4">
                      <p className="text-xs text-Malama-muted uppercase tracking-wide mb-1">Competência</p>
                      <p className="font-semibold text-Malama-main">Maio de 2026</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                    {[
                      { label: 'Vidas protegidas', value: '1.000', sub: 'colaboradores ativos' },
                      { label: 'Redução de risco metabólico', value: '–18%', sub: 'no período' },
                      { label: 'Massa corporal eliminada', value: '312 kg', sub: 'de gordura corporal' },
                      { label: 'Impacto social conquistado', value: '312 kg', sub: 'de alimentos doados' },
                    ].map((item, i) => (
                      <div key={i} className={`rounded-xl p-4 text-center ${i === 3 ? 'bg-Malama-petrol/10 border border-Malama-petrol/20' : 'bg-Malama-bg'}`}>
                        <p className={`font-serif text-2xl font-light mb-1 ${i === 3 ? 'text-Malama-petrol' : 'text-Malama-main'}`}>{item.value}</p>
                        <p className="text-xs text-Malama-muted leading-tight">{item.label}</p>
                        <p className="text-xs text-Malama-muted/60">{item.sub}</p>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-Malama-border pt-5 flex items-start gap-3">
                    <Leaf className="w-4 h-4 text-Malama-petrol flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-Malama-muted leading-relaxed">
                      Este certificado atesta o impacto gerado pelos colaboradores da empresa parceira através da plataforma Malama no período indicado. A doação de alimentos foi realizada à instituição parceira de combate à fome.
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ==================== COMO FUNCIONA ==================== */}
      <section className="py-24 px-6 md:px-12">
        <div className="max-w-[1400px] mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-100px' }} variants={staggerContainer}>
            <motion.div variants={fadeInUp} className="mb-4 flex items-center gap-3">
              <div className="h-px w-8 bg-Malama-petrol" />
              <span className="text-xs font-semibold tracking-widest uppercase text-Malama-petrol">Implementação</span>
            </motion.div>
            <motion.h2 variants={fadeInUp} className="font-serif text-4xl md:text-5xl font-light leading-tight mb-4 text-Malama-main">
              Simples para o RH. <span className="text-Malama-petrol italic">Transformador para o time.</span>
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-Malama-muted mb-14 max-w-xl leading-relaxed">
              Sem integração complexa, sem treinamento técnico. Sua equipe começa em menos de 24 horas.
            </motion.p>

            <motion.div variants={staggerContainer} className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {COMO_FUNCIONA.map((c, i) => (
                <motion.div key={i} variants={fadeInUp} className="p-8 rounded-2xl bg-white border border-Malama-border relative">
                  <span className="absolute top-6 right-7 font-serif text-4xl text-Malama-petrol/20">{c.step}</span>
                  <div className="w-12 h-12 rounded-xl bg-Malama-petrol/10 flex items-center justify-center mb-5">
                    <c.icon className="w-6 h-6 text-Malama-petrol" />
                  </div>
                  <h3 className="font-semibold text-Malama-main text-lg mb-2">{c.title}</h3>
                  <p className="text-sm text-Malama-muted leading-relaxed">{c.body}</p>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ==================== DIFERENCIAIS ==================== */}
      <section className="py-24 px-6 md:px-12 bg-Malama-petrol-light">
        <div className="max-w-[1400px] mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-100px' }} variants={staggerContainer}>
            <motion.div variants={fadeInUp} className="mb-4 flex items-center gap-3">
              <div className="h-px w-8 bg-Malama-petrol" />
              <span className="text-xs font-semibold tracking-widest uppercase text-Malama-petrol">O que nos torna únicos</span>
            </motion.div>
            <motion.h2 variants={fadeInUp} className="font-serif text-4xl md:text-5xl font-light leading-tight mb-4 text-Malama-main">
              O único benefício corporativo focado na <span className="text-Malama-petrol italic">biologia da performance</span>
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-Malama-muted mb-14 max-w-xl leading-relaxed">
              Não somos mais um app de bem-estar genérico. Somos uma intervenção clínica real — com médicos na linha de frente e resultado mensurável.
            </motion.p>

            <motion.div variants={staggerContainer} className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {DIFERENCIAIS.map((d, i) => (
                <motion.div key={i} variants={fadeInUp}
                  className="p-7 rounded-2xl bg-white border border-Malama-border hover:border-Malama-petrol/40 transition-colors">
                  <div className="w-11 h-11 rounded-xl bg-Malama-petrol/10 flex items-center justify-center mb-5">
                    <d.icon className="w-5 h-5 text-Malama-petrol" />
                  </div>
                  <h3 className="font-semibold text-Malama-main text-base mb-2">{d.titulo}</h3>
                  <p className="text-sm text-Malama-muted leading-relaxed">{d.corpo}</p>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ==================== CTA FINAL ==================== */}
      <section id="contato" className="py-24 px-6 md:px-12">
        <div className="max-w-[1400px] mx-auto">
          <div className="max-w-2xl mx-auto">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} variants={staggerContainer}>
              <motion.div variants={fadeInUp} className="mb-4 flex items-center gap-3">
                <div className="h-px w-8 bg-Malama-petrol" />
                <span className="text-xs font-semibold tracking-widest uppercase text-Malama-petrol">Próximo passo</span>
              </motion.div>
              <motion.h2 variants={fadeInUp} className="font-serif text-4xl md:text-5xl font-light leading-tight mb-4 text-Malama-main">
                Pronto para cuidar do seu time?
              </motion.h2>
              <motion.p variants={fadeInUp} className="text-Malama-muted mb-12 leading-relaxed">
                Deixe seu contato e um especialista do Malama apresenta a proposta personalizada para a sua empresa.
              </motion.p>

              {submitted ? (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center gap-5 py-16 text-center">
                  <div className="w-16 h-16 rounded-full bg-Malama-petrol/10 flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-Malama-petrol" />
                  </div>
                  <h3 className="font-serif text-3xl font-light text-Malama-main">Recebemos o seu contato!</h3>
                  <p className="text-Malama-muted max-w-sm leading-relaxed">
                    Nosso time vai entrar em contato em breve para apresentar uma proposta personalizada. Fique de olho no seu e-mail.
                  </p>
                </motion.div>
              ) : (
                <motion.form variants={fadeInUp} onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold tracking-wide text-Malama-muted uppercase">Seu nome *</label>
                      <input type="text" name="nome" value={form.nome} onChange={handleChange} placeholder="Maria Oliveira"
                        className="w-full px-4 py-3.5 rounded-xl border border-Malama-border bg-white text-Malama-main placeholder:text-Malama-muted/50 focus:outline-none focus:border-Malama-petrol transition-colors text-sm" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold tracking-wide text-Malama-muted uppercase">Cargo</label>
                      <input type="text" name="cargo" value={form.cargo} onChange={handleChange} placeholder="Gerente de RH"
                        className="w-full px-4 py-3.5 rounded-xl border border-Malama-border bg-white text-Malama-main placeholder:text-Malama-muted/50 focus:outline-none focus:border-Malama-petrol transition-colors text-sm" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold tracking-wide text-Malama-muted uppercase">Empresa *</label>
                      <input type="text" name="empresa" value={form.empresa} onChange={handleChange} placeholder="Nome da empresa"
                        className="w-full px-4 py-3.5 rounded-xl border border-Malama-border bg-white text-Malama-main placeholder:text-Malama-muted/50 focus:outline-none focus:border-Malama-petrol transition-colors text-sm" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold tracking-wide text-Malama-muted uppercase">CNPJ</label>
                      <input type="text" name="cnpj" value={form.cnpj} onChange={handleChange} placeholder="00.000.000/0001-00"
                        className="w-full px-4 py-3.5 rounded-xl border border-Malama-border bg-white text-Malama-main placeholder:text-Malama-muted/50 focus:outline-none focus:border-Malama-petrol transition-colors text-sm" />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold tracking-wide text-Malama-muted uppercase">E-mail corporativo *</label>
                    <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="maria@empresa.com"
                      className="w-full px-4 py-3.5 rounded-xl border border-Malama-border bg-white text-Malama-main placeholder:text-Malama-muted/50 focus:outline-none focus:border-Malama-petrol transition-colors text-sm" />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold tracking-wide text-Malama-muted uppercase">Número de colaboradores *</label>
                      <select name="num_colaboradores" value={form.num_colaboradores} onChange={handleChange}
                        className="w-full px-4 py-3.5 rounded-xl border border-Malama-border bg-white text-Malama-main focus:outline-none focus:border-Malama-petrol transition-colors text-sm appearance-none cursor-pointer">
                        <option value="">Selecione</option>
                        <option value="Até 50">Até 50</option>
                        <option value="50 a 200">50 a 200</option>
                        <option value="200 a 500">200 a 500</option>
                        <option value="Acima de 500">Acima de 500</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold tracking-wide text-Malama-muted uppercase">Telefone / WhatsApp</label>
                      <input type="tel" name="telefone" value={form.telefone} onChange={handleChange} placeholder="(11) 90000-0000"
                        className="w-full px-4 py-3.5 rounded-xl border border-Malama-border bg-white text-Malama-main placeholder:text-Malama-muted/50 focus:outline-none focus:border-Malama-petrol transition-colors text-sm" />
                    </div>
                  </div>

                  {erro && <p className="text-sm text-red-500">{erro}</p>}

                  <button type="submit" disabled={loading}
                    className="mt-2 w-full group inline-flex items-center justify-center gap-3 bg-Malama-main text-white px-8 py-4 rounded-full font-medium text-base hover:bg-Malama-petrol transition-colors duration-300 disabled:opacity-60">
                    {loading ? 'Enviando...' : 'Quero conhecer o Malama Empresas'}
                    {!loading && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                  </button>

                  <p className="text-xs text-center text-Malama-muted/60">Seus dados são usados apenas para contato. Sem spam.</p>
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
              <p className="text-xs text-Malama-muted">Cuide de quem faz sua empresa crescer.</p>
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
