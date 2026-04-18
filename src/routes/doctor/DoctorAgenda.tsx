// =====================================================
// Malama — Agenda do Médico (com datas específicas)
// =====================================================

import React, { useEffect, useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Save, X, Trash2, AlertTriangle, Plus, Video, FileText, CheckCircle, Clock, Copy, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { availabilityService, consultationService } from '../../services/doctorPortalService';
import type { Doctor, DoctorAvailability, Consultation } from '../../types/doctorPortal';
import { DAY_OF_WEEK_LABELS } from '../../types/doctorPortal';
import toast from 'react-hot-toast';

// Helper para formatar data curta (DD/MM)
const formatDateShort = (date: Date): string => {
  return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
};

// Helper para formatar data ISO (YYYY-MM-DD)
const formatDateISO = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

// Helper para obter nome curto do dia
const getShortDayName = (date: Date): string => {
  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  return days[date.getDay()];
};

export const DoctorAgenda: React.FC = () => {
  const { doctor } = useOutletContext<{ doctor: Doctor }>();
  const navigate = useNavigate();

  // Estado para navegação por semanas
  const [weekOffset, setWeekOffset] = useState(0); // 0 = semana atual, 1 = próxima, -1 = anterior

  // Gerar datas dos próximos 14 dias (2 semanas) a partir do offset
  const generateDays = () => {
    const days = [];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + (weekOffset * 7));

    for (let i = 0; i < 14; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      days.push({
        date,
        dateStr: formatDateISO(date),
        dayOfWeek: date.getDay(),
        label: `${getShortDayName(date)} ${formatDateShort(date)}`,
        isToday: formatDateISO(date) === formatDateISO(new Date())
      });
    }
    return days;
  };

  const days = generateDays();

  const [availabilities, setAvailabilities] = useState<Record<string, DoctorAvailability[]>>({});
  const [deletedIds, setDeletedIds] = useState<string[]>([]);

  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [dayConsultations, setDayConsultations] = useState<Consultation[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showCancelModal, setShowCancelModal] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  // Copy schedule modal state
  const [showCopyModal, setShowCopyModal] = useState<string | null>(null);
  const [copyTargetDays, setCopyTargetDays] = useState<string[]>([]);

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

  const handleDrop = (e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    const timeStr = e.dataTransfer.getData('timeStr');
    if (!timeStr) return;

    const duration = doctor?.consultation_duration || 20;
    const [h, m] = timeStr.split(':').map(Number);
    const endTotalMins = h * 60 + m + duration;

    const endH = Math.floor(endTotalMins / 60).toString().padStart(2, '0');
    const endM = (endTotalMins % 60).toString().padStart(2, '0');

    // Obter day_of_week da data
    const dateObj = new Date(dateStr + 'T00:00:00');
    const dayOfWeek = dateObj.getDay();

    const newSlot: DoctorAvailability = {
      id: `temp-${Date.now()}-${Math.random()}`,
      doctor_id: doctor!.id,
      day_of_week: dayOfWeek,
      date: dateStr, // Data específica!
      start_time: `${timeStr}:00`,
      end_time: `${endH}:${endM}:00`,
      is_active: true
    };

    setAvailabilities(prev => {
      // Impede duplicados na mesma data e mesma hora de inicio
      if (prev[dateStr]?.some(a => a.start_time === newSlot.start_time)) {
        toast.error('Este horário já foi adicionado nesta data.');
        return prev;
      }

      const dateSlots = [...(prev[dateStr] || []), newSlot];
      // Reordena do mais cedo para mais tarde
      dateSlots.sort((a, b) => a.start_time.localeCompare(b.start_time));
      return { ...prev, [dateStr]: dateSlots };
    });
  };

  // ---------- COPY SCHEDULE LOGIC ----------
  const handleCopySchedule = (sourceDateStr: string, targetDateStrs: string[]) => {
    const sourceSlots = availabilities[sourceDateStr] || [];

    if (sourceSlots.length === 0) {
      toast.error('Não há horários para copiar nesta data.');
      return;
    }

    if (targetDateStrs.length === 0) {
      toast.error('Selecione pelo menos uma data de destino.');
      return;
    }

    let copiedCount = 0;

    setAvailabilities(prev => {
      const updated = { ...prev };

      targetDateStrs.forEach(targetDateStr => {
        // Se a data de destino é a mesma que a origem, pula
        if (targetDateStr === sourceDateStr) return;

        const targetSlots = [...(prev[targetDateStr] || [])];

        sourceSlots.forEach(sourceSlot => {
          // Verifica se já existe este horário na data de destino
          if (targetSlots.some(s => s.start_time === sourceSlot.start_time)) {
            return; // Pula duplicados silenciosamente
          }

          // Obter day_of_week da data de destino
          const targetDateObj = new Date(targetDateStr + 'T00:00:00');
          const targetDayOfWeek = targetDateObj.getDay();

          const newSlot: DoctorAvailability = {
            id: `temp-${Date.now()}-${Math.random()}`,
            doctor_id: doctor!.id,
            day_of_week: targetDayOfWeek,
            date: targetDateStr, // Data específica!
            start_time: sourceSlot.start_time,
            end_time: sourceSlot.end_time,
            is_active: true
          };

          targetSlots.push(newSlot);
          copiedCount++;
        });

        // Reordena
        targetSlots.sort((a, b) => a.start_time.localeCompare(b.start_time));
        updated[targetDateStr] = targetSlots;
      });

      return updated;
    });

    setShowCopyModal(null);
    setCopyTargetDays([]);

    if (copiedCount > 0) {
      toast.success(`${copiedCount} horário${copiedCount > 1 ? 's' : ''} copiado${copiedCount > 1 ? 's' : ''} com sucesso!`);
    } else {
      toast('Todos os horários já existem nas datas selecionadas.');
    }
  };

  const selectAllWeekdays = () => {
    // Seleciona apenas dias úteis (Seg-Sex) das próximas 2 semanas
    const weekdays = days
      .filter(d => d.dayOfWeek >= 1 && d.dayOfWeek <= 5 && d.dateStr !== showCopyModal)
      .map(d => d.dateStr);
    setCopyTargetDays(weekdays);
  };

  const selectWeekend = () => {
    // Seleciona apenas fim de semana (Sáb-Dom)
    const weekends = days
      .filter(d => (d.dayOfWeek === 0 || d.dayOfWeek === 6) && d.dateStr !== showCopyModal)
      .map(d => d.dateStr);
    setCopyTargetDays(weekends);
  };

  const selectAllDays = () => {
    // Seleciona todos os dias exceto o de origem
    const allDays = days
      .filter(d => d.dateStr !== showCopyModal)
      .map(d => d.dateStr);
    setCopyTargetDays(allDays);
  };
  // ----------------------------------------
  // ----------------------------------------

  useEffect(() => {
    if (!doctor) return;

    const loadData = async () => {
      try {
        // Calcular período de 2 semanas
        const startDate = new Date();
        startDate.setDate(startDate.getDate() + (weekOffset * 7));
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 13);

        const [availData, consultData] = await Promise.all([
          availabilityService.getDoctorAvailability(
            doctor.id,
            formatDateISO(startDate),
            formatDateISO(endDate)
          ),
          consultationService.getConsultationsByDay(doctor.id, selectedDate)
        ]);

        // Agrupar disponibilidades por data
        const grouped: Record<string, DoctorAvailability[]> = {};

        // Inicializar todas as datas com array vazio
        for (let i = 0; i < 14; i++) {
          const date = new Date(startDate);
          date.setDate(date.getDate() + i);
          grouped[formatDateISO(date)] = [];
        }

        // Popular com dados do banco
        availData.forEach(a => {
          if (a.date) {
            if (!grouped[a.date]) grouped[a.date] = [];
            grouped[a.date].push(a);
          }
        });

        // Ordena cada data
        Object.keys(grouped).forEach(dateStr => {
          grouped[dateStr].sort((a, b) => a.start_time.localeCompare(b.start_time));
        });

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
  }, [doctor, selectedDate, weekOffset]);

  const removeTimeSlot = (dateStr: string, id: string) => {
    if (!id.startsWith('temp-')) {
      setDeletedIds(prev => [...prev, id]);
    }
    setAvailabilities(prev => ({
      ...prev,
      [dateStr]: prev[dateStr].filter(a => a.id !== id)
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
          // Remover id se for temporário ou nulo
          if (a.id?.startsWith('temp-') || !a.id) {
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
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + (weekOffset * 7));
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 13);

      const availData = await availabilityService.getDoctorAvailability(
        doctor.id,
        formatDateISO(startDate),
        formatDateISO(endDate)
      );

      const grouped: Record<string, DoctorAvailability[]> = {};
      for (let i = 0; i < 14; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        grouped[formatDateISO(date)] = [];
      }
      availData.forEach(a => {
        if (a.date) {
          if (!grouped[a.date]) grouped[a.date] = [];
          grouped[a.date].push(a);
        }
      });
      Object.keys(grouped).forEach(dateStr => {
        grouped[dateStr].sort((a, b) => a.start_time.localeCompare(b.start_time));
      });
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
    if (!doctor) return;
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7d4a3c]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Seção 1: Disponibilidade por datas específicas */}
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Disponibilidade por Data</h3>

          {/* Navegação entre semanas */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setWeekOffset(prev => prev - 1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
              title="Semana anterior"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <span className="text-sm font-medium text-gray-700 px-3">
              {weekOffset === 0 ? 'Esta semana' : weekOffset === 1 ? 'Próxima semana' : `+${weekOffset} semanas`}
            </span>
            <button
              onClick={() => setWeekOffset(prev => prev + 1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
              title="Próxima semana"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        <p className="text-sm text-gray-500 mb-6">Configure os horários para cada dia específico. Arraste da paleta ou copie de outro dia.</p>

        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Paleta de Horários */}
          <div className="w-full lg:w-48 bg-white rounded-xl shadow-sm border border-gray-200 p-4 shrink-0 max-h-[500px] flex flex-col">
            <div className="text-sm font-bold text-gray-700 mb-1 flex items-center justify-between">
              Paleta
              <span className="text-[10px] bg-[#7d4a3c]/10 text-[#7d4a3c] font-bold px-2 py-0.5 rounded-full">{doctor?.consultation_duration || 20} min</span>
            </div>
            <p className="text-xs text-gray-400 mb-4 pb-2 border-b border-gray-100">Arraste para as datas</p>

            <div className="flex-1 overflow-y-auto grid grid-cols-2 gap-2 pr-1 custom-scrollbar">
              {generateTimeSlots().map(time => (
                <div
                  key={time}
                  draggable
                  onDragStart={(e) => handleDragStart(e, time)}
                  className="bg-gray-50 border border-gray-200 text-gray-700 font-semibold text-xs text-center py-2 rounded cursor-grab active:cursor-grabbing hover:border-[#7d4a3c] hover:text-[#7d4a3c] hover:shadow-sm transition"
                  title="Segure e arraste"
                >
                  {time}
                </div>
              ))}
            </div>
          </div>

          {/* Kanban Board - 14 dias */}
          <div className="flex-1 w-full">
            <div className="flex overflow-x-auto pb-4 gap-4 snap-x touch-pan-x">
              {days.map((dayInfo, index) => (
                <div
                  key={dayInfo.dateStr}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, dayInfo.dateStr)}
                  className={`bg-gray-50/80 rounded-xl p-3 border shadow-sm min-w-[160px] max-w-[180px] snap-start flex-shrink-0 flex flex-col h-full transition relative group ${dayInfo.isToday ? 'border-[#7d4a3c] border-2 bg-[#7d4a3c]/5' : 'border-dashed border-gray-300 hover:border-[#7d4a3c]/60'
                    }`}
                >
                  <div className="flex items-center justify-between mb-3 border-b border-gray-200 pb-2">
                    <div>
                      <span className={`font-bold text-sm ${dayInfo.isToday ? 'text-[#7d4a3c]' : 'text-gray-700'}`}>
                        {dayInfo.label}
                      </span>
                      {dayInfo.isToday && (
                        <span className="ml-1 text-[9px] bg-[#7d4a3c] text-white px-1.5 py-0.5 rounded-full font-bold">HOJE</span>
                      )}
                    </div>
                    <span className="text-xs font-semibold text-gray-400">{availabilities[dayInfo.dateStr]?.length || 0}</span>
                  </div>

                  {/* Copy Button - aparece no hover */}
                  <button
                    onClick={() => {
                      setShowCopyModal(dayInfo.dateStr);
                      setCopyTargetDays([]);
                    }}
                    disabled={availabilities[dayInfo.dateStr]?.length === 0}
                    className="absolute top-12 right-2 p-1.5 bg-[#7d4a3c] text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#623a2f] disabled:opacity-30 disabled:cursor-not-allowed z-10"
                    title="Copiar horários para outras datas"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>

                  <div className="flex-1 flex flex-col gap-2 min-h-[200px] pt-8">
                    {availabilities[dayInfo.dateStr]?.length === 0 ? (
                      <div className="text-center py-8 h-full flex flex-col items-center justify-center pointer-events-none opacity-50">
                        <p className="text-xs font-medium text-gray-400">Solte aqui</p>
                      </div>
                    ) : (
                      availabilities[dayInfo.dateStr]?.map(avail => (
                        <div key={avail.id} className="bg-white border text-center border-gray-200 rounded-md py-1.5 px-3 shadow-sm group/slot flex items-center justify-between hover:border-[#7d4a3c] transition">
                          <div className="text-sm font-bold text-gray-700">{formatTime(avail.start_time)}</div>
                          <button
                            onClick={() => removeTimeSlot(dayInfo.dateStr, avail.id)}
                            className="p-1 text-gray-300 hover:text-white hover:bg-red-500 rounded transition opacity-0 group-hover/slot:opacity-100"
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
        </div>

        <button
          onClick={handleSaveAvailability}
          disabled={saving}
          className="mt-6 w-full md:w-auto px-6 py-3 bg-[#7d4a3c] hover:bg-[#623a2f] text-white rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50"
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
            className="px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#7d4a3c] text-gray-700"
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
                      <span className="inline-block px-2.5 py-1 bg-[#7d4a3c]/10 text-[#7d4a3c] text-xs font-medium rounded-full">
                        {consult.type === 'initial' ? 'Inicial' : consult.type === 'follow_up' ? 'Retorno' : 'Renovação de Receita'}
                      </span>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${isScheduled ? 'bg-blue-50 text-blue-700' :
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
                        className="flex items-center gap-2 px-4 py-2 bg-[#7d4a3c] hover:bg-[#623a2f] text-white rounded-lg text-sm font-medium transition"
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

      {/* Modal de Copiar Horários */}
      {showCopyModal !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCopyModal(null)} />
          <div className="relative bg-white rounded-xl shadow-lg w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#7d4a3c]/10 flex items-center justify-center">
                  <Copy className="w-5 h-5 text-[#7d4a3c]" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Copiar Horários</h3>
                  <p className="text-sm text-gray-500">
                    De: <strong>{days.find(d => d.dateStr === showCopyModal)?.label}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCopyModal(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Preview dos horários de origem */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-2">Horários que serão copiados:</p>
              <div className="flex flex-wrap gap-2">
                {availabilities[showCopyModal]?.map(avail => (
                  <span key={avail.id} className="px-3 py-1 bg-white border border-gray-200 rounded-md text-sm font-semibold text-gray-700">
                    {formatTime(avail.start_time)}
                  </span>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {availabilities[showCopyModal]?.length || 0} horário{availabilities[showCopyModal]?.length !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Quick Select Buttons */}
            <div className="mb-4 flex flex-wrap gap-2">
              <button
                onClick={selectAllWeekdays}
                className="px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-lg hover:bg-blue-100 transition"
              >
                Dias Úteis (14 dias)
              </button>
              <button
                onClick={selectWeekend}
                className="px-3 py-1.5 bg-purple-50 text-purple-700 text-xs font-medium rounded-lg hover:bg-purple-100 transition"
              >
                Fins de Semana
              </button>
              <button
                onClick={selectAllDays}
                className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-200 transition"
              >
                Todos os 13 dias
              </button>
            </div>

            {/* Date Selection Grid */}
            <div className="mb-6">
              <p className="text-sm font-medium text-gray-700 mb-3">Selecionar datas de destino:</p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-64 overflow-y-auto">
                {days.map(dayInfo => {
                  if (dayInfo.dateStr === showCopyModal) return null;

                  const isSelected = copyTargetDays.includes(dayInfo.dateStr);
                  const hasSlots = availabilities[dayInfo.dateStr]?.length > 0;

                  return (
                    <label
                      key={dayInfo.dateStr}
                      className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 cursor-pointer transition ${isSelected
                          ? 'border-[#7d4a3c] bg-[#7d4a3c]/5'
                          : 'border-gray-200 hover:border-gray-300'
                        } ${dayInfo.isToday ? 'bg-yellow-50' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setCopyTargetDays(prev => [...prev, dayInfo.dateStr]);
                          } else {
                            setCopyTargetDays(prev => prev.filter(d => d !== dayInfo.dateStr));
                          }
                        }}
                        className="w-4 h-4 text-[#7d4a3c] border-gray-300 rounded focus:ring-[#7d4a3c] mb-2"
                      />
                      <span className={`text-xs font-bold ${dayInfo.isToday ? 'text-[#7d4a3c]' : 'text-gray-700'}`}>
                        {dayInfo.label}
                      </span>
                      {hasSlots && (
                        <span className="text-[10px] text-gray-500 mt-1">
                          {availabilities[dayInfo.dateStr].length} slots
                        </span>
                      )}
                      {dayInfo.isToday && (
                        <span className="text-[9px] bg-[#7d4a3c] text-white px-1 py-0.5 rounded-full mt-1">HOJE</span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={() => setShowCopyModal(null)}
                className="flex-1 px-6 py-3 text-gray-600 hover:text-gray-800 font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleCopySchedule(showCopyModal, copyTargetDays)}
                disabled={copyTargetDays.length === 0}
                className="flex-1 px-6 py-3 bg-[#7d4a3c] hover:bg-[#623a2f] text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Copy className="w-4 h-4" />
                Copiar para {copyTargetDays.length} dia{copyTargetDays.length !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      )}

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

