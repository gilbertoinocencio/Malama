// =====================================================
// Malama — Agenda do Médico
// =====================================================

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import {
  Save, X, Trash2, AlertTriangle, Video, FileText, CheckCircle,
  Copy, ChevronLeft, ChevronRight, Calendar, LogOut, LayoutGrid,
  CalendarDays, User, Clock, ChevronDown, RefreshCw, MessageSquare
} from 'lucide-react';
import { availabilityService, consultationService } from '../../services/doctorPortalService';
import type { Doctor, DoctorAvailability, Consultation } from '../../types/doctorPortal';
import { ConsultationStatus } from '../../types/doctorPortal';
import toast from 'react-hot-toast';
import { ClinicalNoteModal } from '../../components/doctor/ClinicalNoteModal';

// ─── Date helpers ─────────────────────────────────────────────────────────────

const formatDateShort = (date: Date) =>
  `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;

const formatDateISO = (date: Date) => date.toISOString().split('T')[0];

const getShortDayName = (date: Date) =>
  ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][date.getDay()];

const FULL_DAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

const getWeekStart = (d: Date): Date => {
  const date = new Date(d);
  const diff = date.getDay() === 0 ? -6 : 1 - date.getDay();
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
};

// ─── Calendar constants ───────────────────────────────────────────────────────

const HOUR_HEIGHT = 56;
const FIRST_HOUR = 7;
const LAST_HOUR = 21;
const HOURS = Array.from({ length: LAST_HOUR - FIRST_HOUR + 1 }, (_, i) => i + FIRST_HOUR);

const getTopPx = (scheduledAt: string) => {
  const d = new Date(scheduledAt);
  return ((d.getHours() - FIRST_HOUR) + d.getMinutes() / 60) * HOUR_HEIGHT;
};

const getDurationPx = (mins: number) => Math.max((mins / 60) * HOUR_HEIGHT, 28);

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS: Record<string, { bg: string; bar: string; text: string; badge: string; label: string }> = {
  scheduled: { bg: 'bg-blue-50',  bar: 'bg-blue-400',  text: 'text-blue-800',  badge: 'bg-blue-100 text-blue-700',  label: 'Agendada'  },
  completed: { bg: 'bg-green-50', bar: 'bg-green-500', text: 'text-green-800', badge: 'bg-green-100 text-green-700', label: 'Concluída' },
  cancelled: { bg: 'bg-gray-50',  bar: 'bg-gray-300',  text: 'text-gray-400',  badge: 'bg-gray-100 text-gray-500',  label: 'Cancelada' },
  no_show:   { bg: 'bg-amber-50', bar: 'bg-amber-400', text: 'text-amber-800', badge: 'bg-amber-100 text-amber-700', label: 'Falta'     },
};
const st = (s: string) => STATUS[s] ?? STATUS.scheduled;

const TYPE_LABELS: Record<string, string> = {
  initial: 'Consulta Inicial',
  follow_up: 'Retorno',
  prescription_renewal: 'Renovação de Receita',
};

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

// ─── Calendar event card (day view) ──────────────────────────────────────────

const DayCard: React.FC<{
  consult: Consultation;
  duration: number;
  selected: boolean;
  onClick: () => void;
}> = ({ consult, duration, selected, onClick }) => {
  const s = st(consult.status);
  const h = getDurationPx(duration);
  const time = fmtTime(consult.scheduled_at);

  return (
    <div
      onClick={onClick}
      className={`absolute left-1 right-1 rounded-md overflow-hidden cursor-pointer transition-all
        ${s.bg} ${selected ? 'ring-2 ring-[#7d4a3c] shadow-md' : 'hover:brightness-95 shadow-sm'}`}
      style={{ top: `${getTopPx(consult.scheduled_at)}px`, height: `${h}px` }}
    >
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${s.bar}`} />
      <div className="flex items-center gap-1.5 pl-2.5 pr-2 h-full overflow-hidden">
        <span className={`text-xs font-bold shrink-0 ${s.text}`}>{time}</span>
        <span className={`text-xs font-medium truncate flex-1 ${s.text}`}>
          {consult.patient_name || 'Paciente'}
        </span>
        {consult.payment_status === 'paid'
          ? <CheckCircle className="w-3 h-3 text-green-500 shrink-0" />
          : <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 shrink-0" />
        }
      </div>
    </div>
  );
};

// ─── Week event card ──────────────────────────────────────────────────────────

const WeekCard: React.FC<{
  consult: Consultation;
  duration: number;
  selected: boolean;
  onClick: () => void;
}> = ({ consult, duration, selected, onClick }) => {
  const s = st(consult.status);
  const time = fmtTime(consult.scheduled_at);
  const name = (consult.patient_name || 'Paciente').split(' ')[0];

  return (
    <div
      onClick={onClick}
      className={`absolute inset-x-0.5 rounded overflow-hidden cursor-pointer transition-all
        ${s.bg} ${selected ? 'ring-2 ring-[#7d4a3c]' : 'hover:brightness-95'}`}
      style={{ top: `${getTopPx(consult.scheduled_at)}px`, height: `${getDurationPx(duration)}px`, zIndex: 10 }}
    >
      <div className={`absolute left-0 top-0 bottom-0 w-0.5 ${s.bar}`} />
      <div className="pl-1.5 pt-0.5 overflow-hidden">
        <p className={`text-[10px] font-bold leading-tight ${s.text}`}>{time}</p>
        <p className={`text-[10px] truncate ${s.text} opacity-75`}>{name}</p>
      </div>
    </div>
  );
};

