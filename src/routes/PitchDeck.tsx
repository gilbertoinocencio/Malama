// =====================================================
// Malama — Pitch Deck (/pitchdeck)
// =====================================================

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MalamaLogo } from '../components/MalamaLogo';
import {
  Target, Eye, Heart, AlertTriangle, TrendingUp, DollarSign,
  Stethoscope, Syringe, Salad, BarChart2, Building2, UserPlus,
  Smartphone, ShieldCheck, Zap, Layers, Leaf, CheckCircle,
  ShoppingBag, Star, Award, ArrowRight, Circle,
} from 'lucide-react';

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
};
const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};
const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.6 } },
};

// ─── Slide label ───────────────────────────────────────
const SlideLabel: React.FC<{ n: string; label: string; light?: boolean }> = ({ n, label, light }) => (
  <div className={`flex items-center gap-3 mb-10 ${light ? 'opacity-60' : ''}`}>
    <span className={`text-xs font-semibold tracking-widest uppercase ${light ? 'text-white/60' : 'text-Malama-petrol'}`}>{n}</span>
    <div className={`h-px w-8 ${light ? 'bg-white/40' : 'bg-Malama-petrol'}`} />
    <span className={`text-xs font-semibold tracking-widest uppercase ${light ? 'text-white/60' : 'text-Malama-muted'}`}>{label}</span>
  </div>
);

// ─── Stat card ─────────────────────────────────────────
const StatCard: React.FC<{ stat: string; label: string; fonte?: string; dark?: boolean }> = ({ stat, label, fonte, dark }) => (
  <div className={`rounded-2xl p-6 border ${dark ? 'bg-white/5 border-white/10' : 'bg-white border-Malama-border/50 shadow-sm'}`}>
    <div className={`font-serif text-4xl font-light mb-2 ${dark ? 'text-white' : 'text-Malama-petrol'}`}>{stat}</div>
    <p className={`text-sm leading-relaxed ${dark ? 'text-white/70' : 'text-Malama-muted'}`}>{label}</p>
    {fonte && <p className={`text-[10px] mt-3 ${dark ? 'text-white/30' : 'text-Malama-muted/50'}`}>{fonte}</p>}
  </div>
);

