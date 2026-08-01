import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { HydrationAnalysis } from '../services/caramelService';
import { WATER_MAX_ML } from '../utils/intakeDetection';

/**
 * Confirmação de foto de ÁGUA.
 *
 * A foto é o sinal do usuário de que ele bebeu; a IA só ESTIMA o volume pelo
 * recipiente. Por isso nada é gravado antes de o usuário confirmar/ajustar o
 * número aqui — mesma regra do interceptor de texto: quem diz "bebeu" é o
 * usuário, e a quantidade nunca é registrada às cegas pelo modelo.
 */

interface MalamaWaterScanProps {
  hydration: HydrationAnalysis;
  imageUri: string;
  /** Confirma o registro com a quantidade final (ml) e se o usuário ajustou a estimativa. */
  onConfirm: (ml: number, edited: boolean) => void | Promise<void>;
  /** "Não é água" — reanalisa a mesma foto como alimento/bebida. */
  onNotWater: () => void;
  onBack: () => void;
}

const MALAMA_RED = '#7d4a3c';
const WATER_BLUE = '#3aa0c9';
const BG_CREAM = '#FDFBF9';

const PRESETS = [200, 250, 300, 500, 750, 1000];
const STEP_ML = 50;
/** Usado quando a IA não conseguiu estimar o volume (ml = 0). */
const FALLBACK_ML = 250;

