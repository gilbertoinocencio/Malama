import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';

interface GLP1ConsultaProps {
  onBack: () => void;
}

type ConsultaStep = 'specialty' | 'doctors' | 'schedule' | 'summary' | 'confirmed';

interface Doctor {
  id: string;
  name: string;
  crm: string;
  specialty: string;
  rating: number;
  avatar: string;
  nextSlots: string[];
}

const MOCK_DOCTORS: Doctor[] = [
  {
    id: '1',
    name: 'Dra. Ana Rodrigues',
    crm: 'CRM 12345-SP',
    specialty: 'Endocrinologista',
    rating: 4.9,
    avatar: '',
    nextSlots: ['09:00', '10:30', '14:00', '16:00'],
  },
  {
    id: '2',
    name: 'Dr. Carlos Silva',
    crm: 'CRM 67890-SP',
    specialty: 'Endocrinologista',
    rating: 4.8,
    avatar: '',
    nextSlots: ['08:30', '11:00', '15:00'],
  },
  {
    id: '3',
    name: 'Dra. Mariana Costa',
    crm: 'CRM 11223-RJ',
    specialty: 'Nutrólogo',
    rating: 4.7,
    avatar: '',
    nextSlots: ['09:30', '13:00', '17:00'],
  },
];

const generateDates = (): string[] => {
  const dates: string[] = [];
  const today = new Date();
  for (let i = 1; i <= 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    if (d.getDay() !== 0) { // skip sundays
      dates.push(d.toISOString().split('T')[0]);
    }
  }
  return dates;
};

