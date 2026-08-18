// =====================================================
// Malama — Rotas Principais do Portal do Médico e Admin
// =====================================================

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from '../components/ToastProvider';
import { MalamaLogo } from '../components/MalamaLogo';
import { LoginView } from '../components/LoginView';
import { LandingPage } from './LandingPage';
import { MedicosLandingPage } from './MedicosLandingPage';
import { EmpresasLandingPage } from './EmpresasLandingPage';
import { EmpresasMentalPage } from './EmpresasMentalPage';
import { PitchDeck } from './PitchDeck';

// Guards
import { DoctorRoute, AdminRoute, PublicDoctorRoute, RhRoute } from './guards';

// RH Portal (empresas B2B)
import { RhLogin } from './rh/RhLogin';
import { RhNovaSenha } from './rh/RhNovaSenha';
import { RhLayout } from './rh/RhLayout';
import { RhDashboard } from './rh/RhDashboard';
import { RhFinanceiro } from './rh/RhFinanceiro';
import { RhCompliance } from './rh/RhCompliance';
import { RhSaudeMental } from './rh/RhSaudeMental';
import { RhAbsenteismo } from './rh/RhAbsenteismo';
import { RhPlanoAcao } from './rh/RhPlanoAcao';
import { RhImportar } from './rh/RhImportar';
import { RhImpacto } from './rh/RhImpacto';
import { RhEmpresa } from './rh/RhEmpresa';
import { RhUsuarios } from './rh/RhUsuarios';
import { RhRelatos } from './rh/RhRelatos';
import { RhComoFunciona } from './rh/RhComoFunciona';
import { RhDocumentos } from './rh/RhDocumentos';
import { RhPermissionGate } from '../contexts/RhAccessContext';

// Doctor Pages
import { DoctorLogin } from './doctor/DoctorLogin';
import { DoctorRegistration } from './doctor/DoctorRegistration';
import { RegistrationSuccess } from './doctor/RegistrationSuccess';
import { DoctorPending, DoctorSuspended } from './doctor/DoctorStatusScreens';
import { DoctorLayout } from './doctor/DoctorLayout';
import { PsiPacientes } from './doctor/PsiPacientes';
import { PsiPaciente } from './doctor/PsiPaciente';
import { DoctorDashboard } from './doctor/DoctorDashboard';
import { DoctorAgenda } from './doctor/DoctorAgenda';
import { PatientsList } from './doctor/PatientsList';
import { PatientProfile } from './doctor/PatientProfile';
import { ConsultationRoom } from './doctor/ConsultationRoom';
import { DoctorSettings } from './doctor/DoctorSettings';
import { DoctorFinancial } from './doctor/DoctorFinancial';

// Referral
import { PatientReferral } from './PatientReferral';
import { ResponderQuestionario } from './ResponderQuestionario';
import { InfluencerReferral } from './InfluencerReferral';
import { PrivacyPolicy } from './PrivacyPolicy';
import { TermsOfUse } from './TermsOfUse';
import { DeleteAccount } from './DeleteAccount';

// Influencer Portal
import { InfluencerLogin } from './influencer/InfluencerLogin';
import { InfluencerActivation } from './influencer/InfluencerActivation';
import { InfluencerSetPassword } from './influencer/InfluencerSetPassword';
import { InfluencerDashboard } from './influencer/InfluencerDashboard';
import { InfluencerOnboarding } from './influencer/InfluencerOnboarding';
import { InfluencerInvite } from './influencer/InfluencerInvite';

// Admin Pages
import { AdminLogin } from './admin/AdminLogin';
import { AdminRoute as AdminGuard } from './guards';
import { AdminDashboard } from './admin/AdminDashboard';
import { AdminDoctorsManagement } from './admin/AdminDoctorsManagement';
import { AdminUsersManagement } from './admin/AdminUsersManagement';
import { AdminInfluencers } from './admin/AdminInfluencers';
import { AdminFinancial } from './admin/AdminFinancial';
import { AdminSettings } from './admin/AdminSettings';
import { AdminCommunityModeration } from './admin/AdminCommunityModeration';
import { AdminSubscriptions } from './admin/AdminSubscriptions';
import { AdminCreditsLog } from './admin/AdminCreditsLog';
import { AdminEmpresas } from './admin/AdminEmpresas';
import { AdminImpacto } from './admin/AdminImpacto';
import { AdminSupport } from './admin/AdminSupport';