export const MalamaWaterScan: React.FC<MalamaWaterScanProps> = ({
  hydration,
  imageUri,
  onConfirm,
  onNotWater,
  onBack,
}) => {
  const estimatedMl = hydration.ml > 0 ? Math.min(hydration.ml, WATER_MAX_ML) : 0;
  const [ml, setMl] = useState(estimatedMl > 0 ? estimatedMl : FALLBACK_ML);
  const [confirming, setConfirming] = useState(false);

  // A análise pode chegar depois da tela (o scan abre assim que a foto é escolhida).
  useEffect(() => {
    if (estimatedMl > 0) setMl(estimatedMl);
  }, [estimatedMl]);

  const clamp = (value: number) => Math.max(STEP_ML, Math.min(WATER_MAX_ML, value));
  const adjust = (delta: number) => setMl(prev => clamp(Math.round(prev / STEP_ML) * STEP_ML + delta));

  const handleConfirm = async () => {
    if (confirming) return;
    setConfirming(true);
    try {
      // Ajustou a estimativa = a leitura do recipiente errou (sinal negativo p/ o Telê).
      await onConfirm(ml, ml !== estimatedMl);
    } finally {
      // Libera o botão também quando o registro falha — senão o spinner trava.
      setConfirming(false);
    }
  };

  return (
    <div className="flex flex-col h-full font-body overflow-hidden" style={{ background: BG_CREAM }}>
      <header
        className="flex items-center px-4 py-3 justify-between shrink-0 z-30"
        style={{ background: BG_CREAM, borderBottom: '1px solid #f5f5f4' }}
      >
        <div className="w-9" />
        <h2
          className="text-base tracking-[0.2em] uppercase"
          style={{ fontFamily: "'Playfair Display', serif", color: MALAMA_RED }}
        >
          Malama Scan
        </h2>
        <button
          onClick={onBack}
          className="flex size-9 items-center justify-center rounded-full bg-stone-50 text-stone-400 hover:bg-stone-100 transition-all active:scale-95"
        >
          <span className="material-symbols-outlined text-xl">close</span>
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 pb-28 pt-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col w-full max-w-md mx-auto"
        >
          {/* Foto */}
          <div className="relative w-full aspect-[4/3] rounded-[20px] overflow-hidden shadow-[0_4px_20px_rgb(0,0,0,0.08)] bg-stone-100 border border-stone-200">
            <img src={imageUri} alt="Água" className="w-full h-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
            <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-white text-[11px] font-medium tracking-wide uppercase shadow-sm" style={{ background: WATER_BLUE }}>
              <span className="material-symbols-outlined text-[15px]">water_drop</span>
              Hidratação
            </div>
            <div className="absolute bottom-0 inset-x-0 px-4 pb-3 pt-6">
              <h1 className="text-2xl text-white leading-tight drop-shadow-md" style={{ fontFamily: "'Playfair Display', serif" }}>
                {hydration.label}
              </h1>
            </div>
          </div>

          {/* Quantidade */}
          <div className="mt-3 bg-white rounded-2xl border border-stone-100 shadow-sm px-4 py-5">
            <p className="text-[10px] font-light text-stone-400 uppercase tracking-widest text-center">
              Quanto você bebeu?
            </p>

            <div className="mt-3 flex items-center justify-center gap-5">
              <button
                onClick={() => adjust(-STEP_ML)}
                disabled={ml <= STEP_ML}
                className="flex size-11 items-center justify-center rounded-full bg-stone-50 border border-stone-200 text-stone-500 active:scale-95 transition-all disabled:opacity-30"
                aria-label="Diminuir"
              >
                <span className="material-symbols-outlined text-xl">remove</span>
              </button>

              <div className="flex items-baseline gap-1 min-w-[130px] justify-center">
                <span className="text-5xl text-stone-800" style={{ fontFamily: "'Playfair Display', serif" }}>{ml}</span>
                <span className="text-sm text-stone-400 font-light">ml</span>
              </div>

              <button
                onClick={() => adjust(STEP_ML)}
                disabled={ml >= WATER_MAX_ML}
                className="flex size-11 items-center justify-center rounded-full bg-stone-50 border border-stone-200 text-stone-500 active:scale-95 transition-all disabled:opacity-30"
                aria-label="Aumentar"
              >
                <span className="material-symbols-outlined text-xl">add</span>
              </button>
            </div>

            <p className="mt-2 text-center text-[11px] font-light text-stone-400">
              {estimatedMl > 0
                ? 'Estimativa pela foto — ajuste se precisar.'
                : 'Não consegui estimar pela foto. Confirme a quantidade.'}
            </p>

            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {PRESETS.map(preset => (
                <button
                  key={preset}
                  onClick={() => setMl(preset)}
                  className="rounded-full px-3.5 py-1.5 text-xs font-light border transition-all active:scale-95"
                  style={
                    ml === preset
                      ? { background: WATER_BLUE, borderColor: WATER_BLUE, color: '#fff' }
                      : { background: '#fafaf9', borderColor: '#e7e5e4', color: '#78716c' }
                  }
                >
                  {preset >= 1000 ? `${preset / 1000} L` : `${preset} ml`}
                </button>
              ))}
            </div>
          </div>

          {hydration.message && (
            <div className="mt-3 bg-white rounded-2xl border border-stone-100 shadow-sm px-4 py-3.5">
              <p className="text-sm text-stone-600 font-light leading-relaxed">{hydration.message}</p>
            </div>
          )}

          <button
            onClick={onNotWater}
            className="mt-3 text-xs font-light text-stone-400 underline underline-offset-4 py-2 active:scale-[0.99] transition-all"
          >
            Não é água — analisar como refeição
          </button>
        </motion.div>
      </div>

      {/* Controles */}
      <div className="fixed bottom-0 left-0 w-full bg-gradient-to-t from-[#FDFBF9] via-[#FDFBF9]/95 to-transparent px-4 pb-8 pt-6 z-40">
        <div className="flex gap-3 max-w-md mx-auto">
          <button
            onClick={handleConfirm}
            disabled={confirming}
            className="w-full py-3.5 rounded-2xl text-white text-base font-light tracking-wider flex items-center justify-center gap-2 hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-50"
            style={{ background: WATER_BLUE }}
          >
            {confirming ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span className="material-symbols-outlined text-xl">water_drop</span>
                Registrar hidratação
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
