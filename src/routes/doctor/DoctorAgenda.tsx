// =====================================================
// NURA — Agenda do Médico
// =====================================================

import React, { useEffect, useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Save, X, Trash2, AlertTriangle, Plus, Video, FileText, CheckCircle, Clock } from 'lucide-react';
import { availabilityService, consultationService } from '../../services/doctorPortalService';
import type { Doctor, DoctorAvailability, Consultation } from '../../types/doctorPortal';
import { DAY_OF_WEEK_LABELS } from '../../types/doctorPortal';
import toast from 'react-hot-toast';

export const DoctorAgenda: React.FC = () => {
  const { doctor } = useOutletContext<{ doctor: Doctor }>();
  const navigate = useNavigate();
  const [availabilities, setAvailabilities] = useState<Record<number, DoctorAvailability[]>>({});
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [dayConsultations, setDayConsultations] = useState<Consultation[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [showCancelModal, setShowCancelModal] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  // ---------- DRAG & DROP LOGIC ----------
  const generateTimeSlots = () => {
    const duration = doctor?.consultation_duration || 20; // Fallback para 20 se nulo
    const slots: string[] = [];
    const startMins = 7 * 60; // 07:00
    const endMins = 21 * 60; // 21:00
    
    for (let m = startMins; m <= endMins; m += duration) {
      const h = Math.floor(m / 60).toString().padStart(2, '0');
      const mins = (m % 60).toString().padStart(2, '0');
      slots.push(`${h}:${mins}`);
    }
    return slots;
  };

  const handleDragStart = (e: React.DragEvent, timeStr: string) => {
    e.dataTransfer.setData('timeStr', timeStr);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Necessário para permitir o drop
  };

  const handleDrop = (e: React.DragEvent, day: number) => {
    e.preventDefault();
    const timeStr = e.dataTransfer.getData('timeStr');
    if (!timeStr) return;

    const duration = doctor?.consultation_duration || 20;
    const [h, m] = timeStr.split(':').map(Number);
    const endTotalMins = h * 60 + m + duration;
    
    const endH = Math.floor(endTotalMins / 60).toString().padStart(2, '0');
    const endM = (endTotalMins % 60).toString().padStart(2, '0');
    
    const newSlot: DoctorAvailability = {
      id: `temp-${Date.now()}-${Math.random()}`,
      doctor_id: doctor!.id,
      day_of_week: day,
      start_time: `${timeStr}:00`,
      end_time: `${endH}:${endM}:00`,
      is_active: true
    };

    setAvailabilities(prev => {
      // Impede duplicados no mesmo dia e mesma hora de inicio
      if (prev[day]?.some(a => a.start_time === newSlot.start_time)) {
        toast.error('Este horário já foi adicionado.');
        return prev;
      }
      
      const daySlots = [...(prev[day] || []), newSlot];
      // Reordena do mais cedo para mais tarde
      daySlots.sort((a, b) => a.start_time.localeCompare(b.start_time));
      return { ...prev, [day]: daySlots };
    });
  };
  // ----------------------------------------

  useEffect(() => {
    if (!doctor) return;

    const loadData = async () => {
      try {
        const [availData, consultData] = await Promise.all([
          availabilityService.getDoctorAvailability(doctor.id),
          consultationService.getConsultationsByDay(doctor.id, selectedDate)
        ]);

        // Agrupar disponibilidades por dia da semana
        const grouped: Record<number, DoctorAvailability[]> = {};
        for (let day = 0; day < 7; day++) {
          grouped[day] = availData.filter(a => a.day_of_week === day);
          // Ordena
          grouped[day].sort((a, b) => a.start_time.localeCompare(b.start_time));
        }

        setAvailabilities(grouped);
        setDayConsultations(consultData);
      } catch (error) {
        console.error('Error loading agenda:', error);
        toast.error('Erro ao carregar os dados da agenda.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [doctor, selectedDate]);

  const removeTimeSlot = (day: number, id: string) => {
    if (!id.startsWith('temp-')) {
      setDeletedIds(prev => [...prev, id]);
    }
    setAvailabilities(prev => ({
      ...prev,
      [day]: prev[day].filter(a => a.id !== id)
    }));
  };

  const handleSaveAvailability = async () => {
    if (!doctor) return;
    setSaving(true);

    try {
      // Deletar os removidos
      for (const id of deletedIds) {
        await availabilityService.deleteAvailability(id);
      }
      setDeletedIds([]);

      // Salvar (upsert) os atuais removendo os IDs temporários
      const flatAvail: DoctorAvailability[] = [];
      for (const day in availabilities) {
        flatAvail.push(...availabilities[day]);
      }

      const toSave = flatAvail
        .filter(a => a.is_active)
        .map(a => {
          if (a.id.startsWith('temp-')) {
            const { id, ...rest } = a;
            return rest;
          }
          return a;
        }) as DoctorAvailability[];

      if (toSave.length > 0) {
        await availabilityService.upsertAvailability(toSave);
      }
      
      toast.success('Disponibilidade salva com sucesso!');
      
      // Recarregar os dados para ter os IDs reais
      const availData = await availabilityService.getDoctorAvailability(doctor.id);
      const grouped: Record<number, DoctorAvailability[]> = {};
      for (let day = 0; day < 7; day++) {
        grouped[day] = availData.filter(a => a.day_of_week === day);
      }
      setAvailabilities(grouped);

    } catch (error) {
      console.error(error);
      toast.error('Erro ao salvar disponibilidade');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelConsultation = async () => {
    if (!showCancelModal || !doctor) return;

    try {
      await consultationService.cancelConsultation(showCancelModal, cancelReason);
      toast.success('Consulta cancelada');
      setShowCancelModal(null);
      setCancelReason('');

      const consultData = await consultationService.getConsultationsByDay(doctor.id, selectedDate);
      setDayConsultations(consultData);
    } catch (error) {
      toast.error('Erro ao cancelar consulta');
    }
  };
  
  const handleNoShow = async (id: string) => {
    if(!doctor) return;
    try {
      // Simplificação usando o método de cancelamento mas poderia ser um novo
      await consultationService.cancelConsultation(id, 'Paciente não compareceu');
      toast.success('Falta registrada');
      const consultData = await consultationService.getConsultationsByDay(doctor.id, selectedDate);
      setDayConsultations(consultData);
    } catch (error) {
      toast.error('Erro ao reportar falta');
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

        <p className="text-sm text-gray-500 mb-6">Selecione na paleta à esquerda e arraste os horários para a coluna do dia.</p>

        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Paleta de Horários */}
          <div className="w-full lg:w-48 bg-white rounded-xl shadow-sm border border-gray-200 p-4 shrink-0 max-h-[500px] flex flex-col">
            <div className="text-sm font-bold text-gray-700 mb-1 flex items-center justify-between">
              Paleta
              <span className="text-[10px] bg-[#2ECC71]/10 text-[#2ECC71] font-bold px-2 py-0.5 rounded-full">{doctor?.consultation_duration || 20} min</span>
            </div>
            <p className="text-xs text-gray-400 mb-4 pb-2 border-b border-gray-100">Arraste para os dias</p>
            
            <div className="flex-1 overflow-y-auto grid grid-cols-2 gap-2 pr-1 custom-scrollbar">
              {generateTimeSlots().map(time => (
                <div
                  key={time}
                  draggable
                  onDragStart={(e) => handleDragStart(e, time)}
                  className="bg-gray-50 border border-gray-200 text-gray-700 font-semibold text-xs text-center py-2 rounded cursor-grab active:cursor-grabbing hover:border-[#2ECC71] hover:text-[#2ECC71] hover:shadow-sm transition"
                  title="Segure e arraste"
                >
                  {time}
                </div>
              ))}
            </div>
          </div>

          {/* Kanban Board */}
          <div className="flex-1 w-full flex overflow-x-auto pb-4 gap-4 snap-x touch-pan-x">
            {[0, 1, 2, 3, 4, 5, 6].map(day => (
              <div 
                key={day} 
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, day)}
                className="bg-gray-50/80 rounded-xl p-3 border shadow-sm min-w-[200px] max-w-[220px] snap-start flex-shrink-0 flex flex-col h-full transition border-dashed border-gray-300 hover:border-[#2ECC71]/60"
              >
                <div className="flex items-center justify-between mb-3 border-b border-gray-200 pb-2 pointer-events-none">
                  <span className="font-bold text-gray-700">{DAY_OF_WEEK_LABELS[day]}</span>
                  <span className="text-xs font-semibold text-gray-400">{availabilities[day]?.length || 0} slots</span>
                </div>

                <div className="flex-1 flex flex-col gap-2 min-h-[200px]">
                  {availabilities[day]?.length === 0 ? (
                    <div className="text-center py-8 h-full flex flex-col items-center justify-center pointer-events-none opacity-50">
                      <p className="text-sm font-medium text-gray-400">Solte horários aqui</p>
                    </div>
                  ) : (
                    availabilities[day]?.map(avail => (
                      <div key={avail.id} className="bg-white border text-center border-gray-200 rounded-md py-1.5 px-3 shadow-sm group flex items-center justify-between hover:border-[#2ECC71] transition">
                        <div className="text-sm font-bold text-gray-700">{formatTime(avail.start_time)}</div>
                        <button 
                          onClick={() => removeTimeSlot(day, avail.id)}
                          className="p-1 text-gray-300 hover:text-white hover:bg-red-500 rounded transition opacity-0 group-hover:opacity-100"
                          title="Remover horário"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={handleSaveAvailability}
          disabled={saving}
          className="mt-6 w-full md:w-auto px-6 py-3 bg-[#2ECC71] hover:bg-[#27ae60] text-white rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Salvando...' : 'Salvar disponibilidades'}
        </button>
      </div>

      {/* Seção 2: Calendário de consultas */}
      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Consultas do Dia</h3>

        <div className="flex items-center gap-2 mb-6">
          <Clock className="w-5 h-5 text-gray-400" />
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#2ECC71] text-gray-700"
          />
        </div>

        {dayConsultations.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-200">
            <p className="text-gray-500 font-medium">Nenhuma consulta agendada para esta data.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {dayConsultations.map(consult => {
              const isPaid = consult.payment_status === 'paid';
              const isScheduled = consult.status === 'scheduled';
              const isCancelled = consult.status === 'cancelled';
              
              return (
                <div key={consult.id} className="flex flex-col md:flex-row items-start md:items-center justify-between p-5 bg-white border border-gray-100 shadow-sm rounded-xl hover:shadow-md transition">
                  {/* Info Box */}
                  <div className="flex-1 mb-4 md:mb-0">
                    <div className="flex gap-3 items-center mb-1">
                      <p className="font-bold text-gray-800 text-lg">
                        {new Date(consult.scheduled_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      
                      {/* Pagamento Confirmado Badge */}
                      {isPaid ? (
                        <span className="flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-700 text-xs font-semibold rounded-full">
                          <CheckCircle className="w-3 h-3" />
                          Pagto Confirmado
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-yellow-50 text-yellow-700 text-xs font-semibold rounded-full border border-yellow-100">
                          Pagamento Pendente
                        </span>
                      )}
                    </div>
  
                    <p className="text-md text-gray-700 font-medium">{consult.patient_name || 'Nome do Paciente'}</p>
                    
                    <div className="flex items-center gap-2 mt-2">
                       <span className="inline-block px-2.5 py-1 bg-[#2ECC71]/10 text-[#2ECC71] text-xs font-medium rounded-full">
                        {consult.type === 'initial' ? 'Inicial' : consult.type === 'follow_up' ? 'Retorno' : 'Renovação de Receita'}
                      </span>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        isScheduled ? 'bg-blue-50 text-blue-700' :
                        isCancelled ? 'bg-red-50 text-red-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {isScheduled ? 'Agendada' : isCancelled ? 'Cancelada' : consult.status === 'no_show' ? 'Falta' : consult.status}
                      </span>
                    </div>
                  </div>
  
                  {/* Actions Box */}
                  {isScheduled && (
                    <div className="flex flex-wrap items-center gap-2 justify-end w-full md:w-auto">
                        <button
                          onClick={() => navigate(`/medico/paciente/${consult.patient_id}`)}
                          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition"
                        >
                          <FileText className="w-4 h-4" />
                          Ver Ficha
                        </button>
                         
                        <button
                          onClick={() => navigate(`/medico/consulta/${consult.id}`)}
                          className="flex items-center gap-2 px-4 py-2 bg-[#2ECC71] hover:bg-[#27ae60] text-white rounded-lg text-sm font-medium transition"
                        >
                          <Video className="w-4 h-4" />
                          Iniciar Video
                        </button>
  
                        <div className="w-full md:hidden"></div>
  
                        <button
                          onClick={() => handleNoShow(consult.id)}
                          className="p-2 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition tooltip"
                          title="Reportar falta (No-show)"
                        >
                          <X className="w-5 h-5" />
                        </button>
  
                        <button
                          onClick={() => setShowCancelModal(consult.id)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                          title="Cancelar consulta"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                    </div>
                  )}
                </div>
              );
            })}
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

