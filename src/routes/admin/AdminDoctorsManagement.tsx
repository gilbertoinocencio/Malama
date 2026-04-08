// =====================================================
// NURA — Gestão de Médicos (Admin)
// =====================================================

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, CheckCircle, XCircle, Link2, X, Copy } from 'lucide-react';
import { doctorService, settingsService } from '../../services/doctorPortalService';
import type { Doctor, DoctorStatus } from '../../types/doctorPortal';
import { SPECIALTY_OPTIONS } from '../../types/doctorPortal';
import toast from 'react-hot-toast';

export const AdminDoctorsManagement: React.FC = () => {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<DoctorStatus | 'all'>('all');
  const [filterSpecialty, setFilterSpecialty] = useState('');
  const [search, setSearch] = useState('');
  const [settings, setSettings] = useState<Record<string, string>>({});

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
  }, [filterStatus, filterSpecialty]);

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
        specialty: filterSpecialty || undefined
      });
      setDoctors(data);
    } catch (error) {
      console.error('Error loading doctors:', error);
    } finally {
      setLoading(false);
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
          className="px-4 py-2 bg-[#2ECC71] hover:bg-[#27ae60] text-white rounded-lg font-medium flex items-center gap-2 transition"
        >
          <Link2 className="w-4 h-4" />
          Gerar Link de Convite
        </button>
      </div>

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
            value={filterSpecialty}
            onChange={e => setFilterSpecialty(e.target.value)}
            className="px-4 py-2 rounded-lg border border-gray-300"
          >
            <option value="">Todas as especialidades</option>
            {SPECIALTY_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabela de médicos */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2ECC71]"></div>
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
                          <div className="w-10 h-10 rounded-full bg-[#2ECC71] flex items-center justify-center text-white font-semibold flex-shrink-0">
                            {doctor.photo_url ? (
                              <img src={doctor.photo_url} alt={doctor.name} className="w-full h-full rounded-full object-cover" />
                            ) : (
                              doctor.name.charAt(0)
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">{doctor.name}</p>
                            <p className="text-xs text-gray-500 md:hidden">{doctor.crm}/{doctor.crm_state}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell">
                        {doctor.crm}/{doctor.crm_state}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 hidden lg:table-cell">
                        {doctor.specialty}
                      </td>
                      <td className="px-4 py-3">
                        {getStatusBadge(doctor.status)}
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
                className="text-sm text-[#2ECC71] hover:underline inline-block"
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

            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-green-800">
                <strong>ℹ️ Taxa de comissão:</strong> Será utilizada a taxa global configurada em
                <strong> Configurações</strong> ({settings?.default_platform_fee || 25}%).
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => setShowApproveModal(null)} className="px-6 py-2 text-gray-600">Cancelar</button>
              <button
                onClick={handleApprove}
                className="px-6 py-2 bg-[#2ECC71] hover:bg-[#27ae60] text-white rounded-lg font-medium flex items-center gap-2"
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
              className="w-full py-3 bg-[#2ECC71] hover:bg-[#27ae60] text-white rounded-lg font-medium mb-4 transition"
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
                  <button onClick={copyToClipboard} className="p-2 text-[#2ECC71] hover:bg-gray-100 rounded-lg transition">
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
