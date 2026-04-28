// =====================================================
// Malama — Agenda do Médico
// =====================================================

import React, { useEffect, useState, useCallback } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import {
  Save, X, Trash2, AlertTriangle, Video, FileText, CheckCircle,
  Copy, ChevronLeft, ChevronRight, Calendar, LogOut, LayoutGrid, CalendarDays
} from 'lucide-react';
import { availabilityService, consultationService } from '../../services/doctorPortalService';
import type { Doctor, DoctorAvailability, Consultation } from '../../types/doctorPortal';
import { ConsultationStatus } from '../../types/doctorPortal';
import toast from 'react-hot-toast';
import { ClinicalNoteModal } from '../../components/doctor/ClinicalNoteModal';

// ─── Date helpers ─────────────────────────────────────────────────────────────

const formatDateShort = (date: Date): string =>
  `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;

const formatDateISO = (date: Date): string => date.toISOString().split('T')[0];

const getShortDayName = (date: Date): string =>
  ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][date.getDay()];

const FULL_DAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

const getWeekStart = (d: Date): Date => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
};

// ─── Calendar constants ───────────────────────────────────────────────────────

const HOUR_HEIGHT = 64;
const FIRST_HOUR = 7;
const LAST_HOUR = 21;
const HOURS = Array.from({ length: LAST_HOUR - FIRST_HOUR + 1 }, (_, i) => i + FIRST_HOUR);

const getTopPx = (scheduledAt: string): number => {
  const d = new Date(scheduledAt);
  return ((d.getHours() - FIRST_HOUR) + d.getMinutes() / 60) * HOUR_HEIGHT;
};

const getDurationPx = (durationMins: number): number =>
  Math.max((durationMins / 60) * HOUR_HEIGHT, 30);

// ─── Status styles ────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, { bg: string; borderL: string; text: string; label: string }> = {
  scheduled: { bg: 'bg-blue-50',  borderL: 'border-l-blue-400',  text: 'text-blue-800',  label: 'Agendada'  },
  completed: { bg: 'bg-green-50', borderL: 'border-l-green-400', text: 'text-green-800', label: 'Concluída' },
  cancelled: { bg: 'bg-gray-50',  borderL: 'border-l-gray-300',  text: 'text-gray-400',  label: 'Cancelada' },
  no_show:   { bg: 'bg-amber-50', borderL: 'border-l-amber-400', text: 'text-amber-800', label: 'Falta'     },
};
const getStatusStyle = (s: string) => STATUS_STYLES[s] ?? STATUS_STYLES.scheduled;

const TYPE_LABELS: Record<string, string> = {
  initial: 'Inicial',
  follow_up: 'Retorno',
  prescription_renewal: 'Receita',
};

// ─── Day-view consultation card ───────────────────────────────────────────────

interface DayCardProps {
  consult: Consultation;
  duration: number;
  onViewProfile: () => void;
  onStartVideo: () => void;
  onClose: () => void;
  onNoShow: () => void;
  onCancel: () => void;
}

const DayCard: React.FC<DayCardProps> = ({
  consult, duration, onViewProfile, onStartVideo, onClose, onNoShow, onCancel,
}) => {
  const s = getStatusStyle(consult.status);
  const isScheduled = consult.status === 'scheduled';
  const h = getDurationPx(duration);
  const time = new Date(consult.scheduled_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div
      className={`absolute left-2 right-2 rounded-xl border border-gray-100 border-l-4 ${s.borderL} ${s.bg} px-3 py-2 overflow-hidden shadow-sm hover:shadow-md transition-shadow`}
      style={{ top: `${getTopPx(consult.scheduled_at)}px`, height: `${h}px` }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center flex-wrap gap-1.5 mb-0.5">
            <span className={`font-bold text-sm ${s.text}`}>{time}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium border border-current border-opacity-20 ${s.text} ${s.bg}`}>
              {s.label}
            </span>
            {consult.payment_status === 'paid' ? (
              <span className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">
                <CheckCircle className="w-2.5 h-2.5" /> Pago
              </span>
            ) : (
              <span className="text-[10px] px-1.5 py-0.5 bg-yellow-50 text-yellow-700 rounded-full font-medium border border-yellow-100">
                Pendente
              </span>
            )}
          </div>
          <p className={`text-sm font-semibold truncate ${s.text}`}>{consult.patient_name || 'Paciente'}</p>
          <p className="text-xs text-gray-400">{TYPE_LABELS[consult.type] ?? consult.type} · {duration} min</p>
        </div>

        {isScheduled && (
          <div className="flex flex-col gap-1 shrink-0">
            <button onClick={onViewProfile} className="p-1 rounded hover:bg-white/70 text-gray-400 hover:text-gray-700 transition" title="Ver ficha">
              <FileText className="w-3.5 h-3.5" />
            </button>
            <button onClick={onStartVideo} className="p-1 rounded hover:bg-white/70 text-gray-400 hover:text-[#7d4a3c] transition" title="Iniciar vídeo">
              <Video className="w-3.5 h-3.5" />
            </button>
            <button onClick={onCancel} className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 transition" title="Cancelar">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {isScheduled && h >= 90 && (
        <div className="flex gap-2 mt-2">
          <button
            onClick={onClose}
            className="flex items-center gap-1 px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-[10px] font-medium"
          >
            <LogOut className="w-2.5 h-2.5" /> Encerrar
          </button>
          <button
            onClick={onNoShow}
            className="flex items-center gap-1 px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded text-[10px] font-medium"
          >
            <X className="w-2.5 h-2.5" /> Falta
          </button>
        </div>
      )}
    </div>
  );
};

