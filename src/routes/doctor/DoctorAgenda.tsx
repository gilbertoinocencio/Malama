// =====================================================
// NURA — Agenda do Médico
// =====================================================

import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Save, X, Trash2, AlertTriangle } from 'lucide-react';
import { availabilityService, consultationService } from '../../services/doctorPortalService';
import type { Doctor, DoctorAvailability, Consultation } from '../../types/doctorPortal';
import { DAY_OF_WEEK_LABELS } from '../../types/doctorPortal';
import toast from 'react-hot-toast';

export const DoctorAgenda: React.FC = () => {
  const { doctor } = useOutletContext<{ doctor: Doctor }>();
  const [availabilities, setAvailabilities] = useState<DoctorAvailability[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [dayConsultations, setDayConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  useEffect(() => {
    if (!doctor) return;

    const loadData = async () => {
      try {
        const [availData, consultData] = await Promise.all([
          availabilityService.getDoctorAvailability(doctor.id),
          consultationService.getConsultationsByDay(doctor.id, selectedDate)
        ]);

        // Preencher dias da semana
        const fullAvail: DoctorAvailability[] = [];
        for (let day = 0; day < 7; day++) {
          const existing = availData.find(a => a.day_of_week === day);
          if (existing) {
            fullAvail.push(existing);
          } else {
            fullAvail.push({
              id: `temp-${day}`,
              doctor_id: doctor.id,
              day_of_week: day,
              start_time: '09:00:00',
              end_time: '17:00:00',
              is_active: false
            });
          }
        }

        setAvailabilities(fullAvail);
        setDayConsultations(consultData);
      } catch (error) {
        console.error('Error loading agenda:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [doctor, selectedDate]);

  const toggleDayActive = (index: number) => {
    setAvailabilities(prev =>
      prev.map((a, i) => i === index ? { ...a, is_active: !a.is_active } : a)
    );
  };

  const updateTime = (index: number, field: 'start_time' | 'end_time', value: string) => {
    setAvailabilities(prev =>
      prev.map((a, i) => i === index ? { ...a, [field]: value } : a)
    );
  };

  const handleSaveAvailability = async () => {
    if (!doctor) return;
    setSaving(true);

    try {
      const toSave = availabilities
        .filter(a => a.is_active)
        .map(({ id, ...rest }) => rest);

      await availabilityService.upsertAvailability(toSave);
      toast.success('Disponibilidade salva com sucesso!');
    } catch (error) {
      toast.error('Erro ao salvar disponibilidade');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelConsultation = async () => {
    if (!showCancelModal) return;

    try {
      await consultationService.cancelConsultation(showCancelModal, cancelReason);
      toast.success('Consulta cancelada');
      setShowCancelModal(null);
      setCancelReason('');

      // Recarregar consultas do dia
      const consultData = await consultationService.getConsultationsByDay(doctor!.id, selectedDate);
      setDayConsultations(consultData);
    } catch (error) {
      toast.error('Erro ao cancelar consulta');
    }
  };

  const formatTime = (timeStr: string) => {
    return timeStr.slice(0, 5);
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
      {/* Seção 1: Disponibilidade recorrente */}
      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Disponibilidade Recorrente</h3>

        <div className="space-y-3">
          {availabilities.map((avail, index) => (
            <div key={avail.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
              <div className="w-32">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={avail.is_active}
                    onChange={() => toggleDayActive(index)}
                    className="w-4 h-4 text-[#2ECC71]"
                  />
                  <span className="text-sm font-medium text-gray-700">{DAY_OF_WEEK_LABELS[avail.day_of_week]}</span>
                </label>
              </div>

              {avail.is_active && (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="time"
                    value={formatTime(avail.start_time)}
                    onChange={e => updateTime(index, 'start_time', e.target.value + ':00')}
                    className="px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-[#2ECC71]"
                  />
                  <span className="text-gray-500">até</span>
                  <input
                    type="time"
                    value={formatTime(avail.end_time)}
                    onChange={e => updateTime(index, 'end_time', e.target.value + ':00')}
                    className="px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-[#2ECC71]"
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={handleSaveAvailability}
          disabled={saving}
          className="mt-4 px-6 py-3 bg-[#2ECC71] hover:bg-[#27ae60] text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Salvando...' : 'Salvar disponibilidade'}
        </button>
      </div>

      {/* Seção 2: Calendário de consultas */}
      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Consultas por Dia</h3>

        <input
          type="date"
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
          className="px-4 py-2 rounded-lg border border-gray-300 mb-4 focus:ring-2 focus:ring-[#2ECC71]"
        />

        {dayConsultations.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Nenhuma consulta neste dia</p>
        ) : (
          <div className="space-y-3">
            {dayConsultations.map(consult => (
              <div key={consult.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-800">
                    {new Date(consult.scheduled_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p className="text-sm text-gray-600">{consult.patient_name || 'Paciente'}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 bg-[#2ECC71]/10 text-[#2ECC71] text-xs rounded-full">
                    {consult.type === 'initial' ? 'Inicial' : consult.type === 'follow_up' ? 'Retorno' : 'Renovação'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    consult.status === 'scheduled' ? 'bg-green-100 text-green-700' :
                    consult.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {consult.status === 'scheduled' ? 'Agendada' : consult.status === 'cancelled' ? 'Cancelada' : consult.status}
                  </span>

                  {consult.status === 'scheduled' && (
                    <button
                      onClick={() => setShowCancelModal(consult.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de cancelamento */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCancelModal(null)} />
          <div className="relative bg-white rounded-xl shadow-lg w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800">Cancelar Consulta</h3>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Motivo (opcional)</label>
              <textarea
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-500 resize-none"
                placeholder="Informe o motivo do cancelamento..."
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowCancelModal(null)}
                className="px-6 py-2 text-gray-600 hover:text-gray-800"
              >
                Voltar
              </button>
              <button
                onClick={handleCancelConsultation}
                className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium"
              >
                Confirmar cancelamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
