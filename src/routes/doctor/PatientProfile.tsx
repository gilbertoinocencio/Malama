// =====================================================
// NURA — Perfil Completo do Paciente (5 abas)
// =====================================================

import React, { useEffect, useState } from 'react';
import { useParams, useOutletContext, Link } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { User, TrendingUp, Activity, FileText, MessageSquare, Calendar, Plus, X, Save } from 'lucide-react';
import { patientService, planAdjustmentService, glp1DoctorService } from '../../services/doctorPortalService';
import type { GLP1MealSlot, GLP1DoctorPrescriptionInput } from '../../services/doctorPortalService';
import { GLP1_MEDICATION_LIST, GLP1_PROTOCOLS } from '../../constants/glp1Protocols';
import { generateDoctorBriefing } from '../../services/geminiService';
import type { Doctor, PatientFullProfile, PatientGoals } from '../../types/doctorPortal';
import { IMC_CLASSIFICATION, IMC_COLOR } from '../../types/doctorPortal';
import toast from 'react-hot-toast';

type TabType = 'overview' | 'history' | 'symptoms' | 'consultations' | 'briefing' | 'glp1';

export const PatientProfile: React.FC = () => {
  const { doctor } = useOutletContext<{ doctor: Doctor }>();
  const { patientId } = useParams<{ patientId: string }>();
  const [patient, setPatient] = useState<PatientFullProfile | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [loading, setLoading] = useState(true);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustGoals, setAdjustGoals] = useState<PatientGoals>({
    calories: 2000,
    protein: 100,
    carbs: 250,
    fat: 65,
    fiber: 25,
    water: 2000
  });
  const [adjustNotes, setAdjustNotes] = useState('');
  const [adjustTag, setAdjustTag] = useState('');
  const [briefing, setBriefing] = useState<string | null>(null);
  const [generatingBriefing, setGeneratingBriefing] = useState(false);
  const [glp1Schedule, setGlp1Schedule] = useState<GLP1MealSlot[]>([]);
  const [glp1ScheduleSaving, setGlp1ScheduleSaving] = useState(false);
  const [glp1Prescription, setGlp1Prescription] = useState<GLP1DoctorPrescriptionInput>({
    doctor_id: '',
    doctor_name: '',
    medication: '',
    current_dose_mg: undefined,
    next_dose_mg: undefined,
    frequency: 'weekly',
    day_of_week: 1,
    time: '08:00',
    macro_calories: undefined,
    macro_protein_g: undefined,
    macro_carbs_g: undefined,
    macro_fats_g: undefined,
    notes: '',
    locked_fields: [],
  });
  const [glp1PrescriptionSaving, setGlp1PrescriptionSaving] = useState(false);

  useEffect(() => {
    if (!doctor || !patientId) return;

    const loadProfile = async () => {
      try {
        const data = await patientService.getPatientFullProfile(patientId, doctor.id);
        setPatient(data);
        if (data) {
          setAdjustGoals(data.current_goals);
        }
        // Load GLP-1 meal schedule
        const schedule = await glp1DoctorService.getPatientGlp1Schedule(patientId);
        setGlp1Schedule(schedule.length > 0 ? schedule : [{ time: '08:00', label: '', notes: '' }]);

        // Load existing GLP-1 prescription
        const existingRx = await glp1DoctorService.getPatientGlp1Prescription(patientId);
        if (existingRx) {
          setGlp1Prescription(prev => ({ ...prev, ...existingRx, doctor_id: doctor.id, doctor_name: doctor.name }));
        } else {
          setGlp1Prescription(prev => ({ ...prev, doctor_id: doctor.id, doctor_name: doctor.name }));
        }
      } catch (error) {
        console.error('Error loading patient profile:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [doctor, patientId]);

  const handleSaveAdjustments = async () => {
    if (!patient || !doctor) return;

    try {
      await planAdjustmentService.createAdjustment({
        doctor_id: doctor.id,
        patient_id: patient.id,
        calorie_goal: adjustGoals.calories,
        protein_goal: adjustGoals.protein,
        carb_goal: adjustGoals.carbs,
        fat_goal: adjustGoals.fat,
        fiber_goal: adjustGoals.fiber,
        water_goal: adjustGoals.water,
        notes: adjustNotes || null,
        tag: adjustTag || null
      });

      toast.success('Metas ajustadas com sucesso!');
      setShowAdjustModal(false);
    } catch (error) {
      toast.error('Erro ao salvar ajustes');
    }
  };

  const handleGenerateBriefing = async () => {
    if (!patient) return;
    try {
      setGeneratingBriefing(true);
      const res = await generateDoctorBriefing(patient);
      setBriefing(res);
      toast.success('Briefing gerado com sucesso!');
    } catch (err) {
      toast.error('Erro ao gerar briefing da IA');
      console.error(err);
    } finally {
      setGeneratingBriefing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2ECC71]"></div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Paciente não encontrado</p>
        <Link to="/medico/pacientes" className="text-[#2ECC71] hover:underline mt-4 inline-block">
          ← Voltar para pacientes
        </Link>
      </div>
    );
  }

  const tabs = [
    { id: 'overview' as TabType, label: 'Visão Geral', icon: TrendingUp },
    { id: 'history' as TabType, label: 'Histórico Nutricional', icon: Activity },
    { id: 'symptoms' as TabType, label: 'Sintomas e Check-ins', icon: MessageSquare },
    { id: 'consultations' as TabType, label: 'Consultas Anteriores', icon: FileText },
    { id: 'briefing' as TabType, label: 'Briefing IA', icon: Calendar },
    ...(patient?.is_glp1_active ? [{ id: 'glp1' as TabType, label: '💉 GLP-1', icon: Plus }] : []),
  ];

  return (
    <div className="space-y-6">
      {/* Cabeçalho do paciente */}
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full bg-[#2ECC71] flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
            {patient.photo_url ? (
              <img src={patient.photo_url} alt={patient.name} className="w-full h-full rounded-full object-cover" />
            ) : (
              patient.name.charAt(0)
            )}
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-gray-800">{patient.name}</h2>
              {patient.is_glp1_active && (
                <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                  💉 {patient.glp1_medication || 'GLP-1'} — {patient.glp1_phase || 'Ativo'}
                </span>
              )}
            </div>
            <p className="text-gray-600">
              {patient.age && `${patient.age} anos`}
              {patient.gender && ` • ${patient.gender}`}
            </p>

            {patient.imc && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-sm font-medium">IMC: {patient.imc.toFixed(1)}</span>
                <span
                  className="px-2 py-1 text-xs rounded-full text-white"
                  style={{ backgroundColor: IMC_COLOR(patient.imc) }}
                >
                  {IMC_CLASSIFICATION(patient.imc)}
                </span>
              </div>
            )}
          </div>

          <Link
            to="/medico/agenda"
            className="px-4 py-2 bg-[#2ECC71] hover:bg-[#27ae60] text-white rounded-lg text-sm font-medium transition"
          >
            Agendar consulta
          </Link>
        </div>
      </div>

      {/* Abas */}
      <div className="bg-white rounded-xl shadow">
        <div className="border-b border-gray-200 overflow-x-auto">
          <div className="flex min-w-max">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-[#2ECC71] text-[#2ECC71]'
                    : 'border-transparent text-gray-600 hover:text-gray-800'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {/* Aba 1: Visão Geral */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Gráfico de peso */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Evololução de Peso</h3>
                <div className="h-64">
                  {patient.weight_history.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={patient.weight_history}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Line type="monotone" dataKey="weight" stroke="#2ECC71" strokeWidth={2} name="Peso real" />
                        {patient.weight_history.some(w => w.target_weight) && (
                          <Line type="monotone" dataKey="target_weight" stroke="#3498db" strokeWidth={2} strokeDasharray="5 5" name="Meta" />
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center bg-gray-50 rounded-lg">
                      <p className="text-gray-500">Dados de peso não disponíveis</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Metas atuais */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">Metas Atuais</h3>
                  <button
                    onClick={() => setShowAdjustModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-[#2ECC71] hover:bg-[#27ae60] text-white rounded-lg text-sm font-medium transition"
                  >
                    <Plus className="w-4 h-4" />
                    Ajustar metas
                  </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {[
                    { label: 'Calorias', value: patient.current_goals.calories, unit: 'kcal' },
                    { label: 'Proteína', value: patient.current_goals.protein, unit: 'g' },
                    { label: 'Carbs', value: patient.current_goals.carbs, unit: 'g' },
                    { label: 'Gordura', value: patient.current_goals.fat, unit: 'g' },
                    { label: 'Fibras', value: patient.current_goals.fiber, unit: 'g' },
                    { label: 'Água', value: patient.current_goals.water, unit: 'ml' }
                  ].map((goal, idx) => (
                    <div key={idx} className="bg-gray-50 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-gray-800">{goal.value}</p>
                      <p className="text-xs text-gray-600">{goal.unit}</p>
                      <p className="text-xs text-gray-500 mt-1">{goal.label}</p>
                      {patient.doctor_adjustments?.length > 0 && (
                        <span className="block mt-2 text-[10px] text-[#2ECC71]">Ajustado por Dr(a)</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Adesão */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Adesão do Paciente</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-6">
                    <p className="text-4xl font-bold text-[#2ECC71]">{patient.adherence.registration_percentage}%</p>
                    <p className="text-sm text-gray-600 mt-2">Dias com registro (últimos 30 dias)</p>
                    <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-[#2ECC71] h-2 rounded-full transition-all"
                        style={{ width: `${patient.adherence.registration_percentage}%` }}
                      />
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-6">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Média calórica:</span>
                        <span className="font-medium">{patient.adherence.average_calories} / {patient.adherence.calorie_goal} kcal</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Média proteica:</span>
                        <span className="font-medium">{patient.adherence.average_protein} / {patient.adherence.protein_goal} g</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Aba 2: Histórico Nutricional */}
          {activeTab === 'history' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-800">Histórico Nutricional (últimas 8 semanas)</h3>

              {patient.weekly_history.length > 0 ? (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium text-gray-500">Semana</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-500">Cal média</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-500">Prot média</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-500">Carbs</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-500">Gordura</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-500">Adesão</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-500">Peso</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {patient.weekly_history.map((week, idx) => (
                          <tr key={idx}>
                            <td className="px-4 py-3">{week.week_start}</td>
                            <td className="px-4 py-3">{week.avg_calories}</td>
                            <td className="px-4 py-3">{week.avg_protein}</td>
                            <td className="px-4 py-3">{week.avg_carbs}</td>
                            <td className="px-4 py-3">{week.avg_fat}</td>
                            <td className="px-4 py-3">{week.adherence_percent}%</td>
                            <td className="px-4 py-3">{week.avg_weight}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={patient.weekly_history}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="week_start" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Bar dataKey="avg_calories" fill="#2ECC71" name="Calorias" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </>
              ) : (
                <div className="h-40 flex items-center justify-center bg-gray-50 rounded-lg">
                  <p className="text-gray-500">Dados de histórico não disponíveis</p>
                </div>
              )}
            </div>
          )}

          {/* Aba 3: Sintomas e Check-ins */}
          {activeTab === 'symptoms' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800">Timeline de Check-ins</h3>

              {patient.symptom_checkins.length > 0 ? (
                <div className="space-y-4">
                  {patient.symptom_checkins.map((checkin, idx) => (
                    <div key={idx} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-3 h-3 rounded-full bg-[#2ECC71]" />
                        {idx < patient.symptom_checkins.length - 1 && (
                          <div className="w-0.5 flex-1 bg-gray-200 my-1" />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <p className="text-sm text-gray-500 mb-2">{checkin.date}</p>
                        <div className="flex flex-wrap gap-2">
                          {checkin.symptoms.map((symptom, sIdx) => {
                            const colorMap: Record<string, string> = {
                              'náusea': 'bg-orange-100 text-orange-700',
                              'fadiga': 'bg-yellow-100 text-yellow-700',
                              'bem': 'bg-green-100 text-green-700',
                              'dor_de_cabeca': 'bg-red-100 text-red-700',
                              'tontura': 'bg-blue-100 text-blue-700'
                            };
                            return (
                              <span
                                key={sIdx}
                                className={`px-3 py-1 rounded-full text-xs font-medium ${colorMap[symptom] || 'bg-gray-100 text-gray-700'}`}
                              >
                                {symptom.replace(/_/g, ' ')}
                              </span>
                            );
                          })}
                        </div>
                        {checkin.mood && (
                          <p className="text-xs text-gray-600 mt-2">Humor: {checkin.mood}</p>
                        )}
                        {checkin.energy && (
                          <p className="text-xs text-gray-600">Energia: {checkin.energy}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-40 flex items-center justify-center bg-gray-50 rounded-lg">
                  <p className="text-gray-500">Nenhum check-in registrado</p>
                </div>
              )}
            </div>
          )}

          {/* Aba 4: Consultas Anteriores */}
          {activeTab === 'consultations' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800">Consultas Anteriores</h3>

              {patient.past_consultations.length > 0 ? (
                <div className="space-y-4">
                  {patient.past_consultations.map(consultation => (
                    <div key={consultation.id} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium">
                          {new Date(consultation.scheduled_at).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                        <span className="text-sm text-gray-600">{consultation.duration_minutes} min</span>
                      </div>

                      <span className="inline-block px-2 py-1 bg-[#2ECC71]/10 text-[#2ECC71] text-xs rounded-full mb-2">
                        {consultation.type === 'initial' ? 'Inicial' : consultation.type === 'follow_up' ? 'Retorno' : 'Renovação'}
                      </span>

                      {consultation.notes && (
                        <p className="text-sm text-gray-600 mt-2">{consultation.notes}</p>
                      )}

                      <Link
                        to={`/medico/consulta/${consultation.id}`}
                        className="text-sm text-[#2ECC71] hover:underline mt-2 inline-block"
                      >
                        Ver detalhes →
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-40 flex items-center justify-center bg-gray-50 rounded-lg">
                  <p className="text-gray-500">Nenhuma consulta realizada</p>
                </div>
              )}
            </div>
          )}

          {/* Aba 5: Briefing IA */}
          {activeTab === 'briefing' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Briefing Pré-Consulta</h3>
                {!briefing && !generatingBriefing && (
                  <button
                    onClick={handleGenerateBriefing}
                    className="px-4 py-2 bg-[#2ECC71]/10 text-[#2ECC71] border border-[#2ECC71]/20 rounded-lg font-medium hover:bg-[#2ECC71]/20 transition-colors flex items-center gap-2 text-sm"
                  >
                    🪄 Gerar Análise IA
                  </button>
                )}
              </div>

              {generatingBriefing ? (
                <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-8 flex flex-col items-center justify-center text-center">
                  <div className="animate-spin w-8 h-8 border-4 border-[#2ECC71] border-t-transparent rounded-full mb-4" />
                  <p className="text-[#2ECC71] font-medium pb-1">Analisando histórico e check-ins...</p>
                  <p className="text-sm text-gray-500">O NURA Assistant está cruzando os dados e montando os alertas.</p>
                </div>
              ) : briefing ? (
                <div className="bg-white border text-gray-700 border-gray-200 rounded-lg p-6 shadow-sm">
                  <p className="text-xs text-gray-400 mb-4 font-mono font-bold tracking-wider">GERADO POR NURA ASSISTANT • AI SUMMARIZATION</p>
                  <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {briefing}
                  </div>
                  <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end">
                    <button
                      onClick={handleGenerateBriefing}
                      className="text-xs text-[#2ECC71] hover:underline flex items-center gap-1"
                    >
                      🔄 Gerar novamente
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 flex flex-col items-center text-center">
                  <p className="text-gray-600 text-lg mb-2 font-medium">
                    📋 BRIEFING PRÉ-CONSULTA
                  </p>
                  <p className="text-sm text-gray-500 max-w-md">
                    Clique em <strong>"Gerar Análise IA"</strong> para que o algoritmo cruze automaticamente 
                    a dieta, os sintomas, o humor e os pesos registrados no aplicativo 
                    e forneça os pontos críticos para guiar essa consulta.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Aba GLP-1: Prescrição + Horários de refeição */}
          {activeTab === 'glp1' && (
            <div className="space-y-8">

              {/* ── Prescrição médica ──────────────────────────────── */}
              <section>
                <h3 className="text-lg font-semibold text-gray-800 mb-1">Prescrição GLP-1</h3>
                <p className="text-sm text-gray-500 mb-4">
                  As informações abaixo serão exibidas no app do paciente com o selo "Prescrito por Dr. {doctor.name}".
                  Campos marcados como <strong>bloqueados</strong> não poderão ser alterados pelo paciente.
                </p>

                <div className="space-y-5 bg-gray-50 rounded-xl p-5 border border-gray-200">

                  {/* Medicamento */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Medicamento</label>
                      <div className="flex gap-2">
                        <select
                          value={glp1Prescription.medication || ''}
                          onChange={e => setGlp1Prescription(p => ({ ...p, medication: e.target.value }))}
                          className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-[#2ECC71] bg-white"
                        >
                          <option value="">Selecionar medicamento</option>
                          {GLP1_MEDICATION_LIST.map(m => (
                            <option key={m.value} value={m.value}>{m.label}</option>
                          ))}
                        </select>
                        <button
                          title={glp1Prescription.locked_fields?.includes('medication') ? 'Desbloquear' : 'Bloquear campo'}
                          onClick={() => setGlp1Prescription(p => ({
                            ...p,
                            locked_fields: p.locked_fields?.includes('medication')
                              ? p.locked_fields.filter(f => f !== 'medication')
                              : [...(p.locked_fields || []), 'medication']
                          }))}
                          className={`px-2.5 rounded-lg border text-sm transition ${
                            glp1Prescription.locked_fields?.includes('medication')
                              ? 'border-orange-400 bg-orange-50 text-orange-600'
                              : 'border-gray-300 text-gray-400 hover:text-gray-600'
                          }`}
                        >
                          {glp1Prescription.locked_fields?.includes('medication') ? '🔒' : '🔓'}
                        </button>
                      </div>
                    </div>

                    {/* Dose atual */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Dose atual (mg)</label>
                      <div className="flex gap-2">
                        <select
                          value={glp1Prescription.current_dose_mg ?? ''}
                          onChange={e => setGlp1Prescription(p => ({
                            ...p,
                            current_dose_mg: e.target.value ? Number(e.target.value) : undefined
                          }))}
                          className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-[#2ECC71] bg-white"
                        >
                          <option value="">Selecionar dose</option>
                          {glp1Prescription.medication && GLP1_PROTOCOLS[glp1Prescription.medication]?.dose_steps.map(s => (
                            <option key={s.dose_mg} value={s.dose_mg}>{s.label}</option>
                          ))}
                        </select>
                        <button
                          title={glp1Prescription.locked_fields?.includes('current_dose_mg') ? 'Desbloquear' : 'Bloquear campo'}
                          onClick={() => setGlp1Prescription(p => ({
                            ...p,
                            locked_fields: p.locked_fields?.includes('current_dose_mg')
                              ? p.locked_fields.filter(f => f !== 'current_dose_mg')
                              : [...(p.locked_fields || []), 'current_dose_mg']
                          }))}
                          className={`px-2.5 rounded-lg border text-sm transition ${
                            glp1Prescription.locked_fields?.includes('current_dose_mg')
                              ? 'border-orange-400 bg-orange-50 text-orange-600'
                              : 'border-gray-300 text-gray-400 hover:text-gray-600'
                          }`}
                        >
                          {glp1Prescription.locked_fields?.includes('current_dose_mg') ? '🔒' : '🔓'}
                        </button>
                      </div>
                    </div>

                    {/* Próxima dose (escalonamento) */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Próxima dose / escalonamento (mg)</label>
                      <select
                        value={glp1Prescription.next_dose_mg ?? ''}
                        onChange={e => setGlp1Prescription(p => ({
                          ...p,
                          next_dose_mg: e.target.value ? Number(e.target.value) : undefined
                        }))}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-[#2ECC71] bg-white"
                      >
                        <option value="">Nenhuma (manter dose atual)</option>
                        {glp1Prescription.medication && GLP1_PROTOCOLS[glp1Prescription.medication]?.dose_steps.map(s => (
                          <option key={s.dose_mg} value={s.dose_mg}>{s.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Frequência */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Frequência de aplicação</label>
                      <div className="flex gap-2">
                        <select
                          value={glp1Prescription.frequency || 'weekly'}
                          onChange={e => setGlp1Prescription(p => ({
                            ...p,
                            frequency: e.target.value as 'weekly' | 'daily'
                          }))}
                          className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-[#2ECC71] bg-white"
                        >
                          <option value="weekly">Semanal</option>
                          <option value="daily">Diária</option>
                        </select>
                        <button
                          title={glp1Prescription.locked_fields?.includes('frequency') ? 'Desbloquear' : 'Bloquear campo'}
                          onClick={() => setGlp1Prescription(p => ({
                            ...p,
                            locked_fields: p.locked_fields?.includes('frequency')
                              ? p.locked_fields.filter(f => f !== 'frequency')
                              : [...(p.locked_fields || []), 'frequency']
                          }))}
                          className={`px-2.5 rounded-lg border text-sm transition ${
                            glp1Prescription.locked_fields?.includes('frequency')
                              ? 'border-orange-400 bg-orange-50 text-orange-600'
                              : 'border-gray-300 text-gray-400 hover:text-gray-600'
                          }`}
                        >
                          {glp1Prescription.locked_fields?.includes('frequency') ? '🔒' : '🔓'}
                        </button>
                      </div>
                    </div>

                    {/* Dia da semana (só weekly) */}
                    {glp1Prescription.frequency === 'weekly' && (
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Dia de aplicação</label>
                        <div className="flex gap-1 flex-wrap">
                          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d, idx) => (
                            <button
                              key={idx}
                              onClick={() => setGlp1Prescription(p => ({ ...p, day_of_week: idx }))}
                              className={`w-10 h-10 rounded-lg text-sm font-medium transition ${
                                glp1Prescription.day_of_week === idx
                                  ? 'bg-[#2ECC71] text-white'
                                  : 'bg-white border border-gray-300 text-gray-600 hover:border-[#2ECC71]'
                              }`}
                            >
                              {d}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Horário */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Horário de aplicação</label>
                      <input
                        type="time"
                        value={glp1Prescription.time || '08:00'}
                        onChange={e => setGlp1Prescription(p => ({ ...p, time: e.target.value }))}
                        className="px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-[#2ECC71] bg-white"
                      />
                    </div>
                  </div>

                  {/* Metas de macros */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-2">Metas nutricionais prescritas (opcional)</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {([
                        { key: 'macro_calories', label: 'Calorias', unit: 'kcal', locked: 'macros' },
                        { key: 'macro_protein_g', label: 'Proteína', unit: 'g', locked: 'macros' },
                        { key: 'macro_carbs_g', label: 'Carboidratos', unit: 'g', locked: 'macros' },
                        { key: 'macro_fats_g', label: 'Gorduras', unit: 'g', locked: 'macros' },
                      ] as const).map(({ key, label, unit }) => (
                        <div key={key}>
                          <label className="block text-xs text-gray-500 mb-1">{label} ({unit})</label>
                          <input
                            type="number"
                            min={0}
                            value={(glp1Prescription as Record<string, unknown>)[key] as number ?? ''}
                            onChange={e => setGlp1Prescription(p => ({
                              ...p,
                              [key]: e.target.value ? Number(e.target.value) : undefined
                            }))}
                            placeholder="—"
                            className="w-full px-2 py-1.5 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-[#2ECC71] bg-white"
                          />
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => setGlp1Prescription(p => ({
                          ...p,
                          locked_fields: p.locked_fields?.includes('macros')
                            ? p.locked_fields.filter(f => f !== 'macros')
                            : [...(p.locked_fields || []), 'macros']
                        }))}
                        className={`text-sm px-3 py-1 rounded-lg border transition ${
                          glp1Prescription.locked_fields?.includes('macros')
                            ? 'border-orange-400 bg-orange-50 text-orange-600'
                            : 'border-gray-300 text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        {glp1Prescription.locked_fields?.includes('macros') ? '🔒 Metas bloqueadas' : '🔓 Bloquear metas'}
                      </button>
                      <span className="text-xs text-gray-400">
                        {glp1Prescription.locked_fields?.includes('macros')
                          ? 'Paciente não pode alterar as metas'
                          : 'Paciente pode ajustar metas'}
                      </span>
                    </div>
                  </div>

                  {/* Observações */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Observações / instruções para o paciente</label>
                    <textarea
                      value={glp1Prescription.notes || ''}
                      onChange={e => setGlp1Prescription(p => ({ ...p, notes: e.target.value }))}
                      rows={3}
                      placeholder="Ex: Aplicar sempre no mesmo dia da semana. Aumentar dose após 4 semanas sem efeitos adversos."
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-[#2ECC71] bg-white resize-none"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={async () => {
                        if (!patientId) return;
                        setGlp1PrescriptionSaving(true);
                        try {
                          await glp1DoctorService.prescribeGlp1(patientId, {
                            ...glp1Prescription,
                            doctor_id: doctor.id,
                            doctor_name: doctor.name,
                          });
                          toast.success('Prescrição GLP-1 salva com sucesso!');
                        } catch {
                          toast.error('Erro ao salvar prescrição');
                        } finally {
                          setGlp1PrescriptionSaving(false);
                        }
                      }}
                      disabled={glp1PrescriptionSaving}
                      className="px-6 py-2 bg-[#2ECC71] hover:bg-[#27ae60] text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      {glp1PrescriptionSaving ? 'Salvando...' : 'Salvar prescrição'}
                    </button>
                  </div>
                </div>
              </section>

              {/* ── Horários de refeição ───────────────────────────── */}
              <section>
                <h3 className="text-lg font-semibold text-gray-800 mb-1">Horários de Alimentação GLP-1</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Configure os horários recomendados de refeição para o paciente. O app enviará lembretes no horário definido.
                </p>

                <div className="space-y-3">
                  {glp1Schedule.map((slot, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
                      <div className="flex-shrink-0">
                        <label className="block text-xs text-gray-500 mb-1">Horário</label>
                        <input
                          type="time"
                          value={slot.time}
                          onChange={e => {
                            const updated = [...glp1Schedule];
                            updated[i] = { ...updated[i], time: e.target.value };
                            setGlp1Schedule(updated);
                          }}
                          className="px-2 py-1.5 rounded border border-gray-300 text-sm focus:ring-2 focus:ring-[#2ECC71]"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <label className="block text-xs text-gray-500 mb-1">Refeição</label>
                        <input
                          type="text"
                          value={slot.label}
                          onChange={e => {
                            const updated = [...glp1Schedule];
                            updated[i] = { ...updated[i], label: e.target.value };
                            setGlp1Schedule(updated);
                          }}
                          placeholder="Ex: Café da manhã"
                          className="w-full px-2 py-1.5 rounded border border-gray-300 text-sm focus:ring-2 focus:ring-[#2ECC71]"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <label className="block text-xs text-gray-500 mb-1">Orientação (opcional)</label>
                        <input
                          type="text"
                          value={slot.notes || ''}
                          onChange={e => {
                            const updated = [...glp1Schedule];
                            updated[i] = { ...updated[i], notes: e.target.value };
                            setGlp1Schedule(updated);
                          }}
                          placeholder="Ex: Proteína + carboidrato leve"
                          className="w-full px-2 py-1.5 rounded border border-gray-300 text-sm focus:ring-2 focus:ring-[#2ECC71]"
                        />
                      </div>
                      <button
                        onClick={() => setGlp1Schedule(glp1Schedule.filter((_, idx) => idx !== i))}
                        className="mt-5 p-1 text-gray-400 hover:text-red-500 transition"
                        title="Remover"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setGlp1Schedule([...glp1Schedule, { time: '12:00', label: '', notes: '' }])}
                  className="mt-3 flex items-center gap-2 text-sm text-[#2ECC71] hover:text-[#27ae60] font-medium transition"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar horário
                </button>

                <div className="flex justify-end mt-4">
                  <button
                    onClick={async () => {
                      if (!patientId) return;
                      setGlp1ScheduleSaving(true);
                      try {
                        await glp1DoctorService.updatePatientGlp1Schedule(
                          patientId,
                          glp1Schedule.filter(s => s.label.trim())
                        );
                        toast.success('Horários GLP-1 salvos!');
                      } catch {
                        toast.error('Erro ao salvar horários');
                      } finally {
                        setGlp1ScheduleSaving(false);
                      }
                    }}
                    disabled={glp1ScheduleSaving}
                    className="px-6 py-2 bg-[#2ECC71] hover:bg-[#27ae60] text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {glp1ScheduleSaving ? 'Salvando...' : 'Salvar horários'}
                  </button>
                </div>
              </section>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Ajuste de Metas */}
      {showAdjustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowAdjustModal(false)} />
          <div className="relative bg-white rounded-xl shadow-lg w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-800">Ajustar Metas</h3>
              <button onClick={() => setShowAdjustModal(false)}>
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Calorias (kcal)</label>
                  <input
                    type="number"
                    value={adjustGoals.calories}
                    onChange={e => setAdjustGoals(prev => ({ ...prev, calories: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#2ECC71]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Proteína (g)</label>
                  <input
                    type="number"
                    value={adjustGoals.protein}
                    onChange={e => setAdjustGoals(prev => ({ ...prev, protein: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#2ECC71]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Carbs (g)</label>
                  <input
                    type="number"
                    value={adjustGoals.carbs}
                    onChange={e => setAdjustGoals(prev => ({ ...prev, carbs: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#2ECC71]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gordura (g)</label>
                  <input
                    type="number"
                    value={adjustGoals.fat}
                    onChange={e => setAdjustGoals(prev => ({ ...prev, fat: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#2ECC71]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fibras (g)</label>
                  <input
                    type="number"
                    value={adjustGoals.fiber}
                    onChange={e => setAdjustGoals(prev => ({ ...prev, fiber: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#2ECC71]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Água (ml)</label>
                  <input
                    type="number"
                    value={adjustGoals.water}
                    onChange={e => setAdjustGoals(prev => ({ ...prev, water: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#2ECC71]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nota para o paciente</label>
                <textarea
                  value={adjustNotes}
                  onChange={e => setAdjustNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#2ECC71] resize-none"
                  placeholder="Observações sobre os ajustes..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tag de incentivo</label>
                <input
                  type="text"
                  value={adjustTag}
                  onChange={e => setAdjustTag(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#2ECC71]"
                  placeholder="Ex: Ótimo progresso! 💪"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAdjustModal(false)}
                className="px-6 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveAdjustments}
                className="px-6 py-2 bg-[#2ECC71] hover:bg-[#27ae60] text-white rounded-lg font-medium flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Aplicar ajustes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
