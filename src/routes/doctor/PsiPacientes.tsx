// =====================================================
// Malama — Portal do psicólogo · Lista de pacientes
//
// Sem peso, sem macros, sem composição corporal. Os dados vêm da RPC
// psi_meus_pacientes — o psicólogo não lê tabela de paciente direto.
// =====================================================

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, ClipboardList, AlertCircle, ChevronRight, CalendarClock } from 'lucide-react';
import { psychologyService, type PsiPaciente } from '../../services/psychologyService';

const fmtDateTime = (d: string | null) =>
  d ? new Date(d).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  }) : '—';

/** Faixa do WHO-5 conforme o manual do instrumento (0–100). */
const who5Cor = (s: number | null) =>
  s == null ? 'text-gray-300'
  : s <= 28 ? 'text-red-500'
  : s < 50 ? 'text-amber-600'
  : 'text-green-600';

export const PsiPacientes: React.FC = () => {
  const [pacientes, setPacientes] = useState<PsiPaciente[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    psychologyService.getPacientes()
      .then(setPacientes)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7d4a3c]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-800">Pacientes</h1>
        <p className="text-sm text-gray-500">
          Pessoas que você atende. O histórico de sessões que você escreveu fica no perfil de cada uma.
        </p>
      </div>

      {pacientes.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-12 text-center">
          <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Nenhum paciente ainda.</p>
          <p className="text-gray-400 text-sm mt-1">
            Assim que houver uma consulta agendada, a pessoa aparece aqui.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="divide-y divide-gray-100">
            {pacientes.map(p => (
              <Link
                key={p.patient_id}
                to={`/medico/psi/paciente/${p.patient_id}`}
                className="flex items-center gap-4 p-4 hover:bg-gray-50 transition"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-800">{p.nome ?? 'Paciente'}</span>
                    {!p.tem_anamnese && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700">
                        <AlertCircle className="w-3 h-3" /> Sem anamnese
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {p.sessoes} {p.sessoes === 1 ? 'sessão' : 'sessões'}
                    {p.ultima_sessao && ` · última em ${fmtDateTime(p.ultima_sessao)}`}
                  </p>
                  {p.proxima_sessao && (
                    <p className="text-xs text-[#7d4a3c] mt-0.5 flex items-center gap-1">
                      <CalendarClock className="w-3 h-3" />
                      Próxima em {fmtDateTime(p.proxima_sessao)}
                    </p>
                  )}
                </div>

                <div className="text-center flex-shrink-0">
                  <p className={`text-xl font-bold tabular-nums ${who5Cor(p.who5_ultimo)}`}>
                    {p.who5_ultimo ?? '—'}
                  </p>
                  <p className="text-[10px] text-gray-400">WHO-5</p>
                </div>

                <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-start gap-2 text-xs text-gray-400 px-1">
        <ClipboardList className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
        <span>
          O índice WHO-5 vai de 0 a 100; abaixo de 50 indica bem-estar reduzido e 28 ou menos
          sugere avaliação aprofundada. É rastreio, não diagnóstico.
        </span>
      </div>
    </div>
  );
};
