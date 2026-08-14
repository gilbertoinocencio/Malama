import React, { createContext, useContext } from 'react';
import { Navigate } from 'react-router-dom';
import type { RhAcesso, RhPermissao } from '../services/empresaService';

type RhAccessValue = {
  acesso: RhAcesso;
  can: (permissao: RhPermissao) => boolean;
};

const RhAccessContext = createContext<RhAccessValue | null>(null);

export const RhAccessProvider: React.FC<{ acesso: RhAcesso; children: React.ReactNode }> = ({ acesso, children }) => {
  const value: RhAccessValue = {
    acesso,
    can: permissao => acesso.principal || acesso.permissoes.includes(permissao),
  };
  return <RhAccessContext.Provider value={value}>{children}</RhAccessContext.Provider>;
};

export const useRhAccess = () => {
  const value = useContext(RhAccessContext);
  if (!value) throw new Error('useRhAccess precisa estar dentro de RhAccessProvider');
  return value;
};

export const RhPermissionGate: React.FC<{ permissao: RhPermissao; children: React.ReactNode }> = ({ permissao, children }) => {
  const { can } = useRhAccess();
  return can(permissao) ? <>{children}</> : <RhHomeRedirect />;
};

export const RhHomeRedirect: React.FC = () => {
  const { acesso, can } = useRhAccess();
  const destino = acesso.principal ? '/rh/dashboard'
    : can('colaboradores') ? '/rh/dashboard'
    : can('saude_mental') ? '/rh/saude-mental'
    : can('apuracao') ? '/rh/relatos'
    : can('absenteismo') ? '/rh/absenteismo'
    : can('plano_acao') ? '/rh/plano-acao'
    : can('importar') ? '/rh/importar'
    : can('financeiro') ? '/rh/financeiro'
    : can('compliance') ? '/rh/compliance'
    : can('empresa') ? '/rh/empresa'
    : '/rh';
  if (destino === '/rh') return <div className="bg-white border rounded-xl p-6 text-sm text-gray-600">Seu acesso está ativo, mas nenhum módulo foi liberado. Fale com o usuário principal.</div>;
  return <Navigate to={destino} replace />;
};
