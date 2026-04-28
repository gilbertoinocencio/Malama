/**
 * BodyScanner — Full-screen body-scan orchestrator.
 *
 * Flow (multi-scan):
 *   tutorial
 *   └─> Cycle N: front (liveness + stability) → side (stability) → confidence check
 *        ├─ confidence ≥ 75 → validCaptures++, next cycle (until TARGET_VALID or MAX_ATTEMPTS)
 *        └─ confidence < 75 → show hint, retry (until MAX_ATTEMPTS)
 *   └─> aggregateScans(validCaptures) → saving → result
 *
 * Precision improvements:
 *   - Side-scan landmarks passed to computeMeasurements → real sagittal depth used
 *     instead of fixed population-average depth ratios.
 *   - Dynamic waist detection (anatomically narrowest point, not fixed 38%).
 *   - US Navy BF% when neck visible; Deurenberg fallback otherwise.
 *
 * Architecture:
 *   - Camera guidance:  BodyScanCamera (MediaPipe, 100 % local)
 *   - Measurements:     computeMeasurements (with side depth integration)
 *   - Aggregation:      scanAggregator (confidence-weighted average, outlier removal)
 *   - Persistence:      useBodyScan → Supabase
 *
 * UI: Quiet Luxury — off-white, Playfair Display, sage-green accents.
 */

import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { BodyScanCamera, type BodyScanCaptureResult, type ScanPose } from './BodyScanCamera';
import { useBodyScan } from '../hooks/useBodyScan';
import type { AnthroMeasurements } from '../services/bodyscan';
import { computeMeasurements } from '../services/bodyscan';
import {
  CONFIDENCE_MIN,
  TARGET_VALID,
  MAX_ATTEMPTS,
  getConfidenceHint,
  aggregateScans,
} from '../services/bodyscan/scanAggregator';
import {
  computeClinicalIndices,
  whrRisk,
  rceRisk,
} from '../utils/bodyCompositionCalculators';

interface BodyScannerProps {
  onClose: () => void;
  onScanComplete?: () => void;
}

type OrchestratorStep = 'tutorial' | 'front' | 'side' | 'result' | 'saving';

interface CaptureState {
  front?: BodyScanCaptureResult;
  side?: BodyScanCaptureResult;
}

// ─── Risk colour helper ───────────────────────────────────────────────────────

const RISK_COLORS = {
  low: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  moderate: 'text-amber-600 bg-amber-50 border-amber-200',
  high: 'text-rose-500 bg-rose-50 border-rose-200',
  very_high: 'text-rose-700 bg-rose-100 border-rose-300',
} as const;

// ─── Small UI primitives ──────────────────────────────────────────────────────