export const GLP1Consulta: React.FC<GLP1ConsultaProps> = ({ onBack }) => {
  const { user, profile, updateProfile } = useAuth();
  const [step, setStep] = useState<ConsultaStep>('specialty');
  const [specialty, setSpecialty] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [saving, setSaving] = useState(false);

  const availableDates = generateDates();
  const filteredDoctors = specialty
    ? MOCK_DOCTORS.filter(d => d.specialty.toLowerCase().includes(specialty.toLowerCase()))
    : MOCK_DOCTORS;

  const handleConfirm = async () => {
    if (!user || !selectedDoctor || !selectedDate || !selectedTime) return;
    setSaving(true);
    try {
      const consultation = {
        id: crypto.randomUUID(),
        doctor_name: selectedDoctor.name,
        specialty: selectedDoctor.specialty,
        date: selectedDate,
        time: selectedTime,
        status: 'scheduled' as const,
      };
      const existing = profile?.glp1_consultations || [];
      const updated = [...existing, consultation];

      await supabase.from('profiles').update({
        glp1_consultations: updated,
      }).eq('id', user.id);

      await updateProfile({ glp1_consultations: updated });
      setStep('confirmed');
    } catch (err) {
      console.error('Booking error:', err);
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00');
    const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return { weekday: weekdays[d.getDay()], day: d.getDate(), month: months[d.getMonth()] };
  };

  const renderStep = () => {
    switch (step) {
      case 'specialty':
        return (
          <StepWrap key="specialty">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Escolha a especialidade</h2>
            <p className="text-sm text-gray-500 mb-6">Que tipo de médico você prefere?</p>
            <div className="space-y-3">
              {[
                { id: 'Endocrinologista', emoji: '🩺', desc: 'Recomendado para GLP-1', badge: true },
                { id: 'Nutrólogo', emoji: '🥗', desc: 'Especialista em nutrição clínica', badge: false },
              ].map(s => (
                <button
                  key={s.id}
                  onClick={() => { setSpecialty(s.id); setStep('doctors'); }}
                  className="w-full text-left px-5 py-4 rounded-2xl bg-white border-2 border-gray-200 hover:border-green-400 transition-all flex items-center gap-3 shadow-sm"
                >
                  <span className="text-2xl">{s.emoji}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-800">{s.id}</span>
                      {s.badge && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded-full">Recomendado</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">{s.desc}</p>
                  </div>
                  <span className="material-symbols-outlined text-gray-400">chevron_right</span>
                </button>
              ))}
            </div>
          </StepWrap>
        );

      case 'doctors':
        return (
          <StepWrap key="doctors">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Médicos disponíveis</h2>
            <p className="text-sm text-gray-500 mb-6">{specialty}</p>
            <div className="space-y-3">
              {filteredDoctors.map(doc => (
                <button
                  key={doc.id}
                  onClick={() => { setSelectedDoctor(doc); setStep('schedule'); }}
                  className={`w-full text-left px-5 py-4 rounded-2xl bg-white border-2 transition-all shadow-sm ${
                    selectedDoctor?.id === doc.id ? 'border-green-500' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 flex-shrink-0">
                      <span className="material-symbols-outlined">person</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-800">{doc.name}</p>
                      <p className="text-xs text-gray-500">{doc.crm} - {doc.specialty}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-yellow-500 text-xs">★</span>
                        <span className="text-xs text-gray-600 font-semibold">{doc.rating}</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-[10px] text-gray-400">{doc.nextSlots.length} horários</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </StepWrap>
        );

      case 'schedule':
        return (
          <StepWrap key="schedule">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Escolha data e horário</h2>
            <p className="text-sm text-gray-500 mb-5">{selectedDoctor?.name}</p>

            {/* Date selector */}
            <div className="mb-5">
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-2">Data</p>
              <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 hide-scrollbar">
                {availableDates.map(date => {
                  const f = formatDate(date);
                  const isSelected = selectedDate === date;
                  return (
                    <button
                      key={date}
                      onClick={() => setSelectedDate(date)}
                      className={`flex flex-col items-center justify-center px-3 py-2.5 rounded-xl min-w-[56px] border-2 transition-all flex-shrink-0 ${
                        isSelected ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <span className="text-[10px] text-gray-400 uppercase">{f.weekday}</span>
                      <span className={`text-lg font-bold ${isSelected ? 'text-green-700' : 'text-gray-800'}`}>{f.day}</span>
                      <span className="text-[10px] text-gray-400">{f.month}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time selector */}
            {selectedDate && (
              <div className="mb-6">
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-2">Horário</p>
                <div className="grid grid-cols-3 gap-2">
                  {(selectedDoctor?.nextSlots || []).map(time => (
                    <button
                      key={time}
                      onClick={() => setSelectedTime(time)}
                      className={`py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                        selectedTime === time
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selectedDate && selectedTime && (
              <button
                onClick={() => setStep('summary')}
                className="w-full py-3.5 rounded-full bg-gray-900 text-white text-sm font-bold hover:bg-gray-800 transition-colors"
              >
                Continuar
              </button>
            )}
          </StepWrap>
        );

      case 'summary':
        return (
          <StepWrap key="summary">
            <h2 className="text-xl font-bold text-gray-900 mb-5">Resumo da consulta</h2>

            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                  <span className="material-symbols-outlined">person</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-800">{selectedDoctor?.name}</p>
                  <p className="text-xs text-gray-500">{selectedDoctor?.specialty}</p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Data</span>
                  <span className="font-semibold">{selectedDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Horário</span>
                  <span className="font-semibold">{selectedTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Duração</span>
                  <span className="font-semibold">30 min</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-2xl p-4 mb-4">
              <p className="text-xs text-gray-500 font-semibold mb-2">Dados compartilhados com o médico:</p>
              <div className="space-y-1.5 text-xs text-gray-600">
                <p>📊 Histórico nutricional</p>
                <p>⚖️ IMC e peso atual: {profile?.weight || '—'}kg</p>
                <p>🎯 Metas e objetivos</p>
                <p>💊 Sintomas GLP-1 reportados</p>
              </div>
            </div>

            <button
              onClick={handleConfirm}
              disabled={saving}
              className="w-full py-3.5 rounded-full bg-gray-900 text-white text-sm font-bold hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {saving ? 'Confirmando...' : 'Confirmar consulta'}
            </button>
          </StepWrap>
        );

      case 'confirmed':
        return (
          <StepWrap key="confirmed">
            <div className="flex flex-col items-center text-center pt-12">
              <span className="text-6xl mb-4">✅</span>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Consulta agendada!</h2>
              <p className="text-sm text-gray-600 mb-2">
                {selectedDoctor?.name} — {selectedDate} às {selectedTime}
              </p>
              <p className="text-xs text-gray-400 mb-8">Enviaremos um aviso 24h antes</p>

              <button
                onClick={onBack}
                className="w-full py-3.5 rounded-full bg-gray-900 text-white text-sm font-bold hover:bg-gray-800 transition-colors"
              >
                Voltar ao dashboard GLP-1
              </button>
            </div>
          </StepWrap>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#EEEFF4] font-display text-gray-900">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 pt-12 pb-4">
        <button
          onClick={() => {
            if (step === 'specialty') { onBack(); return; }
            const backMap: Record<ConsultaStep, ConsultaStep> = {
              specialty: 'specialty',
              doctors: 'specialty',
              schedule: 'doctors',
              summary: 'schedule',
              confirmed: 'confirmed',
            };
            setStep(backMap[step]);
          }}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="text-lg font-bold flex-1">Agendar consulta</h1>
      </header>

      {/* Progress */}
      <div className="px-4 mb-4">
        <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-green-500 rounded-full"
            animate={{
              width: `${
                step === 'specialty' ? 20 :
                step === 'doctors' ? 40 :
                step === 'schedule' ? 60 :
                step === 'summary' ? 80 : 100
              }%`
            }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </div>

      <div className="px-4 pb-8">
        <AnimatePresence mode="wait">
          {renderStep()}
        </AnimatePresence>
      </div>
    </div>
  );
};

const StepWrap: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <motion.div
    initial={{ x: 60, opacity: 0 }}
    animate={{ x: 0, opacity: 1 }}
    exit={{ x: -60, opacity: 0 }}
    transition={{ duration: 0.25 }}
  >
    {children}
  </motion.div>
);

export default GLP1Consulta;