// ─── Week-view mini card ──────────────────────────────────────────────────────

const WeekCard: React.FC<{
  consult: Consultation;
  duration: number;
  onClick: () => void;
}> = ({ consult, duration, onClick }) => {
  const s = getStatusStyle(consult.status);
  const time = new Date(consult.scheduled_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const firstName = (consult.patient_name || 'Paciente').split(' ')[0];

  return (
    <div
      onClick={onClick}
      className={`absolute inset-x-0.5 rounded border-l-2 ${s.borderL} ${s.bg} px-1.5 py-1 overflow-hidden cursor-pointer hover:brightness-95 transition z-10`}
      style={{ top: `${getTopPx(consult.scheduled_at)}px`, height: `${getDurationPx(duration)}px` }}
    >
      <p className={`text-[10px] font-bold leading-tight ${s.text}`}>{time}</p>
      <p className={`text-[10px] truncate ${s.text} opacity-80`}>{firstName}</p>
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

export const DoctorAgenda: React.FC = () => {
  const { doctor } = useOutletContext<{ doctor: Doctor }>();
  const navigate = useNavigate();

  // ── Availability state ─────────────────────────────────────────────────────
  const [weekOffset, setWeekOffset] = useState(0);
  const [availabilities, setAvailabilities] = useState<Record<string, DoctorAvailability[]>>({});
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showCopyModal, setShowCopyModal] = useState<string | null>(null);
  const [copyTargetDays, setCopyTargetDays] = useState<string[]>([]);

  // ── Calendar state ─────────────────────────────────────────────────────────
  const [calendarView, setCalendarView] = useState<'day' | 'week'>('day');
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());
  const [consultationMap, setConsultationMap] = useState<Record<string, Consultation[]>>({});
  const [calendarLoading, setCalendarLoading] = useState(false);

  // ── Modals ─────────────────────────────────────────────────────────────────
  const [showCancelModal, setShowCancelModal] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [closeGate, setCloseGate] = useState<Consultation | null>(null);

  const duration = doctor?.consultation_duration || 20;

  // ── Generate 14-day columns for availability board ─────────────────────────

  const generateDays = useCallback(() => {
    const days = [];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + weekOffset * 7);
    for (let i = 0; i < 14; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      days.push({
        date,
        dateStr: formatDateISO(date),
        dayOfWeek: date.getDay(),
        label: `${getShortDayName(date)} ${formatDateShort(date)}`,
        isToday: formatDateISO(date) === formatDateISO(new Date()),
      });
    }
    return days;
  }, [weekOffset]);

  const days = generateDays();

  const generateTimeSlots = useCallback(() => {
    const slots: string[] = [];
    for (let m = 7 * 60; m <= 21 * 60; m += duration) {
      const h = Math.floor(m / 60).toString().padStart(2, '0');
      const mins = (m % 60).toString().padStart(2, '0');
      slots.push(`${h}:${mins}`);
    }
    return slots;
  }, [duration]);

  // ── Availability drag & drop ────────────────────────────────────────────────

  const handleDragStart = (e: React.DragEvent, timeStr: string) => {
    e.dataTransfer.setData('timeStr', timeStr);
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };

  const handleDrop = (e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    const timeStr = e.dataTransfer.getData('timeStr');
    if (!timeStr) return;
    const [h, m] = timeStr.split(':').map(Number);
    const endMins = h * 60 + m + duration;
    const endH = Math.floor(endMins / 60).toString().padStart(2, '0');
    const endM = (endMins % 60).toString().padStart(2, '0');
    const dayOfWeek = new Date(dateStr + 'T00:00:00').getDay();
    const newSlot: DoctorAvailability = {
      id: `temp-${Date.now()}-${Math.random()}`,
      doctor_id: doctor!.id,
      day_of_week: dayOfWeek,
      date: dateStr,
      start_time: `${timeStr}:00`,
      end_time: `${endH}:${endM}:00`,
      is_active: true,
    };
    setAvailabilities(prev => {
      if (prev[dateStr]?.some(a => a.start_time === newSlot.start_time)) {
        toast.error('Este horário já foi adicionado nesta data.');
        return prev;
      }
      const dateSlots = [...(prev[dateStr] || []), newSlot];
      dateSlots.sort((a, b) => a.start_time.localeCompare(b.start_time));
      return { ...prev, [dateStr]: dateSlots };
    });
  };

  const removeTimeSlot = (dateStr: string, id: string) => {
    if (!id.startsWith('temp-')) setDeletedIds(prev => [...prev, id]);
    setAvailabilities(prev => ({ ...prev, [dateStr]: prev[dateStr].filter(a => a.id !== id) }));
  };

  // ── Copy schedule ────────────────────────────────────────────────────────────

  const handleCopySchedule = (sourceDateStr: string, targetDateStrs: string[]) => {
    const sourceSlots = availabilities[sourceDateStr] || [];
    if (!sourceSlots.length) { toast.error('Não há horários para copiar nesta data.'); return; }
    if (!targetDateStrs.length) { toast.error('Selecione pelo menos uma data de destino.'); return; }
    let copiedCount = 0;
    setAvailabilities(prev => {
      const updated = { ...prev };
      targetDateStrs.forEach(targetDateStr => {
        if (targetDateStr === sourceDateStr) return;
        const targetSlots = [...(prev[targetDateStr] || [])];
        sourceSlots.forEach(sourceSlot => {
          if (targetSlots.some(s => s.start_time === sourceSlot.start_time)) return;
          targetSlots.push({
            id: `temp-${Date.now()}-${Math.random()}`,
            doctor_id: doctor!.id,
            day_of_week: new Date(targetDateStr + 'T00:00:00').getDay(),
            date: targetDateStr,
            start_time: sourceSlot.start_time,
            end_time: sourceSlot.end_time,
            is_active: true,
          });
          copiedCount++;
        });
        targetSlots.sort((a, b) => a.start_time.localeCompare(b.start_time));
        updated[targetDateStr] = targetSlots;
      });
      return updated;
    });
    setShowCopyModal(null);
    setCopyTargetDays([]);
    if (copiedCount > 0) toast.success(`${copiedCount} horário${copiedCount > 1 ? 's' : ''} copiado${copiedCount > 1 ? 's' : ''} com sucesso!`);
    else toast('Todos os horários já existem nas datas selecionadas.');
  };

  const selectAllWeekdays = () => setCopyTargetDays(days.filter(d => d.dayOfWeek >= 1 && d.dayOfWeek <= 5 && d.dateStr !== showCopyModal).map(d => d.dateStr));
  const selectWeekend = () => setCopyTargetDays(days.filter(d => (d.dayOfWeek === 0 || d.dayOfWeek === 6) && d.dateStr !== showCopyModal).map(d => d.dateStr));
  const selectAllDays = () => setCopyTargetDays(days.filter(d => d.dateStr !== showCopyModal).map(d => d.dateStr));

  // ── Load availability ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!doctor) return;
    const loadAvailability = async () => {
      try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() + weekOffset * 7);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 13);

        const availData = await availabilityService.getDoctorAvailability(
          doctor.id, formatDateISO(startDate), formatDateISO(endDate),
        );

        const grouped: Record<string, DoctorAvailability[]> = {};
        for (let i = 0; i < 14; i++) {
          const date = new Date(startDate);
          date.setDate(date.getDate() + i);
          grouped[formatDateISO(date)] = [];
        }
        availData.forEach(a => {
          if (a.date) { if (!grouped[a.date]) grouped[a.date] = []; grouped[a.date].push(a); }
        });
        Object.keys(grouped).forEach(k => {
          grouped[k].sort((a, b) => a.start_time.localeCompare(b.start_time));
        });
        setAvailabilities(grouped);
      } catch (error) {
        console.error('Error loading availability:', error);
        toast.error('Erro ao carregar disponibilidade.');
      } finally {
        setLoading(false);
      }
    };
    loadAvailability();
  }, [doctor, weekOffset]);

  // ── Load calendar consultations ────────────────────────────────────────────

  const loadCalendarData = useCallback(async () => {
    if (!doctor) return;
    setCalendarLoading(true);
    try {
      if (calendarView === 'day') {
        const dateStr = formatDateISO(calendarDate);
        const data = await consultationService.getConsultationsByDay(doctor.id, dateStr);
        setConsultationMap({ [dateStr]: data });
      } else {
        const weekStart = getWeekStart(calendarDate);
        const dates = Array.from({ length: 7 }, (_, i) => {
          const d = new Date(weekStart);
          d.setDate(d.getDate() + i);
          return d;
        });
        const results = await Promise.all(
          dates.map(d => consultationService.getConsultationsByDay(doctor.id, formatDateISO(d)))
        );
        const map: Record<string, Consultation[]> = {};
        dates.forEach((d, i) => { map[formatDateISO(d)] = results[i]; });
        setConsultationMap(map);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCalendarLoading(false);
    }
  }, [doctor, calendarView, calendarDate]);

  useEffect(() => { loadCalendarData(); }, [loadCalendarData]);

  // ── Calendar navigation ────────────────────────────────────────────────────

  const navigatePrev = () => setCalendarDate(prev => {
    const d = new Date(prev);
    d.setDate(d.getDate() - (calendarView === 'day' ? 1 : 7));
    return d;
  });

  const navigateNext = () => setCalendarDate(prev => {
    const d = new Date(prev);
    d.setDate(d.getDate() + (calendarView === 'day' ? 1 : 7));
    return d;
  });

  const goToToday = () => setCalendarDate(new Date());

  // ── Week days ──────────────────────────────────────────────────────────────

  const weekDays = (() => {
    const weekStart = getWeekStart(calendarDate);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      const dateStr = formatDateISO(d);
      return {
        date: d,
        dateStr,
        shortDay: getShortDayName(d),
        dayNum: d.getDate(),
        isToday: dateStr === formatDateISO(new Date()),
      };
    });
  })();

  // ── Period label ───────────────────────────────────────────────────────────

  const getPeriodLabel = () => {
    if (calendarView === 'day') {
      const isToday = formatDateISO(calendarDate) === formatDateISO(new Date());
      const dayName = FULL_DAY_NAMES[calendarDate.getDay()];
      const monthStr = calendarDate.toLocaleDateString('pt-BR', { month: 'long' });
      return `${dayName}, ${calendarDate.getDate()} de ${monthStr}${isToday ? ' (hoje)' : ''}`;
    }
    const ws = getWeekStart(calendarDate);
    const we = new Date(ws);
    we.setDate(we.getDate() + 6);
    return `${ws.getDate()}/${ws.getMonth() + 1} – ${we.getDate()}/${we.getMonth() + 1}`;
  };

  // ── Consultation actions ───────────────────────────────────────────────────

  const handleCancelConsultation = async () => {
    if (!showCancelModal || !doctor) return;
    try {
      await consultationService.cancelConsultation(showCancelModal, cancelReason);
      toast.success('Consulta cancelada');
      setShowCancelModal(null);
      setCancelReason('');
      await loadCalendarData();
    } catch { toast.error('Erro ao cancelar consulta'); }
  };

  const handleNoShow = async (id: string) => {
    if (!doctor) return;
    try {
      await consultationService.cancelConsultation(id, 'Paciente não compareceu');
      toast.success('Falta registrada');
      await loadCalendarData();
    } catch { toast.error('Erro ao reportar falta'); }
  };

  // ── Save availability ──────────────────────────────────────────────────────

  const handleSaveAvailability = async () => {
    if (!doctor) return;
    setSaving(true);
    try {
      for (const id of deletedIds) await availabilityService.deleteAvailability(id);
      setDeletedIds([]);

      const flat: DoctorAvailability[] = [];
      for (const day in availabilities) flat.push(...availabilities[day]);
      const toSave = flat.filter(a => a.is_active).map(a => {
        if (a.id?.startsWith('temp-') || !a.id) { const { id, ...rest } = a; return rest; }
        return a;
      }) as DoctorAvailability[];
      if (toSave.length > 0) await availabilityService.upsertAvailability(toSave);
      toast.success('Disponibilidade salva com sucesso!');

      // Reload
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + weekOffset * 7);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 13);
      const availData = await availabilityService.getDoctorAvailability(doctor.id, formatDateISO(startDate), formatDateISO(endDate));
      const grouped: Record<string, DoctorAvailability[]> = {};
      for (let i = 0; i < 14; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        grouped[formatDateISO(date)] = [];
      }
      availData.forEach(a => { if (a.date) { if (!grouped[a.date]) grouped[a.date] = []; grouped[a.date].push(a); } });
      Object.keys(grouped).forEach(k => { grouped[k].sort((a, b) => a.start_time.localeCompare(b.start_time)); });
      setAvailabilities(grouped);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao salvar disponibilidade');
    } finally {
      setSaving(false);
    }
  };

  // ── Current time line ──────────────────────────────────────────────────────

  const now = new Date();
  const todayStr = formatDateISO(now);
  const currentTimeTopPx =
    now.getHours() >= FIRST_HOUR && now.getHours() <= LAST_HOUR
      ? ((now.getHours() - FIRST_HOUR) + now.getMinutes() / 60) * HOUR_HEIGHT
      : null;

  const dayStr = formatDateISO(calendarDate);
  const dayConsults = consultationMap[dayStr] || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7d4a3c]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ══ Seção 1: Disponibilidade por datas ══════════════════════════════ */}
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Disponibilidade por Data</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setWeekOffset(prev => prev - 1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <span className="text-sm font-medium text-gray-700 px-3">
              {weekOffset === 0 ? 'Esta semana' : weekOffset === 1 ? 'Próxima semana' : weekOffset < 0 ? `${Math.abs(weekOffset)} sem. atrás` : `+${weekOffset} semanas`}
            </span>
            <button
              onClick={() => setWeekOffset(prev => prev + 1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
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
              <span className="text-[10px] bg-[#7d4a3c]/10 text-[#7d4a3c] font-bold px-2 py-0.5 rounded-full">
                {duration} min
              </span>
            </div>
            <p className="text-xs text-gray-400 mb-4 pb-2 border-b border-gray-100">Arraste para as datas</p>
            <div className="flex-1 overflow-y-auto grid grid-cols-2 gap-2 pr-1">
              {generateTimeSlots().map(time => (
                <div
                  key={time}
                  draggable
                  onDragStart={e => handleDragStart(e, time)}
                  className="bg-gray-50 border border-gray-200 text-gray-700 font-semibold text-xs text-center py-2 rounded cursor-grab active:cursor-grabbing hover:border-[#7d4a3c] hover:text-[#7d4a3c] hover:shadow-sm transition"
                >
                  {time}
                </div>
              ))}
            </div>
          </div>

          {/* Kanban board – 14 dias */}
          <div className="flex-1 w-full">
            <div className="flex overflow-x-auto pb-4 gap-4 snap-x touch-pan-x">
              {days.map(dayInfo => (
                <div
                  key={dayInfo.dateStr}
                  onDragOver={handleDragOver}
                  onDrop={e => handleDrop(e, dayInfo.dateStr)}
                  className={`bg-gray-50/80 rounded-xl p-3 border shadow-sm min-w-[160px] max-w-[180px] snap-start flex-shrink-0 flex flex-col h-full transition relative group ${dayInfo.isToday ? 'border-[#7d4a3c] border-2 bg-[#7d4a3c]/5' : 'border-dashed border-gray-300 hover:border-[#7d4a3c]/60'}`}
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

                  <button
                    onClick={() => { setShowCopyModal(dayInfo.dateStr); setCopyTargetDays([]); }}
                    disabled={!availabilities[dayInfo.dateStr]?.length}
                    className="absolute top-12 right-2 p-1.5 bg-[#7d4a3c] text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#623a2f] disabled:opacity-30 disabled:cursor-not-allowed z-10"
                    title="Copiar horários"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>

                  <div className="flex-1 flex flex-col gap-2 min-h-[200px] pt-8">
                    {!availabilities[dayInfo.dateStr]?.length ? (
                      <div className="text-center h-full flex flex-col items-center justify-center pointer-events-none opacity-50">
                        <p className="text-xs font-medium text-gray-400">Solte aqui</p>
                      </div>
                    ) : (
                      availabilities[dayInfo.dateStr].map(avail => (
                        <div key={avail.id} className="bg-white border border-gray-200 rounded-md py-1.5 px-3 shadow-sm group/slot flex items-center justify-between hover:border-[#7d4a3c] transition">
                          <span className="text-sm font-bold text-gray-700">{avail.start_time.slice(0, 5)}</span>
                          <button
                            onClick={() => removeTimeSlot(dayInfo.dateStr, avail.id)}
                            className="p-1 text-gray-300 hover:text-white hover:bg-red-500 rounded transition opacity-0 group-hover/slot:opacity-100"
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

      {/* ══ Seção 2: Calendário de consultas ════════════════════════════════ */}
      <div className="bg-white rounded-xl shadow p-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#7d4a3c]" />
            Calendário de Consultas
          </h3>

          {/* Day / Week toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1 gap-1 self-start">
            <button
              onClick={() => setCalendarView('day')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition ${calendarView === 'day' ? 'bg-white text-[#7d4a3c] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <CalendarDays className="w-3.5 h-3.5" /> Dia
            </button>
            <button
              onClick={() => setCalendarView('week')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition ${calendarView === 'week' ? 'bg-white text-[#7d4a3c] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Semana
            </button>
          </div>
        </div>

        {/* Navigation bar */}
        <div className="flex items-center gap-2 mb-4">
          <button onClick={navigatePrev} className="p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-600">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="flex-1 text-center text-sm font-semibold text-gray-700 capitalize">
            {getPeriodLabel()}
          </span>
          <button onClick={navigateNext} className="p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-600">
            <ChevronRight className="w-5 h-5" />
          </button>
          <button
            onClick={goToToday}
            className="px-3 py-1.5 text-xs font-medium bg-[#7d4a3c]/10 text-[#7d4a3c] hover:bg-[#7d4a3c]/20 rounded-lg transition"
          >
            Hoje
          </button>
          {calendarLoading && (
            <div className="w-4 h-4 border-2 border-[#7d4a3c] border-t-transparent rounded-full animate-spin shrink-0" />
          )}
        </div>

        {/* ─── Day view ───────────────────────────────────────────────────── */}
        {calendarView === 'day' && (
          <div className="overflow-y-auto max-h-[640px] border border-gray-100 rounded-xl">
            <div className="relative flex" style={{ minHeight: `${HOURS.length * HOUR_HEIGHT}px` }}>
              {/* Hour labels */}
              <div className="w-12 shrink-0 select-none">
                {HOURS.map(h => (
                  <div key={h} style={{ height: HOUR_HEIGHT }} className="relative">
                    <span className="absolute -top-2.5 right-2 text-[10px] text-gray-400 font-medium">
                      {h}:00
                    </span>
                  </div>
                ))}
              </div>

              {/* Grid lines + events */}
              <div className="flex-1 relative border-l border-gray-100">
                {HOURS.map(h => (
                  <div key={h} style={{ height: HOUR_HEIGHT }} className="border-t border-gray-100" />
                ))}

                {/* Current time indicator */}
                {currentTimeTopPx !== null && dayStr === todayStr && (
                  <div
                    className="absolute left-0 right-0 flex items-center z-20 pointer-events-none"
                    style={{ top: `${currentTimeTopPx}px` }}
                  >
                    <div className="w-2 h-2 bg-red-500 rounded-full -ml-1 shrink-0" />
                    <div className="flex-1 border-t-2 border-red-400" />
                  </div>
                )}

                {/* Empty state */}
                {!dayConsults.length && !calendarLoading && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                      <Calendar className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">Nenhuma consulta neste dia.</p>
                    </div>
                  </div>
                )}

                {/* Consultation cards */}
                {dayConsults.map(c => (
                  <DayCard
                    key={c.id}
                    consult={c}
                    duration={duration}
                    onViewProfile={() => navigate(`/medico/paciente/${c.patient_id}`)}
                    onStartVideo={() => navigate(`/medico/consulta/${c.id}`)}
                    onClose={() => setCloseGate(c)}
                    onNoShow={() => handleNoShow(c.id)}
                    onCancel={() => setShowCancelModal(c.id)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── Week view ──────────────────────────────────────────────────── */}
        {calendarView === 'week' && (
          <div className="overflow-x-auto">
            <div style={{ minWidth: 640 }}>
              {/* Day header row */}
              <div className="flex mb-1 pl-12">
                {weekDays.map(d => (
                  <div
                    key={d.dateStr}
                    onClick={() => { setCalendarDate(d.date); setCalendarView('day'); }}
                    className={`flex-1 text-center py-2 px-1 rounded-lg cursor-pointer hover:bg-gray-50 transition select-none ${d.isToday ? 'bg-[#7d4a3c]/5' : ''}`}
                  >
                    <p className="text-[10px] text-gray-400 uppercase font-medium">{d.shortDay}</p>
                    <p className={`text-sm font-bold mt-0.5 ${d.isToday ? 'text-[#7d4a3c]' : 'text-gray-700'}`}>
                      {d.dayNum}
                    </p>
                    {d.isToday && <div className="w-1.5 h-1.5 bg-[#7d4a3c] rounded-full mx-auto mt-0.5" />}
                    {(consultationMap[d.dateStr] || []).length > 0 && (
                      <span className="inline-block mt-1 text-[9px] font-bold text-[#7d4a3c] bg-[#7d4a3c]/10 px-1.5 py-0.5 rounded-full">
                        {(consultationMap[d.dateStr] || []).length}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Timeline + 7 columns */}
              <div className="overflow-y-auto max-h-[600px] border border-gray-100 rounded-xl">
                <div className="relative flex" style={{ minHeight: `${HOURS.length * HOUR_HEIGHT}px` }}>
                  {/* Hour labels */}
                  <div className="w-12 shrink-0 select-none">
                    {HOURS.map(h => (
                      <div key={h} style={{ height: HOUR_HEIGHT }} className="relative">
                        <span className="absolute -top-2.5 right-2 text-[10px] text-gray-400 font-medium">
                          {h}:00
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* 7 day columns */}
                  {weekDays.map(d => (
                    <div
                      key={d.dateStr}
                      className={`flex-1 relative border-l border-gray-100 ${d.isToday ? 'bg-[#7d4a3c]/[0.015]' : ''}`}
                    >
                      {HOURS.map(h => (
                        <div key={h} style={{ height: HOUR_HEIGHT }} className="border-t border-gray-100" />
                      ))}

                      {/* Current time line */}
                      {d.isToday && currentTimeTopPx !== null && (
                        <div
                          className="absolute left-0 right-0 border-t-2 border-red-400 z-10 pointer-events-none"
                          style={{ top: `${currentTimeTopPx}px` }}
                        />
                      )}

                      {/* Consultation mini cards */}
                      {(consultationMap[d.dateStr] || []).map(c => (
                        <WeekCard
                          key={c.id}
                          consult={c}
                          duration={duration}
                          onClick={() => { setCalendarDate(d.date); setCalendarView('day'); }}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ══ Modal: Copiar Horários ══════════════════════════════════════════ */}
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
              <button onClick={() => setShowCopyModal(null)} className="p-2 hover:bg-gray-100 rounded-lg transition">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-2">Horários que serão copiados:</p>
              <div className="flex flex-wrap gap-2">
                {availabilities[showCopyModal]?.map(avail => (
                  <span key={avail.id} className="px-3 py-1 bg-white border border-gray-200 rounded-md text-sm font-semibold text-gray-700">
                    {avail.start_time.slice(0, 5)}
                  </span>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {availabilities[showCopyModal]?.length || 0} horário{availabilities[showCopyModal]?.length !== 1 ? 's' : ''}
              </p>
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              <button onClick={selectAllWeekdays} className="px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-lg hover:bg-blue-100 transition">Dias Úteis (14 dias)</button>
              <button onClick={selectWeekend} className="px-3 py-1.5 bg-purple-50 text-purple-700 text-xs font-medium rounded-lg hover:bg-purple-100 transition">Fins de Semana</button>
              <button onClick={selectAllDays} className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-200 transition">Todos os 13 dias</button>
            </div>

            <div className="mb-6">
              <p className="text-sm font-medium text-gray-700 mb-3">Selecionar datas de destino:</p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-64 overflow-y-auto">
                {days.map(dayInfo => {
                  if (dayInfo.dateStr === showCopyModal) return null;
                  const isSelected = copyTargetDays.includes(dayInfo.dateStr);
                  return (
                    <label
                      key={dayInfo.dateStr}
                      className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 cursor-pointer transition ${isSelected ? 'border-[#7d4a3c] bg-[#7d4a3c]/5' : 'border-gray-200 hover:border-gray-300'} ${dayInfo.isToday ? 'bg-yellow-50' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={e => {
                          if (e.target.checked) setCopyTargetDays(prev => [...prev, dayInfo.dateStr]);
                          else setCopyTargetDays(prev => prev.filter(d => d !== dayInfo.dateStr));
                        }}
                        className="w-4 h-4 text-[#7d4a3c] border-gray-300 rounded focus:ring-[#7d4a3c] mb-2"
                      />
                      <span className={`text-xs font-bold ${dayInfo.isToday ? 'text-[#7d4a3c]' : 'text-gray-700'}`}>{dayInfo.label}</span>
                      {availabilities[dayInfo.dateStr]?.length > 0 && (
                        <span className="text-[10px] text-gray-500 mt-1">{availabilities[dayInfo.dateStr].length} slots</span>
                      )}
                      {dayInfo.isToday && <span className="text-[9px] bg-[#7d4a3c] text-white px-1 py-0.5 rounded-full mt-1">HOJE</span>}
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <button onClick={() => setShowCopyModal(null)} className="flex-1 px-6 py-3 text-gray-600 hover:text-gray-800 font-medium">
                Cancelar
              </button>
              <button
                onClick={() => handleCopySchedule(showCopyModal, copyTargetDays)}
                disabled={!copyTargetDays.length}
                className="flex-1 px-6 py-3 bg-[#7d4a3c] hover:bg-[#623a2f] text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Copy className="w-4 h-4" />
                Copiar para {copyTargetDays.length} dia{copyTargetDays.length !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Modal: Encerrar Consulta ════════════════════════════════════════ */}
      {closeGate && (
        <ClinicalNoteModal
          consultationId={closeGate.id}
          doctorId={doctor.id}
          patientId={closeGate.patient_id}
          patientName={closeGate.patient_name ?? 'Paciente'}
          onClose={() => setCloseGate(null)}
          onConsultationClosed={async (id) => {
            setConsultationMap(prev => {
              const updated = { ...prev };
              const key = Object.keys(prev).find(k => prev[k].some(c => c.id === id));
              if (key) updated[key] = prev[key].map(c => c.id === id ? { ...c, status: ConsultationStatus.COMPLETED } : c);
              return updated;
            });
          }}
        />
      )}

      {/* ══ Modal: Cancelar Consulta ════════════════════════════════════════ */}
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
              <button onClick={() => setShowCancelModal(null)} className="px-6 py-2 text-gray-600 hover:text-gray-800">
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
