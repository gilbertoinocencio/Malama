// =====================================================
// Malama — Cadastro do Médico (4 etapas com stepper)
// =====================================================

import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { supabase } from '../../services/supabase';
import { doctorService, storageService } from '../../services/doctorPortalService';
import type { DoctorRegistrationFormData, DoctorSpecialty, ConsultationType, ConsultationObjective } from '../../types/doctorPortal';
import { BRAZILIAN_STATES, SPECIALTY_OPTIONS, SPECIALTY_OPTIONS_PSICOLOGO, CONSULTATION_TYPE_OPTIONS, OBJECTIVE_OPTIONS, ConsultationType as CT, DoctorType } from '../../types/doctorPortal';
import { MalamaLogo } from '../../components/MalamaLogo';
import { isValidCPF } from '../../utils/cpf';

// Mesma regra da Edge Function validate-email: um @, sem espaços, domínio com
// ponto e TLD de 2+ letras. O `\S+@\S+\.\S+` anterior aceitava "a@b.c".
const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[A-Za-z]{2,}$/;


export const DoctorRegistration: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [inviteData, setInviteData] = useState<{ email: string; doctorId: string } | null>(null);
  const [crmValidating, setCrmValidating] = useState(false);
  // E-mail já aprovado no teste de domínio (guarda o valor, não um booleano:
  // trocar o e-mail depois obriga a checar de novo).
  const [emailChecked, setEmailChecked] = useState<string | null>(null);
  const [emailChecking, setEmailChecking] = useState(false);
  const [crmValidated, setCrmValidated] = useState<{ name: string; situation: string; specialty: string | null } | null>(null);
  const [crmError, setCrmError] = useState<string | null>(null);

  const [formData, setFormData] = useState<DoctorRegistrationFormData>({
    name: '',
    email: '',
    cpf: '',
    phone: '',
    password: '',
    confirmPassword: '',
    addressZip: '',
    addressStreet: '',
    addressNumber: '',
    addressComplement: '',
    addressNeighborhood: '',
    addressCity: '',
    addressState: '',
    tipoProfissional: DoctorType.MEDICO,
    crm: '',
    crmState: '',
    epsiAtivo: false,
    documentoConselho: null as File | null,
    specialty: '',
    bio: '',
    photo: null,
    icpCertificate: null,
    consultationDuration: 30,
    pixKey: '',
    consultationTypes: [CT.INITIAL, CT.FOLLOW_UP],
    objectives: [],
  });

  const [errors, setErrors] = useState<Partial<Record<keyof DoctorRegistrationFormData, string>>>({});
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Tipo vindo do convite do admin (?tipo=psicologo). Abre o cadastro já na
  // trilha certa: conselho, especialidades e e-Psi mudam conforme o tipo.
  useEffect(() => {
    const tipo = searchParams.get('tipo');
    if (tipo === DoctorType.PSICOLOGO || tipo === DoctorType.MEDICO) {
      setFormData(prev => ({ ...prev, tipoProfissional: tipo as DoctorType }));
    }
  }, [searchParams]);

  // E-mail do convite (?email=). Só pré-preenche — o campo segue editável,
  // porque o profissional pode preferir outro endereço para o portal.
  useEffect(() => {
    const email = searchParams.get('email');
    if (email) {
      setFormData(prev => (prev.email ? prev : { ...prev, email }));
    }
  }, [searchParams]);

  // Verificar token de convite
  useEffect(() => {
    const inviteToken = searchParams.get('invite');
    if (inviteToken) {
      doctorService.getDoctorByInviteToken(inviteToken)
        .then(doctor => {
          if (doctor) {
            setInviteData({ email: doctor.email, doctorId: doctor.id });
            setFormData(prev => ({ ...prev, email: doctor.email }));
            toast.success('Link de convite válido!');
          } else {
            toast.error('Link de convite inválido ou expirado');
          }
        })
        .catch(() => {
          toast.error('Link de convite inválido');
        });
    }
  }, [searchParams]);

  // Handlers de formulário
  const updateField = (field: keyof DoctorRegistrationFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const formatCPF = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    return digits
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2');
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setErrors(prev => ({ ...prev, photo: 'Selecione uma imagem válida' }));
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, photo: 'Imagem deve ter no máximo 5MB' }));
        return;
      }
      updateField('photo', file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleValidateCRM = async () => {
    if (!formData.crm.trim() || !formData.crmState) {
      setCrmError('Preencha o CRM e o estado antes de verificar.');
      return;
    }
    setCrmValidating(true);
    setCrmValidated(null);
    setCrmError(null);
    try {
      const { data, error } = await supabase.functions.invoke('validate-crm', {
        body: { crm: formData.crm, uf: formData.crmState },
      });
      if (error) throw error;
      if (!data?.valid) {
        setCrmError('CRM não encontrado ou inativo no CFM. Verifique o número e o estado.');
      } else {
        setCrmValidated({ name: data.name, situation: data.situation, specialty: data.specialty });
      }
    } catch {
      setCrmError('Não foi possível consultar o CFM. Tente novamente.');
    } finally {
      setCrmValidating(false);
    }
  };

  // Validação por etapa
  const validateStep = (currentStep: number): boolean => {
    const newErrors: Partial<Record<keyof DoctorRegistrationFormData, string>> = {};

    if (currentStep === 1) {
      if (!formData.name.trim()) newErrors.name = 'Nome é obrigatório';
      if (!formData.email.trim()) newErrors.email = 'Email é obrigatório';
      else if (!EMAIL_RE.test(formData.email.trim())) newErrors.email = 'Email inválido';
      // Dígitos verificadores, não só tamanho: antes qualquer 11 dígitos
      // inventados passavam (inclusive 111.111.111-11).
      if (!isValidCPF(formData.cpf)) newErrors.cpf = 'CPF inválido — confira os números';
      if (!formData.phone.trim() || formData.phone.replace(/\D/g, '').length !== 11) newErrors.phone = 'Telefone inválido';
      if (formData.password.length < 8) newErrors.password = 'Senha deve ter no mínimo 8 caracteres';
      if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Senhas não coincidem';
      if (!formData.addressZip.trim()) newErrors.addressZip = 'CEP é obrigatório';
      if (!formData.addressStreet.trim()) newErrors.addressStreet = 'Logradouro é obrigatório';
      if (!formData.addressNumber.trim()) newErrors.addressNumber = 'Número é obrigatório';
      if (!formData.addressNeighborhood.trim()) newErrors.addressNeighborhood = 'Bairro é obrigatório';
      if (!formData.addressCity.trim()) newErrors.addressCity = 'Cidade é obrigatória';
      if (!formData.addressState) newErrors.addressState = 'Estado é obrigatório';
    }

    if (currentStep === 2) {
      const isPsi = formData.tipoProfissional === DoctorType.PSICOLOGO;
      if (isPsi) {
        // Psicólogo: CRP + UF + declaração de e-Psi. Sem validação CFM
        // (não há API pública do e-Psi); o gate é a aprovação do admin.
        if (!formData.crm.trim()) newErrors.crm = 'CRP é obrigatório';
        if (!formData.crmState) newErrors.crmState = 'Estado do CRP é obrigatório';
        if (!formData.epsiAtivo) newErrors.epsiAtivo = 'É necessário declarar o cadastro e-Psi ativo';
        // Sem API pública de validação do CRP/e-Psi, o anexo é o que permite
        // ao admin conferir antes de liberar.
        if (!formData.documentoConselho) newErrors.documentoConselho = 'Anexe o documento de comprovação';
      } else {
        if (!formData.crm.trim()) newErrors.crm = 'CRM é obrigatório';
        if (!formData.crmState) newErrors.crmState = 'Estado do CRM é obrigatório';
        if (!crmValidated) newErrors.crm = 'Verifique o CRM antes de continuar';
      }
      if (!formData.specialty) newErrors.specialty = 'Especialidade é obrigatória';
      if (formData.bio.length > 300) newErrors.bio = 'Bio deve ter no máximo 300 caracteres';
    }

    // Etapa 4 não tem campo obrigatório: o valor da consulta é tabelado pela
    // Malama (por nível) e a duração tem default.

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Confere no servidor se o domínio do e-mail existe e recebe correio.
   * Regex não pega "charli@n.com": a sintaxe é válida, o domínio não existe.
   * Só roda quando o e-mail muda, para não repetir DNS a cada avanço de etapa.
   */
  const checkEmailDomain = async (): Promise<boolean> => {
    const email = formData.email.trim().toLowerCase();
    if (emailChecked === email) return true;

    setEmailChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke('validate-email', {
        body: { email },
      });
      // Função fora do ar não pode travar um cadastro legítimo.
      if (error) return true;
      if (data?.valid === false) {
        setErrors(prev => ({ ...prev, email: data.reason ?? 'E-mail inválido' }));
        return false;
      }
      setEmailChecked(email);
      return true;
    } catch {
      return true;
    } finally {
      setEmailChecking(false);
    }
  };

  const nextStep = async () => {
    if (!validateStep(step)) return;
    if (step === 1 && !(await checkEmailDomain())) return;
    setStep(prev => Math.min(prev + 1, 4));
  };

  const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

  // Submit
  const handleSubmit = async () => {
    if (!validateStep(4)) return;
    // Revalida etapa 1 no envio: quem voltou e trocou e-mail ou CPF não pode
    // escapar da checagem por ter passado por ela uma vez.
    if (!validateStep(1) || !(await checkEmailDomain())) {
      setStep(1);
      toast.error('Revise os dados pessoais antes de enviar.');
      return;
    }

    setLoading(true);
    try {
      // Criar conta de usuário. O e-mail pode já ter conta Malama — o
      // profissional costuma ser paciente antes de se cadastrar como
      // médico/psicólogo, e aí o signUp devolve "User already registered".
      // Nesse caso entramos com a senha informada e seguimos o cadastro com o
      // mesmo usuário, em vez de travar no último botão do formulário.
      let userId: string;

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name,
            role: 'doctor'
          }
        }
      });

      if (authError) {
        const contaExiste = /already registered|already been registered|user_already_exists/i
          .test(authError.message);
        if (!contaExiste) throw authError;

        const { data: signIn, error: signInError } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });
        if (signInError || !signIn.user) {
          throw new Error(
            'Este e-mail já tem conta na Malama. Informe a senha dessa conta para continuar o cadastro profissional, ou recupere-a em "Esqueci minha senha".'
          );
        }
        userId = signIn.user.id;
      } else {
        if (!authData.user) throw new Error('Falha ao criar conta');
        userId = authData.user.id;
      }

      // Já existe cadastro profissional para esse usuário? Evita um segundo
      // registro (e o erro cru do banco) em reenvio ou clique duplo.
      const jaCadastrado = await doctorService.getOwnDoctorProfile().catch(() => null);
      if (jaCadastrado) {
        toast.success('Você já tem cadastro profissional na Malama.');
        navigate('/medico');
        return;
      }

      // Upload da foto
      let photoUrl: string | null = null;
      if (formData.photo) {
        photoUrl = await storageService.uploadDoctorPhoto(formData.photo, userId);
      }

      // Upload do certificado
      let certificateUrl: string | null = null;
      if (formData.icpCertificate) {
        certificateUrl = await storageService.uploadCertificate(formData.icpCertificate, userId);
      }

      // Documento de comprovação do conselho (CRP / e-Psi). O CRM tem
      // validação por API do CFM; para psicólogo a conferência é documental.
      let documentoConselhoPath: string | null = null;
      if (formData.documentoConselho) {
        documentoConselhoPath = await storageService.uploadDocumentoConselho(
          formData.documentoConselho, userId,
        );
      }

      const isPsi = formData.tipoProfissional === DoctorType.PSICOLOGO;

      // Criar registro do profissional. Médico usa CRM/CFM; psicólogo usa
      // CRP + declaração de e-Psi. O conselho genérico guarda ambos os casos;
      // crm/crm_state seguem preenchidos (compat. com o resto do portal).
      await doctorService.createDoctor({
        user_id: userId,
        name: formData.name,
        email: formData.email,
        cpf: formData.cpf,
        phone: formData.phone,
        tipo_profissional: formData.tipoProfissional,
        crm: formData.crm,
        crm_state: formData.crmState,
        conselho_tipo: isPsi ? 'CRP' : 'CRM',
        conselho_numero: formData.crm,
        conselho_uf: formData.crmState,
        epsi_ativo: isPsi ? formData.epsiAtivo : null,
        documento_conselho_path: documentoConselhoPath,
        documento_conselho_enviado_em: documentoConselhoPath ? new Date().toISOString() : null,
        specialty: formData.specialty,
        bio: formData.bio || null,
        photo_url: photoUrl,
        icp_certificate_url: certificateUrl,
        // consultation_price NÃO vai daqui: é tabelado por nível e só a Malama
        // escreve (bloqueado no trigger protect_doctor_privileged_fields).
        consultation_duration: formData.consultationDuration,
        pix_key: formData.pixKey || null,
        address_zip: formData.addressZip || null,
        address_street: formData.addressStreet || null,
        address_number: formData.addressNumber || null,
        address_complement: formData.addressComplement || null,
        address_neighborhood: formData.addressNeighborhood || null,
        address_city: formData.addressCity || null,
        address_state: formData.addressState || null,
        objectives: formData.objectives.length > 0 ? formData.objectives : undefined,
        invite_token: inviteData?.doctorId ? undefined : doctorService.generateInviteToken()
      });

      toast.success('Cadastro enviado com sucesso!');
      navigate('/medico/cadastro/sucesso');
    } catch (error: any) {
      console.error('Registration error:', error);
      toast.error(error.message || 'Erro ao realizar cadastro');
    } finally {
      setLoading(false);
    }
  };

  // Renderização das etapas
  const renderStep1 = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-800">Dados Pessoais</h2>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo *</label>
        <input
          type="text"
          value={formData.name}
          onChange={e => updateField('name', e.target.value)}
          className={`w-full px-4 py-3 rounded-lg border ${errors.name ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-[#7d4a3c] focus:border-transparent text-gray-900`}
          placeholder="Seu nome completo"
        />
        {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
        <input
          type="email"
          value={formData.email}
          onChange={e => updateField('email', e.target.value)}
          className={`w-full px-4 py-3 rounded-lg border ${errors.email ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-[#7d4a3c] focus:border-transparent text-gray-900`}
          placeholder="seu@email.com"
          disabled={!!inviteData}
        />
        {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">CPF *</label>
          <input
            type="text"
            value={formData.cpf}
            onChange={e => updateField('cpf', formatCPF(e.target.value))}
            className={`w-full px-4 py-3 rounded-lg border ${errors.cpf ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-[#7d4a3c] focus:border-transparent text-gray-900`}
            placeholder="000.000.000-00"
          />
          {errors.cpf && <p className="text-red-500 text-sm mt-1">{errors.cpf}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Telefone *</label>
          <input
            type="text"
            value={formData.phone}
            onChange={e => updateField('phone', formatPhone(e.target.value))}
            className={`w-full px-4 py-3 rounded-lg border ${errors.phone ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-[#7d4a3c] focus:border-transparent text-gray-900`}
            placeholder="(00) 00000-0000"
          />
          {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Senha *</label>
        <input
          type="password"
          value={formData.password}
          onChange={e => updateField('password', e.target.value)}
          className={`w-full px-4 py-3 rounded-lg border ${errors.password ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-[#7d4a3c] focus:border-transparent text-gray-900`}
          placeholder="Mínimo 8 caracteres"
        />
        {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Senha *</label>
        <input
          type="password"
          value={formData.confirmPassword}
          onChange={e => updateField('confirmPassword', e.target.value)}
          className={`w-full px-4 py-3 rounded-lg border ${errors.confirmPassword ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-[#7d4a3c] focus:border-transparent text-gray-900`}
          placeholder="Repita a senha"
        />
        {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>}
      </div>

      <p className="text-sm font-semibold text-gray-700 pt-2">Endereço</p>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">CEP *</label>
          <input
            type="text"
            value={formData.addressZip}
            onChange={e => updateField('addressZip', e.target.value.replace(/\D/g, '').replace(/^(\d{5})(\d)/, '$1-$2').slice(0, 9))}
            className={`w-full px-4 py-3 rounded-lg border ${errors.addressZip ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-[#7d4a3c] focus:border-transparent text-gray-900`}
            placeholder="00000-000"
          />
          {errors.addressZip && <p className="text-red-500 text-sm mt-1">{errors.addressZip}</p>}
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Logradouro *</label>
          <input
            type="text"
            value={formData.addressStreet}
            onChange={e => updateField('addressStreet', e.target.value)}
            className={`w-full px-4 py-3 rounded-lg border ${errors.addressStreet ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-[#7d4a3c] focus:border-transparent text-gray-900`}
            placeholder="Rua, Av., Alameda..."
          />
          {errors.addressStreet && <p className="text-red-500 text-sm mt-1">{errors.addressStreet}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Número *</label>
          <input
            type="text"
            value={formData.addressNumber}
            onChange={e => updateField('addressNumber', e.target.value)}
            className={`w-full px-4 py-3 rounded-lg border ${errors.addressNumber ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-[#7d4a3c] focus:border-transparent text-gray-900`}
            placeholder="123"
          />
          {errors.addressNumber && <p className="text-red-500 text-sm mt-1">{errors.addressNumber}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Complemento</label>
          <input
            type="text"
            value={formData.addressComplement}
            onChange={e => updateField('addressComplement', e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#7d4a3c] focus:border-transparent"
            placeholder="Apto, sala, bloco..."
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Bairro *</label>
        <input
          type="text"
          value={formData.addressNeighborhood}
          onChange={e => updateField('addressNeighborhood', e.target.value)}
          className={`w-full px-4 py-3 rounded-lg border ${errors.addressNeighborhood ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-[#7d4a3c] focus:border-transparent text-gray-900`}
          placeholder="Bairro"
        />
        {errors.addressNeighborhood && <p className="text-red-500 text-sm mt-1">{errors.addressNeighborhood}</p>}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Cidade *</label>
          <input
            type="text"
            value={formData.addressCity}
            onChange={e => updateField('addressCity', e.target.value)}
            className={`w-full px-4 py-3 rounded-lg border ${errors.addressCity ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-[#7d4a3c] focus:border-transparent text-gray-900`}
            placeholder="Cidade"
          />
          {errors.addressCity && <p className="text-red-500 text-sm mt-1">{errors.addressCity}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">UF *</label>
          <select
            value={formData.addressState}
            onChange={e => updateField('addressState', e.target.value)}
            className={`w-full px-4 py-3 rounded-lg border ${errors.addressState ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-[#7d4a3c] focus:border-transparent text-gray-900`}
          >
            <option value="">UF</option>
            {BRAZILIAN_STATES.map(uf => (
              <option key={uf} value={uf}>{uf}</option>
            ))}
          </select>
          {errors.addressState && <p className="text-red-500 text-sm mt-1">{errors.addressState}</p>}
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => {
    const isPsi = formData.tipoProfissional === DoctorType.PSICOLOGO;
    const conselhoLabel = isPsi ? 'CRP' : 'CRM';
    return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-800">Dados Profissionais</h2>

      {/* Tipo de profissional */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de profissional *</label>
        <div className="grid grid-cols-2 gap-3">
          {[
            { v: DoctorType.MEDICO, label: 'Médico(a)', hint: 'CRM · validado no CFM' },
            { v: DoctorType.PSICOLOGO, label: 'Psicólogo(a)', hint: 'CRP · e-Psi ativo' },
          ].map(opt => (
            <button
              key={opt.v}
              type="button"
              onClick={() => {
                updateField('tipoProfissional', opt.v);
                // Trocar de tipo zera validações e especialidade (contextos distintos)
                setCrmValidated(null); setCrmError(null);
                updateField('specialty', opt.v === DoctorType.PSICOLOGO ? 'Psicólogo' : '');
              }}
              className={`p-3 rounded-lg border text-left transition ${
                formData.tipoProfissional === opt.v
                  ? 'border-[#7d4a3c] bg-[#7d4a3c]/5'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <p className="text-sm font-semibold text-gray-800">{opt.label}</p>
              <p className="text-xs text-gray-500">{opt.hint}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">{conselhoLabel} Número *</label>
          <input
            type="text"
            value={formData.crm}
            onChange={e => { updateField('crm', e.target.value); setCrmValidated(null); setCrmError(null); }}
            className={`w-full px-4 py-3 rounded-lg border ${errors.crm ? 'border-red-500' : crmValidated ? 'border-green-500' : 'border-gray-300'} focus:ring-2 focus:ring-[#7d4a3c] focus:border-transparent text-gray-900`}
            placeholder="000000"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Estado *</label>
          <select
            value={formData.crmState}
            onChange={e => { updateField('crmState', e.target.value); setCrmValidated(null); setCrmError(null); }}
            className={`w-full px-4 py-3 rounded-lg border ${errors.crmState ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-[#7d4a3c] focus:border-transparent text-gray-900`}
          >
            <option value="">UF</option>
            {BRAZILIAN_STATES.map(uf => (
              <option key={uf} value={uf}>{uf}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Médico: validação no CFM. Psicólogo: declaração de e-Psi. */}
      {!isPsi ? (
        <>
          <button
            type="button"
            onClick={handleValidateCRM}
            disabled={crmValidating || !formData.crm || !formData.crmState}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#7d4a3c] text-[#7d4a3c] text-sm font-medium hover:bg-[#7d4a3c]/5 disabled:opacity-50 transition"
          >
            {crmValidating ? (
              <span className="w-4 h-4 rounded-full border-2 border-[#7d4a3c] border-t-transparent animate-spin" />
            ) : null}
            {crmValidating ? 'Consultando CFM...' : 'Verificar CRM no CFM'}
          </button>

          {crmValidated && (
            <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-300 rounded-lg text-sm text-green-800">
              <span className="text-green-600 font-bold mt-0.5">✓</span>
              <div>
                <p className="font-semibold">{crmValidated.name}</p>
                <p className="text-xs text-green-700">Situação: {crmValidated.situation}{crmValidated.specialty ? ` · ${crmValidated.specialty}` : ''}</p>
              </div>
            </div>
          )}

          {crmError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{crmError}</p>
          )}
        </>
      ) : (
        <div>
          <label className="flex items-start gap-2 cursor-pointer p-3 rounded-lg border border-gray-300">
            <input
              type="checkbox"
              checked={formData.epsiAtivo}
              onChange={e => updateField('epsiAtivo', e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded accent-[#7d4a3c]"
            />
            <span className="text-sm text-gray-700">
              Declaro que possuo cadastro <strong>e-Psi ativo</strong> no Conselho Federal de
              Psicologia (CFP), habilitado para atendimento psicológico online, e que as
              informações são verdadeiras. A Malama confirmará o cadastro antes da aprovação.
            </span>
          </label>
          {errors.epsiAtivo && <p className="text-red-500 text-sm mt-1">{errors.epsiAtivo}</p>}

          {/* Anexo de comprovação. O CRM tem validação por API do CFM; o CRP
              e o e-Psi não têm equivalente público, então a conferência é
              documental e acontece na aprovação. */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Documento de comprovação *
            </label>
            <p className="text-xs text-gray-500 mb-2">
              Carteira do CRP e/ou comprovante de cadastro e-Psi. PDF ou imagem, até 10 MB.
              Fica visível apenas para você e para a equipe da Malama que faz a análise.
            </p>
            <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition">
              <p className="text-gray-500 text-sm text-center px-3">
                {formData.documentoConselho
                  ? formData.documentoConselho.name
                  : 'Clique para selecionar'}
              </p>
              <input
                type="file"
                accept=".pdf,image/*"
                onChange={e => updateField('documentoConselho', e.target.files?.[0] || null)}
                className="hidden"
              />
            </label>
            {errors.documentoConselho && (
              <p className="text-red-500 text-sm mt-1">{errors.documentoConselho}</p>
            )}
          </div>
        </div>
      )}

      {errors.crm && !crmError && <p className="text-red-500 text-sm">{errors.crm}</p>}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Especialidade *</label>
        {isPsi ? (
          <select
            value={formData.specialty}
            onChange={e => updateField('specialty', e.target.value)}
            className={`w-full px-4 py-3 rounded-lg border ${errors.specialty ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-[#7d4a3c] focus:border-transparent text-gray-900`}
          >
            {SPECIALTY_OPTIONS_PSICOLOGO.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            value={formData.specialty}
            onChange={e => updateField('specialty', e.target.value)}
            placeholder="Ex: Endocrinologista, Nutrólogo para gestantes..."
            className={`w-full px-4 py-3 rounded-lg border ${errors.specialty ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-[#7d4a3c] focus:border-transparent text-gray-900`}
          />
        )}
        {errors.specialty && <p className="text-red-500 text-sm mt-1">{errors.specialty}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
        <textarea
          value={formData.bio}
          onChange={e => updateField('bio', e.target.value.slice(0, 300))}
          rows={4}
          className={`w-full px-4 py-3 rounded-lg border ${errors.bio ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-[#7d4a3c] focus:border-transparent resize-none`}
          placeholder="Conte um pouco sobre sua experiência..."
        />
        <p className="text-xs text-gray-500 mt-1">{formData.bio.length}/300 caracteres</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Objetivos atendidos</label>
        <p className="text-xs text-gray-500 mb-2">Selecione os objetivos de pacientes que você atende</p>
        <div className="space-y-2">
          {OBJECTIVE_OPTIONS.map(obj => {
            const checked = formData.objectives.includes(obj.value as ConsultationObjective);
            return (
              <label key={obj.value} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    const next = checked
                      ? formData.objectives.filter(o => o !== obj.value)
                      : [...formData.objectives, obj.value as ConsultationObjective];
                    updateField('objectives', next);
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
          <div className="w-20 h-20 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
            {photoPreview ? (
              <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 text-2xl">
                {formData.name.charAt(0) || '👤'}
              </div>
            )}
          </div>
          <label className="cursor-pointer">
            <span className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium inline-block">
              Selecionar imagem
            </span>
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              className="hidden"
            />
          </label>
        </div>
        {errors.photo && <p className="text-red-500 text-sm mt-1">{errors.photo}</p>}
      </div>
    </div>
    );
  };

  const renderStep3 = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-800">Certificado Digital</h2>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Necessário</strong> para emissão de receitas digitais com validade legal.
        </p>
        <a
          href="https://www.gov.br/iti/pt-br"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-600 hover:underline mt-2 inline-block"
        >
          Como obter seu certificado ICP-Brasil →
        </a>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Arquivo .pfx ou .p12</label>
        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition">
          <div className="text-center">
            <p className="text-gray-500 text-sm">
              {formData.icpCertificate ? formData.icpCertificate.name : 'Clique para selecionar'}
            </p>
          </div>
          <input
            type="file"
            accept=".pfx,.p12"
            onChange={e => updateField('icpCertificate', e.target.files?.[0] || null)}
            className="hidden"
          />
        </label>
      </div>

      <button
        type="button"
        onClick={() => setStep(4)}
        className="text-sm text-gray-500 hover:text-gray-700"
      >
        Pular esta etapa →
      </button>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-800">Configurações</h2>

      {/* A remuneração não é escolhida pelo profissional: é tabelada por nível,
          definido pela Malama na aprovação. Ver AdminSettings (doctor_value_nivelN
          / psi_value_nivelN) e doctorService.getDoctorEarnings. */}
      <div className="bg-[#F2EBE6] border border-[#7d4a3c]/20 rounded-lg p-4">
        <p className="text-sm font-medium text-[#7d4a3c] mb-1">Valor por consulta</p>
        <p className="text-sm text-gray-700">
          O valor é tabelado pela Malama, por nível de atuação. Sua faixa é definida
          pela nossa equipe na aprovação do cadastro, e você acompanha os repasses
          na aba Financeiro do portal.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Duração da Consulta</label>
        <select
          value={formData.consultationDuration}
          onChange={e => updateField('consultationDuration', parseInt(e.target.value))}
          className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#7d4a3c] focus:border-transparent"
        >
          <option value={20}>20 minutos</option>
          <option value={25}>25 minutos</option>
          <option value={30}>30 minutos</option>
          <option value={40}>40 minutos</option>
          <option value={45}>45 minutos</option>
          <option value={60}>60 minutos</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Chave PIX</label>
        <input
          type="text"
          value={formData.pixKey}
          onChange={e => updateField('pixKey', e.target.value)}
          className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#7d4a3c] focus:border-transparent"
          placeholder="CPF, email, telefone ou chave aleatória"
        />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FDFBF9] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Logo */}
        <div className="text-center mb-8">
          <MalamaLogo size="lg" />
          <p className="text-gray-600 mt-3 text-sm tracking-wide uppercase">Portal do Médico</p>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-center mb-8">
          {[1, 2, 3, 4].map(s => (
            <React.Fragment key={s}>
              <div className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold text-sm ${s === step ? 'bg-[#7d4a3c] text-white' :
                s < step ? 'bg-[#7d4a3c] text-white' :
                  'bg-gray-200 text-gray-600'
                }`}>
                {s < step ? '✓' : s}
              </div>
              {s < 4 && (
                <div className={`w-12 h-1 ${s < step ? 'bg-[#7d4a3c]' : 'bg-gray-200'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Formulário */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}

          {/* Botões */}
          <div className="flex justify-between mt-8 pt-6 border-t">
            {step > 1 ? (
              <button
                type="button"
                onClick={prevStep}
                className="px-6 py-3 text-gray-600 hover:text-gray-800 font-medium"
              >
                Voltar
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate('/medico')}
                className="px-6 py-3 text-gray-600 hover:text-gray-800 font-medium"
              >
                Voltar ao login
              </button>
            )}

            {step < 4 ? (
              <button
                type="button"
                onClick={nextStep}
                disabled={emailChecking}
                className="px-8 py-3 bg-[#7d4a3c] hover:bg-[#623a2f] text-white rounded-lg font-medium transition disabled:opacity-50"
              >
                {emailChecking ? 'Verificando e-mail...' : 'Próximo'}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="px-8 py-3 bg-[#7d4a3c] hover:bg-[#623a2f] text-white rounded-lg font-medium transition disabled:opacity-50"
              >
                {loading ? 'Enviando...' : 'Enviar Cadastro'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
