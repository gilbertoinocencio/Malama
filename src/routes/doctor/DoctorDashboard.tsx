// =====================================================
// NURA — Dashboard do Médico
// =====================================================

import React, { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { Calendar, Clock, DollarSign, User, Video } from 'lucide-react';
import { dashboardService, consultationService } from '../../services/doctorPortalService';
import type { Doctor, Consultation, DashboardSummary } from '../../types/doctorPortal';
import { ConsultationStatus } from '../../types/doctorPortal';

export const DoctorDashboard: React.FC = () => {
  const { doctor } = useOutletContext<{ doctor: Doctor }>();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [upcomingConsultations, setUpcomingConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);

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

  const isConsultationAvailable = (scheduledAt: string) => {
    const now = new Date();
    const consultDate = new Date(scheduledAt);
    const diffMs = consultDate.getTime() - now.getTime();
    return diffMs <= 10 * 60 * 1000 && diffMs >= 0; // 10 minutos antes
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2ECC71]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cards de resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-[#2ECC71]/10 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-[#2ECC71]" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-800">{summary?.todayConsultations || 0}</p>
          <p className="text-gray-600 text-sm">Consultas hoje</p>
          <Link to="/medico/agenda" className="text-[#2ECC71] text-sm hover:underline mt-2 inline-block">
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
                  <div className="w-12 h-12 rounded-full bg-[#2ECC71] flex items-center justify-center text-white font-semibold flex-shrink-0">
                    {consultation.patient_name?.charAt(0) || 'P'}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 truncate">{consultation.patient_name || 'Paciente'}</p>
                    <p className="text-sm text-gray-600">{formatConsultationTime(consultation.scheduled_at)}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 bg-[#2ECC71]/10 text-[#2ECC71] text-xs rounded-full">
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
                    <Link
                      to={`/medico/consulta/${consultation.id}`}
                      className={`px-4 py-2 text-sm rounded-lg transition flex items-center gap-2 ${available
                        ? 'bg-[#2ECC71] hover:bg-[#27ae60] text-white'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                      title={!available ? 'Disponível 10 min antes' : 'Entrar na consulta'}
                    >
                      <Video className="w-4 h-4" />
                      <span className="hidden sm:inline">Entrar</span>
                    </Link>
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
