import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { BodyAnalysisService, BodyScan } from '../services/bodyAnalysisService';

// Helper to format dates in Portuguese
const formatDate = (dateStr: string, formatType: 'short' | 'long' = 'short'): string => {
  const date = new Date(dateStr);
  if (formatType === 'short') {
    return date.toLocaleDateString('pt-BR');
  }
  return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
};

const formatTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

const formatDateTime = (dateStr: string): string => {
  return `${formatDate(dateStr)} ${formatTime(dateStr)}`;
};

interface BodyProgressTimelineProps {
  onClose: () => void;
  onNewScan?: () => void;
}

type ViewMode = 'timeline' | 'comparison' | 'stats';
type PoseFilter = 'all' | 'front' | 'side' | 'back';

export const BodyProgressTimeline: React.FC<BodyProgressTimelineProps> = ({
  onClose,
  onNewScan
}) => {
  const { user } = useAuth();

  const [scans, setScans] = useState<BodyScan[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const [poseFilter, setPoseFilter] = useState<PoseFilter>('front');
  const [selectedScan, setSelectedScan] = useState<BodyScan | null>(null);
  const [compareWithScan, setCompareWithScan] = useState<BodyScan | null>(null);
  const [sliderPosition, setSliderPosition] = useState(50);
  const [ghostOpacity, setGhostOpacity] = useState(50);

  const containerRef = useRef<HTMLDivElement>(null);

  // Load user scans
  useEffect(() => {
    if (user) {
      loadScans();
    }
  }, [user, poseFilter]);

  const loadScans = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const allScans = await BodyAnalysisService.getUserScans(
        user.id,
        poseFilter === 'all' ? undefined : poseFilter
      );
      setScans(allScans);

      // Auto-select latest scan
      if (allScans.length > 0 && !selectedScan) {
        setSelectedScan(allScans[0]);
      }
    } catch (error) {
      console.error('Failed to load scans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (scanId: string) => {
    if (!window.confirm('Deseja realmente excluir esta foto?')) return;

    try {
      await BodyAnalysisService.deleteScan(scanId);
      setScans(prev => prev.filter(s => s.id !== scanId));
      if (selectedScan?.id === scanId) setSelectedScan(null);
      if (compareWithScan?.id === scanId) setCompareWithScan(null);
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Falha ao excluir. Tente novamente.');
    }
  };

  const filteredScans = scans.filter(scan =>
    poseFilter === 'all' ? true : scan.pose_type === poseFilter
  );

  const scansByPose = {
    front: scans.filter(s => s.pose_type === 'front'),
    side: scans.filter(s => s.pose_type === 'side'),
    back: scans.filter(s => s.pose_type === 'back')
  };

  // Calculate progress metrics
  const getProgressMetrics = () => {
    if (filteredScans.length < 2) return null;

    const latest = filteredScans[0];
    const oldest = filteredScans[filteredScans.length - 1];

    const bfChange = latest.body_fat_percentage - oldest.body_fat_percentage;
    const muscleChange = latest.muscle_mass_kg - oldest.muscle_mass_kg;
    const weightChange = latest.weight_kg - oldest.weight_kg;

    return {
      bodyFatChange: bfChange,
      muscleChange,
      weightChange,
      daysBetween: Math.floor(
        (new Date(latest.created_at).getTime() - new Date(oldest.created_at).getTime()) /
        (1000 * 60 * 60 * 24)
      )
    };
  };

  const progress = getProgressMetrics();

  return (
    <div className="fixed inset-0 z-50 bg-background-dark flex flex-col pt-safe">
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
          <span className="material-symbols-outlined text-primary">timeline</span>
          <h1 className="text-white font-bold">Progresso Corporal</h1>
        </div>
        <button
          onClick={onNewScan}
          className="flex items-center gap-1 bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1.5 rounded-lg transition-colors"
        >
          <span className="material-symbols-outlined text-sm">add_photo_alternate</span>
          <span className="text-xs font-medium">Novo</span>
        </button>
      </div>

      {/* View Mode Tabs */}
      <div className="flex items-center gap-2 px-4 py-3 bg-surface-dark/50 border-b border-white/5 overflow-x-auto">
        {[
          { mode: 'timeline' as ViewMode, icon: 'view_list', label: 'Linha do Tempo' },
          { mode: 'comparison' as ViewMode, icon: 'compare', label: 'Comparar' },
          { mode: 'stats' as ViewMode, icon: 'insights', label: 'Estatísticas' }
        ].map(tab => (
          <button
            key={tab.mode}
            onClick={() => setViewMode(tab.mode)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
              viewMode === tab.mode
                ? 'bg-primary text-white'
                : 'bg-surface-dark text-white/60 hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-sm">{tab.icon}</span>
            <span className="text-xs font-medium">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Pose Filter */}
      <div className="flex items-center gap-2 px-4 py-2 bg-surface-dark/30 overflow-x-auto">
        <span className="text-white/60 text-xs font-medium mr-2">Filtrar:</span>
        {[
          { pose: 'all' as PoseFilter, label: 'Todas', count: scans.length },
          { pose: 'front' as PoseFilter, label: 'Frontal', count: scansByPose.front.length },
          { pose: 'side' as PoseFilter, label: 'Lateral', count: scansByPose.side.length },
          { pose: 'back' as PoseFilter, label: 'Costas', count: scansByPose.back.length }
        ].map(filter => (
          <button
            key={filter.pose}
            onClick={() => setPoseFilter(filter.pose)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
              poseFilter === filter.pose
                ? 'bg-primary text-white'
                : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            {filter.label} {filter.count > 0 && `(${filter.count})`}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto" ref={containerRef}>
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : filteredScans.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-6 text-center">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-primary text-4xl">photo_camera</span>
            </div>
            <h2 className="text-white font-bold text-lg mb-2">Nenhuma foto ainda</h2>
            <p className="text-white/60 text-sm mb-6">
              Tire sua primeira foto para começar a acompanhar seu progresso
            </p>
            <button
              onClick={onNewScan}
              className="bg-primary hover:bg-primary-dark text-white font-bold px-6 py-3 rounded-xl transition-colors"
            >
              Tirar Primeira Foto
            </button>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {/* Timeline View */}
            {viewMode === 'timeline' && (
              <motion.div
                key="timeline"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="p-4 space-y-4"
              >
                {filteredScans.map((scan, idx) => (
                  <motion.div
                    key={scan.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-surface-dark rounded-xl overflow-hidden border border-white/5 hover:border-primary/30 transition-colors"
                  >
                    <div className="flex gap-4 p-4">
                      {/* Photo Thumbnail */}
                      <div
                        onClick={() => setSelectedScan(scan)}
                        className="relative w-24 h-32 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                      >
                        <img
                          src={scan.photo_url}
                          alt={`${scan.pose_type} - ${formatDate(scan.created_at)}`}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute bottom-1 left-1 right-1">
                          <div className="bg-black/70 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] text-white text-center capitalize">
                            {scan.pose_type}
                          </div>
                        </div>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="text-white font-semibold text-sm">
                              {formatDate(scan.created_at, 'long')}
                            </p>
                            <p className="text-white/50 text-xs">
                              {formatTime(scan.created_at)}
                            </p>
                          </div>
                          <button
                            onClick={() => handleDelete(scan.id)}
                            className="text-white/40 hover:text-red-400 transition-colors"
                          >
                            <span className="material-symbols-outlined text-sm">delete</span>
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-black/20 rounded-lg px-2 py-1.5">
                            <p className="text-white/50 text-[10px] mb-0.5">Gordura</p>
                            <p className="text-white font-bold text-sm">
                              {scan.body_fat_percentage.toFixed(1)}%
                            </p>
                          </div>
                          <div className="bg-black/20 rounded-lg px-2 py-1.5">
                            <p className="text-white/50 text-[10px] mb-0.5">Músculo</p>
                            <p className="text-white font-bold text-sm">
                              {scan.muscle_mass_kg.toFixed(1)} kg
                            </p>
                          </div>
                        </div>

                        {scan.ai_score && (
                          <div className="mt-2 flex items-center gap-1">
                            <span className="material-symbols-outlined text-primary text-xs">star</span>
                            <span className="text-white/60 text-xs">
                              Qualidade: {scan.ai_score}/100
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex border-t border-white/5">
                      <button
                        onClick={() => {
                          setSelectedScan(scan);
                          setViewMode('comparison');
                        }}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 text-white/60 hover:text-primary hover:bg-primary/5 transition-colors"
                      >
                        <span className="material-symbols-outlined text-sm">compare</span>
                        <span className="text-xs font-medium">Comparar</span>
                      </button>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}

            {/* Comparison View */}
            {viewMode === 'comparison' && (
              <motion.div
                key="comparison"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="p-4 space-y-4"
              >
                {/* Photo Selector */}
                <div className="bg-surface-dark rounded-xl p-4 border border-white/5">
                  <h3 className="text-white font-semibold text-sm mb-3">Selecione as fotos para comparar:</h3>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    {/* Current Photo */}
                    <div>
                      <p className="text-white/60 text-xs mb-2">Foto Atual:</p>
                      <select
                        value={selectedScan?.id || ''}
                        onChange={(e) => {
                          const scan = filteredScans.find(s => s.id === e.target.value);
                          setSelectedScan(scan || null);
                        }}
                        className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-primary"
                      >
                        <option value="">Selecione...</option>
                        {filteredScans.map(scan => (
                          <option key={scan.id} value={scan.id}>
                            {formatDateTime(scan.created_at)}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Compare With */}
                    <div>
                      <p className="text-white/60 text-xs mb-2">Comparar com:</p>
                      <select
                        value={compareWithScan?.id || ''}
                        onChange={(e) => {
                          const scan = filteredScans.find(s => s.id === e.target.value);
                          setCompareWithScan(scan || null);
                        }}
                        className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-primary"
                      >
                        <option value="">Selecione...</option>
                        {filteredScans
                          .filter(s => s.id !== selectedScan?.id)
                          .map(scan => (
                            <option key={scan.id} value={scan.id}>
                              {formatDateTime(scan.created_at)}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>

                  {/* Opacity Slider */}
                  {selectedScan && compareWithScan && (
                    <div className="mt-3 pt-3 border-t border-white/5">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-white/60 text-xs">Transparência da Foto Antiga:</label>
                        <span className="text-white text-xs font-bold">{ghostOpacity}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={ghostOpacity}
                        onChange={(e) => setGhostOpacity(Number(e.target.value))}
                        className="w-full accent-primary"
                      />
                    </div>
                  )}
                </div>

                {/* Ghost Overlay Comparison */}
                {selectedScan && compareWithScan && (
                  <div className="bg-surface-dark rounded-xl overflow-hidden border border-white/5">
                    <div className="relative aspect-[3/4] bg-black">
                      {/* Base Image (Current) */}
                      <img
                        src={selectedScan.photo_url}
                        alt="Current"
                        className="absolute inset-0 w-full h-full object-cover"
                      />

                      {/* Ghost Overlay (Old) */}
                      <img
                        src={compareWithScan.photo_url}
                        alt="Previous"
                        className="absolute inset-0 w-full h-full object-cover mix-blend-lighten"
                        style={{ opacity: ghostOpacity / 100 }}
                      />

                      {/* Labels */}
                      <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                        <div className="bg-black/70 backdrop-blur-sm px-3 py-1.5 rounded-full">
                          <p className="text-white text-xs font-medium">
                            {formatDate(selectedScan.created_at)}
                          </p>
                        </div>
                        <div className="bg-primary/70 backdrop-blur-sm px-3 py-1.5 rounded-full">
                          <p className="text-white text-xs font-medium">
                            {formatDate(compareWithScan.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Metrics Comparison */}
                    <div className="p-4 space-y-3">
                      {/* Body Fat */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-white/60 text-xs">Gordura Corporal</span>
                          {selectedScan.body_fat_percentage !== compareWithScan.body_fat_percentage && (
                            <span className={`text-xs font-bold ${
                              selectedScan.body_fat_percentage < compareWithScan.body_fat_percentage
                                ? 'text-green-400'
                                : 'text-red-400'
                            }`}>
                              {selectedScan.body_fat_percentage < compareWithScan.body_fat_percentage ? '↓' : '↑'}
                              {Math.abs(selectedScan.body_fat_percentage - compareWithScan.body_fat_percentage).toFixed(1)}%
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <div className="flex-1 bg-black/20 rounded px-2 py-1">
                            <p className="text-white text-sm font-bold">
                              {selectedScan.body_fat_percentage.toFixed(1)}%
                            </p>
                          </div>
                          <div className="flex-1 bg-primary/10 rounded px-2 py-1">
                            <p className="text-primary text-sm font-bold">
                              {compareWithScan.body_fat_percentage.toFixed(1)}%
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Muscle Mass */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-white/60 text-xs">Massa Muscular</span>
                          {selectedScan.muscle_mass_kg !== compareWithScan.muscle_mass_kg && (
                            <span className={`text-xs font-bold ${
                              selectedScan.muscle_mass_kg > compareWithScan.muscle_mass_kg
                                ? 'text-green-400'
                                : 'text-red-400'
                            }`}>
                              {selectedScan.muscle_mass_kg > compareWithScan.muscle_mass_kg ? '↑' : '↓'}
                              {Math.abs(selectedScan.muscle_mass_kg - compareWithScan.muscle_mass_kg).toFixed(2)} kg
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <div className="flex-1 bg-black/20 rounded px-2 py-1">
                            <p className="text-white text-sm font-bold">
                              {selectedScan.muscle_mass_kg.toFixed(1)} kg
                            </p>
                          </div>
                          <div className="flex-1 bg-primary/10 rounded px-2 py-1">
                            <p className="text-primary text-sm font-bold">
                              {compareWithScan.muscle_mass_kg.toFixed(1)} kg
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Stats View */}
            {viewMode === 'stats' && progress && (
              <motion.div
                key="stats"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="p-4 space-y-4"
              >
                {/* Progress Summary */}
                <div className="bg-gradient-to-br from-primary/10 to-blue-500/10 border border-primary/20 rounded-xl p-4">
                  <h3 className="text-primary font-bold mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined">trending_up</span>
                    Progresso Total
                  </h3>
                  <p className="text-white/60 text-sm mb-4">
                    {progress.daysBetween} dias de evolução
                  </p>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-black/20 rounded-lg p-3 text-center">
                      <span className={`text-2xl font-bold block mb-1 ${
                        progress.bodyFatChange < 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {progress.bodyFatChange > 0 ? '+' : ''}{progress.bodyFatChange.toFixed(1)}%
                      </span>
                      <span className="text-white/60 text-[10px]">Gordura</span>
                    </div>
                    <div className="bg-black/20 rounded-lg p-3 text-center">
                      <span className={`text-2xl font-bold block mb-1 ${
                        progress.muscleChange > 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {progress.muscleChange > 0 ? '+' : ''}{progress.muscleChange.toFixed(1)}
                      </span>
                      <span className="text-white/60 text-[10px]">Músculo (kg)</span>
                    </div>
                    <div className="bg-black/20 rounded-lg p-3 text-center">
                      <span className="text-white text-2xl font-bold block mb-1">
                        {progress.weightChange > 0 ? '+' : ''}{progress.weightChange.toFixed(1)}
                      </span>
                      <span className="text-white/60 text-[10px]">Peso (kg)</span>
                    </div>
                  </div>
                </div>

                {/* Scan History Chart */}
                <div className="bg-surface-dark rounded-xl p-4 border border-white/5">
                  <h3 className="text-white font-semibold text-sm mb-3">Histórico de Scans</h3>
                  <p className="text-white/60 text-xs mb-4">Total: {filteredScans.length} fotos</p>

                  <div className="space-y-2">
                    {filteredScans.slice(0, 5).map((scan, idx) => (
                      <div key={scan.id} className="flex items-center gap-3">
                        <div className="w-12 h-16 rounded overflow-hidden flex-shrink-0">
                          <img
                            src={scan.photo_url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1">
                          <p className="text-white text-xs font-medium">
                            {formatDate(scan.created_at)}
                          </p>
                          <p className="text-white/50 text-[10px]">
                            {scan.body_fat_percentage.toFixed(1)}% BF • {scan.muscle_mass_kg.toFixed(1)}kg MM
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};
