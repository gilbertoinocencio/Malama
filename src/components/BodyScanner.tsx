/**
 * BodyScanner — Full-screen body-scan orchestrator.
 *
 * Flow:
 *   tutorial → front (liveness + stability) → side (stability) → result
 *
 * Architecture:
 *   - Camera guidance: BodyScanCamera (MediaPipe Pose Landmarker, 100% local)
 *   - Measurements: computeMeasurements + deurenbergBF (no data leaves the device)
 *   - Persistence: useBodyScan → Supabase body_scan_measurements table
 *   - Legacy sessions: BodyAnalysisService.getOrCreateSession kept for compatibility
 *
 * UI: Quiet Luxury — off-white, 1 px guides, Playfair Display numbers,
 *     sage-green on valid state, no aggressive animations.
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { BodyScanCamera, type BodyScanCaptureResult, type ScanPose } from './BodyScanCamera';
import { useBodyScan } from '../hooks/useBodyScan';
import type { AnthroMeasurements } from '../services/bodyscan';

interface BodyScannerProps {
  onClose: () => void;
  onScanComplete?: () => void;
}

type OrchestratorStep = 'tutorial' | 'front' | 'side' | 'result' | 'saving';

interface CaptureState {
  front?: BodyScanCaptureResult;
  side?: BodyScanCaptureResult;
}

// ─── Small UI primitives ──────────────────────────────────────────────────────

const StepDot: React.FC<{ active: boolean; done: boolean }> = ({ active, done }) => (
  <div
    className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${
      done ? 'bg-[#86a88d]' : active ? 'bg-white/80 scale-125' : 'bg-white/25'
    }`}
  />
);

// Single measurement card
const MeasCard: React.FC<{
  label: string;
  value: number;
  unit: string;
  delta?: number;
}> = ({ label, value, unit, delta }) => (
  <div className="flex flex-col gap-1 bg-white rounded-2xl p-4 shadow-sm">
    <span className="text-[10px] font-light tracking-widest uppercase text-stone-400">
      {label}
    </span>
    <div className="flex items-end gap-1">
      <span
        className="text-3xl text-stone-800 leading-none"
        style={{ fontFamily: "'Playfair Display', serif" }}
      >
        {value.toFixed(1)}
      </span>
      <span className="text-stone-400 text-xs pb-0.5">{unit}</span>
    </div>
    {delta !== undefined && (
      <span
        className={`text-[11px] ${
          delta < 0 ? 'text-emerald-600' : delta > 0 ? 'text-rose-400' : 'text-stone-400'
        }`}
      >
        {delta > 0 ? '+' : ''}{delta.toFixed(1)} vs anterior
      </span>
    )}
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export const BodyScanner: React.FC<BodyScannerProps> = ({ onClose, onScanComplete }) => {
  const { user, profile } = useAuth();
  const { saveScan, progress } = useBodyScan();

  const [step, setStep] = useState<OrchestratorStep>('tutorial');
  const [captures, setCaptures] = useState<CaptureState>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [finalMeasurements, setFinalMeasurements] = useState<AnthroMeasurements | null>(null);

  const heightCm = profile?.height ?? 170;
  const weightKg = profile?.weight ?? 70;
  const age      = profile?.age ?? 30;
  const gender   = (profile?.gender as 'male' | 'female') ?? 'female';

  // ── Capture handlers ────────────────────────────────────────────────────────

  const handleFrontCapture = useCallback((result: BodyScanCaptureResult) => {
    setCaptures((prev: CaptureState) => ({ ...prev, front: result }));
    setCameraError(null);
    setStep('side');
  }, []);

  const handleSideCapture = useCallback(async (result: BodyScanCaptureResult) => {
    setCaptures((prev: CaptureState) => {
      const updated = { ...prev, side: result };

      // Average measurements from both poses
      const front = updated.front;
      const side  = result;

      const merged: AnthroMeasurements = {
        waist_cm:             (front?.measurements.waist_cm ?? 0 + side.measurements.waist_cm) / (front ? 2 : 1),
        hip_cm:               (front?.measurements.hip_cm   ?? 0 + side.measurements.hip_cm  ) / (front ? 2 : 1),
        bust_cm:              front?.measurements.bust_cm ?? side.measurements.bust_cm,
        bf_percentage:        side.measurements.bf_percentage,  // Deurenberg is pose-independent
        estimation_confidence: Math.min(
          front?.measurements.estimation_confidence ?? 100,
          side.measurements.estimation_confidence,
        ),
      };

      setFinalMeasurements(merged);
      return updated;
    });
    setCameraError(null);
    setStep('saving');
  }, []);

  // ── Persist ─────────────────────────────────────────────────────────────────

  const persistAndFinish = useCallback(async (measurements: AnthroMeasurements) => {
    if (!user) return;
    setSaveError(null);
    try {
      await saveScan({ measurements, heightCmUsed: heightCm, weightKg });
      setStep('result');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar';
      setSaveError(msg);
      setStep('result'); // show results even if save fails
    }
  }, [user, saveScan, heightCm]);

  // Trigger persist once we reach 'saving'
  React.useEffect(() => {
    if (step === 'saving' && finalMeasurements) {
      persistAndFinish(finalMeasurements);
    }
  }, [step, finalMeasurements, persistAndFinish]);

  // ── Pose step config ─────────────────────────────────────────────────────────

  const poseSteps: Array<{ id: ScanPose; label: string }> = [
    { id: 'front', label: 'Frente' },
    { id: 'side',  label: 'Perfil' },
  ];

  const donePoses = Object.keys(captures) as ScanPose[];

  // ── Camera step render ───────────────────────────────────────────────────────

  const isCamera = step === 'front' || step === 'side';

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#FDFBF9]">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 pt-safe-top py-4 border-b border-stone-100">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 text-stone-500 hover:text-stone-800 transition-colors"
        >
          <span className="material-symbols-outlined text-lg">arrow_back</span>
          <span className="text-sm font-light">Voltar</span>
        </button>

        <h1
          className="text-stone-800 text-base tracking-wide"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Body Scan
        </h1>

        {/* Step dots */}
        <div className="flex items-center gap-1.5 pr-1">
          {poseSteps.map((ps) => (
            <StepDot
              key={ps.id}
              active={step === ps.id}
              done={donePoses.includes(ps.id)}
            />
          ))}
          <StepDot active={step === 'result' || step === 'saving'} done={false} />
        </div>
      </div>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">

          {/* ── Tutorial ─────────────────────────────────────────────────── */}
          {step === 'tutorial' && (
            <motion.div
              key="tutorial"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full overflow-y-auto px-6 pb-8"
            >
              <div className="max-w-sm mx-auto pt-8">
                {/* Icon */}
                <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center mx-auto mb-6">
                  <span className="material-symbols-outlined text-stone-500 text-2xl">accessibility</span>
                </div>

                <h2
                  className="text-stone-800 text-2xl text-center mb-2"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  Medição Digital
                </h2>
                <p className="text-stone-400 text-sm text-center font-light mb-8 leading-relaxed">
                  A IA mede em tempo real via câmera.<br />
                  Nenhuma imagem sai do seu dispositivo.
                </p>

                {/* Preparation list */}
                <div className="space-y-3 mb-8">
                  {[
                    { icon: 'checkroom',    text: 'Vista roupa justa ou traje de banho' },
                    { icon: 'lightbulb',    text: 'Escolha local bem iluminado' },
                    { icon: 'straighten',   text: 'Fique a 2–3 m da câmera' },
                    { icon: 'accessibility',text: 'Corpo inteiro visível (70–85% do frame)' },
                    { icon: 'back_hand',    text: 'Levante o braço direito quando solicitado' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-4 bg-white rounded-xl px-4 py-3 shadow-sm">
                      <span className="material-symbols-outlined text-stone-400 text-xl">{item.icon}</span>
                      <p className="text-stone-600 text-sm font-light">{item.text}</p>
                    </div>
                  ))}
                </div>

                {/* Poses */}
                <div className="grid grid-cols-2 gap-3 mb-8">
                  {poseSteps.map((ps) => (
                    <div key={ps.id} className="bg-white rounded-2xl p-4 text-center shadow-sm">
                      <span className="material-symbols-outlined text-stone-400 text-2xl mb-2 block">
                        {ps.id === 'front' ? 'person' : 'emoji_people'}
                      </span>
                      <p className="text-stone-700 text-sm font-light">{ps.label}</p>
                    </div>
                  ))}
                </div>

                {/* Disclaimer */}
                <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 mb-8">
                  <p className="text-amber-700 text-xs text-center font-light leading-relaxed">
                    Estimativa com margem ±4 cm para circunferências e ±4% para gordura corporal.
                    Não substitui avaliação profissional.
                  </p>
                </div>

                {/* Profile warning */}
                {(!profile?.height || !profile?.weight) && (
                  <div className="bg-rose-50 border border-rose-100 rounded-xl px-4 py-3 mb-6">
                    <p className="text-rose-600 text-xs text-center font-light">
                      Complete seu perfil (altura e peso) para medidas mais precisas.
                    </p>
                  </div>
                )}

                <button
                  onClick={() => setStep('front')}
                  className="w-full text-white rounded-2xl py-4 font-light tracking-wider transition-opacity hover:opacity-90 active:scale-[0.98]"
                  style={{ background: '#1A6070' }}
                >
                  Iniciar Scan
                </button>
              </div>
            </motion.div>
          )}

          {/* ── Camera (front or side) ──────────────────────────────────── */}
          {isCamera && (
            <motion.div
              key={step}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full flex flex-col"
            >
              {/* Pose label */}
              <div className="px-5 py-3 flex items-center justify-between bg-[#0a0a0a]">
                <span className="text-white/50 text-xs font-light tracking-widest uppercase">
                  {step === 'front' ? 'Pose Frontal' : 'Perfil Direito'}
                </span>
                <span className="text-white/30 text-xs">
                  {step === 'front' ? '1 / 2' : '2 / 2'}
                </span>
              </div>

              {/* Camera */}
              <div className="flex-1">
                <BodyScanCamera
                  pose={step as ScanPose}
                  requireLiveness={step === 'front'}
                  heightCm={heightCm}
                  weightKg={weightKg}
                  age={age}
                  gender={gender}
                  onCapture={step === 'front' ? handleFrontCapture : handleSideCapture}
                  onError={(msg: string) => setCameraError(msg)}
                />
              </div>

              {/* Camera error */}
              <AnimatePresence>
                {cameraError && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="absolute bottom-6 left-4 right-4 bg-rose-900/80 backdrop-blur-md rounded-xl px-4 py-3 text-center"
                  >
                    <p className="text-white/90 text-sm font-light">{cameraError}</p>
                    <button
                      onClick={() => { setCameraError(null); setStep(step); }}
                      className="mt-2 text-white/60 text-xs underline"
                    >
                      Tentar novamente
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ── Saving ───────────────────────────────────────────────────── */}
          {step === 'saving' && (
            <motion.div
              key="saving"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full flex flex-col items-center justify-center gap-4"
            >
              <div className="w-8 h-8 border border-stone-300 border-t-stone-700 rounded-full animate-spin" />
              <p className="text-stone-400 text-sm font-light tracking-widest uppercase">
                Calculando
              </p>
            </motion.div>
          )}

          {/* ── Result ───────────────────────────────────────────────────── */}
          {step === 'result' && finalMeasurements && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="h-full overflow-y-auto pb-10"
            >
              <div className="max-w-sm mx-auto px-5 pt-6">

                {/* Confidence badge */}
                <div className="flex justify-center mb-6">
                  <div
                    className={`px-4 py-1.5 rounded-full text-xs font-light tracking-widest uppercase border ${
                      finalMeasurements.estimation_confidence >= 75
                        ? 'border-[#86a88d]/50 text-[#86a88d] bg-[#86a88d]/10'
                        : 'border-amber-300/50 text-amber-600 bg-amber-50'
                    }`}
                  >
                    Confiança {finalMeasurements.estimation_confidence.toFixed(0)}%
                  </div>
                </div>

                {/* Main number — BF% */}
                <div className="text-center mb-8">
                  <p className="text-stone-400 text-xs tracking-widest uppercase font-light mb-1">
                    Gordura Corporal
                  </p>
                  <div className="flex items-end justify-center gap-1">
                    <span
                      className="text-6xl text-stone-800 leading-none"
                      style={{ fontFamily: "'Playfair Display', serif" }}
                    >
                      {finalMeasurements.bf_percentage.toFixed(1)}
                    </span>
                    <span className="text-stone-400 text-lg mb-1.5 font-light">%</span>
                  </div>
                  {progress?.bf_delta !== undefined && (
                    <p
                      className={`text-sm mt-1 ${
                        progress.bf_delta < 0 ? 'text-emerald-600' : 'text-rose-400'
                      }`}
                    >
                      {progress.bf_delta > 0 ? '+' : ''}{progress.bf_delta.toFixed(1)}% vs anterior
                    </p>
                  )}
                </div>

                {/* Measurement cards grid */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  <MeasCard
                    label="Cintura"
                    value={finalMeasurements.waist_cm}
                    unit="cm"
                    delta={progress?.waist_delta}
                  />
                  <MeasCard
                    label="Quadril"
                    value={finalMeasurements.hip_cm}
                    unit="cm"
                    delta={progress?.hip_delta}
                  />
                  <MeasCard
                    label="Busto"
                    value={finalMeasurements.bust_cm}
                    unit="cm"
                  />
                </div>

                {/* Disclaimer */}
                <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 mb-6">
                  <p className="text-amber-700 text-xs text-center font-light leading-relaxed">
                    Estimativa local com margem ±4 cm / ±4%.
                    BF% calculado pela fórmula de Deurenberg (IMC + idade + sexo).
                    Use para acompanhar evolução, não como diagnóstico.
                  </p>
                </div>

                {/* Save error */}
                {saveError && (
                  <div className="bg-rose-50 border border-rose-100 rounded-xl px-4 py-3 mb-6">
                    <p className="text-rose-600 text-xs text-center font-light">
                      Não foi possível salvar: {saveError}
                    </p>
                  </div>
                )}

                {/* Reference data used */}
                <div className="flex justify-center gap-6 text-xs text-stone-400 font-light mb-8">
                  <span>Altura: {heightCm} cm</span>
                  <span>Peso: {weightKg} kg</span>
                  <span>Idade: {age} a</span>
                </div>

                {/* Actions */}
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      onScanComplete?.();
                      onClose();
                    }}
                    className="w-full text-white rounded-2xl py-4 font-light tracking-wider transition-opacity hover:opacity-90 active:scale-[0.98]"
                    style={{ background: '#1A6070' }}
                  >
                    Concluir
                  </button>
                  <button
                    onClick={() => {
                      setCaptures({});
                      setFinalMeasurements(null);
                      setSaveError(null);
                      setCameraError(null);
                      setStep('tutorial');
                    }}
                    className="w-full text-stone-500 text-sm font-light py-2 hover:text-stone-700 transition-colors"
                  >
                    Fazer novo scan
                  </button>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
};

export default BodyScanner;
