import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { rhService, type RhResumoRelatos } from '../../services/empresaService';
import { useRhAccess } from '../../contexts/RhAccessContext';

/**
 * Selo do cabeçalho para o canal confidencial. Vivia como card cheio dentro
 * da aba Saúde Mental — mas quem tem só 'apuracao' (sem 'saude_mental') nunca
 * chega naquela aba, e por isso nunca via o alerta. No cabeçalho, comum a
 * todas as rotas do portal, o alerta alcança quem realmente precisa vê-lo.
 * Só existe quando há relato: sem isso, é mais um item competindo por
 * atenção numa barra que já tem empresa, suporte e equipe.
 */
export const RelatosSentinelaAlerta: React.FC = () => {
  const { can } = useRhAccess();
  const [resumo, setResumo] = useState<RhResumoRelatos | null>(null);

  useEffect(() => {
    rhService.getResumoRelatos().then(setResumo).catch(() => setResumo(null));
  }, []);

  if (!resumo || resumo.total === 0) return null;

  const urgente = resumo.urgentes_abertos > 0;
  const texto = resumo.novos > 0
    ? `${resumo.novos} relato(s) aguardando triagem`
    : 'Relatos em tratamento';
  const detalhe = urgente ? ` · ${resumo.urgentes_abertos} com atenção alta ou imediata` : '';

  const classes = `flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition ${
    urgente ? 'bg-red-50 text-red-700 hover:bg-red-100' : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
  }`;
  const titulo = `Canal confidencial acionado: ${texto}${detalhe}. Detalhes ficam restritos à equipe de apuração.`;

  const conteudo = (
    <>
      {urgente ? <AlertTriangle className="h-4 w-4 flex-shrink-0" /> : <ShieldCheck className="h-4 w-4 flex-shrink-0" />}
      <span className="hidden lg:inline">{texto}</span>
      <span className="lg:hidden">{resumo.total}</span>
    </>
  );

  // Sem o módulo de apuração a pessoa não tem para onde ir — vira aviso
  // estático em vez de link morto.
  if (!can('apuracao')) {
    return <span className={classes} title={titulo}>{conteudo}</span>;
  }

  return (
    <Link to="/rh/relatos" className={classes} title={`${titulo} Abrir fila de apuração.`}>
      {conteudo}
    </Link>
  );
};