// Admin Layout
const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      {/* Admin Header */}
      <header className="bg-[#1A1A1A] text-white px-6 py-4">
        <div className="mx-auto flex w-full max-w-[1800px] items-center justify-between">
          <MalamaLogo size="sm" />
          <nav className="flex gap-4 flex-wrap">
            <a href="/admin/dashboard" className="text-sm hover:text-[#2ECC71] transition">Dashboard</a>
            <a href="/admin/medicos" className="text-sm hover:text-[#2ECC71] transition">Médicos</a>
            <a href="/admin/usuarios" className="text-sm hover:text-[#2ECC71] transition">Usuários</a>
            <a href="/admin/influencers" className="text-sm hover:text-[#2ECC71] transition">Influenciadores</a>
            <a href="/admin/empresas" className="text-sm hover:text-[#2ECC71] transition">Empresas</a>
            <a href="/admin/impacto" className="text-sm hover:text-[#2ECC71] transition">Impacto</a>
            <a href="/admin/financeiro" className="text-sm hover:text-[#2ECC71] transition">Financeiro</a>
            <a href="/admin/comunidade" className="text-sm hover:text-[#2ECC71] transition">Comunidade</a>
            <a href="/admin/suporte" className="text-sm hover:text-[#2ECC71] transition">Suporte</a>
            <a href="/admin/configuracoes" className="text-sm hover:text-[#2ECC71] transition">Configurações</a>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1800px] p-4 sm:p-6 lg:px-8">
        {children}
      </main>
    </div>
  );
};

