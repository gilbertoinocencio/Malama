// =====================================================
// NURA — Layout do Médico com Sidebar
// =====================================================

import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { doctorService } from '../../services/doctorPortalService';
import type { Doctor } from '../../types/doctorPortal';
import { NuraLogo } from '../../components/NuraLogo';
import {
  LayoutDashboard,
  Calendar,
  Users,
  Settings,
  LogOut,
  Menu,
  X
} from 'lucide-react';

export const DoctorLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDoctor = async () => {
      try {
        const d = await doctorService.getOwnDoctorProfile();
        setDoctor(d);
      } catch (error) {
        console.error('Error loading doctor:', error);
      } finally {
        setLoading(false);
      }
    };
    loadDoctor();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/medico');
  };

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/medico/dashboard' },
    { icon: Calendar, label: 'Agenda', path: '/medico/agenda' },
    { icon: Users, label: 'Pacientes', path: '/medico/pacientes' },
    { icon: Settings, label: 'Configurações', path: '/medico/configuracoes' }
  ];

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
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2ECC71] mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[#F8F9FA]">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-[#1A1A1A] text-white fixed h-full z-30">
        {/* Logo */}
        <div className="p-6 border-b border-gray-800">
          <NuraLogo size="md" />
        </div>

        {/* Menu */}
        <nav className="flex-1 p-4">
          {menuItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition ${isActive(item.path)
                ? 'bg-[#2ECC71] text-white'
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
            <div className="w-10 h-10 rounded-full bg-[#2ECC71] flex items-center justify-center font-semibold">
              {doctor?.name?.charAt(0) || 'D'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">Dr(a). {doctor?.name?.split(' ')[0]}</p>
              <p className="text-xs text-gray-400 truncate">{doctor?.specialty}</p>
            </div>
          </div>
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
              <NuraLogo size="sm" />
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
                    ? 'bg-[#2ECC71] text-white'
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
      <main className="flex-1 lg:ml-64">
        {/* Header Mobile */}
        <header className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-20">
          <button onClick={() => setSidebarOpen(true)}>
            <Menu className="w-6 h-6 text-gray-600" />
          </button>
          <NuraLogo size="sm" />
          <div className="w-8 h-8 rounded-full bg-[#2ECC71] flex items-center justify-center text-white font-semibold text-sm">
            {doctor?.name?.charAt(0) || 'D'}
          </div>
        </header>

        {/* Content */}
        <div className="p-4 lg:p-8">
          {/* Greeting */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-800">
              {getGreeting()}, Dr(a). {doctor?.name?.split(' ')[0]} 👋
            </h2>
            <p className="text-gray-600 capitalize">{formatDate()}</p>
          </div>

          <Outlet context={{ doctor }} />
        </div>
      </main>
    </div>
  );
};