// ─── Feature row ───────────────────────────────────────
const FeatureRow: React.FC<{ icon: React.ElementType; titulo: string; corpo: string; dark?: boolean }> = ({ icon: Icon, titulo, corpo, dark }) => (
  <div className="flex gap-4 items-start">
    <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${dark ? 'bg-white/10' : 'bg-Malama-petrol/8'}`}>
      <Icon className={`w-5 h-5 ${dark ? 'text-white/70' : 'text-Malama-petrol'}`} />
    </div>
    <div>
      <p className={`text-sm font-semibold mb-1 ${dark ? 'text-white' : 'text-Malama-main'}`}>{titulo}</p>
      <p className={`text-sm leading-relaxed ${dark ? 'text-white/60' : 'text-Malama-muted'}`}>{corpo}</p>
    </div>
  </div>
);

export const PitchDeck: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="bg-Malama-bg text-Malama-main font-sans selection:bg-Malama-petrol selection:text-white">

      {/* ── HEADER ── */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 border-b border-transparent ${scrolled ? 'bg-Malama-bg/80 backdrop-blur-xl border-Malama-border/50 py-4' : 'bg-transparent py-5'}`}>
        <div className="max-w-[1200px] mx-auto px-6 md:px-12 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src="/malama-logo-transparent.png" alt="Malama" className="h-[190px] w-auto max-w-none object-contain -my-[70px]" />
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden md:block text-xs font-semibold tracking-widest uppercase text-Malama-muted/60">Confidencial</span>
            <div className="h-4 w-px bg-Malama-border hidden md:block" />
            <span className="text-xs font-semibold tracking-widest uppercase text-Malama-petrol">Pitch Deck · 2026</span>
          </div>
        </div>
      </header>

      {/* ================================================================
          SLIDE 01 — CAPA
      ================================================================ */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 text-center overflow-hidden pt-24 pb-20">
        {/* Fundo decorativo */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full bg-Malama-petrol/4 blur-3xl" />
        </div>

        <motion.div initial="hidden" animate="visible" variants={stagger} className="relative z-10 max-w-4xl mx-auto">
          <motion.div variants={fadeInUp} className="flex items-center justify-center gap-3 mb-8">
            <div className="h-px w-12 bg-Malama-petrol/40" />
            <span className="text-xs font-semibold tracking-widest uppercase text-Malama-petrol">Malama Healthtech</span>
            <div className="h-px w-12 bg-Malama-petrol/40" />
          </motion.div>

          <motion.h1 variants={fadeInUp}
            className="font-serif text-5xl md:text-7xl lg:text-8xl font-light leading-[1.05] tracking-tight text-Malama-main mb-6">
            Primeira plataforma<br />
            digital de saúde<br />
            <span className="text-Malama-petrol italic">metabólica.</span>
          </motion.h1>

          <motion.p variants={fadeInUp} className="text-Malama-muted text-lg md:text-xl max-w-xl mx-auto mb-12 leading-relaxed">
            Benefício corporativo que reduz sinistralidade, controla o presenteísmo
            e entrega performance real para o colaborador.
          </motion.p>

          <motion.div variants={fadeInUp} className="grid grid-cols-3 gap-6 max-w-2xl mx-auto">
            {[
              { stat: 'B2B', label: 'Modelo de negócio corporativo' },
              { stat: '2026', label: 'Mandato NR-1 em vigor' },
              { stat: 'R$50bi', label: 'Mercado GLP-1 até 2030' },
            ].map(({ stat, label }) => (
              <div key={stat} className="rounded-2xl border border-Malama-border/50 bg-white/60 px-4 py-5 shadow-sm">
                <div className="font-serif text-2xl md:text-3xl text-Malama-petrol mb-1">{stat}</div>
                <p className="text-xs text-Malama-muted">{label}</p>
              </div>
            ))}
          </motion.div>

          <motion.p variants={fadeInUp} className="mt-14 text-xs text-Malama-muted/40 tracking-widest uppercase">
            Malama significa "cuidar" em havaiano
          </motion.p>
        </motion.div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-30">
          <div className="w-px h-12 bg-Malama-petrol" />
        </div>
      </section>

      {/* ================================================================
          SLIDE 02 — VISÃO E PROPÓSITO
      ================================================================ */}
      <section className="min-h-screen flex items-center px-6 md:px-12 py-24 bg-Malama-main text-white">
        <div className="max-w-[1200px] mx-auto w-full">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={stagger}>
            <motion.div variants={fadeInUp}>
              <SlideLabel n="02" label="Visão e Propósito" light />
            </motion.div>

            <motion.h2 variants={fadeInUp} className="font-serif text-4xl md:text-6xl font-light leading-tight mb-16 max-w-2xl">
              Uma proposta única —<br />
              <span className="text-Malama-petrol italic">trata a raiz, não o sintoma.</span>
            </motion.h2>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: Target,
                  titulo: 'Missão',
                  corpo: 'Tornar a medicina metabólica acessível e contínua para todo trabalhador brasileiro.',
                },
                {
                  icon: Eye,
                  titulo: 'Visão 2030',
                  corpo: 'Ser a principal plataforma de saúde metabólica corporativa da América Latina.',
                },
                {
                  icon: Heart,
                  titulo: 'Propósito — ESG',
                  corpo: 'A cada 1 kg eliminado por um colaborador na plataforma, 1 kg de alimento é doado a instituições parceiras de combate à fome.',
                },
              ].map(({ icon: Icon, titulo, corpo }) => (
                <motion.div key={titulo} variants={fadeInUp}
                  className="rounded-2xl border border-white/10 bg-white/5 p-8 flex flex-col gap-6">
                  <div className="w-12 h-12 rounded-xl bg-Malama-petrol/20 flex items-center justify-center">
                    <Icon className="w-6 h-6 text-Malama-petrol" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold tracking-widest uppercase text-white/40 mb-2">{titulo}</p>
                    <p className="text-white/80 leading-relaxed">{corpo}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.div variants={fadeInUp}
              className="mt-10 rounded-2xl border border-Malama-petrol/30 bg-Malama-petrol/10 p-8">
              <p className="text-white/90 text-lg md:text-xl font-serif font-light leading-relaxed max-w-3xl">
                "Seremos o benefício que a empresa quer que o colaborador use todo dia — porque quanto mais ele usa,{' '}
                <span className="text-Malama-petrol italic">menor será o custo para a própria empresa.</span>"
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ================================================================
          SLIDE 03 — O PROBLEMA
      ================================================================ */}
      <section className="min-h-screen flex items-center px-6 md:px-12 py-24">
        <div className="max-w-[1200px] mx-auto w-full">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={stagger}>
            <motion.div variants={fadeInUp}>
              <SlideLabel n="03" label="O Problema" />
            </motion.div>

            <motion.h2 variants={fadeInUp} className="font-serif text-4xl md:text-6xl font-light leading-tight mb-4 max-w-2xl">
              O trabalhador brasileiro está<br />
              <span className="text-Malama-petrol italic">biologicamente esgotado.</span>
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-Malama-muted mb-14 max-w-xl leading-relaxed">
              Não é falta de motivação. É fisiologia. O esgotamento crônico afeta diretamente
              o córtex pré-frontal — região responsável por raciocínio, planejamento e empatia.
            </motion.p>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              <StatCard stat="72%" label="dos brasileiros trabalham em modo de sobrevivência — equivalente aos níveis mais altos de tensão aguda." fonte="CNN Brasil / Starbem, 2025" />
              <StatCard stat="58%" label="dos trabalhadores dormem mal ou muito mal. Apenas 13% consideram seu sono bom ou excelente." />
              <StatCard stat="62,6%" label="da população adulta está acima do peso. A faixa mais afetada (35–54 anos) é a mais produtiva." fonte="Vigitel / Ministério da Saúde, 2024" />
              <StatCard stat="25,7%" label="já está em obesidade clínica — 1 em cada 4 colaboradores na empresa hoje." fonte="Vigitel / Ministério da Saúde, 2024" />
              <StatCard stat="80%" label="dos custos de sinistralidade estão concentrados em 20% dos colaboradores com doenças crônicas não controladas." />
              <StatCard stat="74%" label="mais afastamentos prolongados em colaboradores com disfunção metabólica." fonte="ABQV" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ================================================================
          SLIDE 04 — O CUSTO PARA AS EMPRESAS
      ================================================================ */}
      <section className="min-h-screen flex items-center px-6 md:px-12 py-24 bg-[#1a100e] text-white">
        <div className="max-w-[1200px] mx-auto w-full">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={stagger}>
            <motion.div variants={fadeInUp}>
              <SlideLabel n="04" label="O Custo Para as Empresas" light />
            </motion.div>

            <motion.h2 variants={fadeInUp} className="font-serif text-4xl md:text-6xl font-light leading-tight mb-4 max-w-3xl">
              O segundo maior custo fixo<br />
              da empresa está fora de controle —
              <span className="text-Malama-petrol italic"> e crescendo.</span>
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-white/60 mb-14 max-w-xl">
              O plano de saúde é o segundo maior custo das empresas, atrás apenas do salário.
              Sem gestão ativa, esse número só cresce.
            </motion.p>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <motion.div variants={fadeInUp} className="rounded-2xl border border-Malama-petrol/40 bg-Malama-petrol/10 p-8">
                <div className="font-serif text-5xl text-Malama-petrol mb-3">R$709</div>
                <p className="text-white/80 font-medium mb-1">Custo médio por vida/mês</p>
                <p className="text-white/50 text-sm">subindo 15,3% ao ano — sem teto de reajuste pela ANS.</p>
                <p className="text-white/30 text-xs mt-3">Mercer Marsh Benefícios, 2025</p>
              </motion.div>
              <motion.div variants={fadeInUp} className="rounded-2xl border border-white/10 bg-white/5 p-8">
                <div className="font-serif text-5xl text-white mb-3">R$200bi</div>
                <p className="text-white/80 font-medium mb-1">Custo anual do presenteísmo no Brasil</p>
                <p className="text-white/50 text-sm">Índice médio de 32% nas empresas — o colaborador está presente, mas não está produzindo.</p>
                <p className="text-white/30 text-xs mt-3">IBEF-SP / Vittude, 2025</p>
              </motion.div>
            </div>

            <div className="grid md:grid-cols-3 gap-5">
              <motion.div variants={fadeInUp} className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <div className="font-serif text-3xl text-Malama-petrol mb-2">15,3% a.a.</div>
                <p className="text-white/70 text-sm">Inflação médica (VCMH) — cresce consistentemente acima do IPCA e dobra o custo do plano em 5 anos.</p>
                <p className="text-white/30 text-xs mt-3">ANS / IESS</p>
              </motion.div>
              <motion.div variants={fadeInUp} className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <div className="font-serif text-3xl text-Malama-petrol mb-2">R$70bi</div>
                <p className="text-white/70 text-sm">Custo anual da obesidade em despesas médicas e perda de produtividade no Brasil.</p>
                <p className="text-white/30 text-xs mt-3">IESS</p>
              </motion.div>
              <motion.div variants={fadeInUp} className="rounded-2xl border border-white/8 bg-Malama-petrol/8 p-6">
                <div className="font-serif text-3xl text-white mb-2">NR-1 · 2026</div>
                <p className="text-white/70 text-sm">A norma atualizada obriga todas as empresas CLT a gerenciar riscos psicossociais ativamente — multas e responsabilização civil para quem não cumprir.</p>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ================================================================
          SLIDE 05 — A SOLUÇÃO
      ================================================================ */}
      <section className="min-h-screen flex items-center px-6 md:px-12 py-24">
        <div className="max-w-[1200px] mx-auto w-full">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={stagger}>
            <motion.div variants={fadeInUp}>
              <SlideLabel n="05" label="A Solução" />
            </motion.div>

            <div className="grid lg:grid-cols-2 gap-16 items-start">
              <div>
                <motion.h2 variants={fadeInUp} className="font-serif text-4xl md:text-5xl font-light leading-tight mb-6">
                  Saúde metabólica<br />
                  <span className="text-Malama-petrol italic">como benefício corporativo.</span>
                </motion.h2>
                <motion.p variants={fadeInUp} className="text-Malama-muted leading-relaxed mb-10">
                  O Malama atua sobre três pilares simultâneos — entregues via app,
                  sem complexidade operacional para a empresa.
                </motion.p>

                <motion.div variants={stagger} className="space-y-6">
                  {[
                    { icon: TrendingUp, titulo: 'Redução do absenteísmo e presenteísmo', corpo: 'Colaboradores com saúde metabólica recuperada faltam menos e produzem mais — com foco, energia e disposição reais.' },
                    { icon: DollarSign, titulo: 'Controle do custo do plano de saúde', corpo: 'Colaboradores mais saudáveis usam menos o plano. Menos sinistralidade significa menor reajuste anual — o Malama é uma contenção direta do segundo maior custo fixo.' },
                    { icon: Zap, titulo: 'Melhora da performance', corpo: 'Saúde metabólica é base biológica de desempenho. Quando o colaborador recupera o sono e o equilíbrio hormonal, a produtividade surge naturalmente.' },
                  ].map(item => (
                    <motion.div key={item.titulo} variants={fadeInUp}>
                      <FeatureRow {...item} />
                    </motion.div>
                  ))}
                </motion.div>
              </div>

              <motion.div variants={fadeInUp} className="space-y-4">
                <p className="text-xs font-semibold tracking-widest uppercase text-Malama-muted mb-6">O que entregamos</p>
                {[
                  { icon: Stethoscope, titulo: 'Telemedicina com especialistas em metabolismo', corpo: 'Nutrólogos e endocrinologistas diretamente no app — sem filas, sem guias.' },
                  { icon: Salad, titulo: 'Plano nutricional clínico supervisionado por IA', corpo: 'Prescrições individualizadas para ganho de energia e otimização metabólica.' },
                  { icon: BarChart2, titulo: 'Monitoramento contínuo de progresso', corpo: 'Peso, composição corporal e evolução clínica — o médico acessa o histórico nutricional completo antes de cada consulta.' },
                  { icon: Syringe, titulo: 'Gestão segura de tratamentos GLP-1', corpo: 'Estrutura médica completa para colaboradores que utilizam semaglutida — diferencial único no Brasil.' },
                  { icon: ShieldCheck, titulo: 'Conformidade NR-1', corpo: 'Relatórios mensais documentados que comprovam gestão de riscos psicossociais — a empresa fica protegida.' },
                ].map(item => (
                  <div key={item.titulo} className="rounded-xl border border-Malama-border/50 bg-white p-5 shadow-sm">
                    <FeatureRow {...item} />
                  </div>
                ))}
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ================================================================
          SLIDE 06 — POR QUE AGORA
      ================================================================ */}
      <section className="min-h-screen flex items-center px-6 md:px-12 py-24 bg-Malama-main text-white">
        <div className="max-w-[1200px] mx-auto w-full">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={stagger}>
            <motion.div variants={fadeInUp}>
              <SlideLabel n="06" label="Por Que Agora" light />
            </motion.div>

            <motion.h2 variants={fadeInUp} className="font-serif text-4xl md:text-6xl font-light leading-tight mb-16 max-w-3xl">
              Três forças convergindo —<br />
              <span className="text-Malama-petrol italic">a janela está aberta.</span>
            </motion.h2>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  n: '01',
                  titulo: 'NR-1 Atualizada — Maio 2026',
                  corpo: 'Todas as empresas CLT passam a ser legalmente obrigadas a gerenciar riscos psicossociais, incluindo fadiga crônica e burnout metabólico. Multas, interdição e responsabilização civil e criminal para quem não cumprir. O Malama entrega relatórios mensais documentados que comprovam conformidade.',
                  tag: 'Regulatório',
                },
                {
                  n: '02',
                  titulo: 'Mercado GLP-1 Explodindo',
                  corpo: 'O mercado de GLP-1 cresceu 77% em 2025 e projeta R$50 bilhões até 2030. Colaboradores já utilizam semaglutida sem estrutura médica de suporte — a empresa precisa dessa estrutura. O Malama é o único benefício corporativo que a oferece.',
                  tag: 'Mercado · Itaú BBA',
                },
                {
                  n: '03',
                  titulo: 'Zero Concorrentes Nessa Combinação',
                  corpo: 'Nenhum concorrente oferece a combinação: nutrição clínica + telemedicina metabólica + gestão de GLP-1 + conformidade NR-1 como benefício corporativo integrado. A janela está aberta — e o primeiro a escalar define o padrão do mercado.',
                  tag: 'Posicionamento',
                },
              ].map(({ n, titulo, corpo, tag }) => (
                <motion.div key={n} variants={fadeInUp}
                  className="rounded-2xl border border-white/10 bg-white/5 p-8 flex flex-col gap-5">
                  <div className="flex items-center justify-between">
                    <span className="font-serif text-4xl text-Malama-petrol/40">{n}</span>
                    <span className="text-[10px] font-semibold tracking-widest uppercase border border-Malama-petrol/30 text-Malama-petrol px-3 py-1 rounded-full">{tag}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-white mb-3">{titulo}</p>
                    <p className="text-white/60 text-sm leading-relaxed">{corpo}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ================================================================
          SLIDE 07 — COMO FUNCIONA
      ================================================================ */}
      <section className="min-h-screen flex items-center px-6 md:px-12 py-24">
        <div className="max-w-[1200px] mx-auto w-full">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={stagger}>
            <motion.div variants={fadeInUp}>
              <SlideLabel n="07" label="Como Funciona" />
            </motion.div>

            <motion.h2 variants={fadeInUp} className="font-serif text-4xl md:text-5xl font-light leading-tight mb-16 max-w-2xl">
              Seis passos —<br />
              <span className="text-Malama-petrol italic">uma única fatura mensal.</span>
            </motion.h2>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { n: '01', icon: Building2, titulo: 'Empresa contrata os assentos', corpo: 'Define o modelo — benefício integral ou coparticipação. Um contrato direto, sem burocracia.' },
                { n: '02', icon: UserPlus, titulo: 'RH insere os colaboradores', corpo: 'Painel simples: insere os e-mails dos elegíveis. Acesso liberado automaticamente.' },
                { n: '03', icon: Smartphone, titulo: 'Colaborador ativa a conta', corpo: 'Recebe o convite, cria sua conta e inicia a jornada no mesmo app.' },
                { n: '04', icon: Stethoscope, titulo: 'Consulta médica no app', corpo: 'Agendamento, consulta com nutrólogo ou endocrinologista e plano nutricional personalizado.' },
                { n: '05', icon: BarChart2, titulo: 'RH recebe relatório mensal', corpo: 'Métricas anônimas de saúde, evolução do grupo e certificado de impacto ESG.' },
                { n: '06', icon: DollarSign, titulo: 'Uma fatura. Sem complexidade.', corpo: 'Gestão financeira simples: um boleto por mês, com preço fixo por assento contratado.' },
              ].map(({ n, icon: Icon, titulo, corpo }) => (
                <motion.div key={n} variants={fadeInUp}
                  className="rounded-2xl border border-Malama-border/50 bg-white p-7 shadow-sm">
                  <div className="flex items-start justify-between mb-5">
                    <div className="w-10 h-10 rounded-xl bg-Malama-petrol/8 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-Malama-petrol" />
                    </div>
                    <span className="font-serif text-3xl text-Malama-petrol/20">{n}</span>
                  </div>
                  <p className="font-semibold text-Malama-main mb-2 text-sm">{titulo}</p>
                  <p className="text-Malama-muted text-sm leading-relaxed">{corpo}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ================================================================
          SLIDE 08 — O PRODUTO
      ================================================================ */}
      <section className="min-h-screen flex items-center px-6 md:px-12 py-24 bg-[#f5f1ee]">
        <div className="max-w-[1200px] mx-auto w-full">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={stagger}>
            <motion.div variants={fadeInUp}>
              <SlideLabel n="08" label="O Produto" />
            </motion.div>

            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <motion.h2 variants={fadeInUp} className="font-serif text-4xl md:text-5xl font-light leading-tight mb-6">
                  App publicado.<br />
                  <span className="text-Malama-petrol italic">Fluxo clínico completo.</span>
                </motion.h2>
                <motion.p variants={fadeInUp} className="text-Malama-muted leading-relaxed mb-10">
                  Dois perfis integrados em um único app — paciente e médico —
                  com fluxo clínico real, validado com médicos parceiros ativos.
                </motion.p>

                <motion.div variants={stagger} className="space-y-3">
                  {[
                    'App publicado na Google Play Store',
                    'Onboarding com histórico metabólico e plano nutricional por IA',
                    'Painel médico: histórico nutricional completo antes da consulta — diferencial clínico único no Brasil',
                    'Notas clínicas obrigatórias e acompanhamento contínuo',
                    'Módulo B2B: painel de RH, gestão de colaboradores e relatório mensal',
                    'Body Scan para monitoramento de composição corporal',
                    'Integração com Strava para dados de atividade física',
                    'Gestão segura de tratamentos GLP-1',
                  ].map(item => (
                    <motion.div key={item} variants={fadeInUp} className="flex items-start gap-3">
                      <CheckCircle className="w-4 h-4 text-Malama-petrol flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-Malama-muted leading-relaxed">{item}</span>
                    </motion.div>
                  ))}
                </motion.div>
              </div>

              <motion.div variants={fadeInUp} className="grid grid-cols-2 gap-4">
                {[
                  { icon: Smartphone, titulo: 'Paciente', corpo: 'Consulta, plano nutricional, monitoramento e comunidade — tudo integrado.', tag: 'iOS · Android' },
                  { icon: Stethoscope, titulo: 'Médico', corpo: 'Agenda, painel clínico, histórico nutricional e notas — fluxo completo.', tag: 'Web · App' },
                  { icon: Building2, titulo: 'RH / Admin', corpo: 'Gestão de colaboradores, relatórios e métricas anônimas de saúde.', tag: 'Web' },
                  { icon: BarChart2, titulo: 'Super Admin', corpo: 'Dashboard de empresas, MRR, assentos, leads e sinistralidade.', tag: 'Interno' },
                ].map(({ icon: Icon, titulo, corpo, tag }) => (
                  <div key={titulo} className="rounded-2xl border border-Malama-border/50 bg-white p-6 shadow-sm">
                    <div className="w-9 h-9 rounded-xl bg-Malama-petrol/8 flex items-center justify-center mb-4">
                      <Icon className="w-4 h-4 text-Malama-petrol" />
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold text-sm text-Malama-main">{titulo}</p>
                      <span className="text-[10px] bg-Malama-petrol/8 text-Malama-petrol px-2 py-0.5 rounded-full font-medium">{tag}</span>
                    </div>
                    <p className="text-xs text-Malama-muted leading-relaxed">{corpo}</p>
                  </div>
                ))}
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ================================================================
          SLIDE 09 — MODELO DE NEGÓCIO
      ================================================================ */}
      <section className="min-h-screen flex items-center px-6 md:px-12 py-24 bg-Malama-main text-white">
        <div className="max-w-[1200px] mx-auto w-full">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={stagger}>
            <motion.div variants={fadeInUp}>
              <SlideLabel n="09" label="Modelo de Negócio" light />
            </motion.div>

            <motion.h2 variants={fadeInUp} className="font-serif text-4xl md:text-6xl font-light leading-tight mb-16 max-w-2xl">
              Receita recorrente<br />
              <span className="text-Malama-petrol italic">em dois canais.</span>
            </motion.h2>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <motion.div variants={fadeInUp} className="rounded-2xl border border-white/10 bg-white/5 p-8">
                <div className="text-xs font-semibold tracking-widest uppercase text-Malama-petrol mb-6">Canal B2C</div>
                <div className="font-serif text-5xl text-white mb-4">Assinatura</div>
                <p className="text-white/60 text-sm leading-relaxed mb-6">
                  Usuário final assina mensalmente para acesso ao app, plano nutricional por IA
                  e consultas médicas avulsas.
                </p>
                <div className="space-y-2">
                  {['Assinatura mensal recorrente (MRR)', 'Comissão sobre consultas médicas na plataforma', 'Médicos gerenciam agenda própria — repasse quinzenal'].map(i => (
                    <div key={i} className="flex gap-2 items-start">
                      <Circle className="w-3 h-3 text-Malama-petrol flex-shrink-0 mt-0.5 fill-Malama-petrol" />
                      <span className="text-white/60 text-sm">{i}</span>
                    </div>
                  ))}
                </div>
              </motion.div>

              <motion.div variants={fadeInUp} className="rounded-2xl border border-Malama-petrol/40 bg-Malama-petrol/10 p-8">
                <div className="text-xs font-semibold tracking-widest uppercase text-Malama-petrol mb-6">Canal B2B · Principal</div>
                <div className="font-serif text-5xl text-white mb-4">Corporativo</div>
                <p className="text-white/60 text-sm leading-relaxed mb-6">
                  Empresas contratam assentos como benefício corporativo —
                  preço negociado por volume, modelo integral ou coparticipação.
                </p>
                <div className="space-y-2">
                  {[
                    'Preço por assento/mês — negociado por volume',
                    'Modelo integral (empresa paga tudo) ou coparticipação (desconto em folha)',
                    'Fatura única mensal — sem complexidade operacional',
                    'Margem crescente conforme escala da base',
                  ].map(i => (
                    <div key={i} className="flex gap-2 items-start">
                      <Circle className="w-3 h-3 text-Malama-petrol flex-shrink-0 mt-0.5 fill-Malama-petrol" />
                      <span className="text-white/60 text-sm">{i}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>

            <motion.div variants={fadeInUp} className="rounded-2xl border border-white/5 bg-white/5 p-6 flex flex-wrap gap-8">
              {[
                { stat: 'MRR', label: 'Receita mensal recorrente em ambos os canais' },
                { stat: '↑ Margem', label: 'Margem de contribuição crescente com escala' },
                { stat: 'B2B2C', label: 'Empresas como canal de aquisição de usuários' },
              ].map(({ stat, label }) => (
                <div key={stat} className="flex items-center gap-4">
                  <div className="font-serif text-2xl text-Malama-petrol">{stat}</div>
                  <p className="text-white/50 text-sm max-w-[160px]">{label}</p>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ================================================================
          SLIDE 10 — TAMANHO DO MERCADO
      ================================================================ */}
      <section className="min-h-screen flex items-center px-6 md:px-12 py-24">
        <div className="max-w-[1200px] mx-auto w-full">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={stagger}>
            <motion.div variants={fadeInUp}>
              <SlideLabel n="10" label="Tamanho do Mercado" />
            </motion.div>

            <motion.h2 variants={fadeInUp} className="font-serif text-4xl md:text-5xl font-light leading-tight mb-4 max-w-2xl">
              Mercado de R$50bi<br />
              <span className="text-Malama-petrol italic">em formação.</span>
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-Malama-muted mb-16 max-w-xl">
              O mercado de saúde metabólica corporativa ainda não tem um líder consolidado.
              A janela de liderança está aberta.
            </motion.p>

            <div className="grid md:grid-cols-3 gap-6 mb-10">
              {[
                {
                  sigla: 'TAM',
                  valor: 'R$50bi',
                  titulo: 'Mercado Total',
                  corpo: 'Mercado de saúde metabólica e GLP-1 no Brasil projetado para 2030, incluindo usuários individuais e corporativos.',
                  fonte: 'Itaú BBA',
                  destaque: false,
                },
                {
                  sigla: 'SAM',
                  valor: 'R$8bi',
                  titulo: 'Mercado Endereçável',
                  corpo: 'Empresas com mais de 50 colaboradores que já oferecem benefícios de saúde e wellness — público imediato do Malama B2B.',
                  fonte: '',
                  destaque: true,
                },
                {
                  sigla: 'SOM',
                  valor: 'R$400mi',
                  titulo: 'Mercado Capturável — 3 anos',
                  corpo: 'Empresas de médio porte (50–500 colaboradores) em São Paulo e principais capitais nos primeiros 3 anos de operação.',
                  fonte: '',
                  destaque: false,
                },
              ].map(({ sigla, valor, titulo, corpo, fonte, destaque }) => (
                <motion.div key={sigla} variants={fadeInUp}
                  className={`rounded-2xl p-8 border ${destaque ? 'bg-Malama-main text-white border-Malama-main' : 'bg-white border-Malama-border/50 shadow-sm'}`}>
                  <div className={`text-xs font-semibold tracking-widest uppercase mb-4 ${destaque ? 'text-Malama-petrol' : 'text-Malama-muted/60'}`}>{sigla}</div>
                  <div className={`font-serif text-4xl md:text-5xl mb-3 ${destaque ? 'text-Malama-petrol' : 'text-Malama-petrol'}`}>{valor}</div>
                  <p className={`font-semibold mb-2 text-sm ${destaque ? 'text-white' : 'text-Malama-main'}`}>{titulo}</p>
                  <p className={`text-sm leading-relaxed ${destaque ? 'text-white/60' : 'text-Malama-muted'}`}>{corpo}</p>
                  {fonte && <p className={`text-xs mt-3 ${destaque ? 'text-white/30' : 'text-Malama-muted/40'}`}>{fonte}</p>}
                </motion.div>
              ))}
            </div>

            <motion.div variants={fadeInUp}
              className="rounded-2xl border border-Malama-petrol/20 bg-Malama-petrol/5 p-6 flex items-center gap-5">
              <div className="w-10 h-10 rounded-xl bg-Malama-petrol/10 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-5 h-5 text-Malama-petrol" />
              </div>
              <p className="text-Malama-muted text-sm leading-relaxed">
                <span className="text-Malama-main font-semibold">15 milhões de usuários estimados de GLP-1 no Brasil até 2030.</span>{' '}
                Cada um deles precisa de acompanhamento médico estruturado — e a maioria ainda não tem. (Itaú BBA)
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ================================================================
          SLIDE 11 — TRAÇÃO
      ================================================================ */}
      <section className="min-h-screen flex items-center px-6 md:px-12 py-24 bg-[#f5f1ee]">
        <div className="max-w-[1200px] mx-auto w-full">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={stagger}>
            <motion.div variants={fadeInUp}>
              <SlideLabel n="11" label="Tração" />
            </motion.div>

            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <motion.h2 variants={fadeInUp} className="font-serif text-4xl md:text-5xl font-light leading-tight mb-6">
                  Produto real.<br />
                  <span className="text-Malama-petrol italic">Fluxo validado.</span>
                </motion.h2>
                <motion.p variants={fadeInUp} className="text-Malama-muted leading-relaxed mb-10">
                  Não somos uma ideia — somos uma plataforma publicada, com médicos ativos
                  e fluxo clínico completo funcionando.
                </motion.p>

                <motion.div variants={stagger} className="space-y-4">
                  {[
                    { status: 'done', texto: 'App publicado na Google Play Store' },
                    { status: 'done', texto: 'Médicos parceiros ativos e integrados na plataforma' },
                    { status: 'done', texto: 'Fluxo paciente-médico validado: consulta, notas clínicas, plano nutricional e monitoramento funcionando' },
                    { status: 'done', texto: 'Módulo B2B desenvolvido: painel de RH, gestão de empresas e colaboradores' },
                    { status: 'next', texto: 'Primeiras empresas parceiras — validação do modelo B2B com métricas reais' },
                  ].map(({ status, texto }) => (
                    <motion.div key={texto} variants={fadeInUp} className="flex items-start gap-3">
                      <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5 ${status === 'done' ? 'bg-Malama-petrol' : 'border-2 border-Malama-petrol/30'}`}>
                        {status === 'done' && <CheckCircle className="w-3 h-3 text-white fill-white" />}
                      </div>
                      <span className={`text-sm leading-relaxed ${status === 'done' ? 'text-Malama-main' : 'text-Malama-muted'}`}>{texto}</span>
                    </motion.div>
                  ))}
                </motion.div>
              </div>

              <motion.div variants={fadeInUp} className="grid grid-cols-2 gap-4">
                {[
                  { stat: '✓', label: 'Google Play', corpo: 'App publicado e disponível para download' },
                  { stat: '✓', label: 'Médicos ativos', corpo: 'Corpo clínico integrado com agenda própria' },
                  { stat: '✓', label: 'Módulo B2B', corpo: 'Painel RH e gestão de colaboradores prontos' },
                  { stat: '→', label: 'Próximo passo', corpo: 'Primeiras empresas parceiras e validação B2B' },
                ].map(({ stat, label, corpo }) => (
                  <div key={label} className="rounded-2xl border border-Malama-border/50 bg-white p-6 shadow-sm">
                    <div className={`font-serif text-3xl mb-3 ${stat === '→' ? 'text-Malama-petrol/40' : 'text-Malama-petrol'}`}>{stat}</div>
                    <p className="font-semibold text-sm text-Malama-main mb-1">{label}</p>
                    <p className="text-xs text-Malama-muted leading-relaxed">{corpo}</p>
                  </div>
                ))}
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ================================================================
          SLIDE 12 — O QUE BUSCAMOS
      ================================================================ */}
      <section className="min-h-screen flex items-center px-6 md:px-12 py-24 bg-Malama-main text-white">
        <div className="max-w-[1200px] mx-auto w-full">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={stagger}>
            <motion.div variants={fadeInUp}>
              <SlideLabel n="12" label="O Que Buscamos" light />
            </motion.div>

            <motion.h2 variants={fadeInUp} className="font-serif text-4xl md:text-6xl font-light leading-tight mb-4 max-w-3xl">
              Parceiros que constroem<br />
              <span className="text-Malama-petrol italic">o padrão do mercado conosco.</span>
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-white/60 mb-16 max-w-xl leading-relaxed">
              Não buscamos apenas capital — buscamos credibilidade, rede e conhecimento
              que encurtem o caminho até a liderança de mercado.
            </motion.p>

            <div className="grid md:grid-cols-2 gap-6 mb-12">
              {[
                {
                  icon: Building2,
                  titulo: 'Credibilidade institucional',
                  corpo: 'Abertura de portas com empresas de médio e grande porte que já investem em benefícios de saúde corporativos.',
                },
                {
                  icon: TrendingUp,
                  titulo: 'Mentoria em modelo de negócio',
                  corpo: 'Orientação em regulatório, go-to-market e pricing para o mercado de healthtech B2B no Brasil.',
                },
                {
                  icon: Stethoscope,
                  titulo: 'Parceria clínica',
                  corpo: 'Validação clínica da plataforma com especialistas em saúde metabólica — fortalecendo a credibilidade científica.',
                },
                {
                  icon: Heart,
                  titulo: 'Rede médica',
                  corpo: 'Acesso a rede de médicos e especialistas para fortalecer o corpo clínico da plataforma e escalar a capacidade de atendimento.',
                },
              ].map(({ icon: Icon, titulo, corpo }) => (
                <motion.div key={titulo} variants={fadeInUp}
                  className="rounded-2xl border border-white/10 bg-white/5 p-8 flex gap-5 items-start">
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-Malama-petrol/20 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-Malama-petrol" />
                  </div>
                  <div>
                    <p className="font-semibold text-white mb-2">{titulo}</p>
                    <p className="text-white/60 text-sm leading-relaxed">{corpo}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.div variants={fadeInUp}
              className="rounded-2xl border border-Malama-petrol/30 bg-Malama-petrol/10 p-10 text-center">
              <p className="font-serif text-3xl md:text-4xl text-white font-light leading-snug mb-6">
                Cuide de quem faz<br />
                <span className="text-Malama-petrol italic">sua empresa crescer.</span>
              </p>
              <Link to="/empresas"
                className="inline-flex items-center gap-2 bg-Malama-petrol text-white px-8 py-4 rounded-xl text-sm font-semibold hover:bg-Malama-petrol/90 transition-colors">
                Conhecer a plataforma
                <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-Malama-main border-t border-white/5 py-8 px-6 text-center">
        <p className="text-white/20 text-xs tracking-widest uppercase">
          Malama Healthtech · Confidencial · 2026
        </p>
      </footer>

    </div>
  );
};
