import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../i18n';
import {
  analyzeBodyImage,
  BodyAnalysisService,
  BodyAnalysisResult
} from '../services/bodyAnalysisService';
import { BodyScanResult } from './BodyScanResult';

interface BodyScannerProps {
  onClose: () => void;
  onScanComplete?: () => void;
}

type PoseType = 'front' | 'side' | 'back';
type ScanStep = 'tutorial' | 'capture' | 'analyzing' | 'result';

interface CapturedScan {
  poseType: PoseType;
  imageData: string;
  result?: BodyAnalysisResult;
  scanId?: string;
}

// Helper for image resizing
const resizeImage = (base64Str: string, maxDim = 1200): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(base64Str);

      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxDim) {
          height *= maxDim / width;
          width = maxDim;
        }
      } else {
        if (height > maxDim) {
          width *= maxDim / height;
          height = maxDim;
        }
      }

      canvas.width = width;
      canvas.height = height;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => resolve(base64Str);
  });
};

export const BodyScanner: React.FC<BodyScannerProps> = ({ onClose, onScanComplete }) => {
  const { user } = useAuth();
  const { t } = useLanguage();

  const [step, setStep] = useState<ScanStep>('tutorial');
  const [currentPose, setCurrentPose] = useState<PoseType>('front');
  const [scans, setScans] = useState<CapturedScan[]>([]);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showPoseGuide, setShowPoseGuide] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Translations (temporary - will be added to i18n)
  const texts = {
    tutorial: {
      title: 'Como fazer seu Body Scan',
      steps: [
        { icon: 'checkroom', text: 'Vista roupa justa ou traje de banho' },
        { icon: 'lightbulb', text: 'Escolha local bem iluminado' },
        { icon: 'straighten', text: 'Fique a 2-3 metros do celular' },
        { icon: 'accessibility', text: 'Mantenha corpo inteiro visível' }
      ],
      poses: [
        { type: 'front' as PoseType, icon: 'person', label: 'Frontal', desc: 'Braços abertos 45°' },
        { type: 'side' as PoseType, icon: 'emoji_people', label: 'Lateral', desc: 'Perfil direito' },
        { type: 'back' as PoseType, icon: 'person', label: 'Costas', desc: 'De costas para câmera' }
      ],
      disclaimer: '⚠️ Estimativa por IA. Não substitui avaliação profissional.',
      startButton: 'Iniciar Scan'
    },
    capture: {
      front: {
        title: 'Pose Frontal',
        instruction: 'Fique de frente, braços abertos em 45°',
        tips: ['Pés na largura dos ombros', 'Olhe para a câmera', 'Relaxe os ombros']
      },
      side: {
        title: 'Pose Lateral',
        instruction: 'Vire 90° para o lado direito',
        tips: ['Braços relaxados ao lado do corpo', 'Perfil completo visível', 'Postura ereta']
      },
      back: {
        title: 'Pose de Costas',
        instruction: 'Vire de costas, braços abertos em 45°',
        tips: ['Mesma posição dos braços', 'Pés na largura dos ombros', 'Olhe para frente']
      },
      uploadButton: 'Tirar Foto',
      guideToggle: 'Guia de Pose',
      analyzing: 'Analisando imagem...'
    },
    result: {
      excellent: 'Excelente!',
      good: 'Muito bom!',
      needsImprovement: 'Pode melhorar',
      nextPose: 'Próxima Pose',
      retake: 'Refazer Foto',
      viewResults: 'Ver Resultados Completos',
      saveProgress: 'Salvar Progresso'
    }
  };

  // Initialize session on mount
  useEffect(() => {
    if (user) {
      BodyAnalysisService.getOrCreateSession(user.id)
        .then(session => {
          setSessionId(session.id);
          console.log('📋 Session ready:', session.id);
        })
        .catch(err => console.error('Session creation failed:', err));
    }
  }, [user]);

  const handleStartTutorial = () => {
    setStep('capture');
    setCurrentPose('front');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setLoading(true);
    setStep('analyzing');

    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        let base64 = reader.result as string;
        base64 = await resizeImage(base64, 1200);

        // Get user profile data
        const { data: profile } = await BodyAnalysisService.getUserScans(user.id);
        const heightCm = 170; // TODO: Get from profile
        const weightKg = 70; // TODO: Get from profile
        const age = 30; // TODO: Get from profile
        const gender = 'male' as 'male' | 'female'; // TODO: Get from profile

        console.log(`🔍 Analyzing ${currentPose} pose...`);

        // Analyze with Gemini
        const result = await analyzeBodyImage(
          base64,
          heightCm,
          weightKg,
          age,
          gender,
          currentPose,
          'pt'
        );

        // Upload photo
        const photoUrl = await BodyAnalysisService.uploadBodyPhoto(
          user.id,
          base64,
          currentPose
        );

        // Save to database
        const savedScan = await BodyAnalysisService.saveBodyScan(
          user.id,
          photoUrl,
          currentPose,
          result,
          heightCm,
          weightKg,
          age,
          gender
        );

        // Update session
        if (sessionId) {
          await BodyAnalysisService.updateSession(sessionId, currentPose, savedScan.id);
        }

        // Store scan
        const capturedScan: CapturedScan = {
          poseType: currentPose,
          imageData: base64,
          result,
          scanId: savedScan.id
        };

        setScans(prev => [...prev, capturedScan]);
        setStep('result');

        console.log('✅ Scan complete:', {
          pose: currentPose,
          bodyFat: result.bodyFatPercentage + '%',
          score: result.aiScore
        });

      } catch (error) {
        console.error('❌ Scan failed:', error);
        alert('Falha na análise. Tente novamente.');
        setStep('capture');
      } finally {
        setLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.readAsDataURL(file);
  };

  const handleNextPose = () => {
    const poseOrder: PoseType[] = ['front', 'side', 'back'];
    const currentIndex = poseOrder.indexOf(currentPose);

    if (currentIndex < poseOrder.length - 1) {
      setCurrentPose(poseOrder[currentIndex + 1]);
      setStep('capture');
    } else {
      // All poses complete
      handleFinishSession();
    }
  };

  const handleRetake = () => {
    // Remove last scan
    setScans(prev => prev.slice(0, -1));
    setStep('capture');
  };

  const handleFinishSession = async () => {
    if (!sessionId) return;

    try {
      await BodyAnalysisService.completeSession(sessionId);
      console.log('🎯 Session completed!');
      onScanComplete?.();
      onClose();
    } catch (error) {
      console.error('❌ Session completion failed:', error);
    }
  };

  const currentResult = scans.find(s => s.poseType === currentPose)?.result;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-surface-dark border-b border-white/10">
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back</span>
          <span className="text-sm font-medium">Voltar</span>
        </button>
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">photo_camera</span>
          <h1 className="text-white font-bold">Body Scan</h1>
        </div>
        <div className="w-16"></div> {/* Spacer */}
      </div>

      {/* Progress Indicator */}
      <div className="flex items-center justify-center gap-2 px-6 py-3 bg-surface-dark/50">
        {['front', 'side', 'back'].map((pose, idx) => {
          const isCompleted = scans.some(s => s.poseType === pose);
          const isCurrent = currentPose === pose && step !== 'tutorial';

          return (
            <React.Fragment key={pose}>
              <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all ${
                isCompleted
                  ? 'bg-primary border-primary text-white'
                  : isCurrent
                  ? 'border-primary text-primary bg-primary/10'
                  : 'border-white/20 text-white/40'
              }`}>
                {isCompleted ? (
                  <span className="material-symbols-outlined text-sm">check</span>
                ) : (
                  <span className="text-xs font-bold">{idx + 1}</span>
                )}
              </div>
              {idx < 2 && (
                <div className={`h-0.5 w-8 ${isCompleted ? 'bg-primary' : 'bg-white/20'}`}></div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {/* Tutorial Step */}
          {step === 'tutorial' && (
            <motion.div
              key="tutorial"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="p-6 max-w-md mx-auto"
            >
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-primary text-4xl">photo_camera</span>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">{texts.tutorial.title}</h2>
                <p className="text-white/60 text-sm">Siga as instruções para melhores resultados</p>
              </div>

              {/* Preparation Steps */}
              <div className="bg-surface-dark rounded-xl p-4 mb-6 space-y-3">
                {texts.tutorial.steps.map((step, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-primary">{step.icon}</span>
                    </div>
                    <p className="text-white/80 text-sm">{step.text}</p>
                  </div>
                ))}
              </div>

              {/* Pose Types */}
              <div className="mb-6">
                <h3 className="text-white font-semibold mb-3 text-sm">Você vai tirar 3 fotos:</h3>
                <div className="grid grid-cols-3 gap-3">
                  {texts.tutorial.poses.map((pose, idx) => (
                    <div key={idx} className="bg-surface-dark rounded-xl p-3 text-center">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                        <span className="material-symbols-outlined text-primary">{pose.icon}</span>
                      </div>
                      <p className="text-white text-xs font-medium mb-1">{pose.label}</p>
                      <p className="text-white/50 text-[10px]">{pose.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Disclaimer */}
              <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-3 mb-6">
                <p className="text-orange-200 text-xs text-center">{texts.tutorial.disclaimer}</p>
              </div>

              {/* Start Button */}
              <button
                onClick={handleStartTutorial}
                className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-4 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined">arrow_forward</span>
                {texts.tutorial.startButton}
              </button>
            </motion.div>
          )}

          {/* Capture Step */}
          {step === 'capture' && (
            <motion.div
              key="capture"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="p-6 max-w-md mx-auto"
            >
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-white mb-2">
                  {texts.capture[currentPose].title}
                </h2>
                <p className="text-white/60 text-sm">{texts.capture[currentPose].instruction}</p>
              </div>

              {/* Camera Preview Area with Pose Guide */}
              <div className="relative bg-surface-dark rounded-2xl overflow-hidden mb-6 aspect-[3/4]">
                {/* Pose Guide Overlay */}
                <AnimatePresence>
                  {showPoseGuide && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.3 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none"
                    >
                      <svg
                        viewBox="0 0 200 300"
                        className="w-full h-full"
                        fill="none"
                        stroke="white"
                        strokeWidth="2"
                      >
                        {currentPose === 'front' && (
                          <>
                            {/* Simple stick figure - front pose */}
                            <circle cx="100" cy="40" r="15" /> {/* Head */}
                            <line x1="100" y1="55" x2="100" y2="150" /> {/* Torso */}
                            <line x1="100" y1="75" x2="60" y2="110" /> {/* Left arm */}
                            <line x1="100" y1="75" x2="140" y2="110" /> {/* Right arm */}
                            <line x1="100" y1="150" x2="75" y2="230" /> {/* Left leg */}
                            <line x1="100" y1="150" x2="125" y2="230" /> {/* Right leg */}
                          </>
                        )}
                        {currentPose === 'side' && (
                          <>
                            {/* Side profile */}
                            <circle cx="100" cy="40" r="15" />
                            <line x1="100" y1="55" x2="100" y2="150" />
                            <line x1="100" y1="75" x2="100" y2="120" />
                            <line x1="100" y1="150" x2="90" y2="230" />
                            <line x1="100" y1="150" x2="110" y2="230" />
                          </>
                        )}
                        {currentPose === 'back' && (
                          <>
                            {/* Back pose */}
                            <circle cx="100" cy="40" r="15" />
                            <line x1="100" y1="55" x2="100" y2="150" />
                            <line x1="100" y1="75" x2="60" y2="110" />
                            <line x1="100" y1="75" x2="140" y2="110" />
                            <line x1="100" y1="150" x2="75" y2="230" />
                            <line x1="100" y1="150" x2="125" y2="230" />
                          </>
                        )}
                      </svg>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Placeholder */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <span className="material-symbols-outlined text-white/20 text-6xl mb-2">photo_camera</span>
                    <p className="text-white/40 text-xs">Toque no botão para capturar</p>
                  </div>
                </div>
              </div>

              {/* Tips */}
              <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 mb-6">
                <h3 className="text-primary font-semibold text-sm mb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">tips_and_updates</span>
                  Dicas importantes:
                </h3>
                <ul className="space-y-1">
                  {texts.capture[currentPose].tips.map((tip, idx) => (
                    <li key={idx} className="text-white/70 text-xs flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Controls */}
              <div className="space-y-3">
                <button
                  onClick={() => setShowPoseGuide(!showPoseGuide)}
                  className="w-full bg-surface-dark hover:bg-white/5 text-white/80 py-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  <span className="material-symbols-outlined text-sm">
                    {showPoseGuide ? 'visibility_off' : 'visibility'}
                  </span>
                  {showPoseGuide ? 'Ocultar' : 'Mostrar'} {texts.capture.guideToggle}
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                  className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-4 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined">photo_camera</span>
                  {texts.capture.uploadButton}
                </button>
              </div>
            </motion.div>
          )}

          {/* Analyzing Step */}
          {step === 'analyzing' && (
            <motion.div
              key="analyzing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center h-full"
            >
              <div className="text-center">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                  <span className="material-symbols-outlined text-primary text-4xl">psychology</span>
                </div>
                <p className="text-white font-semibold mb-2">{texts.capture.analyzing}</p>
                <p className="text-white/50 text-sm">Aguarde alguns segundos...</p>
              </div>
            </motion.div>
          )}

          {/* Result Step */}
          {step === 'result' && currentResult && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="p-6 max-w-md mx-auto"
            >
              <BodyScanResult
                result={currentResult}
                poseType={currentPose}
                imageData={scans.find(s => s.poseType === currentPose)?.imageData || ''}
              />

              {/* Action Buttons */}
              <div className="mt-6 space-y-3">
                <button
                  onClick={handleRetake}
                  className="w-full bg-surface-dark hover:bg-white/5 text-white py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined">refresh</span>
                  {texts.result.retake}
                </button>

                <button
                  onClick={handleNextPose}
                  className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-4 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {currentPose === 'back' ? (
                    <>
                      <span className="material-symbols-outlined">done_all</span>
                      {texts.result.viewResults}
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined">arrow_forward</span>
                      {texts.result.nextPose}
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
