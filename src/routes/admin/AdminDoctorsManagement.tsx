// =====================================================
// Malama — Gestão de Médicos (Admin)
// =====================================================

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, CheckCircle, XCircle, Link2, X, Copy, Mail, Clock, Stethoscope, CalendarCheck, TrendingDown, Users } from 'lucide-react';
import { doctorService, settingsService, adminService, storageService } from '../../services/doctorPortalService';
import type { Doctor, DoctorStatus } from '../../types/doctorPortal';
import type { AdminDoctorKpis } from '../../services/doctorPortalService';
import { SPECIALTY_OPTIONS, SPECIALTY_OPTIONS_PSICOLOGO } from '../../types/doctorPortal';
import { supabase } from '../../services/supabase';
import { edgeFunctionErrorMessage } from '../../utils/functionError';
import toast from 'react-hot-toast';

interface DoctorLead {
  id: string;
  nome: string;
  /** 'medico' | 'psicologo'. Legado sem tipo é médico (default no banco). */
  tipo_profissional?: string | null;
  /** Psicólogo: declaração de e-Psi ativo (CFP). */
  epsi_ativo?: boolean | null;
  /** Registro do conselho: CRM para médico, CRP para psicólogo. */
  crm: string;
  crm_uf: string;
  especialidade: string;
  email: string;
  horarios: string[];
  origem: string | null;
  status: 'pendente' | 'convidado';
  invited_at: string | null;
  created_at: string;
}