// ─── Detail sidebar ───────────────────────────────────────────────────────────

const ConsultSidebar: React.FC<{
  consult: Consultation;
  duration: number;
  onClose: () => void;
  onViewProfile: () => void;
  onStartVideo: () => void;
  onCloseConsult: () => void;
  onNoShow: () => void;
  onCancel: () => void;
  onReschedule: () => void;
}> = ({ consult, duration, onClose, onViewProfile, onStartVideo, onCloseConsult, onNoShow, onCancel, onReschedule }) => {
  const s = st(consult.status);
  const isScheduled = consult.status === 'scheduled';
  const time = fmtTime(consult.scheduled_at);
  const date = new Date(consult.scheduled_at).toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  return (
    <div className="w-72 shrink-0 border-l border-gray-100 flex flex-col bg-white">
      {/* Header */}
      <div className={`px-4 py-3 ${s.bg} border-b border-gray-100 flex items-start justify-between gap-2`}>
        <div className="flex-1 min-w-0">
          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${s.badge} mb-1`}>
            {s.label}
          </span>
          <p className={`text-base font-bold leading-tight truncate ${s.text}`}>
            {consult.patient_name || 'Paciente'}
          </p>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-black/5 transition shrink-0">
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {/* Info */}
      <div className="p-4 space-y-2.5 flex-1 overflow-y-auto">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Clock className="w-4 h-4 text-gray-400 shrink-0" />
          <div>
            <p className="font-semibold text-gray-800">{time} · {duration} min</p>
            <p className="text-xs text-gray-500 capitalize">{date}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-600">
          <User className="w-4 h-4 text-gray-400 shrink-0" />
          <span>{TYPE_LABELS[consult.type] ?? consult.type}</span>
        </div>

        {/* Actions */}
        <div className="border-t border-gray-100 pt-3 space-y-2">
          <button
            onClick={onViewProfile}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-700 text-sm font-medium transition"
          >
            <FileText className="w-4 h-4 text-gray-500" />
            Ver ficha do paciente
          </button>

          {isScheduled && (
            <>
              <button
                onClick={onStartVideo}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-[#7d4a3c]/5 hover:bg-[#7d4a3c]/10 text-[#7d4a3c] text-sm font-medium transition"
              >
                <Video className="w-4 h-4" />
                Iniciar videoconsulta
              </button>

              <button
                onClick={onCloseConsult}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition"
              >
                <LogOut className="w-4 h-4" />
                Encerrar e preencher prontuário
              </button>

              {/* Reagendar — reduz atrito com paciente */}
              <button
                onClick={onReschedule}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-medium transition"
              >
                <RefreshCw className="w-4 h-4" />
                Sugerir reagendamento
              </button>

              <div className="flex gap-2">
                <button
                  onClick={onNoShow}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-medium transition"
                >
                  <X className="w-3.5 h-3.5" /> Registrar falta
                </button>
                <button
                  onClick={onCancel}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium transition"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Cancelar
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

export const DoctorAgenda: React.FC = () => {
  const { doctor } = useOutletContext<{ doctor: Doctor }>();
  const navigate = useNavigate();

  // ── Availability ────────────────────────────────────────────────────────────
  const [weekOffset, setWeekOffset] = useState(0);
  const [availabilities, setAvailabilities] = useState<Record<string, DoctorAvailability[]>>({});
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showCopyModal, setShowCopyModal] = useState<string | null>(null);
  const [copyTargetDays, setCopyTargetDays] = useState<string[]>([]);
  const [availabilityOpen, setAvailabilityOpen] = useState(false);

  // ── Calendar ────────────────────────────────────────────────────────────────
  const [calendarView, setCalendarView] = useState<'day' | 'week'>('day');
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());
  const [consultationMap, setConsultationMap] = useState<Record<string, Consultation[]>>({});
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [selectedConsult, setSelectedConsult] = useState<Consultation | null>(null);

  // ── Modals ──────────────────────────────────────────────────────────────────
  const [showCancelModal, setShowCancelModal] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [closeGate, setCloseGate] = useState<Consultation | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<Consultation | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [rescheduleMsg, setRescheduleMsg] = useState('');
  const [rescheduling, setRescheduling] = useState(false);

  const duration = doctor?.consultation_duration || 20;

  // ── 14-day columns ──────────────────────────────────────────────────────────
  const generateDays = useCallback(() => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + weekOffset * 7);
    return Array.from({ length: 14 }, (_, i) => {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      return {
        date,
        dateStr: formatDateISO(date),
        dayOfWeek: date.getDay(),
        label: `${getShortDayName(date)} ${formatDateShort(date)}`,
        isToday: formatDateISO(date) === formatDateISO(new Date()),
      };
    });
  }, [weekOffset]);

  const days = generateDays();

  const generateTimeSlots = useCallback(() => {
    const slots: string[] = [];
    for (let m = 7 * 60; m <= 21 * 60; m += duration) {
      slots.push(`${Math.floor(m / 60).toString().padStart(2, '0')}:${(m % 60).toString().padStart(2, '0')}`);
    }
    return slots;
  }, [duration]);

  // ── Drag & drop ─────────────────────────────────────────────────────────────
  const handleDragStart = (e: React.DragEvent, t: string) => e.dataTransfer.setData('timeStr', t);
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const handleDrop = (e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    const timeStr = e.dataTransfer.getData('timeStr');
    if (!timeStr) return;
    const [h, m] = timeStr.split(':').map(Number);
    const endMins = h * 60 + m + duration;
    const endH = Math.floor(endMins / 60).toString().padStart(2, '0');
    const endM = (endMins % 60).toString().padStart(2, '0');
    const newSlot: DoctorAvailability = {
      id: `temp-${Date.now()}-${Math.random()}`,
      doctor_id: doctor!.id,
      day_of_week: new Date(dateStr + 'T00:00:00').getDay(),
      date: dateStr,
      start_time: `${timeStr}:00`,
      end_time: `${endH}:${endM}:00`,
      is_active: true,
    };
    setAvailabilities(prev => {
      if (prev[dateStr]?.some(a => a.start_time === newSlot.start_time)) {
        toast.error('Horário já adicionado nesta data.');
        return prev;
      }
      const sorted = [...(prev[dateStr] || []), newSlot].sort((a, b) => a.start_time.localeCompare(b.start_time));
      return { ...prev, [dateStr]: sorted };
    });
  };

  const removeTimeSlot = (dateStr: string, id: string) => {
    if (!id.startsWith('temp-')) setDeletedIds(prev => [...prev, id]);
    setAvailabilities(prev => ({ ...prev, [dateStr]: prev[dateStr].filter(a => a.id !== id) }));
  };

  // ── Copy schedule ───────────────────────────────────────────────────────────
  const handleCopySchedule = (src: string, targets: string[]) => {
    const sourceSlots = availabilities[src] || [];
    if (!sourceSlots.length) { toast.error('Nenhum horário para copiar.'); return; }
    if (!targets.length) { toast.error('Selecione pelo menos uma data.'); return; }
    let count = 0;
    setAvailabilities(prev => {
      const updated = { ...prev };
      targets.forEach(t => {
        if (t === src) return;
        const target = [...(prev[t] || [])];
        sourceSlots.forEach(s => {
          if (target.some(x => x.start_time === s.start_time)) return;
          target.push({ id: `temp-${Date.now()}-${Math.random()}`, doctor_id: doctor!.id, day_of_week: new Date(t + 'T00:00:00').getDay(), date: t, start_time: s.start_time, end_time: s.end_time, is_active: true });
          count++;
        });
        updated[t] = target.sort((a, b) => a.start_time.localeCompare(b.start_time));
      });
      return updated;
    });
    setShowCopyModal(null);
    setCopyTargetDays([]);
    if (count > 0) toast.success(`${count} horário${count > 1 ? 's' : ''} copiado${count > 1 ? 's' : ''}!`);
    else toast('Horários já existem nas datas selecionadas.');
  };

  const selectAllWeekdays = () => setCopyTargetDays(days.filter(d => d.dayOfWeek >= 1 && d.dayOfWeek <= 5 && d.dateStr !== showCopyModal).map(d => d.dateStr));
  const selectWeekend = () => setCopyTargetDays(days.filter(d => (d.dayOfWeek === 0 || d.dayOfWeek === 6) && d.dateStr !== showCopyModal).map(d => d.dateStr));
  const selectAllDays = () => setCopyTargetDays(days.filter(d => d.dateStr !== showCopyModal).map(d => d.dateStr));

  // ── Load availability ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!doctor) return;
    const load = async () => {
      try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() + weekOffset * 7);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 13);
        const data = await availabilityService.getDoctorAvailability(doctor.id, formatDateISO(startDate), formatDateISO(endDate));
        const grouped: Record<string, DoctorAvailability[]> = {};
        for (let i = 0; i < 14; i++) {
          const d = new Date(startDate); d.setDate(d.getDate() + i);
          grouped[formatDateISO(d)] = [];
        }
        data.forEach(a => { if (a.date) { if (!grouped[a.date]) grouped[a.date] = []; grouped[a.date].push(a); } });
        Object.keys(grouped).forEach(k => grouped[k].sort((a, b) => a.start_time.localeCompare(b.start_time)));
        setAvailabilities(grouped);
      } catch { toast.error('Erro ao carregar disponibilidade.'); }
      finally { setLoading(false); }
    };
    load();
  }, [doctor, weekOffset]);

  // ── Load calendar consultations ─────────────────────────────────────────────
  const loadCalendarData = useCallback(async () => {
    if (!doctor) return;
    setCalendarLoading(true);
    try {
      if (calendarView === 'day') {
        const dateStr = formatDateISO(calendarDate);
        const data = await consultationService.getConsultationsByDay(doctor.id, dateStr);
        setConsultationMap({ [dateStr]: data });
      } else {
        const ws = getWeekStart(calendarDate);
        const dates = Array.from({ length: 7 }, (_, i) => { const d = new Date(ws); d.setDate(d.getDate() + i); return d; });
        const results = await Promise.all(dates.map(d => consultationService.getConsultationsByDay(doctor.id, formatDateISO(d))));
        const map: Record<string, Consultation[]> = {};
        dates.forEach((d, i) => { map[formatDateISO(d)] = results[i]; });
        setConsultationMap(map);
      }
    } catch (e) { console.error(e); }
    finally { setCalendarLoading(false); }
  }, [doctor, calendarView, calendarDate]);

  useEffect(() => { loadCalendarData(); }, [loadCalendarData]);

  // ── Calendar navigation ─────────────────────────────────────────────────────
  const navigatePrev = () => { setCalendarDate(p => { const d = new Date(p); d.setDate(d.getDate() - (calendarView === 'day' ? 1 : 7)); return d; }); setSelectedConsult(null); };
  const navigateNext = () => { setCalendarDate(p => { const d = new Date(p); d.setDate(d.getDate() + (calendarView === 'day' ? 1 : 7)); return d; }); setSelectedConsult(null); };
  const goToToday = () => { setCalendarDate(new Date()); setSelectedConsult(null); };

  const weekDays = (() => {
    const ws = getWeekStart(calendarDate);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(ws); d.setDate(d.getDate() + i);
      const dateStr = formatDateISO(d);
      return { date: d, dateStr, shortDay: getShortDayName(d), dayNum: d.getDate(), isToday: dateStr === formatDateISO(new Date()) };
    });
  })();

  const getPeriodLabel = () => {
    if (calendarView === 'day') {
      const isToday = formatDateISO(calendarDate) === formatDateISO(new Date());
      return `${FULL_DAY_NAMES[calendarDate.getDay()]}, ${calendarDate.getDate()} de ${calendarDate.toLocaleDateString('pt-BR', { month: 'long' })}${isToday ? ' (hoje)' : ''}`;
    }
    const ws = getWeekStart(calendarDate);
    const we = new Date(ws); we.setDate(we.getDate() + 6);
    return `${ws.getDate()}/${ws.getMonth() + 1} – ${we.getDate()}/${we.getMonth() + 1}`;
  };

  // ── Consultation actions ────────────────────────────────────────────────────
  const handleCancelConsultation = async () => {
    if (!showCancelModal) return;
    try {
      await consultationService.cancelConsultation(showCancelModal, cancelReason);
      toast.success('Consulta cancelada');
      setShowCancelModal(null); setCancelReason(''); setSelectedConsult(null);
      await loadCalendarData();
    } catch { toast.error('Erro ao cancelar'); }
  };

  const handleNoShow = async (id: string) => {
    try {
      await consultationService.cancelConsultation(id, 'Paciente não compareceu');
      toast.success('Falta registrada');
      setSelectedConsult(null);
      await loadCalendarData();
    } catch { toast.error('Erro ao registrar falta'); }
  };

  const handleReschedule = async () => {
    if (!rescheduleTarget || !rescheduleDate || !rescheduleTime) return;
    setRescheduling(true);
    try {
      const newISO = new Date(`${rescheduleDate}T${rescheduleTime}:00`).toISOString();
      await consultationService.rescheduleConsultation(rescheduleTarget.id, newISO, rescheduleMsg || undefined);
      toast.success('Consulta reagendada e paciente notificado!');
      setRescheduleTarget(null);
      setRescheduleDate('');
      setRescheduleTime('');
      setRescheduleMsg('');
      setSelectedConsult(null);
      await loadCalendarData();
    } catch { toast.error('Erro ao reagendar consulta'); }
    finally { setRescheduling(false); }
  };

  const openReschedule = (consult: Consultation) => {
    const d = new Date(consult.scheduled_at);
    setRescheduleDate(formatDateISO(d));
    setRescheduleTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
    setRescheduleMsg('');
    setRescheduleTarget(consult);
  };

  // ── Save availability ────────────────────────────────────────────────────────
  const handleSaveAvailability = async () => {
    if (!doctor) return;
    setSaving(true);
    try {
      for (const id of deletedIds) await availabilityService.deleteAvailability(id);
      setDeletedIds([]);
      const flat = (Object.values(availabilities).flat() as DoctorAvailability[]).filter(a => a.is_active).map(a => {
        if (a.id?.startsWith('temp-') || !a.id) { const { id, ...rest } = a; return rest; }
        return a;
      }) as DoctorAvailability[];
      if (flat.length > 0) await availabilityService.upsertAvailability(flat);
      toast.success('Disponibilidade salva!');
      // Reload
      const startDate = new Date(); startDate.setDate(startDate.getDate() + weekOffset * 7);
      const endDate = new Date(startDate); endDate.setDate(endDate.getDate() + 13);
      const data = await availabilityService.getDoctorAvailability(doctor.id, formatDateISO(startDate), formatDateISO(endDate));
      const grouped: Record<string, DoctorAvailability[]> = {};
      for (let i = 0; i < 14; i++) { const d = new Date(startDate); d.setDate(d.getDate() + i); grouped[formatDateISO(d)] = []; }
      data.forEach(a => { if (a.date) { if (!grouped[a.date]) grouped[a.date] = []; grouped[a.date].push(a); } });
      Object.keys(grouped).forEach(k => grouped[k].sort((a, b) => a.start_time.localeCompare(b.start_time)));
      setAvailabilities(grouped);
    } catch { toast.error('Erro ao salvar'); }
    finally { setSaving(false); }
  };

  // ── Auto-scroll ──────────────────────────────────────────────────────────────
  const now = new Date();
  const todayStr = formatDateISO(now);
  const currentTimeTopPx = now.getHours() >= FIRST_HOUR && now.getHours() <= LAST_HOUR
    ? ((now.getHours() - FIRST_HOUR) + now.getMinutes() / 60) * HOUR_HEIGHT : null;

  const dayStr = formatDateISO(calendarDate);
  const dayConsults = consultationMap[dayStr] || [];

  const dayScrollRef = useRef<HTMLDivElement>(null);
  const weekScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ref = calendarView === 'day' ? dayScrollRef.current : weekScrollRef.current;
    if (!ref) return;
    let target: number;
    if (calendarView === 'day' && dayStr === todayStr && currentTimeTopPx !== null) {
      target = currentTimeTopPx - 100;
    } else {
      const first = dayConsults[0];
      target = first ? getTopPx(first.scheduled_at) - 80 : (8 - FIRST_HOUR) * HOUR_HEIGHT;
    }
    ref.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calendarView, calendarDate, consultationMap]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7d4a3c]" />
    </div>
  );

  // ── Sidebar action handlers ─────────────────────────────────────────────────
  const sidebarActions = selectedConsult ? {
    onViewProfile: () => navigate(`/medico/paciente/${selectedConsult.patient_id}`),
    onStartVideo: () => navigate(`/medico/consulta/${selectedConsult.id}`),
    onCloseConsult: () => { setCloseGate(selectedConsult); },
    onNoShow: () => handleNoShow(selectedConsult.id),
    onCancel: () => setShowCancelModal(selectedConsult.id),
    onReschedule: () => openReschedule(selectedConsult),
  } : null;

  return (
    <div className="space-y-3">

      {/* ══ Calendário de consultas ══════════════════════════════════════════ */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">

        {/* Toolbar */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 bg-gray-50/50">
          <div className="flex bg-white border border-gray-200 rounded-lg p-0.5 gap-0.5 shrink-0">
            <button
              onClick={() => { setCalendarView('day'); setSelectedConsult(null); }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition ${calendarView === 'day' ? 'bg-[#7d4a3c] text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              <CalendarDays className="w-3 h-3" /> Dia
            </button>
            <button
              onClick={() => { setCalendarView('week'); setSelectedConsult(null); }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition ${calendarView === 'week' ? 'bg-[#7d4a3c] text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              <LayoutGrid className="w-3 h-3" /> Semana
            </button>
          </div>

          <button onClick={navigatePrev} className="p-1 rounded hover:bg-gray-200 transition text-gray-500 shrink-0">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="flex-1 text-center text-sm font-semibold text-gray-700 capitalize">
            {getPeriodLabel()}
          </span>
          <button onClick={navigateNext} className="p-1 rounded hover:bg-gray-200 transition text-gray-500 shrink-0">
            <ChevronRight className="w-4 h-4" />
          </button>

          <button onClick={goToToday} className="px-2.5 py-1 text-xs font-medium border border-[#7d4a3c] text-[#7d4a3c] hover:bg-[#7d4a3c] hover:text-white rounded-lg transition shrink-0">
            Hoje
          </button>
          {calendarLoading && <div className="w-3.5 h-3.5 border-2 border-[#7d4a3c] border-t-transparent rounded-full animate-spin shrink-0" />}
        </div>

        {/* Calendar body + sidebar */}
        <div className="flex" style={{ height: 'calc(100vh - 220px)', minHeight: 480 }}>

          {/* ─── Day view ─────────────────────────────────────────────────── */}
          {calendarView === 'day' && (
            <div ref={dayScrollRef} className="flex-1 overflow-y-auto min-w-0">
              <div className="relative flex" style={{ minHeight: `${HOURS.length * HOUR_HEIGHT}px` }}>
                {/* Hour labels */}
                <div className="w-12 shrink-0 border-r border-gray-100 select-none">
                  {HOURS.map(h => (
                    <div key={h} style={{ height: HOUR_HEIGHT }} className="relative">
                      <span className="absolute -top-2 right-2 text-[10px] text-gray-400">
                        {String(h).padStart(2, '0')}:00
                      </span>
                    </div>
                  ))}
                </div>
                {/* Grid + cards */}
                <div className="flex-1 relative">
                  {HOURS.map(h => (
                    <div key={h} style={{ height: HOUR_HEIGHT }} className="border-t border-gray-100" />
                  ))}
                  {currentTimeTopPx !== null && dayStr === todayStr && (
                    <div className="absolute left-0 right-0 flex items-center z-20 pointer-events-none" style={{ top: currentTimeTopPx }}>
                      <div className="w-2 h-2 bg-red-500 rounded-full -ml-1 shrink-0" />
                      <div className="flex-1 border-t border-red-400" />
                    </div>
                  )}
                  {!dayConsults.length && !calendarLoading && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="text-center">
                        <Calendar className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                        <p className="text-sm text-gray-400">Sem consultas neste dia</p>
                      </div>
                    </div>
                  )}
                  {dayConsults.map(c => (
                    <DayCard
                      key={c.id}
                      consult={c}
                      duration={duration}
                      selected={selectedConsult?.id === c.id}
                      onClick={() => setSelectedConsult(prev => prev?.id === c.id ? null : c)}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ─── Week view ────────────────────────────────────────────────── */}
          {calendarView === 'week' && (
            <div className="flex-1 flex flex-col min-w-0 overflow-x-auto">
              {/* Day headers */}
              <div className="flex shrink-0 border-b border-gray-100 bg-gray-50/50" style={{ paddingLeft: 48 }}>
                {weekDays.map(d => (
                  <div
                    key={d.dateStr}
                    onClick={() => { setCalendarDate(d.date); setCalendarView('day'); setSelectedConsult(null); }}
                    className={`flex-1 text-center py-1.5 cursor-pointer hover:bg-gray-100 transition select-none min-w-[80px] ${d.isToday ? 'bg-[#7d4a3c]/5' : ''}`}
                  >
                    <p className="text-[10px] text-gray-400 uppercase">{d.shortDay}</p>
                    <p className={`text-sm font-bold ${d.isToday ? 'text-[#7d4a3c]' : 'text-gray-700'}`}>{d.dayNum}</p>
                    {d.isToday && <div className="w-1 h-1 bg-[#7d4a3c] rounded-full mx-auto" />}
                    {(consultationMap[d.dateStr] || []).length > 0 && (
                      <span className="text-[9px] font-bold text-[#7d4a3c] bg-[#7d4a3c]/10 px-1.5 rounded-full">
                        {(consultationMap[d.dateStr] || []).length}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              {/* Timeline */}
              <div ref={weekScrollRef} className="flex-1 overflow-y-auto">
                <div className="relative flex" style={{ minHeight: `${HOURS.length * HOUR_HEIGHT}px`, minWidth: 560 }}>
                  <div className="w-12 shrink-0 border-r border-gray-100 select-none">
                    {HOURS.map(h => (
                      <div key={h} style={{ height: HOUR_HEIGHT }} className="relative">
                        <span className="absolute -top-2 right-2 text-[10px] text-gray-400">{String(h).padStart(2, '0')}:00</span>
                      </div>
                    ))}
                  </div>
                  {weekDays.map(d => (
                    <div key={d.dateStr} className={`flex-1 relative border-l border-gray-100 min-w-[80px] ${d.isToday ? 'bg-[#7d4a3c]/[0.02]' : ''}`}>
                      {HOURS.map(h => <div key={h} style={{ height: HOUR_HEIGHT }} className="border-t border-gray-100" />)}
                      {d.isToday && currentTimeTopPx !== null && (
                        <div className="absolute left-0 right-0 border-t border-red-400 z-10 pointer-events-none" style={{ top: currentTimeTopPx }} />
                      )}
                      {(consultationMap[d.dateStr] || []).map(c => (
                        <WeekCard
                          key={c.id}
                          consult={c}
                          duration={duration}
                          selected={selectedConsult?.id === c.id}
                          onClick={() => setSelectedConsult(prev => prev?.id === c.id ? null : c)}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ─── Detail sidebar ───────────────────────────────────────────── */}
          {selectedConsult && sidebarActions && (
            <ConsultSidebar
              consult={selectedConsult}
              duration={duration}
              onClose={() => setSelectedConsult(null)}
              {...sidebarActions}
            />
          )}
        </div>
      </div>

      {/* ══ Trigger: Configurar Disponibilidade ══════════════════════════════ */}
      <button
        onClick={() => setAvailabilityOpen(true)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-white rounded-xl border border-gray-100 shadow-sm hover:bg-gray-50 transition"
      >
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-semibold text-gray-700">Configurar Disponibilidade</span>
          <span className="text-xs text-gray-400">
            ({(Object.values(availabilities).flat() as DoctorAvailability[]).length} horários cadastrados)
          </span>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-400" />
      </button>

      {/* ══ Modal: Disponibilidade ══════════════════════════════════════════ */}
      {availabilityOpen && (
        <div className="fixed inset-0 z-50 flex flex-col">
          <div className="absolute inset-0 bg-black/40" onClick={() => setAvailabilityOpen(false)} />
          <div className="relative mt-auto bg-white rounded-t-2xl shadow-2xl flex flex-col" style={{ maxHeight: '85vh' }}>
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-[#7d4a3c]" />
                <h3 className="text-base font-semibold text-gray-800">Configurar Disponibilidade</h3>
              </div>
              <div className="flex items-center gap-2">
                {/* Week navigation */}
                <button onClick={() => setWeekOffset(p => p - 1)} className="p-1.5 hover:bg-gray-100 rounded-lg transition">
                  <ChevronLeft className="w-4 h-4 text-gray-500" />
                </button>
                <span className="text-xs font-semibold text-gray-600 w-28 text-center">
                  {weekOffset === 0 ? 'Esta semana' : weekOffset === 1 ? 'Próxima semana' : weekOffset < 0 ? `${Math.abs(weekOffset)} sem. atrás` : `+${weekOffset} semanas`}
                </span>
                <button onClick={() => setWeekOffset(p => p + 1)} className="p-1.5 hover:bg-gray-100 rounded-lg transition">
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                </button>
                <div className="w-px h-5 bg-gray-200 mx-1" />
                <button onClick={() => setAvailabilityOpen(false)} className="p-1.5 hover:bg-gray-100 rounded-lg transition">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Modal body */}
            <div className="flex gap-4 p-5 flex-1 overflow-hidden">
              {/* Paleta */}
              <div className="w-40 shrink-0 bg-gray-50 rounded-xl border border-gray-200 p-3 flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-600">Paleta</span>
                  <span className="text-[10px] bg-[#7d4a3c]/10 text-[#7d4a3c] font-bold px-1.5 py-0.5 rounded-full">{duration} min</span>
                </div>
                <p className="text-[10px] text-gray-400 mb-2">Arraste para as datas →</p>
                <div className="flex-1 overflow-y-auto grid grid-cols-2 gap-1.5">
                  {generateTimeSlots().map(t => (
                    <div
                      key={t}
                      draggable
                      onDragStart={e => handleDragStart(e, t)}
                      className="bg-white border border-gray-200 text-gray-600 font-semibold text-xs text-center py-1.5 rounded-lg cursor-grab hover:border-[#7d4a3c] hover:text-[#7d4a3c] hover:shadow-sm transition"
                    >
                      {t}
                    </div>
                  ))}
                </div>
              </div>

              {/* Kanban – scrollable horizontally */}
              <div className="flex-1 overflow-x-auto overflow-y-auto">
                <div className="flex gap-3 pb-2 h-full" style={{ minWidth: 'max-content' }}>
                  {days.map(dayInfo => (
                    <div
                      key={dayInfo.dateStr}
                      onDragOver={handleDragOver}
                      onDrop={e => handleDrop(e, dayInfo.dateStr)}
                      className={`rounded-xl p-3 border w-36 shrink-0 relative group transition flex flex-col ${dayInfo.isToday ? 'border-[#7d4a3c] bg-[#7d4a3c]/5' : 'border-dashed border-gray-300 hover:border-[#7d4a3c]/50 bg-gray-50/50'}`}
                    >
                      <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-200">
                        <div>
                          <span className={`text-xs font-bold block ${dayInfo.isToday ? 'text-[#7d4a3c]' : 'text-gray-700'}`}>{dayInfo.label}</span>
                          {dayInfo.isToday && <span className="text-[9px] bg-[#7d4a3c] text-white px-1 rounded-full font-bold">HOJE</span>}
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-gray-400">{availabilities[dayInfo.dateStr]?.length || 0}</span>
                          <button
                            onClick={() => { setShowCopyModal(dayInfo.dateStr); setCopyTargetDays([]); }}
                            disabled={!availabilities[dayInfo.dateStr]?.length}
                            className="p-0.5 bg-[#7d4a3c] text-white rounded opacity-0 group-hover:opacity-100 disabled:opacity-0 transition"
                          >
                            <Copy className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5 flex-1 overflow-y-auto">
                        {!availabilities[dayInfo.dateStr]?.length ? (
                          <p className="text-[10px] text-gray-400 text-center mt-4 opacity-60">Solte aqui</p>
                        ) : (
                          availabilities[dayInfo.dateStr].map(avail => (
                            <div key={avail.id} className="bg-white border border-gray-200 rounded-lg px-2 py-1 flex items-center justify-between group/slot hover:border-[#7d4a3c] transition">
                              <span className="text-xs font-bold text-gray-700">{avail.start_time.slice(0, 5)}</span>
                              <button onClick={() => removeTimeSlot(dayInfo.dateStr, avail.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover/slot:opacity-100 transition">
                                <X className="w-3 h-3" />
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

            {/* Modal footer */}
            <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between shrink-0 bg-gray-50/50">
              <p className="text-xs text-gray-400">
                {(Object.values(availabilities).flat() as DoctorAvailability[]).length} horários cadastrados nesta quinzena
              </p>
              <div className="flex items-center gap-2">
                <button onClick={() => setAvailabilityOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition">
                  Fechar
                </button>
                <button
                  onClick={async () => { await handleSaveAvailability(); setAvailabilityOpen(false); }}
                  disabled={saving}
                  className="px-4 py-2 bg-[#7d4a3c] hover:bg-[#623a2f] text-white rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50 transition"
                >
                  <Save className="w-3.5 h-3.5" />
                  {saving ? 'Salvando...' : 'Salvar e fechar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ Modal: Copiar Horários ══════════════════════════════════════════ */}
      {showCopyModal !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCopyModal(null)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg p-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-gray-800">Copiar Horários</h3>
                <p className="text-xs text-gray-500 mt-0.5">De: <strong>{days.find(d => d.dateStr === showCopyModal)?.label}</strong></p>
              </div>
              <button onClick={() => setShowCopyModal(null)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="mb-3 p-3 bg-gray-50 rounded-lg flex flex-wrap gap-1.5">
              {availabilities[showCopyModal]?.map(a => (
                <span key={a.id} className="px-2 py-0.5 bg-white border border-gray-200 rounded text-xs font-semibold text-gray-700">
                  {a.start_time.slice(0, 5)}
                </span>
              ))}
            </div>

            <div className="flex gap-2 mb-3">
              <button onClick={selectAllWeekdays} className="px-2.5 py-1.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-lg hover:bg-blue-100 transition">Dias úteis</button>
              <button onClick={selectWeekend} className="px-2.5 py-1.5 bg-purple-50 text-purple-700 text-xs font-medium rounded-lg hover:bg-purple-100 transition">Fim de semana</button>
              <button onClick={selectAllDays} className="px-2.5 py-1.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-200 transition">Todos</button>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 max-h-52 overflow-y-auto mb-4">
              {days.map(d => {
                if (d.dateStr === showCopyModal) return null;
                const sel = copyTargetDays.includes(d.dateStr);
                return (
                  <label key={d.dateStr} className={`flex flex-col items-center p-2 rounded-lg border-2 cursor-pointer transition ${sel ? 'border-[#7d4a3c] bg-[#7d4a3c]/5' : 'border-gray-200 hover:border-gray-300'}`}>
                    <input type="checkbox" checked={sel} onChange={e => { if (e.target.checked) setCopyTargetDays(p => [...p, d.dateStr]); else setCopyTargetDays(p => p.filter(x => x !== d.dateStr)); }} className="sr-only" />
                    <span className={`text-xs font-bold ${d.isToday ? 'text-[#7d4a3c]' : 'text-gray-700'}`}>{d.label}</span>
                    {availabilities[d.dateStr]?.length > 0 && <span className="text-[10px] text-gray-400 mt-0.5">{availabilities[d.dateStr].length} slots</span>}
                  </label>
                );
              })}
            </div>

            <div className="flex gap-2 pt-3 border-t border-gray-100">
              <button onClick={() => setShowCopyModal(null)} className="flex-1 py-2 text-gray-600 text-sm font-medium hover:bg-gray-50 rounded-lg">Cancelar</button>
              <button onClick={() => handleCopySchedule(showCopyModal, copyTargetDays)} disabled={!copyTargetDays.length}
                className="flex-1 py-2 bg-[#7d4a3c] hover:bg-[#623a2f] text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-1.5">
                <Copy className="w-3.5 h-3.5" /> Copiar para {copyTargetDays.length} dia{copyTargetDays.length !== 1 ? 's' : ''}
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
            setSelectedConsult(null);
          }}
        />
      )}

      {/* ══ Modal: Reagendar Consulta ══════════════════════════════════════ */}
      {rescheduleTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setRescheduleTarget(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <RefreshCw className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-800">Sugerir reagendamento</h3>
                <p className="text-xs text-gray-500">{rescheduleTarget.patient_name || 'Paciente'}</p>
              </div>
              <button onClick={() => setRescheduleTarget(null)} className="ml-auto p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Nova data */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nova data</label>
                <input
                  type="date"
                  value={rescheduleDate}
                  min={formatDateISO(new Date())}
                  onChange={e => setRescheduleDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm text-gray-800"
                />
              </div>

              {/* Novo horário */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Novo horário</label>
                <input
                  type="time"
                  value={rescheduleTime}
                  onChange={e => setRescheduleTime(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm text-gray-800"
                />
              </div>

              {/* Mensagem opcional */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-gray-400" />
                    Mensagem para o paciente
                    <span className="text-gray-400 font-normal">(opcional)</span>
                  </span>
                </label>
                <textarea
                  value={rescheduleMsg}
                  onChange={e => setRescheduleMsg(e.target.value)}
                  rows={2}
                  placeholder="Ex: Preciso ajustar minha agenda. Nova proposta de horário."
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm text-gray-700 resize-none"
                />
              </div>

              {/* Preview */}
              {rescheduleDate && rescheduleTime && (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-blue-50 rounded-xl">
                  <Clock className="w-4 h-4 text-blue-500 shrink-0" />
                  <p className="text-sm text-blue-700 font-medium">
                    {new Date(`${rescheduleDate}T${rescheduleTime}`).toLocaleDateString('pt-BR', {
                      weekday: 'long', day: 'numeric', month: 'long',
                    })} às {rescheduleTime}
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-2 mt-5">
              <button onClick={() => setRescheduleTarget(null)} className="flex-1 py-2.5 text-sm text-gray-600 hover:bg-gray-100 rounded-xl font-medium transition">
                Cancelar
              </button>
              <button
                onClick={handleReschedule}
                disabled={!rescheduleDate || !rescheduleTime || rescheduling}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition"
              >
                {rescheduling ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                {rescheduling ? 'Reagendando...' : 'Confirmar e notificar paciente'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Modal: Cancelar Consulta ════════════════════════════════════════ */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCancelModal(null)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4.5 h-4.5 text-red-600" />
              </div>
              <h3 className="text-base font-semibold text-gray-800">Cancelar Consulta</h3>
            </div>
            <textarea
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-500 resize-none text-sm mb-4"
              placeholder="Motivo do cancelamento (opcional)..."
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowCancelModal(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Voltar</button>
              <button onClick={handleCancelConsultation} className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium">
                Confirmar cancelamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
