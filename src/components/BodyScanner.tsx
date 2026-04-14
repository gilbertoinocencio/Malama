import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import {
  analyzeBodyImage,
  BodyAnalysisService,
  BodyAnalysisResult
} from '../services/bodyAnalysisService';
import { MeasurementSnapshotService, WeightLogService } from '../services/weightLogService';
import { BodyScanResult } from './BodyScanResult';

interface BodyScannerProps {
  onClose: () => void;
  onScanComplete?: () => void;
}

type PoseType = 'front' | 'side' | 'back';
type ScanStep = 'tutorial' | 'capture' | 'analyzing' | 'result';
type CameraError = 'permission_denied' | 'not_found' | 'not_supported' | null;

interface CapturedScan {
  poseType: PoseType;
  imageData: string;
  result?: BodyAnalysisResult;
  scanId?: string;
}

// Helper for image resizing
const resizeImage = (base64Str: string, maxDim = 1024): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(base64Str);

      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxDim) { height *= maxDim / width; width = maxDim; }
      } else {
        if (height > maxDim) { width *= maxDim / height; height = maxDim; }
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

// Silhouette SVG paths for each pose
const PoseSilhouette: React.FC<{ pose: PoseType }> = ({ pose }) => (
  <svg
    viewBox="0 0 200 320"
    className="w-3/4 h-3/4"
    fill="none"
    stroke="white"
    strokeWidth="2.5"
    strokeLinecap="round"
  >
    {pose === 'front' && (
      <>
        <ellipse cx="100" cy="35" rx="16" ry="20" strokeWidth="2.5" />
        <line x1="100" y1="55" x2="100" y2="65" strokeWidth="2.5" />
        <line x1="70" y1="75" x2="130" y2="75" strokeWidth="2.5" />
        <line x1="100" y1="65" x2="100" y2="160" strokeWidth="2.5" />
        <line x1="70" y1="75" x2="45" y2="130" strokeWidth="2.5" />
        <line x1="45" y1="130" x2="40" y2="170" strokeWidth="2.5" />
        <line x1="130" y1="75" x2="155" y2="130" strokeWidth="2.5" />
        <line x1="155" y1="130" x2="160" y2="170" strokeWidth="2.5" />
        <line x1="80" y1="160" x2="120" y2="160" strokeWidth="2.5" />
        <line x1="85" y1="160" x2="75" y2="230" strokeWidth="2.5" />
        <line x1="75" y1="230" x2="70" y2="290" strokeWidth="2.5" />
        <line x1="115" y1="160" x2="125" y2="230" strokeWidth="2.5" />
        <line x1="125" y1="230" x2="130" y2="290" strokeWidth="2.5" />
        <path d="M 65 70 Q 100 65 135 70" strokeWidth="1.5" strokeDasharray="4,4" opacity="0.5" />
      </>
    )}
    {pose === 'side' && (
      <>
        <ellipse cx="100" cy="35" rx="14" ry="18" strokeWidth="2.5" />
        <path d="M 100 25 Q 108 30 108 35 Q 108 40 100 45" strokeWidth="2" />
        <line x1="100" y1="53" x2="100" y2="65" strokeWidth="2.5" />
        <path d="M 100 65 Q 105 90 100 160" strokeWidth="2.5" />
        <path d="M 100 65 Q 95 90 100 160" strokeWidth="2.5" />
        <line x1="100" y1="75" x2="100" y2="120" strokeWidth="2.5" />
        <line x1="100" y1="120" x2="100" y2="155" strokeWidth="2.5" />
        <line x1="90" y1="160" x2="110" y2="160" strokeWidth="2.5" />
        <line x1="95" y1="160" x2="90" y2="230" strokeWidth="2.5" />
        <line x1="90" y1="230" x2="88" y2="290" strokeWidth="2.5" />
        <line x1="105" y1="160" x2="110" y2="230" strokeWidth="2.5" />
        <line x1="110" y1="230" x2="112" y2="290" strokeWidth="2.5" />
      </>
    )}
    {pose === 'back' && (
      <>
        <ellipse cx="100" cy="35" rx="16" ry="20" strokeWidth="2.5" />
        <path d="M 88 30 Q 100 25 112 30" strokeWidth="1.5" opacity="0.5" />
        <line x1="100" y1="55" x2="100" y2="65" strokeWidth="2.5" />
        <line x1="70" y1="75" x2="130" y2="75" strokeWidth="2.5" />
        <line x1="100" y1="65" x2="100" y2="160" strokeWidth="2" strokeDasharray="4,4" opacity="0.6" />
        <line x1="70" y1="75" x2="45" y2="130" strokeWidth="2.5" />
        <line x1="45" y1="130" x2="40" y2="170" strokeWidth="2.5" />
        <line x1="130" y1="75" x2="155" y2="130" strokeWidth="2.5" />
        <line x1="155" y1="130" x2="160" y2="170" strokeWidth="2.5" />
        <line x1="80" y1="160" x2="120" y2="160" strokeWidth="2.5" />
        <line x1="85" y1="160" x2="75" y2="230" strokeWidth="2.5" />
        <line x1="75" y1="230" x2="70" y2="290" strokeWidth="2.5" />
        <line x1="115" y1="160" x2="125" y2="230" strokeWidth="2.5" />
        <line x1="125" y1="230" x2="130" y2="290" strokeWidth="2.5" />
      </>
    )}
  </svg>
);

export const BodyScanner: React.FC<BodyScannerProps> = ({ onClose, onScanComplete }) => {
  const { user, profile } = useAuth();

  const [step, setStep] = useState<ScanStep>('tutorial');
  const [currentPose, setCurrentPose] = useState<PoseType>('front');
  const [scans, setScans] = useState<CapturedScan[]>([]);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showPoseGuide, setShowPoseGuide] = useState(true);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Camera state
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<CameraError>(null);
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('environment');
  const [isMirrored, setIsMirrored] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      }
    },
    result: {
      nextPose: 'Próxima Pose',
      retake: 'Refazer Foto',
      viewResults: 'Ver Resultados Completos'
    }
  };

  // Stop all active camera tracks
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  // Start camera stream
  const startCamera = useCallback(async (facing: 'user' | 'environment' = cameraFacing) => {
    stopCamera();
    setCameraError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('not_supported');
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facing,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      setCameraFacing(facing);
      setIsMirrored(facing === 'user');
      setCameraActive(true);
    } catch (err: unknown) {
      console.error('Camera error:', err);
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setCameraError('permission_denied');
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setCameraError('not_found');
        } else {
          setCameraError('not_supported');
        }
      } else {
        setCameraError('not_supported');
      }
    }
  }, [cameraFacing, stopCamera]);

  // Flip camera
  const flipCamera = useCallback(() => {
    const newFacing = cameraFacing === 'environment' ? 'user' : 'environment';
    startCamera(newFacing);
  }, [cameraFacing, startCamera]);

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

  // Start camera when entering capture step
  useEffect(() => {
    if (step === 'capture') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => { stopCamera(); };
  }, [step]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { stopCamera(); };
  }, [stopCamera]);

  const profileComplete = profile?.height && profile?.weight;

  const handleStartTutorial = () => {
    setStep('capture');
    setCurrentPose('front');
    setImagePreview(null);
  };

  // Capture photo from live camera stream
  const handleCaptureFromCamera = async () => {
    if (!videoRef.current || !canvasRef.current || !user) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Mirror if front camera
    if (isMirrored) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0);

    const base64 = canvas.toDataURL('image/jpeg', 0.9);
    stopCamera();
    await processImage(base64);
  };

  // Process captured or uploaded image
  const processImage = async (rawBase64: string) => {
    if (!user) return;

    setImagePreview(rawBase64);
    setLoading(true);
    setStep('analyzing');

    try {
      const base64 = await resizeImage(rawBase64, 1024);

      const heightCm = profile?.height || 170;
      const weightKg = profile?.weight || 70;
      const age = profile?.age || 30;
      const gender = profile?.gender || 'male';

      if (!profile?.height || !profile?.weight) {
        console.warn('⚠️ Perfil incompleto. Usando valores padrão.');
      }

      console.log(`🔍 Analyzing ${currentPose} pose:`, { heightCm, weightKg, age, gender });

      const result = await analyzeBodyImage(base64, heightCm, weightKg, age, gender, currentPose, 'pt');

      if (result.aiScore < 40) {
        const continueAnyway = window.confirm(
          `A qualidade da imagem está baixa (score: ${result.aiScore}/100). Os resultados podem ser imprecisos. Deseja continuar?`
        );
        if (!continueAnyway) {
          setStep('capture');
          setLoading(false);
          startCamera();
          return;
        }
      }

      const photoUrl = await BodyAnalysisService.uploadBodyPhoto(user.id, base64, currentPose);
      const savedScan = await BodyAnalysisService.saveBodyScan(
        user.id, photoUrl, currentPose, result, heightCm, weightKg, age, gender
      );

      if (sessionId) {
        await BodyAnalysisService.updateSession(sessionId, currentPose, savedScan.id);
      }

      setScans(prev => [...prev, { poseType: currentPose, imageData: base64, result, scanId: savedScan.id }]);
      setStep('result');
      console.log('✅ Scan complete:', { pose: currentPose, bodyFat: result.bodyFatPercentage + '%', score: result.aiScore });

    } catch (error) {
      console.error('❌ Scan failed:', error);
      let errorMessage = 'Falha na análise. Tente novamente.';
      if (error instanceof Error) {
        if (error.message.includes('API Key')) {
          errorMessage = 'Erro de configuração da IA. Contate o suporte.';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = 'Erro de conexão. Verifique sua internet e tente novamente.';
        } else if (error.message.includes('incompleta')) {
          errorMessage = 'Erro na análise da IA. Tente com outra imagem.';
        } else {
          errorMessage = `Erro: ${error.message}`;
        }
      }
      alert(errorMessage);
      setStep('capture');
      startCamera();
    } finally {
      setLoading(false);
    }
  };

  // Fallback: file upload handler
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione uma imagem válida.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('Imagem muito grande. Máximo: 10MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      await processImage(base64);
    };
    reader.onerror = () => {
      alert('Erro ao ler imagem. Tente outra.');
      setStep('capture');
      startCamera();
    };
    reader.readAsDataURL(file);

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleNextPose = () => {
    const poseOrder: PoseType[] = ['front', 'side', 'back'];
    const currentIndex = poseOrder.indexOf(currentPose);
    setImagePreview(null);

    if (currentIndex < poseOrder.length - 1) {
      setCurrentPose(poseOrder[currentIndex + 1]);
      setStep('capture');
    } else {
      handleFinishSession();
    }
  };

  const handleRetake = () => {
    setScans(prev => prev.slice(0, -1));
    setImagePreview(null);
    setStep('capture');
  };

  const handleFinishSession = async () => {
    if (!sessionId || !user) return;
    try {
      await BodyAnalysisService.completeSession(sessionId);

      // Build consolidated measurement snapshot from all scans in this session
      const frontScan = scans.find(s => s.poseType === 'front');
      const allResults = scans.filter(s => s.result);

      if (allResults.length > 0) {
        const avgBodyFat = allResults.reduce((sum, s) => sum + (s.result?.bodyFatPercentage || 0), 0) / allResults.length;
        const avgMuscleMass = allResults.reduce((sum, s) => sum + (s.result?.muscleMassKg || 0), 0) / allResults.length;
        const avgAiScore = Math.round(allResults.reduce((sum, s) => sum + (s.result?.aiScore || 0), 0) / allResults.length);
        const biotype = frontScan?.result?.detectedBiotype || allResults[0]?.result?.detectedBiotype;

        const weightKg = profile?.weight || 70;
        const heightCm = profile?.height || 170;

        // Save measurement snapshot (body scan history)
        await MeasurementSnapshotService.createFromSession(
          user.id,
          sessionId,
          +avgBodyFat.toFixed(2),
          +avgMuscleMass.toFixed(2),
          frontScan?.result?.measurements || {},
          weightKg,
          heightCm,
          avgAiScore,
          biotype
        );

        // Also log weight from body scan
        await WeightLogService.logWeight(
          user.id,
          weightKg,
          'body_scan',
          `Body Scan — ${avgBodyFat.toFixed(1)}% BF, ${avgMuscleMass.toFixed(1)}kg MM`
        );

        console.log('📊 Snapshot saved:', { avgBodyFat: avgBodyFat.toFixed(1) + '%', avgMuscleMass: avgMuscleMass.toFixed(2) + 'kg' });
      }

      console.log('🎯 Session completed!');
      onScanComplete?.();
      onClose();
    } catch (error) {
      console.error('❌ Session completion failed:', error);
      // Don't block user if snapshot save fails
      onScanComplete?.();
      onClose();
    }
  };

  const currentResult = scans.find(s => s.poseType === currentPose)?.result;

  return (
    // This modal renders as a full-screen overlay with its own dark theme (camera UI)
    // It uses style directly to avoid Tailwind's dark: class dependency on document.documentElement
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: '#0a0f10', color: 'white', fontFamily: 'inherit' }}
    >
      {/* Hidden canvas for photo capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Fallback file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10"
        style={{ background: '#111c1e' }}>
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back</span>
          <span className="text-sm font-medium">Voltar</span>
        </button>
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#1a9aaf]">photo_camera</span>
          <h1 className="text-white font-bold">Body Scan</h1>
        </div>
        <div className="w-16" />
      </div>

      {/* Progress Indicator */}
      <div className="flex items-center justify-center gap-2 px-6 py-3" style={{ background: 'rgba(17,28,30,0.5)' }}>
        {(['front', 'side', 'back'] as PoseType[]).map((pose, idx) => {
          const isCompleted = scans.some(s => s.poseType === pose);
          const isCurrent = currentPose === pose && step !== 'tutorial';
          return (
            <React.Fragment key={pose}>
              <div
                className="flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all"
                style={{
                  background: isCompleted ? '#1a9aaf' : isCurrent ? 'rgba(26,154,175,0.1)' : 'transparent',
                  borderColor: isCompleted ? '#1a9aaf' : isCurrent ? '#1a9aaf' : 'rgba(255,255,255,0.2)',
                  color: isCompleted ? 'white' : isCurrent ? '#1a9aaf' : 'rgba(255,255,255,0.4)'
                }}
              >
                {isCompleted
                  ? <span className="material-symbols-outlined text-sm">check</span>
                  : <span className="text-xs font-bold">{idx + 1}</span>
                }
              </div>
              {idx < 2 && (
                <div className="h-0.5 w-8" style={{ background: isCompleted ? '#1a9aaf' : 'rgba(255,255,255,0.2)' }} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <AnimatePresence mode="wait">

          {/* ── Tutorial Step ── */}
          {step === 'tutorial' && (
            <motion.div
              key="tutorial"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="p-6 max-w-md mx-auto"
            >
              <div className="text-center mb-8">
                <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ background: 'rgba(26,154,175,0.1)' }}>
                  <span className="material-symbols-outlined text-4xl" style={{ color: '#1a9aaf' }}>photo_camera</span>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">{texts.tutorial.title}</h2>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>Siga as instruções para melhores resultados</p>
              </div>

              {/* Preparation Steps */}
              <div className="rounded-xl p-4 mb-6 space-y-3" style={{ background: '#111c1e' }}>
                {texts.tutorial.steps.map((s, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(26,154,175,0.1)' }}>
                      <span className="material-symbols-outlined" style={{ color: '#1a9aaf' }}>{s.icon}</span>
                    </div>
                    <p className="text-sm" style={{ color: 'rgba(255,255,255,0.8)' }}>{s.text}</p>
                  </div>
                ))}
              </div>

              {/* Pose Types */}
              <div className="mb-6">
                <h3 className="text-white font-semibold mb-3 text-sm">Você vai tirar 3 fotos:</h3>
                <div className="grid grid-cols-3 gap-3">
                  {texts.tutorial.poses.map((pose, idx) => (
                    <div key={idx} className="rounded-xl p-3 text-center" style={{ background: '#111c1e' }}>
                      <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2"
                        style={{ background: 'rgba(26,154,175,0.1)' }}>
                        <span className="material-symbols-outlined" style={{ color: '#1a9aaf' }}>{pose.icon}</span>
                      </div>
                      <p className="text-white text-xs font-medium mb-1">{pose.label}</p>
                      <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.5)' }}>{pose.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Disclaimer */}
              <div className="rounded-xl p-3 mb-6" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
                <p className="text-[#fbbf24] text-xs text-center">{texts.tutorial.disclaimer}</p>
              </div>

              {/* Profile Warning */}
              {!profileComplete && (
                <div className="rounded-xl p-3 mb-6" style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.2)' }}>
                  <div className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-sm flex-shrink-0 mt-0.5" style={{ color: '#facc15' }}>warning</span>
                    <p className="text-xs" style={{ color: '#fde68a' }}>
                      <strong>Perfil incompleto:</strong> Para resultados mais precisos, atualize sua altura e peso no perfil.
                    </p>
                  </div>
                </div>
              )}

              {/* Start Button */}
              <button
                onClick={handleStartTutorial}
                className="w-full font-bold py-4 rounded-xl transition-colors flex items-center justify-center gap-2"
                style={{ background: '#1a9aaf', color: 'white' }}
              >
                <span className="material-symbols-outlined">arrow_forward</span>
                {texts.tutorial.startButton}
              </button>
            </motion.div>
          )}

          {/* ── Capture Step ── */}
          {step === 'capture' && (
            <motion.div
              key="capture"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.03 }}
              className="p-4 max-w-md mx-auto"
            >
              <div className="text-center mb-4">
                <h2 className="text-xl font-bold text-white mb-1">
                  {texts.capture[currentPose].title}
                </h2>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  {texts.capture[currentPose].instruction}
                </p>
              </div>

              {/* Camera / Preview Area */}
              <div
                className="relative rounded-2xl overflow-hidden mb-4"
                style={{ aspectRatio: '3/4', background: '#111c1e' }}
              >
                {/* Camera error states */}
                {cameraError === 'permission_denied' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                    <span className="material-symbols-outlined text-5xl mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      no_photography
                    </span>
                    <p className="text-white font-semibold mb-1">Câmera bloqueada</p>
                    <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.5)' }}>
                      Permita o acesso à câmera nas configurações do browser, ou use o upload de foto abaixo.
                    </p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
                      style={{ background: 'rgba(26,154,175,0.2)', border: '1px solid rgba(26,154,175,0.4)', color: '#1a9aaf' }}
                    >
                      <span className="material-symbols-outlined text-sm">upload</span>
                      Carregar Foto da Galeria
                    </button>
                  </div>
                )}

                {cameraError === 'not_found' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                    <span className="material-symbols-outlined text-5xl mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      videocam_off
                    </span>
                    <p className="text-white font-semibold mb-1">Câmera não encontrada</p>
                    <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.5)' }}>
                      Seu dispositivo não tem câmera disponível.
                    </p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
                      style={{ background: 'rgba(26,154,175,0.2)', border: '1px solid rgba(26,154,175,0.4)', color: '#1a9aaf' }}
                    >
                      <span className="material-symbols-outlined text-sm">upload</span>
                      Carregar Foto da Galeria
                    </button>
                  </div>
                )}

                {(cameraError === 'not_supported' || (!cameraActive && !cameraError)) && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="w-12 h-12 rounded-full animate-spin border-2 border-t-transparent"
                      style={{ borderColor: 'rgba(26,154,175,0.3)', borderTopColor: '#1a9aaf' }} />
                    <p className="text-xs mt-3" style={{ color: 'rgba(255,255,255,0.5)' }}>Iniciando câmera...</p>
                  </div>
                )}

                {/* Live Video */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{
                    display: cameraActive ? 'block' : 'none',
                    transform: isMirrored ? 'scaleX(-1)' : 'none'
                  }}
                />

                {/* Pose Guide Overlay */}
                <AnimatePresence>
                  {showPoseGuide && cameraActive && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.4 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 flex items-center justify-center pointer-events-none"
                      style={{ zIndex: 10 }}
                    >
                      <PoseSilhouette pose={currentPose} />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Camera controls overlay */}
                {cameraActive && (
                  <div className="absolute top-3 right-3 flex flex-col gap-2" style={{ zIndex: 20 }}>
                    <button
                      onClick={flipCamera}
                      className="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
                      style={{ background: 'rgba(0,0,0,0.5)' }}
                      title="Girar câmera"
                    >
                      <span className="material-symbols-outlined text-white text-sm">flip_camera_ios</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Tips */}
              <div className="rounded-xl p-3 mb-4" style={{ background: 'rgba(26,154,175,0.1)', border: '1px solid rgba(26,154,175,0.2)' }}>
                <h3 className="font-semibold text-sm mb-2 flex items-center gap-2" style={{ color: '#1a9aaf' }}>
                  <span className="material-symbols-outlined text-sm">tips_and_updates</span>
                  Dicas importantes:
                </h3>
                <ul className="space-y-1">
                  {texts.capture[currentPose].tips.map((tip, idx) => (
                    <li key={idx} className="text-xs flex items-start gap-2" style={{ color: 'rgba(255,255,255,0.7)' }}>
                      <span style={{ color: '#1a9aaf' }}>•</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Controls */}
              <div className="space-y-3">
                <button
                  onClick={() => setShowPoseGuide(!showPoseGuide)}
                  className="w-full py-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
                  style={{ background: '#111c1e', color: 'rgba(255,255,255,0.8)' }}
                >
                  <span className="material-symbols-outlined text-sm">
                    {showPoseGuide ? 'visibility_off' : 'visibility'}
                  </span>
                  {showPoseGuide ? 'Ocultar' : 'Mostrar'} Guia de Pose
                </button>

                {/* Primary: Camera capture */}
                {cameraActive && (
                  <button
                    onClick={handleCaptureFromCamera}
                    disabled={loading}
                    className="w-full font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    style={{ background: '#1a9aaf', color: 'white' }}
                  >
                    <span className="material-symbols-outlined">photo_camera</span>
                    Tirar Foto
                  </button>
                )}

                {/* Fallback: Upload from gallery */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                  className="w-full py-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                  style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  <span className="material-symbols-outlined text-sm">photo_library</span>
                  Ou carregar da galeria
                </button>
              </div>
            </motion.div>
          )}

          {/* ── Analyzing Step ── */}
          {step === 'analyzing' && (
            <motion.div
              key="analyzing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center min-h-[60vh] p-6"
            >
              <div className="text-center max-w-sm w-full">
                {/* Animated Icon */}
                <div className="relative w-24 h-24 mx-auto mb-6">
                  <div className="absolute inset-0 rounded-full animate-ping"
                    style={{ background: 'rgba(26,154,175,0.2)', animationDuration: '2s' }} />
                  <div className="absolute inset-2 rounded-full animate-ping"
                    style={{ background: 'rgba(26,154,175,0.15)', animationDuration: '1.5s' }} />
                  <div className="absolute inset-4 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(26,154,175,0.1)' }}>
                    <span className="material-symbols-outlined text-5xl" style={{ color: '#1a9aaf' }}>psychology</span>
                  </div>
                </div>

                <h3 className="text-white font-bold text-lg mb-2">Analisando Imagem</h3>
                <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  {currentPose === 'front' && 'Analisando pose frontal...'}
                  {currentPose === 'side' && 'Analisando pose lateral...'}
                  {currentPose === 'back' && 'Analisando pose de costas...'}
                </p>

                {/* Progress Steps */}
                <div className="space-y-3 text-left rounded-xl p-4 mb-4" style={{ background: '#111c1e' }}>
                  {[
                    { label: 'Redimensionando imagem', done: true },
                    { label: 'Analisando composição corporal', done: false, active: true },
                    { label: 'Calculando medidas', done: false, active: false }
                  ].map((s, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center"
                        style={{ background: s.done ? 'rgba(26,154,175,0.2)' : s.active ? 'rgba(26,154,175,0.15)' : 'rgba(255,255,255,0.05)' }}>
                        <span
                          className={`material-symbols-outlined text-sm ${s.active ? 'animate-pulse' : ''}`}
                          style={{ color: s.done ? '#1a9aaf' : s.active ? '#1a9aaf' : 'rgba(255,255,255,0.3)' }}
                        >
                          {s.done ? 'check' : s.active ? 'hourglass_top' : 'pending'}
                        </span>
                      </div>
                      <span className="text-xs" style={{ color: s.done || s.active ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.3)' }}>
                        {s.label}
                      </span>
                    </div>
                  ))}
                </div>

                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Aguarde 10-20 segundos...</p>

                {/* Preview image */}
                {imagePreview && (
                  <div className="mt-6 relative rounded-xl overflow-hidden max-w-xs mx-auto opacity-50"
                    style={{ aspectRatio: '3/4' }}>
                    <img src={imagePreview} alt="Analisando" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center"
                      style={{ background: 'rgba(26,154,175,0.2)', backdropFilter: 'blur(2px)' }}>
                      <span className="material-symbols-outlined text-white text-4xl animate-spin">settings</span>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ── Result Step ── */}
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

              <div className="mt-6 space-y-3">
                <button
                  onClick={handleRetake}
                  className="w-full py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                  style={{ background: '#111c1e', color: 'rgba(255,255,255,0.8)' }}
                >
                  <span className="material-symbols-outlined">refresh</span>
                  {texts.result.retake}
                </button>

                <button
                  onClick={handleNextPose}
                  className="w-full font-bold py-4 rounded-xl transition-colors flex items-center justify-center gap-2"
                  style={{ background: '#1a9aaf', color: 'white' }}
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