export const AdminDoctorsManagement: React.FC = () => {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<DoctorStatus | 'all'>('all');
  const [filterSpecialty, setFilterSpecialty] = useState('');
  // Médico e psicólogo têm conselho, especialidades e exigências distintas —
  // o admin analisa cada trilha separada.
  const [filterTipo, setFilterTipo] = useState<'todos' | 'medico' | 'psicologo'>('todos');
  const [abrindoDoc, setAbrindoDoc] = useState<string | null>(null);

  /**
   * Abre a comprovação do conselho numa aba nova. O link é assinado na hora
   * (bucket privado, validade curta) em vez de guardado no banco.
   */
  const abrirDocumento = async (doctorId: string) => {
    setAbrindoDoc(doctorId);
    try {
      const url = await storageService.getDocumentoConselhoUrl(doctorId);
      if (!url) { toast.error('Documento indisponível.'); return; }
      window.open(url, '_blank', 'noopener');
    } catch {
      toast.error('Não foi possível abrir o documento.');
    } finally {
      setAbrindoDoc(null);
    }
  };
  const [search, setSearch] = useState('');
  const [settings, setSettings] = useState<Record<string, string>>({});

  // Fila de espera
  const [activeTab, setActiveTab] = useState<'medicos' | 'fila'>('medicos');
  const [leads, setLeads] = useState<DoctorLead[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [leadSearch, setLeadSearch] = useState('');
  // Fila separada por tipo: o admin analisa e libera médico e psicólogo em
  // trilhas diferentes (conselho, especialidade e exigências distintas).
  const [leadTipo, setLeadTipo] = useState<'todos' | 'medico' | 'psicologo'>('todos');
  const [invitingLeadId, setInvitingLeadId] = useState<string | null>(null);

  const [kpis, setKpis] = useState<AdminDoctorKpis | null>(null);

  // Modals
  const [showApproveModal, setShowApproveModal] = useState<string | null>(null);
  const [showSuspendModal, setShowSuspendModal] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);

  // Form states
  const [approveSpecialty, setApproveSpecialty] = useState('');
  const [approveSpecialtyCustom, setApproveSpecialtyCustom] = useState('');
  const [suspendReason, setSuspendReason] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');

  useEffect(() => {
    loadDoctors();
    loadSettings();
  }, [filterStatus, filterSpecialty, filterTipo]);

  useEffect(() => {
    adminService.getDoctorKpis().then(setKpis).catch(() => {});
  }, []);

  useEffect(() => {
    if (activeTab === 'fila') loadLeads();
  }, [activeTab]);

  const loadLeads = async () => {
    setLeadsLoading(true);
    try {
      const { data, error } = await supabase
        .from('doctor_leads')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error) setLeads(data ?? []);
    } finally {
      setLeadsLoading(false);
    }
  };

  const handleInviteLead = async (lead: DoctorLead) => {
    const tipo = lead.tipo_profissional === 'psicologo' ? 'psicologo' : 'medico';
    setInvitingLeadId(lead.id);
    try {
      const { data, error } = await supabase.functions.invoke('invite-lead', {
        body: {
          email: lead.email,
          type: 'doctor',
          lead_id: lead.id,
          tipo_profissional: tipo,
          // O convite leva ao formulário completo, já na trilha do profissional
          // (CRM x CRP, especialidades e e-Psi mudam conforme o tipo). A conta e
          // a senha nascem lá; aqui nenhuma conta é criada.
          redirect_to: `${window.location.origin}/medico/cadastro?tipo=${tipo}&email=${encodeURIComponent(lead.email)}`,
        },
      });
      if (error) throw error;
      toast.success(`Convite enviado para ${lead.email}`);
      if (data?.warning) toast(data.warning);
      loadLeads();
    } catch (err) {
      toast.error(await edgeFunctionErrorMessage(err, 'Erro ao enviar convite. Tente novamente.'));
    } finally {
      setInvitingLeadId(null);
    }
  };

  const loadSettings = async () => {
    try {
      const data = await settingsService.getAllSettings();
      const settingsMap: Record<string, string> = {};
      data.forEach(s => { settingsMap[s.key] = s.value; });
      setSettings(settingsMap);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const loadDoctors = async () => {
    setLoading(true);
    try {
      const data = await doctorService.getAllDoctors({
        status: filterStatus,
        specialty: filterSpecialty || undefined,
        tipo: filterTipo === 'todos' ? undefined : filterTipo
      });
      setDoctors(data);
    } catch (error) {
      console.error('Error loading doctors:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNivelChange = async (doctorId: string, nivel: Doctor['nivel']) => {
    // Atualização otimista no estado local
    setDoctors(prev => prev.map(d => d.id === doctorId ? { ...d, nivel } : d));
    try {
      await doctorService.updateDoctor(doctorId, { nivel });
      toast.success('Nível atualizado');
    } catch {
      toast.error('Erro ao atualizar nível');
      loadDoctors(); // reverte para o estado do servidor
    }
  };

  const handleApprove = async () => {
    if (!showApproveModal) return;

    try {
      const updates: any = {};

      // Se mudou a especialidade, atualizar
      if (approveSpecialty) {
        updates.specialty = approveSpecialty;
        // Se selecionou "Outro" e preencheu custom, salvar
        if (approveSpecialty === 'Outro' && approveSpecialtyCustom.trim()) {
          updates.specialty_custom = approveSpecialtyCustom.trim();
        }
      }

      await doctorService.updateDoctor(showApproveModal, updates);
      await doctorService.approveDoctor(showApproveModal);
      toast.success('Médico aprovado!');
      setShowApproveModal(null);
      loadDoctors();
    } catch (error) {
      toast.error('Erro ao aprovar médico');
    }
  };

  const handleSuspend = async () => {
    if (!showSuspendModal) return;

    try {
      await doctorService.suspendDoctor(showSuspendModal);
      toast.success('Médico suspenso');
      setShowSuspendModal(null);
      loadDoctors();
    } catch (error) {
      toast.error('Erro ao suspender médico');
    }
  };

  const generateInviteLink = () => {
    const token = doctorService.generateInviteToken();
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/medico/cadastro?invite=${token}`;
    setGeneratedLink(link);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedLink);
    toast.success('Link copiado!');
  };

  const getStatusBadge = (status: DoctorStatus) => {
    const config = {
      pending: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-700' },
      approved: { label: 'Aprovado', color: 'bg-green-100 text-green-700' },
      suspended: { label: 'Suspenso', color: 'bg-red-100 text-red-700' }
    };
    const { label, color } = config[status];
    return <span className={`px-2 py-1 rounded-full text-xs ${color}`}>{label}</span>;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const selectedDoctor = doctors.find(d => d.id === showApproveModal) ||
    doctors.find(d => d.id === showSuspendModal);

  return (
    <div className="space-y-6">
      {/* Header com botão de convite */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Gestão de Médicos</h2>
          <p className="text-sm text-gray-600 mt-1">Gerencie médicos cadastrados e convide novos profissionais</p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="px-4 py-2 bg-[#7d4a3c] hover:bg-[#623a2f] text-white rounded-lg font-medium flex items-center gap-2 transition"
        >
          <Link2 className="w-4 h-4" />
          Gerar Link de Convite
        </button>
      </div>

      {/* Abas */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('medicos')}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'medicos' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Médicos Cadastrados
        </button>
        <button
          onClick={() => setActiveTab('fila')}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'fila' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Fila de Espera
          {leads.filter(l => l.status === 'pendente').length > 0 && (
            <span className="ml-2 px-1.5 py-0.5 bg-[#7d4a3c] text-white text-xs rounded-full">
              {leads.filter(l => l.status === 'pendente').length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'fila' ? (
        <>
          {/* Busca + separação por tipo */}
          <div className="bg-white rounded-xl shadow p-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1 flex-shrink-0">
              {([
                ['todos', 'Todos'],
                ['medico', 'Médicos'],
                ['psicologo', 'Psicólogos'],
              ] as const).map(([v, rotulo]) => {
                const n = v === 'todos'
                  ? leads.length
                  : leads.filter(l => (l.tipo_profissional ?? 'medico') === v).length;
                return (
                  <button
                    key={v}
                    onClick={() => setLeadTipo(v)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                      leadTipo === v ? 'bg-white text-[#7d4a3c] shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {rotulo} <span className="opacity-60">{n}</span>
                  </button>
                );
              })}
            </div>
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={leadSearch}
                onChange={e => setLeadSearch(e.target.value)}
                placeholder="Buscar por nome ou email..."
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300"
              />
            </div>
          </div>

          {/* Tabela de leads */}
          <div className="bg-white rounded-xl shadow overflow-hidden">
            {leadsLoading ? (
              <div className="flex items-center justify-center h-40">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7d4a3c]" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Conselho</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Especialidade</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Horários</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Origem</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Cadastro</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {leads
                      .filter(l => leadTipo === 'todos'
                        || (l.tipo_profissional ?? 'medico') === leadTipo)
                      .filter(l => !leadSearch ||
                        l.nome.toLowerCase().includes(leadSearch.toLowerCase()) ||
                        l.email.toLowerCase().includes(leadSearch.toLowerCase()))
                      .map(lead => (
                        <tr key={lead.id} className="hover:bg-gray-50 transition">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium text-gray-800">{lead.nome}</p>
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                (lead.tipo_profissional ?? 'medico') === 'psicologo'
                                  ? 'bg-[#7d4a3c]/10 text-[#7d4a3c]'
                                  : 'bg-blue-50 text-blue-700'
                              }`}>
                                {(lead.tipo_profissional ?? 'medico') === 'psicologo' ? 'Psicólogo' : 'Médico'}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500">{lead.email}</p>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell">
                            {(lead.tipo_profissional ?? 'medico') === 'psicologo' ? 'CRP' : 'CRM'}{' '}
                            {lead.crm}/{lead.crm_uf}
                            {(lead.tipo_profissional ?? 'medico') === 'psicologo' && (
                              <span className={`block text-[10px] mt-0.5 ${lead.epsi_ativo ? 'text-green-600' : 'text-amber-600'}`}>
                                {lead.epsi_ativo ? 'e-Psi declarado' : 'sem e-Psi'}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 hidden lg:table-cell">
                            {lead.especialidade}
                          </td>
                          <td className="px-4 py-3 hidden lg:table-cell">
                            <div className="flex flex-wrap gap-1">
                              {(lead.horarios ?? []).map(h => (
                                <span key={h} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full capitalize">{h}</span>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500 hidden md:table-cell">
                            {lead.origem ?? <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-4 py-3">
                            {lead.status === 'convidado' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                                <CheckCircle className="w-3 h-3" /> Convidado
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs">
                                <Clock className="w-3 h-3" /> Pendente
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500 hidden lg:table-cell">
                            {formatDate(lead.created_at)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {lead.status === 'pendente' && (
                              <button
                                onClick={() => handleInviteLead(lead)}
                                disabled={invitingLeadId === lead.id}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#7d4a3c] hover:bg-[#623a2f] text-white text-xs font-medium rounded-lg transition disabled:opacity-50"
                              >
                                <Mail className="w-3.5 h-3.5" />
                                {invitingLeadId === lead.id ? 'Enviando...' : 'Convidar'}
                              </button>
                            )}
                            {lead.status === 'convidado' && lead.invited_at && (
                              <span className="text-xs text-gray-400">{formatDate(lead.invited_at)}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    {leads.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-4 py-12 text-center text-gray-400 text-sm">
                          Nenhum médico na fila de espera ainda.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
      {/* ── KPIs ── */}
      {kpis && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              icon: <Stethoscope className="w-5 h-5 text-[#7d4a3c]" />,
              label: 'Médicos aprovados',
              value: kpis.aprovados.toString(),
              sub: kpis.pendentes > 0 ? `${kpis.pendentes} aguardando aprovação` : undefined,
              subColor: 'text-yellow-600',
              bg: 'bg-[#7d4a3c]/10',
            },
            {
              icon: <Users className="w-5 h-5 text-green-600" />,
              label: 'Ativos este mês',
              value: kpis.medicos_ativos_mes.toString(),
              sub: `de ${kpis.aprovados} aprovados`,
              subColor: 'text-gray-400',
              bg: 'bg-green-50',
            },
            {
              icon: <CalendarCheck className="w-5 h-5 text-blue-600" />,
              label: 'Consultas realizadas',
              value: kpis.consultas_mes.toString(),
              sub: `~${kpis.media_consultas_dia}/dia · ${kpis.pacientes_unicos_mes} pacientes únicos`,
              subColor: 'text-gray-400',
              bg: 'bg-blue-50',
            },
            {
              icon: <TrendingDown className="w-5 h-5 text-red-500" />,
              label: 'Cancelamentos / no-show',
              value: `${kpis.taxa_cancelamento}%`,
              sub: `${kpis.cancelamentos_mes} ocorrências no mês`,
              subColor: kpis.taxa_cancelamento > 20 ? 'text-red-500' : 'text-gray-400',
              bg: 'bg-red-50',
            },
          ].map(({ icon, label, value, sub, subColor, bg }) => (
            <div key={label} className="bg-white rounded-xl shadow p-4 flex items-start gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${bg}`}>
                {icon}
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold text-gray-800">{value}</p>
                <p className="text-xs text-gray-500">{label}</p>
                {sub && <p className={`text-xs mt-0.5 ${subColor}`}>{sub}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nome..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300"
            />
          </div>

          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as DoctorStatus | 'all')}
            className="px-4 py-2 rounded-lg border border-gray-300"
          >
            <option value="all">Todos os status</option>
            <option value="pending">Pendentes</option>
            <option value="approved">Aprovados</option>
            <option value="suspended">Suspensos</option>
          </select>

          <select
            value={filterTipo}
            onChange={e => {
              setFilterTipo(e.target.value as 'todos' | 'medico' | 'psicologo');
              // As especialidades disponíveis mudam com o tipo.
              setFilterSpecialty('');
            }}
            className="px-4 py-2 rounded-lg border border-gray-300"
          >
            <option value="todos">Todos os profissionais</option>
            <option value="medico">Médicos</option>
            <option value="psicologo">Psicólogos</option>
          </select>

          <select
            value={filterSpecialty}
            onChange={e => setFilterSpecialty(e.target.value)}
            className="px-4 py-2 rounded-lg border border-gray-300"
          >
            <option value="">Todas as especialidades</option>
            {(filterTipo === 'psicologo' ? SPECIALTY_OPTIONS_PSICOLOGO : SPECIALTY_OPTIONS).map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabela de médicos */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7d4a3c]"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">CRM/UF</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Especialidade</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patente</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Criado em</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {doctors
                  .filter(d => !search || d.name.toLowerCase().includes(search.toLowerCase()))
                  .map(doctor => (
                    <tr key={doctor.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#7d4a3c] flex items-center justify-center text-white font-semibold flex-shrink-0">
                            {doctor.photo_url ? (
                              <img src={doctor.photo_url} alt={doctor.name} className="w-full h-full rounded-full object-cover" />
                            ) : (
                              doctor.name.charAt(0)
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-gray-800">{doctor.name}</p>
                              {doctor.tipo_profissional === 'psicologo' && (
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-teal-100 text-teal-700">
                                  Psicólogo
                                </span>
                              )}
                            </div>
                            {doctor.tipo_profissional === 'psicologo' && (
                              <div className="mt-0.5 flex items-center gap-2 flex-wrap">
                                <p className={`text-[11px] ${doctor.epsi_ativo ? 'text-green-600' : 'text-amber-600'}`}>
                                  {doctor.epsi_ativo ? '✓ e-Psi declarado' : '⚠ e-Psi não declarado'}
                                </p>
                                {/* A declaração é do profissional; o documento é o
                                    que permite conferir antes de liberar. */}
                                {doctor.documento_conselho_path ? (
                                  <button
                                    onClick={() => abrirDocumento(doctor.id)}
                                    disabled={abrindoDoc === doctor.id}
                                    className="text-[11px] font-medium text-[#7d4a3c] hover:underline disabled:opacity-50"
                                  >
                                    {abrindoDoc === doctor.id ? 'abrindo...' : 'ver comprovação'}
                                  </button>
                                ) : (
                                  <span className="text-[11px] text-amber-600">sem comprovação anexada</span>
                                )}
                              </div>
                            )}
                            <p className="text-xs text-gray-500 md:hidden">
                              {doctor.conselho_tipo ?? 'CRM'} {doctor.conselho_numero ?? doctor.crm}/{doctor.conselho_uf ?? doctor.crm_state}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell">
                        {doctor.conselho_tipo ?? 'CRM'} {doctor.conselho_numero ?? doctor.crm}/{doctor.conselho_uf ?? doctor.crm_state}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 hidden lg:table-cell">
                        {doctor.specialty}
                      </td>
                      <td className="px-4 py-3">
                        {getStatusBadge(doctor.status)}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={doctor.nivel ?? 'nivel_2'}
                          onChange={e => handleNivelChange(doctor.id, e.target.value as Doctor['nivel'])}
                          className="text-sm border border-gray-300 rounded-lg px-2 py-1 focus:ring-2 focus:ring-[#7d4a3c] bg-white"
                          title="Nível do médico (define o valor por consulta)"
                        >
                          <option value="nivel_1">Nível 1</option>
                          <option value="nivel_2">Nível 2</option>
                          <option value="nivel_3">Nível 3</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 hidden lg:table-cell">
                        {formatDate(doctor.created_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          {doctor.status === 'pending' && (
                            <button
                              onClick={() => {
                                setShowApproveModal(doctor.id);
                                setApproveSpecialty(doctor.specialty || '');
                                setApproveSpecialtyCustom(doctor.specialty_custom || '');
                              }}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                              title="Aprovar"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}
                          {doctor.status !== 'suspended' && (
                            <button
                              onClick={() => setShowSuspendModal(doctor.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                              title="Suspender"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
        </>
      )}

      {/* Modal Aprovar */}
      {showApproveModal && selectedDoctor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowApproveModal(null)} />
          <div className="relative bg-white rounded-xl shadow-lg w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Aprovar Médico</h3>

            <div className="space-y-3 mb-6 p-4 bg-gray-50 rounded-lg">
              <p><strong>Nome:</strong> {selectedDoctor.name}</p>
              <p><strong>CRM:</strong> {selectedDoctor.crm}/{selectedDoctor.crm_state}</p>
              <p><strong>Especialidade declarada:</strong> {selectedDoctor.specialty}</p>
              {selectedDoctor.specialty_custom && (
                <p><strong>Especialidade personalizada:</strong> {selectedDoctor.specialty_custom}</p>
              )}
              <p><strong>Email:</strong> {selectedDoctor.email}</p>

              <a
                href={`https://portal.cfm.org.br/${selectedDoctor.crm_state}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-[#7d4a3c] hover:underline inline-block"
              >
                Verificar CRM no CFM →
              </a>
            </div>

            {/* Campo de Especialidade */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Especialidade</label>
              <select
                value={approveSpecialty}
                onChange={e => setApproveSpecialty(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300"
              >
                <option value="">Manter especialidade declarada</option>
                {SPECIALTY_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Campo de Especialidade Customizada - aparece apenas se "Outro" for selecionado */}
            {approveSpecialty === 'Outro' && (
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Especificar especialidade
                </label>
                <input
                  type="text"
                  value={approveSpecialtyCustom}
                  onChange={e => setApproveSpecialtyCustom(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300"
                  placeholder="Ex: Cardiologista, Dermatologista, etc."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Esta especialidade será adicionada ao perfil do médico
                </p>
              </div>
            )}

            {/* Não há comissão por consulta: o profissional recebe o valor do
                nível dele menos a taxa de transação. Ver MODELO_FINANCEIRO.md */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-green-800">
                <strong>ℹ️ Repasse:</strong> O profissional recebe, por consulta realizada, o valor
                do nível dele (configurável em <strong>Configurações</strong>), menos a taxa de
                transação de {settings?.transaction_fee_percent || 5}%.
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => setShowApproveModal(null)} className="px-6 py-2 text-gray-600">Cancelar</button>
              <button
                onClick={handleApprove}
                className="px-6 py-2 bg-[#7d4a3c] hover:bg-[#623a2f] text-white rounded-lg font-medium flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Aprovar médico
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Suspender */}
      {showSuspendModal && selectedDoctor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowSuspendModal(null)} />
          <div className="relative bg-white rounded-xl shadow-lg w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Suspender Médico</h3>
            <p className="text-sm text-gray-600 mb-4">{selectedDoctor.name}</p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Motivo</label>
              <textarea
                value={suspendReason}
                onChange={e => setSuspendReason(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 resize-none"
                placeholder="Informe o motivo da suspensão..."
              />
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => setShowSuspendModal(null)} className="px-6 py-2 text-gray-600">Cancelar</button>
              <button
                onClick={handleSuspend}
                className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium"
              >
                Confirmar suspensão
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Gerar Link de Convite */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowInviteModal(false)} />
          <div className="relative bg-white rounded-xl shadow-lg w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Gerar Link de Convite</h3>
            <p className="text-sm text-gray-600 mb-4">
              Envie este link para médicos que deseja convidar para a plataforma.
              O link é único e expira em 7 dias.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Email do médico (opcional)</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300"
                placeholder="email@exemplo.com"
              />
            </div>

            <button
              onClick={generateInviteLink}
              className="w-full py-3 bg-[#7d4a3c] hover:bg-[#623a2f] text-white rounded-lg font-medium mb-4 transition"
            >
              Gerar link de convite
            </button>

            {generatedLink && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                  <input
                    type="text"
                    value={generatedLink}
                    readOnly
                    className="flex-1 px-3 py-2 text-sm bg-white rounded-lg border border-gray-300"
                  />
                  <button onClick={copyToClipboard} className="p-2 text-[#7d4a3c] hover:bg-gray-100 rounded-lg transition">
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-800">
                    <strong>💡 Dica:</strong> Envie o link por email ou WhatsApp para o médico.
                    Ele poderá se cadastrar diretamente na plataforma.
                  </p>
                </div>
              </div>
            )}

            <p className="text-xs text-gray-500 mt-4 text-center">Link expira em 7 dias</p>
          </div>
        </div>
      )}
    </div>
  );
};
