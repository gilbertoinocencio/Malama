// =====================================================
// Malama — Guards de Rotas para Portal do Médico e Admin
// =====================================================

import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { doctorService } from '../services/doctorPortalService';
import type { Doctor } from '../types/doctorPortal';

// =====================================================
// DoctorRoute — Protege rotas do médico
// =====================================================

interface DoctorRouteProps {
  children: React.ReactNode;
}

export const DoctorRoute: React.FC<DoctorRouteProps> = ({ children }) => {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [doctorStatus, setDoctorStatus] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          setAuthorized(false);
          setLoading(false);
          return;
        }

        const doctor = await doctorService.getOwnDoctorProfile();

        if (!doctor) {
          setAuthorized(false);
          setLoading(false);
          return;
        }

        setDoctorStatus(doctor.status);

        if (doctor.status === 'approved') {
          setAuthorized(true);
        } else {
          setAuthorized(false);
        }
      } catch (error) {
        console.error('Error checking doctor auth:', error);
        setAuthorized(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

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

  if (!authorized) {
    if (doctorStatus === 'pending') {
      return <Navigate to="/medico/em-analise" state={{ from: location }} replace />;
    }
    if (doctorStatus === 'suspended') {
      return <Navigate to="/medico/conta-suspensa" state={{ from: location }} replace />;
    }
    return <Navigate to="/medico" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

// =====================================================
// AdminRoute — Protege rotas do super admin
// =====================================================

interface AdminRouteProps {
  children: React.ReactNode;
}

export const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          setAuthorized(false);
          setLoading(false);
          return;
        }

        // Verificar role nos metadados do usuário
        const { data: { user } } = await supabase.auth.getUser();
        const isAdmin = user?.user_metadata?.role === 'super_admin';

        setAuthorized(isAdmin);
      } catch (error) {
        console.error('Error checking admin auth:', error);
        setAuthorized(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

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

  if (!authorized) {
    return <Navigate to="/admin" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

// =====================================================
// RhRoute — Protege rotas do portal do RH (empresas B2B)
// =====================================================

interface RhRouteProps {
  children: React.ReactNode;
}

export const RhRoute: React.FC<RhRouteProps> = ({ children }) => {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setAuthorized(false);
          setLoading(false);
          return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        setAuthorized(user?.user_metadata?.role === 'rh');
      } catch (error) {
        console.error('Error checking RH auth:', error);
        setAuthorized(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#7d4a3c] mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!authorized) {
    return <Navigate to="/rh" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

// =====================================================
// PublicDoctorRoute — Para rotas públicas do médico (login, cadastro)
// Redireciona para dashboard se já estiver logado como médico aprovado
// =====================================================

interface PublicDoctorRouteProps {
  children: React.ReactNode;
}

export const PublicDoctorRoute: React.FC<PublicDoctorRouteProps> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [shouldRedirect, setShouldRedirect] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
          const doctor = await doctorService.getOwnDoctorProfile();
          if (doctor && doctor.status === 'approved') {
            setShouldRedirect(true);
          }
        }
      } catch (error) {
        console.error('Error checking auth:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

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

  if (shouldRedirect) {
    return <Navigate to="/medico/dashboard" replace />;
  }

  return <>{children}</>;
};
