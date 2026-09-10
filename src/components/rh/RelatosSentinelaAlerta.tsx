import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { rhService, type RhResumoRelatos } from '../../services/empresaService';
import { useRhAccess } from '../../contexts/RhAccessContext';

export const RelatosSentinelaCard: React.FC = () => {
  const { can } = useRhAccess();
  const [resumo, setResumo] = useState<RhResumoRelatos | null>(null);

  useEffect(() => {
    rhService.getResumoRelatos().then(setResumo).catch(() => setResumo(null));
  }, []);

  if (!resumo || resumo.total === 0) return null;

  return (
    <div className={`rounded-xl border p-5 ${resumo.urgentes_abertos > 0 ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}`}>
      <div className="flex items-start gap-3">
        {resumo.urgentes_abertos > 0 ? <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" /> : <ShieldCheck className="w-6 h-6 text-amber-700 flex-shrink-0" />}
        <div className="flex-1">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="font-semibold text-gray-900">Evento sentinela: canal confidencial acionado</h2>
              <p className="text-sm text-gray-700 mt-1">
                {resumo.novos > 0 ? `${resumo.novos} relato(s) aguardando triagem.` : 'Há relatos em tratamento.'}
                {resumo.urgentes_abertos > 0 ? ` ${resumo.urgentes_abertos} marcado(s) com atenção alta ou imediata.` : ''}
              </p>
            </div>
            {can('apuracao') && <Link to="/rh/relatos" className="px-4 py-2 rounded-lg bg-white border text-sm font-semibold text-[#7d4a3c]">Abrir fila de apuração</Link>}
          </div>
          <p className="text-xs text-gray-500 mt-3">Este alerta aparece desde o primeiro relato e não usa o corte estatístico de cinco pessoas. Detalhes ficam restritos à equipe de apuração.</p>
        </div>
      </div>
    </div>
  );
};

