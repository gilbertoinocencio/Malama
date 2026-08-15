// =====================================================
// Malama — Layout do Médico com Sidebar
// =====================================================

import React, { useState, useEffect, useCallback } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { doctorService } from '../../services/doctorPortalService';
import type { Doctor } from '../../types/doctorPortal';
import { MalamaLogo } from '../../components/MalamaLogo';
import {
  LayoutDashboard,
  Calendar,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  DollarSign,
  Bell
} from 'lucide-react';
import { DoctorNotificationsPanel } from '../../components/doctor/DoctorNotificationsPanel';

export const DoctorLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);

  const refreshUnread = useCallback(async () => {
    const { data } = await supabase.rpc('get_doctor_notifications', { p_limit: 50 });
    setUnreadCount((data ?? []).filter((n: any) => !n.is_read).length);
  }, []);

  const loadDoctor = useCallback(async () => {
    try {
      const d = await doctorService.getOwnDoctorProfile();
      setDoctor(d);
      if (d) refreshUnread();
    } catch (error) {
      console.error('Error loading doctor:', error);
    } finally {
      setLoading(false);
    }
  }, [refreshUnread]);

  useEffect(() => {
    loadDoctor();
  }, [loadDoctor]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/medico');
  };

  // Psicólogo tem escopo próprio: nada de dashboard de métricas metabólicas
  // nem da lista de pacientes do médico (que abre peso, macros e exames).
  // Registro legado sem tipo_profissional é médico — mesma convenção do
  // scheduling.ts e da migration 20260802.
  const isPsicologo = doctor?.tipo_profissional === 'psicologo';

  const menuItems = isPsicologo
    ? [
        { icon: Calendar, label: 'Agenda', path: '/medico/agenda' },
        { icon: Users, label: 'Pacientes', path: '/medico/psi/pacientes' },
        { icon: DollarSign, label: 'Financeiro', path: '/medico/financeiro' },
        { icon: Settings, label: 'Configurações', path: '/medico/configuracoes' },
      ]
    : [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/medico/dashboard' },
        { icon: Calendar, label: 'Agenda', path: '/medico/agenda' },
        { icon: Users, label: 'Pacientes', path: '/medico/pacientes' },
        { icon: DollarSign, label: 'Financeiro', path: '/medico/financeiro' },
        { icon: Settings, label: 'Configurações', path: '/medico/configuracoes' },
      ];

  // Gate de rota. O banco já barra o dado (20260802), mas sem isto o
  // psicólogo cairia em telas médicas quebradas ao digitar a URL.
  useEffect(() => {
    if (!doctor) return;
    const p = location.pathname;
    const rotaMedica = p.startsWith('/medico/dashboard')
      || p.startsWith('/medico/pacientes')
      || p.startsWith('/medico/paciente/');
    const rotaPsi = p.startsWith('/medico/psi');

    if (isPsicologo && rotaMedica) navigate('/medico/psi/pacientes', { replace: true });
    if (!isPsicologo && rotaPsi) navigate('/medico/pacientes', { replace: true });
  }, [doctor, isPsicologo, location.pathname, navigate]);

  const isActive = (path: string) => location.pathname === path;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const formatDate = () => {
    return new Date().toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFBF9]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#7d4a3c] mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[#FDFBF9]">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-[#1A1A1A] text-white fixed h-full z-30">
        {/* Logo */}
        <div className="p-6 border-b border-gray-800">
          <MalamaLogo size="md" />
        </div>

        {/* Menu */}
        <nav className="flex-1 p-4">
          {menuItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition ${isActive(item.path)
                ? 'bg-[#7d4a3c] text-white'
                : 'text-gray-300 hover:bg-gray-800'
                }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* User */}
        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-[#7d4a3c] flex items-center justify-center font-semibold">
              {doctor?.name?.charAt(0) || 'D'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">Dr(a). {doctor?.name?.split(' ')[0]}</p>
              <p className="text-xs text-gray-400 truncate">{doctor?.specialty}</p>
            </div>
          </div>
          <button
            onClick={() => setNotifOpen(o => !o)}
            className="relative flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition mb-2"
          >
            <Bell className="w-4 h-4" />
            Notificações
            {unreadCount > 0 && (
              <span className="ml-auto inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold bg-red-500 text-white rounded-full">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </aside>

      {/* Sidebar Mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-64 h-full bg-[#1A1A1A] text-white">
            <div className="flex justify-between items-center p-4 border-b border-gray-800">
              <MalamaLogo size="sm" />
              <button onClick={() => setSidebarOpen(false)}>
                <X className="w-6 h-6" />
              </button>
            </div>

            <nav className="p-4">
              {menuItems.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition ${isActive(item.path)
                    ? 'bg-[#7d4a3c] text-white'
                    : 'text-gray-300 hover:bg-gray-800'
                    }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              ))}
            </nav>

            <div className="absolute bottom-0 w-full p-4 border-t border-gray-800">
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-300 hover:text-white"
              >
                <LogOut className="w-4 h-4" />
                Sair
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 min-w-0 lg:ml-64">
        {/* Header Mobile */}
        <header className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-20">
          <button onClick={() => setSidebarOpen(true)}>
            <Menu className="w-6 h-6 text-gray-600" />
          </button>
          <MalamaLogo size="sm" />
          <button
            onClick={() => setNotifOpen(o => !o)}
            className="relative p-1.5 rounded-lg hover:bg-gray-100 transition"
          >
            <Bell className="w-5 h-5 text-gray-600" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center w-4 h-4 text-[9px] font-bold bg-red-500 text-white rounded-full">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        </header>

        {/* Content */}
        <div className="mx-auto w-full max-w-[1800px] p-4 lg:p-8">
          {/* Greeting */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-800">
              {getGreeting()}, Dr(a). {doctor?.name?.split(' ')[0]} 👋
            </h2>
            <p className="text-gray-600 capitalize">{formatDate()}</p>
          </div>

          <Outlet context={{ doctor, refreshDoctor: loadDoctor }} />
        </div>
      </main>

      {/* Notifications panel */}
      {notifOpen && (
        <DoctorNotificationsPanel
          onClose={() => { setNotifOpen(false); refreshUnread(); }}
        />
      )}
    </div>
  );
};
