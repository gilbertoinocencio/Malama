// =====================================================
// NURA — Perfil Completo do Paciente (5 abas)
// =====================================================

import React, { useEffect, useState } from 'react';
import { useParams, useOutletContext, Link } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { User, TrendingUp, Activity, FileText, MessageSquare, Calendar, Plus, X, Save } from 'lucide-react';
import { patientService, planAdjustmentService } from '../../services/doctorPortalService';
import type { Doctor, PatientFullProfile, PatientGoals } from '../../types/doctorPortal';
import { IMC_CLASSIFICATION, IMC_COLOR } from '../../types/doctorPortal';
import toast from 'react-hot-toast';

type TabType = 'overview' | 'history' | 'symptoms' | 'consultations' | 'briefing';

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

  useEffect(() => {
    if (!doctor || !patientId) return;

    const loadProfile = async () => {
      try {
        const data = await patientService.getPatientFullProfile(patientId, doctor.id);
        setPatient(data);
        if (data) {
          setAdjustGoals(data.current_goals);
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
    { id: 'briefing' as TabType, label: 'Briefing IA', icon: Calendar }
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
              <h3 className="text-lg font-semibold text-gray-800">Briefing Pré-Consulta</h3>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <p className="text-gray-600">
                  📋 BRIEFING PRÉ-CONSULTA
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Conteúdo será gerado pela IA antes da consulta
                </p>
              </div>

              <button
                onClick={() => toast('Funcionalidade será implementada na Parte 2', { icon: '🤖' })}
                className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition"
              >
                Gerar briefing
              </button>
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
