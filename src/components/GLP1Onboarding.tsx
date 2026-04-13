import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { glp1Service } from '../services/glp1Service';
import { AppView } from '../types';

interface GLP1OnboardingProps {
  onComplete: () => void;
  onClose: () => void;
  onNavigate: (view: AppView) => void;
}

type GLP1Screen =
  | 'initial'
  | 'already_uses' // 2A
  | 'treatment_phase' // 3A
  | 'symptoms' // 4
  | 'main_concern' // 5
  | 'result' // activated
  | 'educative'
  | 'bridge' // 2B
  | 'eligibility'
  | 'consulta_cta';

const MASCOT = 'https://lh3.googleusercontent.com/aida-public/AB6AXuA-xQHSmu8x8yOTWxOzGrssEMcbvwBsOU_HpWpnTSoH9vWro66G-X9zTulu_4lv_VpgKUlGbnGhn0KQGAB4_g6DsgRCu79kp1p8flyThCOSXgMpWp8m8BgHZBU4uvAHANhijMX7k33ailofN6ARlpwv26to8KY0OGKwT9xb5_64ZKS70fmz00OQ5iontQwSIMeYkmRFNT0UZKQVdKq2TSGuukgbzNthbfQsoS-iGld7nR2yuSe9G2pKTlRV6jJCC7Bv6d7O-hIRbbA';

const slideVariants = {
  enter: { x: 80, opacity: 0 },
  center: { x: 0, opacity: 1 },
  exit: { x: -80, opacity: 0 },
};