const StepDot: React.FC<{ active: boolean; done: boolean }> = ({ active, done }) => (
  <div
    className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${
      done ? 'bg-[#86a88d]' : active ? 'bg-white/80 scale-125' : 'bg-white/25'
    }`}
  />
);

const MeasCard: React.FC<{
  label: string;
  value: number;
  unit: string;
  badge?: string;
  delta?: number;
}> = ({ label, value, unit, badge, delta }) => (
  <div className="flex flex-col gap-1 bg-white rounded-2xl p-3.5 shadow-sm">
    <div className="flex items-center gap-1">
      <span className="text-[10px] font-light tracking-widest uppercase text-stone-400 flex-1">
        {label}
      </span>
      {badge && (
        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-stone-100 text-stone-400 border border-stone-200">
          {badge}
        </span>
      )}
    </div>
    <div className="flex items-end gap-1">
      <span
        className="text-2xl text-stone-800 leading-none"
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

const IndexChip: React.FC<{
  label: string;
  value: string;
  risk: 'low' | 'moderate' | 'high' | 'very_high';
}> = ({ label, value, risk }) => (
  <div className={`flex flex-col items-center px-3 py-2 rounded-xl border text-center ${RISK_COLORS[risk]}`}>
    <span className="text-[9px] font-light tracking-widest uppercase opacity-70">{label}</span>
    <span className="text-base font-medium leading-tight">{value}</span>
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

  const [validCaptures, setValidCaptures] = useState<AnthroMeasurements[]>([]);
  const [sessionAttempt, setSessionAttempt] = useState(0);
  const [lastDiscardHint, setLastDiscardHint] = useState<string | null>(null);
  const [sessionFailed, setSessionFailed] = useState(false);

  const capturesRef = useRef<CaptureState>({});
  capturesRef.current = captures;

  const heightCm = profile?.height ?? 170;
  const weightKg = profile?.weight ?? 70;
  const age      = profile?.age ?? 30;
  const gender   = (profile?.gender as 'male' | 'female') ?? 'female';

  // ── Persist ─────────────────────────────────────────────────────────────────

  const persistAndFinish = useCallback(async (measurements: AnthroMeasurements) => {
    if (!user) return;
    setSaveError(null);
    try {
      await saveScan({ measurements, heightCmUsed: heightCm, weightKg, age, gender });
      setStep('result');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar';
      setSaveError(msg);
      setStep('result');
    }
  }, [user, saveScan, heightCm, weightKg, age, gender]);

  React.useEffect(() => {
    if (step === 'saving' && finalMeasurements) {
      persistAndFinish(finalMeasurements);
    }
  }, [step, finalMeasurements, persistAndFinish]);

  // ── Multi-scan cycle decision ────────────────────────────────────────────────

  const handleCycleComplete = useCallback((merged: AnthroMeasurements) => {
    const newAttempt = sessionAttempt + 1;
    setSessionAttempt(newAttempt);

    if (merged.estimation_confidence >= CONFIDENCE_MIN) {
      const newValid = [...validCaptures, merged];
      setValidCaptures(newValid);
      setLastDiscardHint(null);

      if (newValid.length >= TARGET_VALID || newAttempt >= MAX_ATTEMPTS) {
        const final = aggregateScans(newValid);
        setFinalMeasurements(final);
        setStep('saving');
      } else {
        setCaptures({});
        setStep('front');
      }
    } else {
      const hint = getConfidenceHint(merged.estimation_confidence);
      setLastDiscardHint(hint);

      if (newAttempt >= MAX_ATTEMPTS) {
        if (validCaptures.length >= 2) {
          const final = aggregateScans(validCaptures);
          setFinalMeasurements(final);
          setStep('saving');
        } else {
          setSessionFailed(true);
        }
      } else {
        setTimeout(() => {
          setLastDiscardHint(null);
          setCaptures({});
          setStep('front');
        }, 2000);
      }
    }
  }, [sessionAttempt, validCaptures]);

  // ── Capture handlers ────────────────────────────────────────────────────────

  const handleFrontCapture = useCallback((result: BodyScanCaptureResult) => {
    setCaptures((prev: CaptureState) => ({ ...prev, front: result }));
    setCameraError(null);
    setStep('side');
  }, []);

  const handleSideCapture = useCallback((result: BodyScanCaptureResult) => {
    const front = capturesRef.current.front;

    // Recompute with actual sagittal depth from the side scan landmarks.
    // Front landmarks give bilateral widths; side landmarks give depth.
    let merged: AnthroMeasurements;

    if (front) {
      const recomputed = computeMeasurements({
        landmarks:       front.landmarks,
        frameWidth:      front.frameWidth,
        frameHeight:     front.frameHeight,
        heightCm,
        weightKg,
        age,
        gender,
        sideLandmarks:   result.landmarks,
        sideFrameWidth:  result.frameWidth,
        sideFrameHeight: result.frameHeight,
      });

      merged = recomputed ?? {
        // Fallback to front-only measurements if recompute fails
        ...front.measurements,
        estimation_confidence: Math.min(
          front.measurements.estimation_confidence,
          result.measurements.estimation_confidence,
        ),
      };
    } else {
      merged = result.measurements;
    }

    setCaptures((prev: CaptureState) => ({ ...prev, side: result }));
    setCameraError(null);
    handleCycleComplete(merged);
  }, [handleCycleComplete, heightCm, weightKg, age, gender]);

  // ── Pose step config ─────────────────────────────────────────────────────────

  const poseSteps: Array<{ id: ScanPose; label: string }> = [
    { id: 'front', label: 'Frente' },
    { id: 'side',  label: 'Perfil' },
  ];

  const donePoses = Object.keys(captures) as ScanPose[];

  // ── Reset helpers ────────────────────────────────────────────────────────────

  const resetSession = useCallback(() => {
    setCaptures({});
    setFinalMeasurements(null);
    setSaveError(null);
    setCameraError(null);
    setValidCaptures([]);
    setSessionAttempt(0);
    setLastDiscardHint(null);
    setSessionFailed(false);
  }, []);

  const isCamera = step === 'front' || step === 'side';

  // ── Session failed screen ────────────────────────────────────────────────────

  if (sessionFailed) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0a0f10] p-8 text-center gap-4">
        <span className="material-symbols-outlined text-amber-400" style={{ fontSize: 64 }}>
          warning
        </span>
        <h2
          className="text-white text-xl"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Leituras inconsistentes
        </h2>
        <p className="text-white/60 text-sm leading-relaxed max-w-xs">
          Não foi possível obter capturas confiáveis suficientes.
          Tente em ambiente com melhor iluminação, fundo simples e mais espaço.
        </p>
        <button
          onClick={() => { resetSession(); setStep('front'); }}
          className="mt-4 w-full max-w-xs h-14 rounded-2xl text-white font-light tracking-wider"
          style={{ background: '#7d4a3c' }}
        >
          Tentar novamente
        </button>
        <button onClick={onClose} className="text-white/40 text-sm font-light">
          Cancelar
        </button>
      </div>
    );
  }

  // ── Clinical indices (computed from final measurements for result screen) ───

  const indices = finalMeasurements
    ? computeClinicalIndices({
        waist_cm: finalMeasurements.waist_cm,
        hip_cm: finalMeasurements.hip_cm,
        height_cm: heightCm,
        weight_kg: weightKg,
        bf_percentage: finalMeasurements.bf_percentage,
        gender,
      })
    : null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#FDFBF9]">

      {/* ── Header ───────────────────────────────────────────────────────────── */}
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

        <div className="flex items-center gap-1.5 pr-1">
          {poseSteps.map((ps) => (
            <StepDot key={ps.id} active={step === ps.id} done={donePoses.includes(ps.id)} />
          ))}
          <StepDot active={step === 'result' || step === 'saving'} done={false} />
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">

          {/* ── Tutorial ─────────────────────────────────────────────────────── */}
          {step === 'tutorial' && (
            <motion.div
              key="tutorial"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full overflow-y-auto px-6 pb-8"
            >
              <div className="max-w-sm mx-auto pt-8">
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
                  A IA fará até {TARGET_VALID} capturas para aumentar a precisão.<br />
                  Nenhuma imagem sai do seu dispositivo.
                </p>

                <div className="space-y-3 mb-8">
                  {[
                    { icon: 'checkroom',     text: 'Vista roupa justa ou traje de banho' },
                    { icon: 'lightbulb',     text: 'Escolha local bem iluminado' },
                    { icon: 'straighten',    text: 'Fique a 2–3 m da câmera' },
                    { icon: 'accessibility', text: 'Corpo inteiro visível (70–85% do frame)' },
                    { icon: 'back_hand',     text: 'Levante o braço direito quando solicitado' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-4 bg-white rounded-xl px-4 py-3 shadow-sm">
                      <span className="material-symbols-outlined text-stone-400 text-xl">{item.icon}</span>
                      <p className="text-stone-600 text-sm font-light">{item.text}</p>
                    </div>
                  ))}
                </div>

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

                <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 mb-8">
                  <p className="text-amber-700 text-xs text-center font-light leading-relaxed">
                    Estimativa com margem ±2–4 cm para circunferências e ±4% para gordura corporal.
                    Não substitui avaliação profissional.
                  </p>
                </div>

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
                  style={{ background: '#7d4a3c' }}
                >
                  Iniciar Scan
                </button>
              </div>
            </motion.div>
          )}

          {/* ── Camera ───────────────────────────────────────────────────────── */}
          {isCamera && (
            <motion.div
              key={step}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full flex flex-col"
            >
              <div className="px-4 py-3 flex items-center justify-between gap-3 bg-[#0a0a0a]">
                <span className="text-white/50 text-xs font-light tracking-widest uppercase shrink-0">
                  {step === 'front' ? 'Pose Frontal' : 'Perfil Direito'}
                </span>

                <div className="flex items-center gap-1.5 flex-1 max-w-[120px]">
                  {Array.from({ length: TARGET_VALID }).map((_, i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                        i < validCaptures.length ? 'bg-emerald-400' : 'bg-white/20'
                      }`}
                    />
                  ))}
                  <span className="text-white/40 text-[10px] ml-1 shrink-0">
                    {validCaptures.length}/{TARGET_VALID}
                  </span>
                </div>
              </div>

              <div className="flex-1 relative">
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

                <AnimatePresence>
                  {lastDiscardHint && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="absolute bottom-32 left-4 right-4 bg-amber-500/90 backdrop-blur-sm rounded-2xl p-3 text-center"
                    >
                      <span className="material-symbols-outlined text-white text-sm">warning</span>
                      <p className="text-white text-sm font-medium mt-1">{lastDiscardHint}</p>
                      <p className="text-white/70 text-xs mt-0.5">Ajustando para próxima captura…</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

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

          {/* ── Saving ───────────────────────────────────────────────────────── */}
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

          {/* ── Result ───────────────────────────────────────────────────────── */}
          {step === 'result' && finalMeasurements && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="h-full overflow-y-auto pb-10"
            >
              <div className="max-w-sm mx-auto px-5 pt-6">

                {/* Badges */}
                <div className="flex justify-center gap-2 mb-6 flex-wrap">
                  <div
                    className={`px-4 py-1.5 rounded-full text-xs font-light tracking-widest uppercase border ${
                      finalMeasurements.estimation_confidence >= 75
                        ? 'border-[#86a88d]/50 text-[#86a88d] bg-[#86a88d]/10'
                        : 'border-amber-300/50 text-amber-600 bg-amber-50'
                    }`}
                  >
                    Confiança {finalMeasurements.estimation_confidence.toFixed(0)}%
                  </div>

                  {validCaptures.length > 1 && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10">
                      <span className="material-symbols-outlined text-emerald-500 text-xs">check_circle</span>
                      <span className="text-emerald-600 text-xs font-light tracking-wide">
                        Média de {validCaptures.length} capturas
                      </span>
                    </div>
                  )}
                </div>

                {/* BF% hero */}
                <div className="text-center mb-6">
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
                  <p className="text-stone-400 text-[10px] mt-1 font-light">
                    {finalMeasurements.bf_formula === 'navy'
                      ? 'Fórmula da Marinha dos EUA (câmera-derivada)'
                      : 'Fórmula de Deurenberg (IMC + idade + sexo)'}
                  </p>
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

                {/* Clinical indices */}
                {indices && (
                  <div className="mb-5">
                    <p className="text-stone-400 text-[10px] tracking-widest uppercase font-light mb-2 text-center">
                      Índices Clínicos
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {indices.whr !== null && (
                        <IndexChip
                          label="RCQ"
                          value={indices.whr.toFixed(2)}
                          risk={whrRisk(indices.whr, gender)}
                        />
                      )}
                      {indices.rce !== null && (
                        <IndexChip
                          label="RCE"
                          value={indices.rce.toFixed(2)}
                          risk={rceRisk(indices.rce)}
                        />
                      )}
                      {indices.bmi !== null && (
                        <IndexChip
                          label="IMC"
                          value={indices.bmi.toFixed(1)}
                          risk={
                            indices.bmi < 18.5 ? 'moderate'
                            : indices.bmi < 25 ? 'low'
                            : indices.bmi < 30 ? 'moderate'
                            : 'high'
                          }
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* Main circumference cards */}
                <p className="text-stone-400 text-[10px] tracking-widest uppercase font-light mb-2 text-center">
                  Circunferências
                </p>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <MeasCard
                    label="Cintura"
                    value={finalMeasurements.waist_cm}
                    unit="cm"
                    badge="📷"
                    delta={progress?.waist_delta}
                  />
                  <MeasCard
                    label="Quadril"
                    value={finalMeasurements.hip_cm}
                    unit="cm"
                    badge="📷"
                    delta={progress?.hip_delta}
                  />
                  <MeasCard
                    label="Busto"
                    value={finalMeasurements.bust_cm}
                    unit="cm"
                    badge="📷"
                  />
                </div>

                {/* Neck (if detected) */}
                {finalMeasurements.neck_cm !== null && (
                  <div className="grid grid-cols-1 gap-2 mb-3">
                    <MeasCard
                      label="Pescoço"
                      value={finalMeasurements.neck_cm}
                      unit="cm"
                      badge="📷 ±2cm"
                    />
                  </div>
                )}

                {/* Legend */}
                <div className="flex gap-4 justify-center text-[10px] text-stone-400 font-light mb-5">
                  <span>📷 Câmera-derivado</span>
                  <span>📊 Estimativa estatística</span>
                </div>

                {/* Disclaimer */}
                <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 mb-5">
                  <p className="text-amber-700 text-xs text-center font-light leading-relaxed">
                    Circunferências com margem ±2 cm (scan lateral) a ±4 cm (regressão).
                    BF% com margem ±4%. Use para acompanhar evolução, não como diagnóstico.
                  </p>
                </div>

                {saveError && (
                  <div className="bg-rose-50 border border-rose-100 rounded-xl px-4 py-3 mb-5">
                    <p className="text-rose-600 text-xs text-center font-light">
                      Não foi possível salvar: {saveError}
                    </p>
                  </div>
                )}

                <div className="flex justify-center gap-6 text-xs text-stone-400 font-light mb-8">
                  <span>Altura: {heightCm} cm</span>
                  <span>Peso: {weightKg} kg</span>
                  <span>Idade: {age} a</span>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={() => { onScanComplete?.(); onClose(); }}
                    className="w-full text-white rounded-2xl py-4 font-light tracking-wider transition-opacity hover:opacity-90 active:scale-[0.98]"
                    style={{ background: '#7d4a3c' }}
                  >
                    Concluir
                  </button>
                  <button
                    onClick={() => { resetSession(); setStep('tutorial'); }}
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
