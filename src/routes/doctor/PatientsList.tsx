// =====================================================
// NURA — Lista de Pacientes do Médico
// =====================================================

import React, { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { Search, User, Share2, Copy, Check } from 'lucide-react';
import { patientService, doctorService } from '../../services/doctorPortalService';
import type { Doctor, PatientSummary } from '../../types/doctorPortal';

export const PatientsList: React.FC = () => {
  const { doctor } = useOutletContext<{ doctor: Doctor }>();
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [referralLink, setReferralLink] = useState<string | null>(null);
  const [loadingReferral, setLoadingReferral] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showReferral, setShowReferral] = useState(false);

  useEffect(() => {
    if (!doctor) return;

    const loadPatients = async () => {
      try {
        const data = await patientService.getDoctorPatients(doctor.id, search || undefined);
        setPatients(data);
      } catch (error) {
        console.error('Error loading patients:', error);
      } finally {
        setLoading(false);
      }
    };

    const timeout = setTimeout(loadPatients, 300);
    return () => clearTimeout(timeout);
  }, [doctor, search]);

  const handleGetReferralLink = async () => {
    if (referralLink) {
      setShowReferral(true);
      return;
    }
    setLoadingReferral(true);
    try {
      const token = await doctorService.getOrCreatePatientReferralToken(doctor.id);
      const base = window.location.origin;
      setReferralLink(`${base}/convite/${token}`);
      setShowReferral(true);
    } catch (err) {
      console.error('Erro ao gerar link:', err);
    } finally {
      setLoadingReferral(false);
    }
  };

  const handleCopy = async () => {
    if (!referralLink) return;
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Indicar Paciente */}
      <div className="bg-white rounded-xl shadow p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-800">Indicar paciente</h2>
            <p className="text-sm text-gray-500 mt-0.5">Compartilhe seu link personalizado para que pacientes baixem o app Nura.</p>
          </div>
          <button
            onClick={handleGetReferralLink}
            disabled={loadingReferral}
            className="flex items-center gap-2 px-4 py-2 bg-[#2ECC71] hover:bg-[#27ae60] text-white text-sm font-medium rounded-lg transition disabled:opacity-60"
          >
            {loadingReferral ? (
              <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : (
              <Share2 className="w-4 h-4" />
            )}
            Gerar link
          </button>
        </div>

        {showReferral && referralLink && (
          <div className="mt-4 flex items-center gap-2">
            <input
              readOnly
              value={referralLink}
              className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-700 select-all"
              onClick={e => (e.target as HTMLInputElement).select()}
            />
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition whitespace-nowrap"
            >
              {copied ? <Check className="w-4 h-4 text-[#2ECC71]" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copiado!' : 'Copiar'}
            </button>
          </div>
        )}
      </div>

      {/* Busca */}
      <div className="bg-white rounded-xl shadow p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar paciente por nome..."
            className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#2ECC71] focus:border-transparent"
          />
        </div>
      </div>

      {/* Tabela de pacientes */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2ECC71]"></div>
          </div>
        ) : patients.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <User className="w-10 h-10 text-gray-400" />
            </div>
            <p className="text-gray-600">Nenhum paciente ainda.</p>
            <p className="text-gray-500 text-sm mt-1">Suas consultas aparecerão aqui.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paciente</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Última consulta</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Próxima consulta</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">IMC</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {patients.map(patient => (
                  <tr key={patient.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#2ECC71] flex items-center justify-center text-white font-semibold flex-shrink-0">
                          {patient.photo_url ? (
                            <img src={patient.photo_url} alt={patient.name} className="w-full h-full object-cover rounded-full" />
                          ) : (
                            patient.name.charAt(0)
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{patient.name}</p>
                          {patient.is_glp1_active && (
                            <span className="text-xs text-purple-600">💉 GLP-1</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell">
                      {formatDate(patient.lastConsultation)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell">
                      {formatDate(patient.nextConsultation)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 hidden lg:table-cell">
                      {patient.imc?.toFixed(1) || '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/medico/paciente/${patient.id}`}
                        className="px-4 py-2 bg-[#2ECC71] hover:bg-[#27ae60] text-white text-sm rounded-lg transition"
                      >
                        Ver perfil
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