export const GLP1Onboarding: React.FC<GLP1OnboardingProps> = ({ onComplete, onClose, onNavigate }) => {
  const { user, profile, updateProfile } = useAuth();
  const [screen, setScreen] = useState<GLP1Screen>('initial');
  const [medication, setMedication] = useState('');
  const [phase, setPhase] = useState<'start' | 'adjust' | 'maintain'>('start');
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [mainConcern, setMainConcern] = useState('');
  const [saving, setSaving] = useState(false);

  const handleActivate = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const now = new Date().toISOString().split('T')[0];
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + 90);

      await supabase.from('profiles').update({
        glp1_mode: true,
        glp1_medication: medication || null,
        glp1_phase: phase,
        glp1_symptoms: symptoms,
        glp1_main_concern: mainConcern || null,
        glp1_start_date: now,
        glp1_prescription_expiry: expiry.toISOString().split('T')[0],
      }).eq('id', user.id);

      await updateProfile({
        glp1_mode: true,
        glp1_medication: medication || null,
        glp1_phase: phase,
        glp1_symptoms: symptoms,
        glp1_main_concern: mainConcern || null,
        glp1_start_date: now,
        glp1_prescription_expiry: expiry.toISOString().split('T')[0],
      });

      // Reformulate nutrition goals for GLP-1 phase
      if (profile) {
        glp1Service.reformulateGoals(user.id, {
          ...profile,
          glp1_phase: phase as any,
        }).catch(err => console.warn('reformulateGoals failed:', err));
      }

      onComplete();
    } catch (err) {
      console.error('Error activating GLP-1:', err);
    } finally {
      setSaving(false);
    }
  };

  const toggleSymptom = (s: string) => {
    if (s === 'none') {
      setSymptoms([]);
      return;
    }
    setSymptoms(prev =>
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev.filter(x => x !== 'none'), s]
    );
  };

  const renderScreen = () => {
    switch (screen) {
      case 'initial':
        return (
          <ScreenWrapper key="initial">
            {/* Mascot bubble */}
            <div className="flex items-start gap-3 mb-8">
              <div className="w-10 h-10 rounded-full bg-white shadow-sm overflow-hidden flex-shrink-0">
                <img src={MASCOT} alt="" className="w-full h-full object-cover" />
              </div>
              <div className="bg-white rounded-2xl rounded-tl-md px-4 py-3 shadow-sm border border-gray-100 flex-1">
                <p className="text-sm text-gray-700 leading-relaxed">
                  Você já ouviu falar nos medicamentos <strong>GLP-1</strong> para emagrecer?
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <OptionCard
                emoji="💊"
                label="Sim, já uso"
                onClick={() => setScreen('already_uses')}
              />
              <OptionCard
                emoji="🤔"
                label="Sim, tenho interesse"
                onClick={() => setScreen('bridge')}
              />
              <OptionCard
                emoji="🙋"
                label="Não conheço"
                onClick={() => setScreen('educative')}
              />
            </div>
          </ScreenWrapper>
        );

      case 'already_uses':
        return (
          <ScreenWrapper key="already_uses">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Qual medicamento você está usando?</h2>
            <p className="text-sm text-gray-500 mb-6">Selecione seu medicamento atual</p>
            <div className="space-y-3">
              {['Ozempic', 'Wegovy', 'Mounjaro', 'Saxenda', 'Outro'].map(med => (
                <button
                  key={med}
                  onClick={() => { setMedication(med); setScreen('treatment_phase'); }}
                  className={`w-full text-left px-5 py-4 rounded-2xl border-2 transition-all ${
                    medication === med
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <span className="text-sm font-semibold text-gray-800">{med}</span>
                </button>
              ))}
            </div>
          </ScreenWrapper>
        );

      case 'treatment_phase':
        return (
          <ScreenWrapper key="treatment_phase">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Em que fase do tratamento você está?</h2>
            <p className="text-sm text-gray-500 mb-6">Isso nos ajuda a personalizar suas metas</p>
            <div className="space-y-3">
              {[
                { id: 'start' as const, emoji: '🌱', label: 'Início', desc: 'Menos de 1 mês, dose baixa' },
                { id: 'adjust' as const, emoji: '⚖️', label: 'Ajuste', desc: '1 a 3 meses, adaptando a dose' },
                { id: 'maintain' as const, emoji: '🚀', label: 'Manutenção', desc: 'Mais de 3 meses, dose estável' },
              ].map(p => (
                <button
                  key={p.id}
                  onClick={() => { setPhase(p.id); setScreen('symptoms'); }}
                  className={`w-full text-left px-5 py-4 rounded-2xl border-2 transition-all ${
                    phase === p.id
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{p.emoji}</span>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{p.label}</p>
                      <p className="text-xs text-gray-500">{p.desc}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </ScreenWrapper>
        );

      case 'symptoms':
        return (
          <ScreenWrapper key="symptoms">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Você tem sentido algum desses efeitos?</h2>
            <p className="text-sm text-gray-500 mb-6">Selecione todos que se aplicam</p>
            <div className="flex flex-wrap gap-2 mb-8">
              {[
                { id: 'nausea', emoji: '🤢', label: 'Náusea' },
                { id: 'satiety', emoji: '🍽️', label: 'Saciedade rápida' },
                { id: 'constipation', emoji: '💣', label: 'Constipação' },
                { id: 'fatigue', emoji: '😴', label: 'Fadiga' },
                { id: 'reflux', emoji: '🔥', label: 'Refluxo' },
                { id: 'none', emoji: '✅', label: 'Nenhum' },
              ].map(s => (
                <button
                  key={s.id}
                  onClick={() => toggleSymptom(s.id)}
                  className={`px-4 py-2.5 rounded-full border-2 text-sm font-medium transition-all ${
                    (s.id === 'none' && symptoms.length === 0) || symptoms.includes(s.id)
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {s.emoji} {s.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setScreen('main_concern')}
              className="w-full py-3.5 rounded-full bg-gray-900 text-white text-sm font-bold hover:bg-gray-800 transition-colors"
            >
              Próximo
            </button>
          </ScreenWrapper>
        );

      case 'main_concern':
        return (
          <ScreenWrapper key="main_concern">
            <h2 className="text-xl font-bold text-gray-900 mb-2">O que mais te preocupa no tratamento?</h2>
            <p className="text-sm text-gray-500 mb-6">Vamos focar no que é mais importante para você</p>
            <div className="space-y-3">
              {[
                { id: 'muscle_loss', emoji: '💪', label: 'Perder massa muscular' },
                { id: 'long_term', emoji: '📈', label: 'Manter o resultado a longo prazo' },
                { id: 'what_to_eat', emoji: '🥗', label: 'Saber o que comer' },
                { id: 'side_effects', emoji: '😷', label: 'Lidar com os efeitos colaterais' },
              ].map(c => (
                <button
                  key={c.id}
                  onClick={() => { setMainConcern(c.id); setScreen('result'); }}
                  className={`w-full text-left px-5 py-4 rounded-2xl border-2 transition-all ${
                    mainConcern === c.id
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{c.emoji}</span>
                    <span className="text-sm font-semibold text-gray-800">{c.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </ScreenWrapper>
        );

      case 'result':
        return (
          <ScreenWrapper key="result" bg="bg-[#EBF9F1]">
            <div className="flex flex-col items-center text-center pt-8">
              <span className="text-6xl mb-4">🎯</span>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Modo GLP-1 ativado!</h2>
              <p className="text-sm text-gray-600 mb-8">Seu plano foi ajustado para apoiar o seu tratamento.</p>

              <div className="w-full space-y-3 mb-8">
                <InfoCard emoji="🥩" title="Meta proteína elevada" desc="Mínimo 1,2g por kg de peso corporal" />
                <InfoCard emoji="📊" title="Dashboard de sintomas" desc="Registre seus efeitos semanalmente" />
                <InfoCard emoji="📋" title="Lembrete de renovação" desc="Receita válida 90 dias — avisamos antes" />
              </div>

              <button
                onClick={handleActivate}
                disabled={saving}
                className="w-full py-3.5 rounded-full bg-gray-900 text-white text-sm font-bold hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                {saving ? 'Ativando...' : 'Começar com o Nura'}
              </button>
            </div>
          </ScreenWrapper>
        );

      case 'educative':
        return (
          <ScreenWrapper key="educative">
            <div className="flex items-start gap-3 mb-8">
              <div className="w-10 h-10 rounded-full bg-white shadow-sm overflow-hidden flex-shrink-0">
                <img src={MASCOT} alt="" className="w-full h-full object-cover" />
              </div>
              <div className="bg-white rounded-2xl rounded-tl-md px-4 py-3 shadow-sm border border-gray-100 flex-1">
                <p className="text-sm text-gray-700 leading-relaxed">
                  Os medicamentos <strong>GLP-1</strong> imitam um hormônio que reduz o apetite e melhora o metabolismo.
                </p>
              </div>
            </div>

            <div className="space-y-3 mb-8">
              <InfoCard emoji="⚡" title="Como funciona" desc="Reduz o apetite e atrasa o esvaziamento gástrico" />
              <InfoCard emoji="📉" title="Resultados típicos" desc="10–15% de redução de peso em 6–12 meses" />
              <InfoCard emoji="👨‍⚕️" title="Requer prescrição" desc="Apenas com avaliação médica e acompanhamento" />
            </div>

            <button
              onClick={() => setScreen('bridge')}
              className="w-full py-3.5 rounded-full bg-gray-900 text-white text-sm font-bold hover:bg-gray-800 transition-colors"
            >
              Quero saber mais
            </button>
          </ScreenWrapper>
        );

      case 'bridge':
        return (
          <ScreenWrapper key="bridge">
            <div className="flex items-start gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-white shadow-sm overflow-hidden flex-shrink-0">
                <img src={MASCOT} alt="" className="w-full h-full object-cover" />
              </div>
              <div className="bg-white rounded-2xl rounded-tl-md px-4 py-3 shadow-sm border border-gray-100 flex-1">
                <p className="text-sm text-gray-700 leading-relaxed">
                  O Nura pode te conectar com um <strong>médico especialista</strong> para avaliar o seu caso.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-6">
              <h3 className="font-bold text-gray-900 text-sm mb-1">Consulta com médico parceiro</h3>
              <p className="text-xs text-gray-500 mb-4">
                Seu histórico nutricional é compartilhado automaticamente com o médico.
              </p>
              <div className="space-y-2.5">
                <FeatureRow icon="🎥" text="Videochamada dentro do app" />
                <FeatureRow icon="📋" text="Receita digital no final" />
                <FeatureRow icon="🔄" text="Renovação a cada 90 dias" />
              </div>
            </div>

            <button
              onClick={() => setScreen('eligibility')}
              className="w-full py-3.5 rounded-full bg-gray-900 text-white text-sm font-bold hover:bg-gray-800 transition-colors"
            >
              Continuar
            </button>
          </ScreenWrapper>
        );

      case 'eligibility':
        return (
          <ScreenWrapper key="eligibility">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Você já conversou com um médico sobre o GLP-1?</h2>
            <p className="text-sm text-gray-500 mb-6">Isso nos ajuda a te guiar pelo melhor caminho</p>
            <div className="space-y-3">
              <OptionCard
                emoji="📋"
                label="Sim, tenho receita"
                onClick={() => setScreen('already_uses')}
              />
              <OptionCard
                emoji="🔍"
                label="Não, quero avaliar se sou candidato"
                onClick={() => setScreen('consulta_cta')}
              />
            </div>
          </ScreenWrapper>
        );

      case 'consulta_cta':
        return (
          <ScreenWrapper key="consulta_cta">
            <div className="flex items-start gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-white shadow-sm overflow-hidden flex-shrink-0">
                <img src={MASCOT} alt="" className="w-full h-full object-cover" />
              </div>
              <div className="bg-white rounded-2xl rounded-tl-md px-4 py-3 shadow-sm border border-gray-100 flex-1">
                <p className="text-sm text-gray-700 leading-relaxed">
                  Agende uma consulta e descubra se o <strong>GLP-1</strong> é a opção certa para você.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-4">
              <h3 className="font-bold text-gray-900 text-sm mb-3">O que está incluído:</h3>
              <div className="space-y-2.5">
                <FeatureRow icon="🧾" text="Histórico Nura compartilhado com o médico" />
                <FeatureRow icon="🎥" text="Videochamada 30 min com especialista" />
                <FeatureRow icon="📋" text="Receita digital se indicado" />
                <FeatureRow icon="🛡" text="Suporte nutricional no Nura após consulta" />
              </div>
            </div>

            <div className="bg-gray-50 rounded-2xl p-4 mb-6 text-center">
              <span className="text-xs text-gray-500">Consulta</span>
              <p className="text-2xl font-bold text-gray-900">R$ 249</p>
            </div>

            <button
              onClick={() => onNavigate(AppView.GLP1_CONSULTA)}
              className="w-full py-3.5 rounded-full bg-gray-900 text-white text-sm font-bold hover:bg-gray-800 transition-colors mb-3"
            >
              Agendar consulta
            </button>
            <button
              onClick={onClose}
              className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Agora não
            </button>
          </ScreenWrapper>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#EEEFF4] flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 pt-12 pb-3">
        <button
          onClick={() => {
            if (screen === 'initial') { onClose(); return; }
            const backMap: Partial<Record<GLP1Screen, GLP1Screen>> = {
              already_uses: 'initial',
              treatment_phase: 'already_uses',
              symptoms: 'treatment_phase',
              main_concern: 'symptoms',
              result: 'main_concern',
              educative: 'initial',
              bridge: 'initial',
              eligibility: 'bridge',
              consulta_cta: 'eligibility',
            };
            setScreen(backMap[screen] || 'initial');
          }}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors"
        >
          <span className="material-symbols-outlined text-gray-700">arrow_back</span>
        </button>
        <span className="text-sm font-bold text-gray-700">Programa GLP-1</span>
        <button
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors"
        >
          <span className="material-symbols-outlined text-gray-700">close</span>
        </button>
      </header>

      {/* Progress */}
      <div className="px-4 mb-4">
        <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-green-500 rounded-full"
            animate={{ width: `${getProgress(screen)}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-8">
        <AnimatePresence mode="wait">
          {renderScreen()}
        </AnimatePresence>
      </div>
    </div>
  );
};

// Progress helper
function getProgress(screen: GLP1Screen): number {
  const map: Record<GLP1Screen, number> = {
    initial: 10,
    educative: 15,
    bridge: 20,
    eligibility: 30,
    consulta_cta: 35,
    already_uses: 30,
    treatment_phase: 50,
    symptoms: 70,
    main_concern: 85,
    result: 100,
  };
  return map[screen] || 0;
}

// Sub-components
const ScreenWrapper: React.FC<{ children: React.ReactNode; bg?: string }> = ({ children, bg }) => (
  <motion.div
    variants={slideVariants}
    initial="enter"
    animate="center"
    exit="exit"
    transition={{ duration: 0.3, ease: 'easeInOut' }}
    className={`${bg || ''}`}
  >
    {children}
  </motion.div>
);

const OptionCard: React.FC<{ emoji: string; label: string; onClick: () => void }> = ({ emoji, label, onClick }) => (
  <button
    onClick={onClick}
    className="w-full text-left px-5 py-4 rounded-2xl bg-white border-2 border-gray-200 hover:border-green-400 hover:bg-green-50/50 transition-all flex items-center gap-3 shadow-sm"
  >
    <span className="text-2xl">{emoji}</span>
    <span className="text-sm font-semibold text-gray-800">{label}</span>
    <span className="material-symbols-outlined text-gray-400 ml-auto text-lg">chevron_right</span>
  </button>
);

const InfoCard: React.FC<{ emoji: string; title: string; desc: string }> = ({ emoji, title, desc }) => (
  <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-start gap-3">
    <span className="text-xl flex-shrink-0">{emoji}</span>
    <div>
      <p className="text-sm font-bold text-gray-800">{title}</p>
      <p className="text-xs text-gray-500">{desc}</p>
    </div>
  </div>
);

const FeatureRow: React.FC<{ icon: string; text: string }> = ({ icon, text }) => (
  <div className="flex items-center gap-2.5">
    <span className="text-base">{icon}</span>
    <span className="text-xs text-gray-700">{text}</span>
  </div>
);

export default GLP1Onboarding;
