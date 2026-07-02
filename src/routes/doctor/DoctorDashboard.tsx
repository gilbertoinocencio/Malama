// =====================================================
// Malama — Dashboard do Médico
// =====================================================

import React, { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { Calendar, Clock, DollarSign, User, Video, UserPlus, Users, Timer } from 'lucide-react';
import { dashboardService, consultationService } from '../../services/doctorPortalService';
import type { Doctor, Consultation, DashboardSummary, AdvancedDashboardData } from '../../types/doctorPortal';
import { ConsultationStatus } from '../../types/doctorPortal';
import { DashboardAdvancedMetrics } from './DashboardAdvancedMetrics';

export const DoctorDashboard: React.FC = () => {
  const { doctor } = useOutletContext<{ doctor: Doctor }>();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [upcomingConsultations, setUpcomingConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [advancedData, setAdvancedData] = useState<AdvancedDashboardData | null>(null);
  const [advancedLoading, setAdvancedLoading] = useState(true);
  const [, setTick] = useState(0);

  // Reavalia a janela de entrada a cada 30s para o botão "Entrar"
  // ativar/desativar sozinho, sem precisar recarregar a página.
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      if (!doctor) return;

      try {
        const [summaryData, consultations] = await Promise.all([
          dashboardService.getSummary(doctor.id),
          consultationService.getDoctorConsultations(doctor.id, {
            status: ConsultationStatus.SCHEDULED,
            limit: 5
          })
        ]);

        setSummary(summaryData);
        setUpcomingConsultations(consultations);
      } catch (error) {
        console.error('Error loading dashboard:', error);
      } finally {
        setLoading(false);
      }

      // Load advanced metrics separately (heavier queries)
      try {
        const advanced = await dashboardService.getAdvancedData(doctor.id);
        setAdvancedData(advanced);
      } catch (error) {
        console.error('Error loading advanced dashboard data:', error);
      } finally {
        setAdvancedLoading(false);
      }
    };

    loadData();
  }, [doctor]);

  const formatConsultationTime = (scheduledAt: string) => {
    const date = new Date(scheduledAt);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isTomorrow = date.toDateString() === new Date(now.getTime() + 86400000).toDateString();

    const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    if (isToday) return `Hoje às ${time}`;
    if (isTomorrow) return `Amanhã às ${time}`;
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) + ` às ${time}`;
  };

  const getConsultationTypeLabel = (type: string) => {
    switch (type) {
      case 'initial': return 'Inicial';
      case 'follow_up': return 'Retorno';
      case 'prescription_renewal': return 'Renovação';
      default: return type;
    }
  };

  // Alinhado ao gate da sala (ConsultationRoom): abre 15 min antes e fecha
  // 30 min após o horário sem a consulta iniciar (vira no-show).
  const isConsultationAvailable = (scheduledAt: string) => {
    const diffMs = new Date(scheduledAt).getTime() - Date.now();
    return diffMs <= 15 * 60 * 1000 && diffMs >= -30 * 60 * 1000;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7d4a3c]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cards de resumo principais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-[#7d4a3c]/10 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-[#7d4a3c]" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-800">{summary?.todayConsultations || 0}</p>
          <p className="text-gray-600 text-sm">Consultas hoje</p>
          <Link to="/medico/agenda" className="text-[#7d4a3c] text-sm hover:underline mt-2 inline-block">
            Ver agenda →
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-800">{summary?.weekConsultations || 0}</p>
          <p className="text-gray-600 text-sm">Esta semana</p>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-800">
            {formatCurrency(summary?.pendingReceivable || 0)}
          </p>
          <p className="text-gray-600 text-sm">A receber</p>
        </div>
      </div>

      {/* Cards de métricas secundárias */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-indigo-100 flex items-center justify-center">
              <UserPlus className="w-6 h-6 text-indigo-600" />
            </div>
            {summary?.newPatientsCount !== undefined && (
              <span className="text-sm font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">
                {summary.newPatientsPercentage}% do total
              </span>
            )}
          </div>
          <p className="text-3xl font-bold text-gray-800">{summary?.newPatientsCount || 0}</p>
          <p className="text-gray-600 text-sm">Novos pacientes</p>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center">
              <Users className="w-6 h-6 text-orange-600" />
            </div>
            {summary?.recurringPatientsCount !== undefined && (
              <span className="text-sm font-medium text-orange-600 bg-orange-50 px-2 py-1 rounded-full">
                {summary.recurringPatientsPercentage}% do total
              </span>
            )}
          </div>
          <p className="text-3xl font-bold text-gray-800">{summary?.recurringPatientsCount || 0}</p>
          <p className="text-gray-600 text-sm">Pacientes recorrentes</p>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-teal-100 flex items-center justify-center">
              <Timer className="w-6 h-6 text-teal-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-800">
            {summary?.averageConsultationTime || 0}
            <span className="text-lg text-gray-500 font-normal ml-1">min</span>
          </p>
          <p className="text-gray-600 text-sm">Tempo médio de consulta</p>
        </div>
      </div>

      {/* Métricas Avançadas */}
      <DashboardAdvancedMetrics data={advancedData ?? {
        alertPatients: [],
        avgWeightLossKg: 0,
        retentionRate: 0,
        avgAdherence: 0,
        avgMood: 0,
        totalReferred: 0,
        referredScheduled: 0,
        conversionRate: 0,
        referredThisMonth: 0,
      }} loading={advancedLoading} />

      {/* Próximas consultas */}
      <div className="bg-white rounded-xl shadow">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800">Próximas consultas</h3>
        </div>

        {upcomingConsultations.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <Calendar className="w-10 h-10 text-gray-400" />
            </div>
            <p className="text-gray-600">Nenhuma consulta agendada</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {upcomingConsultations.map(consultation => {
              const available = isConsultationAvailable(consultation.scheduled_at);

              return (
                <div key={consultation.id} className="p-4 flex items-center gap-4">
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full bg-[#7d4a3c] flex items-center justify-center text-white font-semibold flex-shrink-0">
                    {consultation.patient_name?.charAt(0) || 'P'}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 truncate">{consultation.patient_name || 'Paciente'}</p>
                    <p className="text-sm text-gray-600">{formatConsultationTime(consultation.scheduled_at)}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 bg-[#7d4a3c]/10 text-[#7d4a3c] text-xs rounded-full">
                      {getConsultationTypeLabel(consultation.type)}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Link
                      to={`/medico/paciente/${consultation.patient_id}`}
                      className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition"
                    >
                      <User className="w-4 h-4" />
                    </Link>
                    {available ? (
                      <Link
                        to={`/medico/consulta/${consultation.id}`}
                        className="px-4 py-2 text-sm rounded-lg transition flex items-center gap-2 bg-[#7d4a3c] hover:bg-[#623a2f] text-white"
                        title="Entrar na consulta"
                      >
                        <Video className="w-4 h-4" />
                        <span className="hidden sm:inline">Entrar</span>
                      </Link>
                    ) : (
                      /* Fora da janela: elemento inerte — antes era um Link "desabilitado"
                         só no estilo, que ainda navegava e abria a sala */
                      <span
                        className="px-4 py-2 text-sm rounded-lg flex items-center gap-2 bg-gray-100 text-gray-400 cursor-not-allowed select-none"
                        title="Disponível 15 min antes do horário"
                        aria-disabled="true"
                      >
                        <Video className="w-4 h-4" />
                        <span className="hidden sm:inline">Entrar</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
