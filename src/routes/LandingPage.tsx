// =====================================================
// NURA — Landing Page Principal
// =====================================================

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Brain,
  Clock,
  Shield,
  TrendingUp,
  Users,
  Star,
  ArrowRight,
  CheckCircle,
  Video,
  BarChart3,
  Calendar,
  Stethoscope,
  Leaf,
  Zap,
  Target,
  ChevronDown,
  Menu,
  X
} from 'lucide-react';

const LandingPage: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
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

  return (
    <div className="min-h-screen bg-white">
      {/* ==================== HEADER ==================== */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-md shadow-lg' : 'bg-transparent'
        }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="bg-nura-petrol rounded-lg px-4 py-2">
                <span className="text-white font-serif text-2xl font-light tracking-[8px]">NURA</span>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              <button onClick={() => scrollToSection('diferenciais')} className="text-gray-700 hover:text-nura-petrol font-medium transition">
                Diferenciais
              </button>
              <button onClick={() => scrollToSection('como-funciona')} className="text-gray-700 hover:text-nura-petrol font-medium transition">
                Como Funciona
              </button>
              <button onClick={() => scrollToSection('medicos')} className="text-gray-700 hover:text-nura-petrol font-medium transition">
                Para Médicos
              </button>
              <button onClick={() => scrollToSection('depoimentos')} className="text-gray-700 hover:text-nura-petrol font-medium transition">
                Depoimentos
              </button>
            </nav>

            {/* CTA Buttons */}
            <div className="hidden md:flex items-center gap-4">
              <Link
                to="/medico"
                className="text-nura-petrol font-semibold hover:opacity-80 transition"
              >
                Para Médicos
              </Link>
              <Link
                to="/entrar?signup=true"
                className="bg-nura-petrol text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-nura-petrol/90 transition shadow-lg shadow-nura-petrol/20"
              >
                Sou Nura
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 text-gray-700"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 shadow-lg">
            <div className="px-4 py-4 space-y-3">
              <button onClick={() => scrollToSection('diferenciais')} className="block w-full text-left py-2 text-gray-700 font-medium">
                Diferenciais
              </button>
              <button onClick={() => scrollToSection('como-funciona')} className="block w-full text-left py-2 text-gray-700 font-medium">
                Como Funciona
              </button>
              <button onClick={() => scrollToSection('medicos')} className="block w-full text-left py-2 text-gray-700 font-medium">
                Para Médicos
              </button>
              <button onClick={() => scrollToSection('depoimentos')} className="block w-full text-left py-2 text-gray-700 font-medium">
                Depoimentos
              </button>
              <div className="pt-3 border-t border-gray-100 space-y-2">
                <Link to="/medico" className="block text-center py-2 text-nura-petrol font-semibold">
                  Para Médicos
                </Link>
                <Link to="/entrar?signup=true" className="block text-center bg-nura-petrol text-white py-3 rounded-xl font-semibold">
                  Sou Nura
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* ==================== HERO SECTION ==================== */}
      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-nura-petrol-light/30 via-white to-white" />
        <div className="absolute top-20 right-0 w-96 h-96 bg-nura-petrol/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-nura-brown/5 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 bg-nura-petrol/10 text-nura-petrol px-4 py-2 rounded-full text-sm font-semibold mb-6">
                <Zap className="w-4 h-4" />
                Nutrição Inteligente com IA
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-nura-main leading-tight mb-6">
                Alimente seu{' '}
                <span className="text-nura-petrol">fluxo</span> natural
              </h1>

              <p className="text-lg text-nura-muted mb-8 max-w-xl mx-auto lg:mx-0">
                O Nura combina inteligência artificial com acompanhamento médico personalizado
                para transformar sua relação com a nutrição. Alcance seus objetivos de forma
                saudável e sustentável.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link
                  to="/entrar?signup=true"
                  className="inline-flex items-center justify-center gap-2 bg-nura-petrol text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-nura-petrol/90 transition shadow-xl shadow-nura-petrol/25 hover:shadow-nura-petrol/40"
                >
                  Começar Agora
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <button
                  onClick={() => scrollToSection('como-funciona')}
                  className="inline-flex items-center justify-center gap-2 border-2 border-nura-petrol text-nura-petrol px-8 py-4 rounded-xl font-semibold text-lg hover:bg-nura-petrol/5 transition"
                >
                  Saiba Mais
                </button>
              </div>

              {/* Stats */}
              <div className="mt-12 grid grid-cols-3 gap-6">
                <div>
                  <div className="text-3xl font-bold text-nura-petrol">10k+</div>
                  <div className="text-sm text-nura-muted">Usuários Ativos</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-nura-petrol">50+</div>
                  <div className="text-sm text-nura-muted">Médicos Parceiros</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-nura-petrol">98%</div>
                  <div className="text-sm text-nura-muted">Satisfação</div>
                </div>
              </div>
            </div>

            {/* Right Image/Illustration */}
            <div className="relative">
              <div className="relative bg-gradient-to-br from-nura-petrol to-nura-petrol/80 rounded-3xl p-8 shadow-2xl">
                <div className="bg-white rounded-2xl p-6 space-y-4">
                  {/* Mock Dashboard */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-semibold text-nura-main">Seu Plano de Hoje</span>
                    <span className="text-xs bg-nura-petrol-light text-nura-petrol px-2 py-1 rounded-full">Em dia!</span>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-nura-main">Café da manhã</div>
                        <div className="text-xs text-nura-muted">450 kcal • 08:30</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <Leaf className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-nura-main">Almoço</div>
                        <div className="text-xs text-nura-muted">650 kcal • 12:30</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-nura-petrol-light rounded-xl border border-nura-petrol/20">
                      <div className="w-10 h-10 bg-nura-petrol/20 rounded-full flex items-center justify-center">
                        <Clock className="w-5 h-5 text-nura-petrol" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-nura-main">Próxima refeição</div>
                        <div className="text-xs text-nura-petrol">Em 45 minutos</div>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="pt-4 border-t border-gray-100">
                    <div className="flex justify-between text-xs text-nura-muted mb-2">
                      <span>Progresso diário</span>
                      <span>75%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full w-3/4 bg-gradient-to-r from-nura-petrol to-nura-petrol/60 rounded-full" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating Badge */}
              <div className="absolute -bottom-4 -left-4 bg-white rounded-xl shadow-lg p-4 flex items-center gap-3">
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                  <Star className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <div className="text-sm font-bold text-nura-main">4.9/5.0</div>
                  <div className="text-xs text-nura-muted">Avaliação média</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== DIFERENCIAIS ==================== */}
      <section id="diferenciais" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-nura-main mb-4">
              Por que escolher o <span className="text-nura-petrol">Nura</span>?
            </h2>
            <p className="text-lg text-nura-muted max-w-2xl mx-auto">
              Tecnologia de ponta combinada com acompanhamento humano para resultados reais
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Brain,
                title: 'IA Personalizada',
                description: 'Algoritmos inteligentes que adaptam seu plano nutricional baseado nos seus resultados e preferências.'
              },
              {
                icon: Users,
                title: 'Acompanhamento Médico',
                description: 'Consultas online com médicos especializados para ajustes e orientação personalizada.'
              },
              {
                icon: TrendingUp,
                title: 'Evolução Visual',
                description: 'Acompanhe seu progresso com gráficos detalhados e análises de composição corporal.'
              },
              {
                icon: Shield,
                title: 'Segurança Total',
                description: 'Seus dados protegidos com criptografia e compliance com LGPD e regulamentações médicas.'
              },
              {
                icon: Calendar,
                title: 'Agenda Inteligente',
                description: 'Agendamento flexível de consultas com lembretes automáticos e cancelamento fácil.'
              },
              {
                icon: Target,
                title: 'Metas Alcançáveis',
                description: 'Objetivos realistas definidos por profissionais, com monitoramento contínuo.'
              }
            ].map((feature, index) => (
              <div key={index} className="group p-6 bg-white border border-gray-100 rounded-2xl hover:shadow-xl hover:border-nura-petrol/20 transition-all duration-300">
                <div className="w-14 h-14 bg-nura-petrol-light rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-7 h-7 text-nura-petrol" />
                </div>
                <h3 className="text-xl font-bold text-nura-main mb-2">{feature.title}</h3>
                <p className="text-nura-muted">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== COMO FUNCIONA ==================== */}
      <section id="como-funciona" className="py-20 bg-nura-petrol-light/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-nura-main mb-4">
              Como funciona o <span className="text-nura-petrol">Nura</span>
            </h2>
            <p className="text-lg text-nura-muted max-w-2xl mx-auto">
              Três passos simples para transformar sua saúde
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connecting Line (Desktop) */}
            <div className="hidden md:block absolute top-24 left-1/4 right-1/4 h-0.5 bg-nura-petrol/20" />

            {[
              {
                step: '01',
                icon: Stethoscope,
                title: 'Cadastre-se',
                description: 'Crie sua conta gratuitamente e complete seu perfil com suas informações de saúde e objetivos.'
              },
              {
                step: '02',
                icon: BarChart3,
                title: 'Receba seu Plano',
                description: 'Nossa IA cria um plano nutricional personalizado, revisado por médicos especialistas.'
              },
              {
                step: '03',
                icon: TrendingUp,
                title: 'Acompanhe sua Evolução',
                description: 'Registre suas refeições, consulte seu médico e veja seus resultados em tempo real.'
              }
            ].map((step, index) => (
              <div key={index} className="relative text-center">
                <div className="relative z-10 w-20 h-20 bg-nura-petrol rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-nura-petrol/30">
                  <step.icon className="w-10 h-10 text-white" />
                  <span className="absolute -top-2 -right-2 w-8 h-8 bg-nura-brown text-white rounded-full flex items-center justify-center text-sm font-bold">
                    {step.step}
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-nura-main mb-3">{step.title}</h3>
                <p className="text-nura-muted max-w-xs mx-auto">{step.description}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link
              to="/entrar?signup=true"
              className="inline-flex items-center gap-2 bg-nura-petrol text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-nura-petrol/90 transition shadow-xl shadow-nura-petrol/25"
            >
              Começar Gratuitamente
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ==================== PARA MÉDICOS ==================== */}
      <section id="medicos" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left - Image/Illustration */}
            <div className="relative">
              <div className="bg-gradient-to-br from-nura-petrol to-nura-petrol/80 rounded-3xl p-8 shadow-2xl">
                <div className="bg-white rounded-2xl p-6 space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-semibold text-nura-main">Painel do Médico</span>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Online</span>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <span className="text-sm text-nura-muted">Pacientes Ativos</span>
                      <span className="text-lg font-bold text-nura-main">127</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <span className="text-sm text-nura-muted">Consultas Hoje</span>
                      <span className="text-lg font-bold text-nura-main">8</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-nura-petrol-light rounded-xl">
                      <span className="text-sm text-nura-petrol">Próxima Consulta</span>
                      <span className="text-lg font-bold text-nura-petrol">14:00</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl">
                      <Video className="w-5 h-5 text-green-600" />
                      <span className="text-sm font-medium text-green-700">Consulta em andamento</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right - Content */}
            <div>
              <div className="inline-flex items-center gap-2 bg-nura-petrol/10 text-nura-petrol px-4 py-2 rounded-full text-sm font-semibold mb-6">
                <Stethoscope className="w-4 h-4" />
                Para Profissionais de Saúde
              </div>

              <h2 className="text-3xl sm:text-4xl font-bold text-nura-main mb-6">
                Amplie seu alcance com o <span className="text-nura-petrol">Nura</span>
              </h2>

              <p className="text-lg text-nura-muted mb-8">
                Junte-se à nossa rede de médicos especializados e ofereça acompanhamento
                nutricional de qualidade para centenas de pacientes.
              </p>

              <div className="space-y-4 mb-8">
                {[
                  'Painel completo de acompanhamento de pacientes',
                  'Agenda flexível com gerenciamento de horários',
                  'Telemedicina integrada com vídeo e prontuário',
                  'Relatórios detalhados de evolução',
                  'Pagamentos automáticos e transparentes'
                ].map((benefit, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-nura-petrol flex-shrink-0" />
                    <span className="text-nura-main">{benefit}</span>
                  </div>
                ))}
              </div>

              <Link
                to="/medico/cadastro"
                className="inline-flex items-center gap-2 bg-nura-petrol text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-nura-petrol/90 transition shadow-xl shadow-nura-petrol/25"
              >
                Cadastrar como Médico
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== DEPOIMENTOS ==================== */}
      <section id="depoimentos" className="py-20 bg-nura-petrol-light/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-nura-main mb-4">
              O que dizem nossos <span className="text-nura-petrol">usuários</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: 'Maria Silva',
                role: 'Perdeu 15kg em 6 meses',
                text: 'O Nura mudou minha relação com a comida. O acompanhamento médico fez toda a diferença nos meus resultados.',
                rating: 5
              },
              {
                name: 'Dr. João Santos',
                role: 'Endocrinologista',
                text: 'Como médico, o painel do Nura me permite acompanhar meus pacientes de forma muito mais eficiente e personalizada.',
                rating: 5
              },
              {
                name: 'Carlos Oliveira',
                role: 'Ganhou massa muscular',
                text: 'A IA do Nura adaptou meu plano conforme minha evolução. Em 3 meses vi resultados que nunca tinha conseguido.',
                rating: 5
              }
            ].map((testimonial, index) => (
              <div key={index} className="bg-white rounded-2xl p-6 shadow-lg">
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-500 fill-current" />
                  ))}
                </div>
                <p className="text-nura-muted mb-6 italic">"{testimonial.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-nura-petrol-light rounded-full flex items-center justify-center">
                    <span className="text-nura-petrol font-bold">{testimonial.name.charAt(0)}</span>
                  </div>
                  <div>
                    <div className="font-semibold text-nura-main">{testimonial.name}</div>
                    <div className="text-sm text-nura-muted">{testimonial.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== CTA FINAL ==================== */}
      <section className="py-20 bg-nura-petrol">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            Pronto para transformar sua saúde?
          </h2>
          <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">
            Junte-se a milhares de pessoas que já alcançaram seus objetivos nutricionais com o Nura.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/entrar?signup=true"
              className="inline-flex items-center justify-center gap-2 bg-white text-nura-petrol px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gray-100 transition shadow-xl"
            >
              Criar Conta Gratuita
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              to="/entrar"
              className="inline-flex items-center justify-center gap-2 border-2 border-white text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white/10 transition"
            >
              Já tenho conta
            </Link>
          </div>
        </div>
      </section>

      {/* ==================== FOOTER ==================== */}
      <footer className="bg-nura-main text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-2">
              <div className="bg-nura-petrol rounded-lg px-4 py-2 inline-block mb-4">
                <span className="text-white font-serif text-xl font-light tracking-[6px]">NURA</span>
              </div>
              <p className="text-gray-400 max-w-sm">
                Nutrição inteligente com acompanhamento médico personalizado.
                Transforme sua relação com a alimentação.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Links Rápidos</h4>
              <ul className="space-y-2 text-gray-400">
                <li><button onClick={() => scrollToSection('diferenciais')} className="hover:text-white transition">Diferenciais</button></li>
                <li><button onClick={() => scrollToSection('como-funciona')} className="hover:text-white transition">Como Funciona</button></li>
                <li><button onClick={() => scrollToSection('medicos')} className="hover:text-white transition">Para Médicos</button></li>
                <li><button onClick={() => scrollToSection('depoimentos')} className="hover:text-white transition">Depoimentos</button></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Área do Médico</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link to="/medico" className="hover:text-white transition">Login</Link></li>
                <li><Link to="/medico/cadastro" className="hover:text-white transition">Cadastrar-se</Link></li>
                <li><Link to="/admin" className="hover:text-white transition">Painel Admin</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 text-center text-gray-400 text-sm">
            <p>&copy; 2026 Nura - Feed the Flow. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export { LandingPage };
