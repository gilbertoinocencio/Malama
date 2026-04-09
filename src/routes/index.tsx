// =====================================================
// NURA — Rotas Principais do Portal do Médico e Admin
// =====================================================

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from '../components/ToastProvider';
import { NuraLogo } from '../components/NuraLogo';
import { LandingPage } from './LandingPage';

// Guards
import { DoctorRoute, AdminRoute, PublicDoctorRoute } from './guards';

// Doctor Pages
import { DoctorLogin } from './doctor/DoctorLogin';
import { DoctorRegistration } from './doctor/DoctorRegistration';
import { RegistrationSuccess } from './doctor/RegistrationSuccess';
import { DoctorPending, DoctorSuspended } from './doctor/DoctorStatusScreens';
import { DoctorLayout } from './doctor/DoctorLayout';
import { DoctorDashboard } from './doctor/DoctorDashboard';
import { DoctorAgenda } from './doctor/DoctorAgenda';
import { PatientsList } from './doctor/PatientsList';
import { PatientProfile } from './doctor/PatientProfile';
import { ConsultationRoom } from './doctor/ConsultationRoom';
import { DoctorSettings } from './doctor/DoctorSettings';
import { DoctorFinancial } from './doctor/DoctorFinancial';

// Referral
import { PatientReferral } from './PatientReferral';
import { InfluencerReferral } from './InfluencerReferral';

// Influencer Portal
import { InfluencerLogin } from './influencer/InfluencerLogin';
import { InfluencerActivation } from './influencer/InfluencerActivation';
import { InfluencerDashboard } from './influencer/InfluencerDashboard';
import { InfluencerOnboarding } from './influencer/InfluencerOnboarding';

// Admin Pages
import { AdminLogin } from './admin/AdminLogin';
import { AdminRoute as AdminGuard } from './guards';
import { AdminDashboard } from './admin/AdminDashboard';
import { AdminDoctorsManagement } from './admin/AdminDoctorsManagement';
import { AdminUsersManagement } from './admin/AdminUsersManagement';
import { AdminInfluencers } from './admin/AdminInfluencers';
import { AdminFinancial } from './admin/AdminFinancial';
import { AdminSettings } from './admin/AdminSettings';

// Admin Layout
const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      {/* Admin Header */}
      <header className="bg-[#1A1A1A] text-white px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <NuraLogo size="sm" />
          <nav className="flex gap-4">
            <a href="/admin/dashboard" className="text-sm hover:text-[#2ECC71] transition">Dashboard</a>
            <a href="/admin/medicos" className="text-sm hover:text-[#2ECC71] transition">Médicos</a>
            <a href="/admin/usuarios" className="text-sm hover:text-[#2ECC71] transition">Usuários</a>
            <a href="/admin/influencers" className="text-sm hover:text-[#2ECC71] transition">Influenciadores</a>
            <a href="/admin/financeiro" className="text-sm hover:text-[#2ECC71] transition">Financeiro</a>
            <a href="/admin/configuracoes" className="text-sm hover:text-[#2ECC71] transition">Configurações</a>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
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

          {/* Indicação de paciente (médico) */}
          <Route path="/convite/:token" element={<PatientReferral />} />

          {/* Indicação de influenciador */}
          <Route path="/i/:token" element={<InfluencerReferral />} />

          {/* Portal do influenciador */}
          <Route path="/influencer/login" element={<InfluencerLogin />} />
          <Route path="/influencer/ativar/:token" element={<InfluencerActivation />} />
          <Route path="/influencer/onboarding" element={<InfluencerOnboarding />} />
          <Route path="/influencer/dashboard" element={<InfluencerDashboard />} />

          {/* Rota padrão - redireciona para Landing Page */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ToastProvider>
    </BrowserRouter>
  );
};
