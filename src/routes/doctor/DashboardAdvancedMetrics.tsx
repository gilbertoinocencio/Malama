// =====================================================
// Malama — Dashboard Avançado do Médico
// 4 seções: Alertas, Sucesso Clínico, Engajamento, Funil
// =====================================================

import React from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, TrendingDown, Activity, Smile,
  UserCheck, ArrowRight, Users, Percent,
  CheckCircle, Scale, Utensils, Link2
} from 'lucide-react';
import type { AdvancedDashboardData, AlertPatient } from '../../types/doctorPortal';

interface Props {
  data: AdvancedDashboardData;
  loading: boolean;
}

const ALERT_CONFIG = {
  symptom: {
    label: 'Sintoma crítico',
    color: 'bg-red-50 border-red-200',
    badge: 'bg-red-100 text-red-700',
    icon: <AlertTriangle className="w-4 h-4 text-red-500" />,
    dot: 'bg-red-500',
  },
  low_adherence: {
    label: 'Baixa adesão',
    color: 'bg-amber-50 border-amber-200',
    badge: 'bg-amber-100 text-amber-700',
    icon: <Utensils className="w-4 h-4 text-amber-500" />,
    dot: 'bg-amber-500',
  },
  weight_stagnation: {
    label: 'Estagnação de peso',
    color: 'bg-orange-50 border-orange-200',
    badge: 'bg-orange-100 text-orange-700',
    icon: <Scale className="w-4 h-4 text-orange-500" />,
    dot: 'bg-orange-500',
  },
};

const MoodLabel = ({ value }: { value: number }) => {
  if (value === 0) return <span className="text-gray-400">—</span>;
  const labels = ['', '😞 Péssimo', '😕 Ruim', '😐 Neutro', '🙂 Bom', '😄 Excelente'];
  const idx = Math.round(value);
  return <span>{labels[idx] ?? `${value}/5`}</span>;
};

