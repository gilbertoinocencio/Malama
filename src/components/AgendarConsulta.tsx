import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import {
  Doctor,
  TimeSlot,
  getAvailableDoctors,
  getAvailableSlots,
  bookConsultation,
  Consultation,
} from '../lib/scheduling';
import { AppView } from '../types';

interface AgendarConsultaProps {
  onBack: () => void;
  onBooked: (consultation: Consultation) => void;
  onNavigate: (view: AppView) => void;
}

type Step = 'type' | 'doctors' | 'schedule' | 'summary' | 'confirmed';

const TYPE_LABELS: Record<string, { label: string; emoji: string; desc: string }> = {
  initial: { label: 'Consulta inicial', emoji: '🩺', desc: 'Primeira avaliação com especialista' },
  followup: { label: 'Acompanhamento', emoji: '📊', desc: 'Revisão de progresso e ajustes' },
  prescription_renewal: { label: 'Renovação de receita', emoji: '📋', desc: 'Renovar prescrição GLP-1' },
};

const generateNextDates = (count = 30): Date[] => {
  const dates: Date[] = [];
  const today = new Date();
  for (let i = 1; dates.length < count; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    if (d.getDay() !== 0) dates.push(d); // skip sundays
  }
  return dates;
};

export const AgendarConsulta: React.FC<AgendarConsultaProps> = ({ onBack, onBooked, onNavigate }) => {
  const { user, profile } = useAuth();
  const [step, setStep] = useState<Step>('type');
  const [consultationType, setConsultationType] = useState<'initial' | 'followup' | 'prescription_renewal'>('initial');
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);
  const [booking, setBooking] = useState(false);
  const [bookedConsultation, setBookedConsultation] = useState<Consultation | null>(null);
  const [bookError, setBookError] = useState('');

  const availableDates = generateNextDates(30);

  useEffect(() => {
    if (step === 'doctors' && doctors.length === 0) {
      console.log('📋 [AgendarConsulta] Step doctors ativado, buscando médicos...');
      setLoadingDoctors(true);
      getAvailableDoctors()
        .then((result) => {
          console.log('📋 [AgendarConsulta] Médicos recebidos:', result.length);
          console.table(result);
          setDoctors(result);
        })
        .catch((err) => {
          console.error('❌ [AgendarConsulta] Erro ao buscar médicos:', err);
        })
        .finally(() => setLoadingDoctors(false));
    }
  }, [step]);

  useEffect(() => {
    if (selectedDoctor && selectedDate) {
      setLoadingSlots(true);
      setSlots([]);
      setSelectedSlot('');
      getAvailableSlots(selectedDoctor.id, selectedDate)
        .then(setSlots)
        .catch(console.error)
        .finally(() => setLoadingSlots(false));
    }
  }, [selectedDoctor, selectedDate]);

  const handleBook = async () => {
    if (!user || !selectedDoctor || !selectedDate || !selectedSlot) return;
    setBooking(true);
    setBookError('');
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const consultation = await bookConsultation({
        patientId: user.id,
        doctorId: selectedDoctor.id,
        date: dateStr,
        time: selectedSlot,
        consultationType,
        consentGiven,
      });
      setBookedConsultation(consultation);
      setStep('confirmed');
      onBooked(consultation);
    } catch (err: any) {
      setBookError(err.message || 'Erro ao agendar. Tente novamente.');
    } finally {
      setBooking(false);
    }
  };

  const formatDateShort = (d: Date) => {
    const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return { weekday: weekdays[d.getDay()], day: d.getDate(), month: months[d.getMonth()] };
  };

  const formatDateLong = (d: Date) =>
    d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

  const progressPct = { type: 20, doctors: 40, schedule: 60, summary: 80, confirmed: 100 }[step];

  const goBack = () => {
    const map: Record<Step, Step | null> = {
      type: null, doctors: 'type', schedule: 'doctors', summary: 'schedule', confirmed: null,
    };
    const prev = map[step];
    if (prev) setStep(prev);
    else onBack();
  };

  return (
    <div className="min-h-screen bg-[#EEEFF4] font-display text-gray-900">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 pt-12 pb-4">
        <button
          onClick={goBack}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="text-lg font-bold flex-1">Agendar consulta</h1>
      </header>

      {/* Progress */}
      <div className="px-4 mb-5">
        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-green-500 rounded-full"
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </div>

      <div className="px-4 pb-10">
        <AnimatePresence mode="wait">
          {/* STEP 1: Type */}
          {step === 'type' && (
            <StepWrap key="type">
              <h2 className="text-xl font-bold mb-2">Tipo de consulta</h2>
              <p className="text-sm text-gray-500 mb-6">Como podemos te ajudar?</p>
              <div className="space-y-3">
                {(Object.entries(TYPE_LABELS) as [string, typeof TYPE_LABELS[string]][]).map(([id, info]) => (
                  <button
                    key={id}
                    onClick={() => { setConsultationType(id as any); setStep('doctors'); }}
                    className="w-full text-left px-5 py-4 rounded-2xl bg-white border-2 border-gray-200 hover:border-green-400 transition-all flex items-center gap-3 shadow-sm"
                  >
                    <span className="text-2xl">{info.emoji}</span>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-gray-800">{info.label}</p>
                      <p className="text-xs text-gray-500">{info.desc}</p>
                    </div>
                    <span className="material-symbols-outlined text-gray-400">chevron_right</span>
                  </button>
                ))}
              </div>
            </StepWrap>
          )}

          {/* STEP 2: Doctors */}
          {step === 'doctors' && (
            <StepWrap key="doctors">
              <h2 className="text-xl font-bold mb-1">Escolha o médico</h2>
              <p className="text-sm text-gray-500 mb-5">{TYPE_LABELS[consultationType].label}</p>
              {loadingDoctors ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="space-y-3">
                  {doctors.map((doc) => (
                    <button
                      key={doc.id}
                      onClick={() => { setSelectedDoctor(doc); setStep('schedule'); }}
                      className="w-full text-left px-4 py-4 rounded-2xl bg-white border-2 border-gray-200 hover:border-green-400 transition-all shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 flex-shrink-0">
                          {doc.avatar_url ? (
                            <img src={doc.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                          ) : (
                            <span className="material-symbols-outlined">person</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-800">{doc.name}</p>
                          <p className="text-xs text-gray-500">{doc.crm} · {doc.specialty}</p>
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-yellow-500 text-xs">★</span>
                            <span className="text-xs text-gray-700 font-semibold">{doc.rating.toFixed(1)}</span>
                            <span className="text-xs text-gray-400">· {doc.total_consultations} consultas</span>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-bold text-gray-800">R$ {doc.price}</p>
                          <p className="text-[10px] text-gray-400">{doc.consultation_duration} min</p>
                        </div>
                      </div>
                      {doc.bio && (
                        <p className="text-xs text-gray-500 mt-2 line-clamp-2">{doc.bio}</p>
                      )}
                    </button>
                  ))}
                  {doctors.length === 0 && (
                    <div className="text-center py-12 text-gray-400">
                      <p className="text-sm">Nenhum médico disponível no momento</p>
                    </div>
                  )}
                </div>
              )}
            </StepWrap>
          )}

          {/* STEP 3: Schedule */}
          {step === 'schedule' && selectedDoctor && (
            <StepWrap key="schedule">
              <h2 className="text-xl font-bold mb-1">Data e horário</h2>
              <p className="text-sm text-gray-500 mb-5">{selectedDoctor.name}</p>

              {/* Date picker */}
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-2">Data</p>
              <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 hide-scrollbar mb-5">
                {availableDates.map((date) => {
                  const f = formatDateShort(date);
                  const isSelected = selectedDate?.toDateString() === date.toDateString();
                  return (
                    <button
                      key={date.toISOString()}
                      onClick={() => setSelectedDate(date)}
                      className={`flex flex-col items-center px-3 py-2.5 rounded-xl min-w-[56px] border-2 transition-all flex-shrink-0 ${isSelected ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                    >
                      <span className="text-[10px] text-gray-400 uppercase">{f.weekday}</span>
                      <span className={`text-lg font-bold ${isSelected ? 'text-green-700' : 'text-gray-800'}`}>{f.day}</span>
                      <span className="text-[10px] text-gray-400">{f.month}</span>
                    </button>
                  );
                })}
              </div>

              {/* Time slots */}
              {selectedDate && (
                <>
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-2">Horários disponíveis</p>
                  {loadingSlots ? (
                    <div className="flex justify-center py-6">
                      <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 mb-6">
                      {slots.filter((s) => s.available).map((slot) => (
                        <button
                          key={slot.time}
                          onClick={() => setSelectedSlot(slot.time)}
                          className={`py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${selectedSlot === slot.time
                              ? 'border-green-500 bg-green-50 text-green-700'
                              : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                            }`}
                        >
                          {slot.time}
                        </button>
                      ))}
                      {slots.filter((s) => s.available).length === 0 && (
                        <p className="col-span-3 text-sm text-gray-400 text-center py-4">
                          Nenhum horário disponível neste dia
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}

              {selectedDate && selectedSlot && (
                <button
                  onClick={() => setStep('summary')}
                  className="w-full py-3.5 rounded-full bg-gray-900 text-white text-sm font-bold hover:bg-gray-800 transition-colors"
                >
                  Continuar
                </button>
              )}
            </StepWrap>
          )}

          {/* STEP 4: Summary */}
          {step === 'summary' && selectedDoctor && selectedDate && (
            <StepWrap key="summary">
              <h2 className="text-xl font-bold mb-5">Resumo da consulta</h2>

              {/* Doctor card */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                    <span className="material-symbols-outlined">person</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold">{selectedDoctor.name}</p>
                    <p className="text-xs text-gray-500">{selectedDoctor.specialty}</p>
                  </div>
                </div>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Tipo</span>
                    <span className="font-semibold">{TYPE_LABELS[consultationType].label}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Data</span>
                    <span className="font-semibold capitalize">{formatDateLong(selectedDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Horário</span>
                    <span className="font-semibold">{selectedSlot}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Duração</span>
                    <span className="font-semibold">{selectedDoctor.consultation_duration} min</span>
                  </div>
                </div>
              </div>

              {/* Data sharing */}
              <div className="bg-gray-50 rounded-2xl p-4 mb-4">
                <p className="text-xs font-semibold text-gray-600 mb-2">📤 Dados compartilhados com o médico:</p>
                <div className="space-y-1 text-xs text-gray-500">
                  <p>📊 Histórico nutricional dos últimos 90 dias</p>
                  <p>⚖️ Peso atual: {profile?.weight || '—'}kg · IMC estimado</p>
                  <p>🎯 Metas e objetivos do plano</p>
                  {profile?.glp1_mode && <p>💊 Status GLP-1 e check-ins de sintomas</p>}
                </div>
              </div>

              {/* Consent */}
              <div
                onClick={() => setConsentGiven(!consentGiven)}
                className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all mb-4 ${consentGiven ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white'
                  }`}
              >
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${consentGiven ? 'border-green-500 bg-green-500' : 'border-gray-300'
                  }`}>
                  {consentGiven && <span className="text-white text-xs">✓</span>}
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Autorizo o compartilhamento dos meus dados de saúde com o médico para esta consulta (LGPD Art. 11)
                </p>
              </div>

              {/* Price */}
              <div className="bg-white rounded-2xl p-4 mb-5 flex items-center justify-between border border-gray-100">
                <span className="text-sm text-gray-600">Total</span>
                <span className="text-xl font-bold">R$ {selectedDoctor.price}</span>
              </div>

              {bookError && (
                <p className="text-sm text-red-500 text-center mb-3">{bookError}</p>
              )}

              <button
                onClick={handleBook}
                disabled={booking || !consentGiven}
                className="w-full py-3.5 rounded-full bg-gray-900 text-white text-sm font-bold hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                {booking ? 'Agendando...' : `Confirmar consulta — R$ ${selectedDoctor.price}`}
              </button>
              {!consentGiven && (
                <p className="text-xs text-center text-gray-400 mt-2">Aceite o compartilhamento de dados para continuar</p>
              )}
            </StepWrap>
          )}

          {/* STEP 5: Confirmed */}
          {step === 'confirmed' && bookedConsultation && selectedDoctor && selectedDate && (
            <StepWrap key="confirmed">
              <div className="flex flex-col items-center text-center pt-8">
                <span className="text-6xl mb-4">✅</span>
                <h2 className="text-2xl font-bold mb-2">Consulta agendada!</h2>
                <p className="text-gray-600 text-sm mb-1">{selectedDoctor.name}</p>
                <p className="text-gray-500 text-sm mb-1 capitalize">{formatDateLong(selectedDate)} às {selectedSlot}</p>
                <p className="text-xs text-gray-400 mb-8">Você receberá um lembrete 24h antes</p>

                <div className="w-full space-y-3">
                  <button
                    onClick={() => onNavigate(AppView.PROFILE)}
                    className="w-full py-3.5 rounded-full bg-gray-900 text-white text-sm font-bold hover:bg-gray-800 transition-colors"
                  >
                    Ver minhas consultas
                  </button>
                  <button
                    onClick={onBack}
                    className="w-full py-2 text-sm text-gray-500 hover:text-gray-700"
                  >
                    Voltar ao início
                  </button>
                </div>
              </div>
            </StepWrap>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

const StepWrap: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <motion.div
    initial={{ x: 50, opacity: 0 }}
    animate={{ x: 0, opacity: 1 }}
    exit={{ x: -50, opacity: 0 }}
    transition={{ duration: 0.25 }}
  >
    {children}
  </motion.div>
);

export default AgendarConsulta;
