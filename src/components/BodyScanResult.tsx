import React from 'react';
import { motion } from 'framer-motion';
import { BodyAnalysisResult } from '../services/bodyAnalysisService';

interface BodyScanResultProps {
  result: BodyAnalysisResult;
  poseType: 'front' | 'side' | 'back';
  imageData: string;
}

export const BodyScanResult: React.FC<BodyScanResultProps> = ({
  result,
  poseType,
  imageData
}) => {
  // Calculate quality level
  const getQualityLevel = (score: number) => {
    if (score >= 85) return { label: 'Excelente', color: 'text-green-400', bg: 'bg-green-400/10' };
    if (score >= 70) return { label: 'Muito Bom', color: 'text-blue-400', bg: 'bg-blue-400/10' };
    if (score >= 50) return { label: 'Bom', color: 'text-yellow-400', bg: 'bg-yellow-400/10' };
    return { label: 'Pode Melhorar', color: 'text-orange-400', bg: 'bg-orange-400/10' };
  };

  // Get body fat category
  const getBodyFatCategory = (bf: number, biotype: string) => {
    // Simplified for males (adjust for females)
    if (bf < 6) return { label: 'Essencial', color: 'text-red-400' };
    if (bf < 14) return { label: 'Atleta', color: 'text-green-400' };
    if (bf < 18) return { label: 'Fitness', color: 'text-blue-400' };
    if (bf < 25) return { label: 'Média', color: 'text-yellow-400' };
    return { label: 'Acima da Média', color: 'text-orange-400' };
  };

  // Get biotype info
  const getBiotypeInfo = (biotype: string) => {
    const biotypeMap = {
      ecto: { label: 'Ectomorfo', icon: 'trending_up', desc: 'Magro, metabolismo rápido' },
      meso: { label: 'Mesomorfo', icon: 'fitness_center', desc: 'Atlético, ganha músculo fácil' },
      endo: { label: 'Endomorfo', icon: 'circle', desc: 'Estrutura mais larga, ganha peso fácil' }
    };
    return biotypeMap[biotype as keyof typeof biotypeMap] || biotypeMap.meso;
  };

  const quality = getQualityLevel(result.aiScore);
  const bfCategory = getBodyFatCategory(result.bodyFatPercentage, result.detectedBiotype);
  const biotypeInfo = getBiotypeInfo(result.detectedBiotype);

  return (
    <div className="space-y-4">
      {/* Photo Preview */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative rounded-2xl overflow-hidden aspect-[3/4] bg-surface-dark"
      >
        <img
          src={imageData}
          alt={`${poseType} pose`}
          className="w-full h-full object-cover"
        />

        {/* Quality Badge */}
        <div className="absolute top-3 right-3">
          <div className={`${quality.bg} backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10`}>
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm" style={{ color: quality.color.replace('text-', '') }}>
                photo_camera
              </span>
              <span className={`text-xs font-bold ${quality.color}`}>{result.aiScore}/100</span>
            </div>
          </div>
        </div>

        {/* Pose Label */}
        <div className="absolute bottom-3 left-3">
          <div className="bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
            <span className="text-white text-xs font-medium capitalize">{poseType}</span>
          </div>
        </div>
      </motion.div>

      {/* Quality Feedback */}
      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className={`${quality.bg} border border-white/10 rounded-xl p-4`}
      >
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <span className={`material-symbols-outlined ${quality.color}`}>
              {result.aiScore >= 70 ? 'check_circle' : 'info'}
            </span>
          </div>
          <div className="flex-1">
            <h3 className={`font-semibold mb-1 ${quality.color}`}>
              Qualidade: {quality.label}
            </h3>
            <p className="text-white/70 text-sm">{result.message}</p>
          </div>
        </div>
      </motion.div>

      {/* Main Metrics */}
      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-2 gap-3"
      >
        {/* Body Fat */}
        <div className="bg-surface-dark rounded-xl p-4 border border-white/5">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-orange-400 text-lg">local_fire_department</span>
            <span className="text-white/60 text-xs font-medium">Gordura Corporal</span>
          </div>
          <p className="text-2xl font-bold text-white mb-1">
            ≈{result.bodyFatPercentage.toFixed(0)}%
          </p>
          <p className={`text-xs font-medium ${bfCategory.color}`}>
            {bfCategory.label}
          </p>
          <p className="text-[10px] text-white/50 mt-1">
            Faixa orientativa: {Math.max(2, Math.round(result.bodyFatPercentage - 4))}–{Math.min(60, Math.round(result.bodyFatPercentage + 4))}%
          </p>
        </div>

        {/* Lean mass — legacy result field is named muscleMassKg */}
        <div className="bg-surface-dark rounded-xl p-4 border border-white/5">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-blue-400 text-lg">fitness_center</span>
            <span className="text-white/60 text-xs font-medium">Massa Magra Estimada</span>
          </div>
          <p className="text-2xl font-bold text-white mb-1">
            ≈{result.muscleMassKg.toFixed(0)}
            <span className="text-base text-white/60 ml-1">kg</span>
          </p>
          <p className="text-xs text-white/50">Não equivale à massa muscular esquelética</p>
        </div>
      </motion.div>

      {/* Biotype Detection */}
      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="bg-primary/10 border border-primary/20 rounded-xl p-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-primary">{biotypeInfo.icon}</span>
          </div>
          <div className="flex-1">
            <h3 className="text-primary font-semibold text-sm mb-0.5">
              Biotipo: {biotypeInfo.label}
            </h3>
            <p className="text-white/70 text-xs">{biotypeInfo.desc}</p>
          </div>
        </div>
      </motion.div>

      {/* Tips Section */}
      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="bg-gradient-to-br from-primary/10 to-blue-500/10 border border-primary/20 rounded-xl p-4"
      >
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-primary text-lg flex-shrink-0">tips_and_updates</span>
          <div>
            <h3 className="text-primary font-semibold text-sm mb-2">Dicas para Próxima Foto</h3>
            <ul className="space-y-1.5">
              <li className="text-white/70 text-xs flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                Sempre use as mesmas condições (roupa, horário, local)
              </li>
              <li className="text-white/70 text-xs flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                Tire fotos semanalmente ou quinzenalmente
              </li>
              <li className="text-white/70 text-xs flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                Mantenha a mesma pose para facilitar comparação
              </li>
            </ul>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