const ProgressBar = ({ value, max, color }: { value: number; max: number; color: string }) => {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="mt-2">
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>{value} de {max}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

const AlertCard = ({ patient }: { patient: AlertPatient }) => {
  const cfg = ALERT_CONFIG[patient.alertType];
  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border ${cfg.color}`}>
      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0 bg-[#7d4a3c]`}>
        {patient.name.charAt(0)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-gray-800 text-sm">{patient.name}</p>
          <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${cfg.badge}`}>
            {cfg.label}
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-0.5 truncate">{patient.detail}</p>
      </div>
      <Link
        to={`/medico/paciente/${patient.id}`}
        className="flex-shrink-0 p-1.5 rounded-lg hover:bg-white transition text-gray-400 hover:text-gray-700"
        title="Ver paciente"
      >
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
};

export const DashboardAdvancedMetrics: React.FC<Props> = ({ data, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white rounded-xl shadow p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-4" />
            <div className="space-y-3">
              <div className="h-8 bg-gray-100 rounded" />
              <div className="h-8 bg-gray-100 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* ── Linha 1: Alertas + Sucesso Clínico ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Alertas de Atenção */}
        <div className="bg-white rounded-xl shadow">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-red-500" />
              </div>
              <h3 className="font-semibold text-gray-800">Alertas de Atenção</h3>
              {data.alertPatients.length > 0 && (
                <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-medium">
                  {data.alertPatients.length}
                </span>
              )}
            </div>
          </div>
          <div className="p-5">
            {data.alertPatients.length === 0 ? (
              <div className="flex flex-col items-center py-6 text-center">
                <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mb-3">
                  <CheckCircle className="w-6 h-6 text-green-500" />
                </div>
                <p className="text-sm font-medium text-gray-700">Tudo certo!</p>
                <p className="text-xs text-gray-400 mt-1">Nenhum paciente requer atenção imediata</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {data.alertPatients.map(p => (
                  <React.Fragment key={`${p.id}-${p.alertType}`}>
                    <AlertCard patient={p} />
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sucesso Clínico */}
        <div className="bg-white rounded-xl shadow">
          <div className="p-5 border-b border-gray-100 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <TrendingDown className="w-4 h-4 text-emerald-600" />
            </div>
            <h3 className="font-semibold text-gray-800">Sucesso Clínico</h3>
          </div>
          <div className="p-5 space-y-5">
            {/* Perda de peso média */}
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">
                Perda de peso média (30 dias)
              </p>
              <div className="flex items-end gap-2">
                <p className="text-3xl font-bold text-gray-800">
                  {data.avgWeightLossKg > 0 ? `-${data.avgWeightLossKg}` : '0'}
                  <span className="text-base text-gray-400 font-normal ml-1">kg</span>
                </p>
                {data.avgWeightLossKg > 0 && (
                  <span className="text-sm text-emerald-600 font-medium mb-1">↓ média dos pacientes ativos</span>
                )}
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4">
              {/* Taxa de retenção */}
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-2">
                Taxa de Retenção (retornos)
              </p>
              <div className="flex items-center gap-4">
                <div className="relative w-16 h-16 flex-shrink-0">
                  <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f3f4f6" strokeWidth="3" />
                    <circle
                      cx="18" cy="18" r="15.9" fill="none"
                      stroke="#10b981" strokeWidth="3"
                      strokeDasharray={`${data.retentionRate} 100`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-800">
                    {data.retentionRate}%
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-600">dos pacientes voltaram para pelo menos uma consulta de retorno</p>
                  <p className="text-xs text-gray-400 mt-1">Baseado em consultas do tipo "Retorno"</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Linha 2: Engajamento + Funil ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Engajamento e Adesão */}
        <div className="bg-white rounded-xl shadow">
          <div className="p-5 border-b border-gray-100 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <Activity className="w-4 h-4 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-800">Engajamento e Adesão</h3>
          </div>
          <div className="p-5 space-y-5">
            {/* Adesão média */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Adesão média (30 dias)</p>
                <span className="text-lg font-bold text-gray-800">{data.avgAdherence}%</span>
              </div>
              <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-700"
                  style={{ width: `${data.avgAdherence}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">% de dias em que os pacientes registraram refeições</p>
            </div>

            <div className="border-t border-gray-100 pt-4">
              {/* Humor médio */}
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-3">
                Humor médio dos pacientes (7 dias)
              </p>
              <div className="flex items-center gap-4">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(n => (
                    <div
                      key={n}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-lg transition-all ${
                        n <= Math.round(data.avgMood)
                          ? 'bg-blue-100 scale-110'
                          : 'bg-gray-50 opacity-40'
                      }`}
                    >
                      {['😞', '😕', '😐', '🙂', '😄'][n - 1]}
                    </div>
                  ))}
                </div>
                <div>
                  <p className="font-semibold text-gray-700"><MoodLabel value={data.avgMood} /></p>
                  <p className="text-xs text-gray-400">{data.avgMood > 0 ? `${data.avgMood}/5 em média` : 'Sem checkins recentes'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Funil de Conversão */}
        <div className="bg-white rounded-xl shadow">
          <div className="p-5 border-b border-gray-100 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
              <Link2 className="w-4 h-4 text-indigo-600" />
            </div>
            <h3 className="font-semibold text-gray-800">Funil de Indicações</h3>
          </div>
          <div className="p-5 space-y-4">
            {/* Indicados este mês */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-indigo-50">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-500" />
                <span className="text-sm text-indigo-700 font-medium">Indicados este mês</span>
              </div>
              <span className="text-lg font-bold text-indigo-700">{data.referredThisMonth}</span>
            </div>

            {/* Etapas do funil */}
            <div className="space-y-3">
              {/* Total indicados */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
                    <span className="text-sm text-gray-600">Total indicados</span>
                  </div>
                  <span className="font-semibold text-gray-800">{data.totalReferred}</span>
                </div>
                <div className="h-2 rounded-full bg-indigo-100 overflow-hidden">
                  <div className="h-full rounded-full bg-indigo-400" style={{ width: '100%' }} />
                </div>
              </div>

              {/* Agendaram consulta */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                    <span className="text-sm text-gray-600">Agendaram consulta</span>
                  </div>
                  <span className="font-semibold text-gray-800">{data.referredScheduled}</span>
                </div>
                <div className="h-2 rounded-full bg-indigo-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-indigo-600 transition-all duration-700"
                    style={{ width: data.totalReferred > 0 ? `${(data.referredScheduled / data.totalReferred) * 100}%` : '0%' }}
                  />
                </div>
              </div>
            </div>

            {/* Taxa de conversão */}
            <div className="mt-2 flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100">
              <div className="flex items-center gap-2">
                <Percent className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600 font-medium">Taxa de conversão</span>
              </div>
              <span className={`text-xl font-bold ${data.conversionRate >= 50 ? 'text-emerald-600' : data.conversionRate >= 25 ? 'text-amber-600' : 'text-gray-800'}`}>
                {data.conversionRate}%
              </span>
            </div>

            {data.totalReferred === 0 && (
              <p className="text-xs text-gray-400 text-center pt-2">
                Compartilhe seu link de indicação para começar a rastrear conversões
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
