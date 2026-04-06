// =====================================================
// NURA — Rotas Principais do Portal do Médico e Admin
// =====================================================

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from '../components/ToastProvider';

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

// Admin Pages
import { AdminLogin } from './admin/AdminLogin';
import { AdminRoute as AdminGuard } from './guards';
import { AdminDashboard } from './admin/AdminDashboard';
import { AdminDoctorsManagement } from './admin/AdminDoctorsManagement';
import { AdminFinancial } from './admin/AdminFinancial';
import { AdminSettings } from './admin/AdminSettings';

// Admin Layout
const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      {/* Admin Header */}
      <header className="bg-[#1A1A1A] text-white px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[#2ECC71]">Nura Admin</h1>
            <p className="text-xs text-gray-400">Super Admin Panel</p>
          </div>
          <nav className="flex gap-4">
            <a href="/admin/dashboard" className="text-sm hover:text-[#2ECC71] transition">Dashboard</a>
            <a href="/admin/medicos" className="text-sm hover:text-[#2ECC71] transition">Médicos</a>
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

          {/* Rota padrão */}
          <Route path="*" element={<Navigate to="/medico" replace />} />
        </Routes>
      </ToastProvider>
    </BrowserRouter>
  );
};
