// =====================================================
// Malama — Configurações do Médico
// =====================================================

import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Save, Upload, AlertTriangle } from 'lucide-react';
import { doctorService, storageService, payoutService } from '../../services/doctorPortalService';
import type { Doctor, Payout, ConsultationObjective } from '../../types/doctorPortal';
import { SPECIALTY_OPTIONS, CONSULTATION_TYPE_OPTIONS, OBJECTIVE_OPTIONS, BRAZILIAN_STATES } from '../../types/doctorPortal';
import toast from 'react-hot-toast';

export const DoctorSettings: React.FC = () => {
  const { doctor: initialDoctor, refreshDoctor } = useOutletContext<{ doctor: Doctor; refreshDoctor: () => Promise<void> }>();
  const [doctor, setDoctor] = useState<Doctor | null>(initialDoctor);
  const [activeSection, setActiveSection] = useState<'profile' | 'consultation' | 'financial' | 'certificate'>('profile');
  const [loading, setLoading] = useState(false);
  const [payouts, setPayouts] = useState<Payout[]>([]);

  // Profile fields
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [phone, setPhone] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Address fields
  const [addressZip, setAddressZip] = useState('');
  const [addressStreet, setAddressStreet] = useState('');
  const [addressNumber, setAddressNumber] = useState('');
  const [addressComplement, setAddressComplement] = useState('');
  const [addressNeighborhood, setAddressNeighborhood] = useState('');
  const [addressCity, setAddressCity] = useState('');
  const [addressState, setAddressState] = useState('');

  // Consultation fields
  const [consultationPrice, setConsultationPrice] = useState(80);
  const [consultationDuration, setConsultationDuration] = useState(30);
  const [consultationTypes, setConsultationTypes] = useState<string[]>([]);
  const [objectives, setObjectives] = useState<ConsultationObjective[]>([]);

  // Financial fields
  const [pixKey, setPixKey] = useState('');

  // Certificate
  const [certificateFile, setCertificateFile] = useState<File | null>(null);

  useEffect(() => {
    if (!doctor) return;

    setName(doctor.name || '');
    setBio(doctor.bio || '');
    setSpecialty(doctor.specialty || '');
    setPhone(doctor.phone || '');
    setPhotoPreview(doctor.photo_url);
    setConsultationPrice(doctor.consultation_price || 80);
    setConsultationDuration(doctor.consultation_duration || 30);
    setPixKey(doctor.pix_key || '');
    setConsultationTypes(['initial', 'follow_up']);
    setObjectives((doctor.objectives as ConsultationObjective[]) || []);
    setAddressZip(doctor.address_zip || '');
    setAddressStreet(doctor.address_street || '');
    setAddressNumber(doctor.address_number || '');
    setAddressComplement(doctor.address_complement || '');
    setAddressNeighborhood(doctor.address_neighborhood || '');
    setAddressCity(doctor.address_city || '');
    setAddressState(doctor.address_state || '');

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

    const digitsPhone = phone.replace(/\D/g, '');
    if (phone && (digitsPhone.length < 10 || digitsPhone.length > 11)) {
      toast.error('Telefone inválido. Use o formato (00) 00000-0000');
      return;
    }

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
        phone: phone || null,
        photo_url: photoUrl,
        objectives: objectives.length > 0 ? objectives : null,
        address_zip: addressZip || null,
        address_street: addressStreet || null,
        address_number: addressNumber || null,
        address_complement: addressComplement || null,
        address_neighborhood: addressNeighborhood || null,
        address_city: addressCity || null,
        address_state: addressState || null,
      });

      setDoctor(updated);
      await refreshDoctor();
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

      await refreshDoctor();
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

      await refreshDoctor();
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
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#7d4a3c]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#7d4a3c] resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Especialidade</label>
              <input
                type="text"
                value={specialty}
                onChange={e => setSpecialty(e.target.value)}
                placeholder="Ex: Nutrólogo para gestantes, Endocrinologista..."
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#7d4a3c]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Objetivos atendidos</label>
              <p className="text-xs text-gray-500 mb-2">Define quais pacientes encontram você no agendamento</p>
              <div className="space-y-2">
                {OBJECTIVE_OPTIONS.map(obj => {
                  const checked = objectives.includes(obj.value as ConsultationObjective);
                  return (
                    <label key={obj.value} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          setObjectives(prev =>
                            checked ? prev.filter(o => o !== obj.value) : [...prev, obj.value as ConsultationObjective]
                          );
                        }}
                        className="w-4 h-4 accent-[#7d4a3c]"
                      />
                      <span className="text-lg">{obj.icon}</span>
                      <span className="text-sm font-medium text-gray-800">{obj.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Foto de Perfil</label>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-[#7d4a3c] overflow-hidden flex-shrink-0">
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="(00) 00000-0000"
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#7d4a3c]"
              />
            </div>

            <p className="text-sm font-semibold text-gray-700 pt-2">Endereço</p>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CEP</label>
                <input
                  type="text"
                  value={addressZip}
                  onChange={e => setAddressZip(e.target.value.replace(/\D/g, '').replace(/^(\d{5})(\d)/, '$1-$2').slice(0, 9))}
                  placeholder="00000-000"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#7d4a3c]"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Logradouro</label>
                <input
                  type="text"
                  value={addressStreet}
                  onChange={e => setAddressStreet(e.target.value)}
                  placeholder="Rua, Av., Alameda..."
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#7d4a3c]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Número</label>
                <input
                  type="text"
                  value={addressNumber}
                  onChange={e => setAddressNumber(e.target.value)}
                  placeholder="123"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#7d4a3c]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Complemento</label>
                <input
                  type="text"
                  value={addressComplement}
                  onChange={e => setAddressComplement(e.target.value)}
                  placeholder="Apto, sala..."
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#7d4a3c]"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bairro</label>
              <input
                type="text"
                value={addressNeighborhood}
                onChange={e => setAddressNeighborhood(e.target.value)}
                placeholder="Bairro"
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#7d4a3c]"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
                <input
                  type="text"
                  value={addressCity}
                  onChange={e => setAddressCity(e.target.value)}
                  placeholder="Cidade"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#7d4a3c]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">UF</label>
                <select
                  value={addressState}
                  onChange={e => setAddressState(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#7d4a3c]"
                >
                  <option value="">UF</option>
                  {BRAZILIAN_STATES.map(uf => (
                    <option key={uf} value={uf}>{uf}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={handleSaveProfile}
              disabled={loading}
              className="px-6 py-2 bg-[#7d4a3c] hover:bg-[#623a2f] text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
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
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#7d4a3c]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duração (minutos)</label>
              <select
                value={consultationDuration}
                onChange={e => setConsultationDuration(parseInt(e.target.value))}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#7d4a3c]"
              >
                <option value={20}>20 minutos</option>
                <option value={25}>25 minutos</option>
                <option value={30}>30 minutos</option>
                <option value={40}>40 minutos</option>
                <option value={45}>45 minutos</option>
                <option value={60}>60 minutos</option>
              </select>
            </div>

            <button
              onClick={handleSaveConsultation}
              disabled={loading}
              className="px-6 py-2 bg-[#7d4a3c] hover:bg-[#623a2f] text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
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
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#7d4a3c]"
                placeholder="CPF, email, telefone ou chave aleatória"
              />
            </div>

            <button
              onClick={handleSaveFinancial}
              disabled={loading}
              className="px-6 py-2 bg-[#7d4a3c] hover:bg-[#623a2f] text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
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
                            <span className={`px-2 py-1 rounded-full text-xs ${payout.status === 'paid' ? 'bg-green-100 text-green-700' :
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
              className="px-6 py-2 bg-[#7d4a3c] hover:bg-[#623a2f] text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
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
