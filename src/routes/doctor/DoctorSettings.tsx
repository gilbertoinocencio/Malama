// =====================================================
// NURA — Configurações do Médico
// =====================================================

import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Save, Upload, AlertTriangle } from 'lucide-react';
import { doctorService, storageService, payoutService } from '../../services/doctorPortalService';
import type { Doctor, Payout } from '../../types/doctorPortal';
import { SPECIALTY_OPTIONS, CONSULTATION_TYPE_OPTIONS } from '../../types/doctorPortal';
import toast from 'react-hot-toast';

export const DoctorSettings: React.FC = () => {
  const { doctor: initialDoctor } = useOutletContext<{ doctor: Doctor }>();
  const [doctor, setDoctor] = useState<Doctor | null>(initialDoctor);
  const [activeSection, setActiveSection] = useState<'profile' | 'consultation' | 'financial' | 'certificate'>('profile');
  const [loading, setLoading] = useState(false);
  const [payouts, setPayouts] = useState<Payout[]>([]);

  // Profile fields
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Consultation fields
  const [consultationPrice, setConsultationPrice] = useState(80);
  const [consultationDuration, setConsultationDuration] = useState(30);
  const [consultationTypes, setConsultationTypes] = useState<string[]>([]);

  // Financial fields
  const [pixKey, setPixKey] = useState('');
  const [platformFee, setPlatformFee] = useState(25);

  // Certificate
  const [certificateFile, setCertificateFile] = useState<File | null>(null);

  useEffect(() => {
    if (!doctor) return;

    setName(doctor.name || '');
    setBio(doctor.bio || '');
    setSpecialty(doctor.specialty || '');
    setPhotoPreview(doctor.photo_url);
    setConsultationPrice(doctor.consultation_price || 80);
    setConsultationDuration(doctor.consultation_duration || 30);
    setPixKey(doctor.pix_key || '');
    setPlatformFee(doctor.platform_fee_percent || 25);
    setConsultationTypes(['initial', 'follow_up']);

    // Load payouts
    payoutService.getDoctorPayouts(doctor.id).then(setPayouts);
  }, [doctor]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleCertificateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCertificateFile(file);
    }
  };

  const handleSaveProfile = async () => {
    if (!doctor) return;
    setLoading(true);

    try {
      let photoUrl = doctor.photo_url;
      if (photo) {
        photoUrl = await storageService.uploadDoctorPhoto(photo, doctor.id);
      }

      const updated = await doctorService.updateDoctor(doctor.id, {
        name,
        bio: bio || null,
        specialty,
        photo_url: photoUrl
      });

      setDoctor(updated);
      toast.success('Perfil atualizado com sucesso!');
    } catch (error) {
      toast.error('Erro ao atualizar perfil');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConsultation = async () => {
    if (!doctor) return;
    setLoading(true);

    try {
      await doctorService.updateDoctor(doctor.id, {
        consultation_price: consultationPrice,
        consultation_duration: consultationDuration
      });

      toast.success('Configurações de consulta atualizadas!');
    } catch (error) {
      toast.error('Erro ao atualizar configurações');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveFinancial = async () => {
    if (!doctor) return;
    setLoading(true);

    try {
      await doctorService.updateDoctor(doctor.id, {
        pix_key: pixKey
      });

      toast.success('Configurações financeiras atualizadas!');
    } catch (error) {
      toast.error('Erro ao atualizar configurações financeiras');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadCertificate = async () => {
    if (!doctor || !certificateFile) return;
    setLoading(true);

    try {
      const certUrl = await storageService.uploadCertificate(certificateFile, doctor.id);
      await doctorService.updateDoctor(doctor.id, {
        icp_certificate_url: certUrl
      });

      toast.success('Certificado enviado com sucesso!');
      setCertificateFile(null);
    } catch (error) {
      toast.error('Erro ao enviar certificado');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (!doctor) return null;

  return (
    <div className="space-y-6">
      {/* Seções em accordion */}
      <div className="bg-white rounded-xl shadow divide-y divide-gray-200">
        {/* Perfil */}
        <div className="p-6">
          <button
            onClick={() => setActiveSection(activeSection === 'profile' ? 'profile' : 'profile')}
            className="w-full text-left"
          >
            <h3 className="text-lg font-semibold text-gray-800">Perfil</h3>
          </button>

          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#2ECC71]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#2ECC71] resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Especialidade</label>
              <select
                value={specialty}
                onChange={e => setSpecialty(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#2ECC71]"
              >
                <option value="">Selecione...</option>
                {SPECIALTY_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Foto de Perfil</label>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-[#2ECC71] overflow-hidden flex-shrink-0">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white text-xl font-bold">
                      {name.charAt(0)}
                    </div>
                  )}
                </div>
                <label className="cursor-pointer">
                  <span className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium inline-block">
                    Trocar foto
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <button
              onClick={handleSaveProfile}
              disabled={loading}
              className="px-6 py-2 bg-[#2ECC71] hover:bg-[#27ae60] text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              Salvar perfil
            </button>
          </div>
        </div>

        {/* Consulta */}
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-800">Consulta</h3>

          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valor por Consulta (R$)</label>
              <input
                type="number"
                value={consultationPrice}
                onChange={e => setConsultationPrice(parseFloat(e.target.value) || 80)}
                min={80}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#2ECC71]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duração (minutos)</label>
              <select
                value={consultationDuration}
                onChange={e => setConsultationDuration(parseInt(e.target.value))}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#2ECC71]"
              >
                <option value={20}>20 minutos</option>
                <option value={30}>30 minutos</option>
                <option value={45}>45 minutos</option>
                <option value={60}>60 minutos</option>
              </select>
            </div>

            <button
              onClick={handleSaveConsultation}
              disabled={loading}
              className="px-6 py-2 bg-[#2ECC71] hover:bg-[#27ae60] text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              Salvar configurações
            </button>
          </div>
        </div>

        {/* Financeiro */}
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-800">Financeiro</h3>

          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Chave PIX</label>
              <input
                type="text"
                value={pixKey}
                onChange={e => setPixKey(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#2ECC71]"
                placeholder="CPF, email, telefone ou chave aleatória"
              />
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">Taxa da plataforma</p>
              <p className="text-lg font-semibold text-gray-800">{platformFee}%</p>
            </div>

            <button
              onClick={handleSaveFinancial}
              disabled={loading}
              className="px-6 py-2 bg-[#2ECC71] hover:bg-[#27ae60] text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              Salvar configurações financeiras
            </button>

            {/* Histórico de repasses */}
            <div className="mt-6">
              <h4 className="font-medium text-gray-800 mb-3">Histórico de Repasses</h4>
              {payouts.length === 0 ? (
                <p className="text-gray-500 text-sm">Nenhum repasse registrado</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-gray-500">Período</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500">Consultas</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500">Valor</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500">Status</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500">Pago em</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {payouts.map(payout => (
                        <tr key={payout.id}>
                          <td className="px-3 py-2">
                            {formatDate(payout.period_start)} - {formatDate(payout.period_end)}
                          </td>
                          <td className="px-3 py-2">{payout.consultations_count}</td>
                          <td className="px-3 py-2">{formatCurrency(payout.amount)}</td>
                          <td className="px-3 py-2">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              payout.status === 'paid' ? 'bg-green-100 text-green-700' :
                              payout.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {payout.status === 'paid' ? 'Pago' : payout.status === 'pending' ? 'Pendente' : payout.status}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            {payout.paid_at ? formatDate(payout.paid_at) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Certificado Digital */}
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-800">Certificado Digital</h3>

          <div className="mt-4 space-y-4">
            {doctor.icp_certificate_url ? (
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">Certificado atual cadastrado</p>
                <p className="text-xs text-gray-500 mt-1">{doctor.updated_at ? formatDate(doctor.updated_at) : 'Data não disponível'}</p>
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-800">Certificado não cadastrado. É necessário para emissão de receitas com validade legal.</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Substituir Certificado (.pfx/.p12)</label>
              <input
                type="file"
                accept=".pfx,.p12"
                onChange={handleCertificateChange}
                className="w-full px-4 py-2 rounded-lg border border-gray-300"
              />
            </div>

            <button
              onClick={handleUploadCertificate}
              disabled={loading || !certificateFile}
              className="px-6 py-2 bg-[#2ECC71] hover:bg-[#27ae60] text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              {loading ? 'Enviando...' : 'Enviar certificado'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