export const AppRoutes: React.FC = () => {
  return (
    <BrowserRouter>
      <ToastProvider>
        <Routes>
          {/* ==================== LANDING PAGE ==================== */}
          <Route path="/" element={<LandingPage />} />

          {/* ==================== ROTAS DO MÉDICO ==================== */}

          {/* Rotas públicas */}
          <Route
            path="/medico"
            element={
              <PublicDoctorRoute>
                <DoctorLogin />
              </PublicDoctorRoute>
            }
          />
          <Route
            path="/medico/cadastro"
            element={
              <PublicDoctorRoute>
                <DoctorRegistration />
              </PublicDoctorRoute>
            }
          />
          <Route path="/medico/cadastro/sucesso" element={<RegistrationSuccess />} />
          <Route path="/medico/em-analise" element={<DoctorPending />} />
          <Route path="/medico/conta-suspensa" element={<DoctorSuspended />} />

          {/* Rotas protegidas do médico */}
          <Route
            path="/medico"
            element={
              <DoctorRoute>
                <DoctorLayout />
              </DoctorRoute>
            }
          >
            <Route path="dashboard" element={<DoctorDashboard />} />
            <Route path="agenda" element={<DoctorAgenda />} />
            <Route path="pacientes" element={<PatientsList />} />
            <Route path="paciente/:patientId" element={<PatientProfile />} />
            {/* Escopo do psicólogo — o gate em DoctorLayout redireciona
                quem entra pela URL errada; o dado já é barrado por RLS. */}
            <Route path="psi/pacientes" element={<PsiPacientes />} />
            <Route path="psi/paciente/:id" element={<PsiPaciente />} />
            <Route path="consulta/:id" element={<ConsultationRoom />} />
            <Route path="financeiro" element={<DoctorFinancial />} />
            <Route path="configuracoes" element={<DoctorSettings />} />
          </Route>

          {/* ==================== ROTAS DO ADMIN ==================== */}

          <Route path="/admin" element={<AdminLogin />} />

          <Route
            path="/admin/dashboard"
            element={
              <AdminGuard>
                <AdminLayout>
                  <AdminDashboard />
                </AdminLayout>
              </AdminGuard>
            }
          />

          <Route
            path="/admin/medicos"
            element={
              <AdminGuard>
                <AdminLayout>
                  <AdminDoctorsManagement />
                </AdminLayout>
              </AdminGuard>
            }
          />

          <Route
            path="/admin/usuarios"
            element={
              <AdminGuard>
                <AdminLayout>
                  <AdminUsersManagement />
                </AdminLayout>
              </AdminGuard>
            }
          />

          <Route
            path="/admin/influencers"
            element={
              <AdminGuard>
                <AdminLayout>
                  <AdminInfluencers />
                </AdminLayout>
              </AdminGuard>
            }
          />

          <Route
            path="/admin/empresas"
            element={
              <AdminGuard>
                <AdminLayout>
                  <AdminEmpresas />
                </AdminLayout>
              </AdminGuard>
            }
          />

          <Route
            path="/admin/impacto"
            element={
              <AdminGuard>
                <AdminLayout>
                  <AdminImpacto />
                </AdminLayout>
              </AdminGuard>
            }
          />

          <Route
            path="/admin/financeiro"
            element={
              <AdminGuard>
                <AdminLayout>
                  <AdminFinancial />
                </AdminLayout>
              </AdminGuard>
            }
          />

          <Route
            path="/admin/configuracoes"
            element={
              <AdminGuard>
                <AdminLayout>
                  <AdminSettings />
                </AdminLayout>
              </AdminGuard>
            }
          />

          <Route
            path="/admin/comunidade"
            element={
              <AdminGuard>
                <AdminLayout>
                  <AdminCommunityModeration />
                </AdminLayout>
              </AdminGuard>
            }
          />

          <Route
            path="/admin/suporte"
            element={
              <AdminGuard>
                <AdminLayout>
                  <AdminSupport />
                </AdminLayout>
              </AdminGuard>
            }
          />

          <Route
            path="/admin/assinantes"
            element={<Navigate to="/admin/usuarios" replace />}
          />

          <Route
            path="/admin/creditos"
            element={<Navigate to="/admin/usuarios" replace />}
          />

          {/* Indicação de paciente (médico) */}
          <Route path="/convite/:token" element={<PatientReferral />} />

          {/* Indicação de influenciador */}
          <Route path="/i/:token" element={<InfluencerReferral />} />

          {/* Questionário psicossocial pelo link enviado pelo RH (sem login).
              Caminho curto de propósito: o link vai por WhatsApp e mural. */}
          <Route path="/q/:token" element={<ResponderQuestionario />} />

          {/* Portal do influenciador */}
          <Route path="/influencer/login" element={<InfluencerLogin />} />
          <Route path="/influencer/ativar/:token" element={<InfluencerActivation />} />
          <Route path="/influencer/definir-senha" element={<InfluencerSetPassword />} />
          <Route path="/influencer/convite/:token" element={<InfluencerInvite />} />
          <Route path="/influencer/onboarding" element={<InfluencerOnboarding />} />
          <Route path="/influencer/dashboard" element={<InfluencerDashboard />} />

          {/* ==================== EMPRESAS (B2B) ==================== */}

          {/* Landings públicas — uma por modo contratável */}
          <Route path="/empresas" element={<EmpresasLandingPage />} />
          <Route path="/empresas/saude-mental" element={<EmpresasMentalPage />} />

          {/* Pitch Deck */}
          <Route path="/pitchdeck" element={<PitchDeck />} />

          {/* Portal do RH */}
          <Route path="/rh" element={<RhLogin />} />
          {/* Destino do link de recuperação: fica fora do RhRoute porque a
              sessão só nasce ao abrir o link, depois da validação. */}
          <Route path="/rh/nova-senha" element={<RhNovaSenha />} />
          <Route
            path="/rh"
            element={
              <RhRoute>
                <RhLayout />
              </RhRoute>
            }
          >
            <Route path="dashboard" element={<RhPermissionGate permissao="colaboradores"><RhDashboard /></RhPermissionGate>} />
            <Route path="financeiro" element={<RhPermissionGate permissao="financeiro"><RhFinanceiro /></RhPermissionGate>} />
            <Route path="saude-mental" element={<RhPermissionGate permissao="saude_mental"><RhSaudeMental /></RhPermissionGate>} />
            <Route path="relatos" element={<RhPermissionGate permissao="apuracao"><RhRelatos /></RhPermissionGate>} />
            <Route path="absenteismo" element={<RhPermissionGate permissao="absenteismo"><RhAbsenteismo /></RhPermissionGate>} />
            <Route path="plano-acao" element={<RhPermissionGate permissao="plano_acao"><RhPlanoAcao /></RhPermissionGate>} />
            <Route path="importar" element={<RhPermissionGate permissao="importar"><RhImportar /></RhPermissionGate>} />
            <Route path="compliance" element={<RhPermissionGate permissao="compliance"><RhCompliance /></RhPermissionGate>} />
            {/* Reúne a emissão de todos os documentos. A aba só aparece na
                barra quando o ciclo fecha (ver RhLayout), mas a rota existe
                sempre — quem tem o link direto não deve bater em 404. */}
            <Route path="documentos" element={<RhPermissionGate permissao="compliance"><RhDocumentos /></RhPermissionGate>} />
            <Route path="impacto" element={<RhPermissionGate permissao="compliance"><RhImpacto /></RhPermissionGate>} />
            {/* Explicador da norma: fora da barra de abas e sem permissão —
                quem está perdido na NR-1 pode ser justamente quem tem o
                acesso mais restrito. */}
            <Route path="nr1" element={<RhComoFunciona />} />
            {/* Área da empresa: fora da barra de abas, aberta pelo cabeçalho. */}
            <Route path="empresa" element={<RhPermissionGate permissao="empresa"><RhEmpresa /></RhPermissionGate>} />
            <Route path="usuarios" element={<RhPermissionGate permissao="usuarios"><RhUsuarios /></RhPermissionGate>} />
          </Route>

          {/* Landing pages de captação */}
          <Route path="/listamedicos" element={<MedicosLandingPage />} />
          <Route path="/listausuarios" element={<LandingPage />} />
          <Route path="/listausu%C3%A1rios" element={<LandingPage />} />
          <Route path="/listausuários" element={<LandingPage />} />

          {/* Rota de acesso direto ao login — usada como PWA no celular */}
          <Route path="/acesso" element={<LoginView />} />

          {/* Política de privacidade — pública, sem autenticação */}
          <Route path="/privacidade" element={<PrivacyPolicy />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />

          {/* Termos de uso — pública, sem autenticação */}
          <Route path="/termos" element={<TermsOfUse />} />
          <Route path="/terms" element={<TermsOfUse />} />
          <Route path="/termos-de-uso" element={<TermsOfUse />} />

          {/* Exclusão de conta — exigido pelo Google Play */}
          <Route path="/deletar-conta" element={<DeleteAccount />} />
          <Route path="/delete-account" element={<DeleteAccount />} />

          {/* Rota padrão - redireciona para Landing Page */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ToastProvider>
    </BrowserRouter>
  );
};
