// =====================================================
// Malama — Admin: Log de Créditos de Consulta
// /admin/creditos
// =====================================================

import React, { useEffect, useState } from 'react';
import {
  ChevronDown, ChevronUp, RefreshCw, Search, FileText
} from 'lucide-react';
import { adminBillingService, creditService } from '../../services/billingService';
import type {
  CreditWithDetails, CreditAdminLog,
  CreditFilters, CreditStatus
} from '../../types/billing';
import toast from 'react-hot-toast';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const statusLabel: Record<CreditStatus, string> = {
  disponivel: 'Disponível',
  agendada: 'Agendada',
  realizada: 'Realizada',
  expirada: 'Expirada',
  perdida_cancelamento: 'Perdida',
  cancelada_reagendada: 'Reagendada',
};

const statusColor: Record<CreditStatus, string> = {
  disponivel: 'bg-green-100 text-green-800',
  agendada: 'bg-blue-100 text-blue-800',
  realizada: 'bg-gray-100 text-gray-700',
  expirada: 'bg-orange-100 text-orange-800',
  perdida_cancelamento: 'bg-red-100 text-red-800',
  cancelada_reagendada: 'bg-purple-100 text-purple-800',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatMonthRef(dateStr: string): string {
  const [year, month] = dateStr.split('-');
  const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  return `${months[parseInt(month, 10) - 1]}/${year}`;
}

// ─── Linha expansível com logs de auditoria ───────────────────────────────────

interface CreditRowProps {
  credit: CreditWithDetails;
}

const CreditRow: React.FC<CreditRowProps> = ({ credit }) => {
  const [expanded, setExpanded] = useState(false);
  const [logs, setLogs] = useState<CreditAdminLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const handleExpand = async () => {
    if (!expanded && logs.length === 0) {
      setLoadingLogs(true);
      try {
        const data = await creditService.getAdminLogs(credit.id);
        setLogs(data);
      } catch {
        toast.error('Erro ao carregar logs');
      } finally {
        setLoadingLogs(false);
      }
    }
    setExpanded(v => !v);
  };

  return (
    <>
      <tr className="hover:bg-gray-50">
        <td className="px-4 py-3 text-xs font-mono text-gray-500">{credit.id.slice(0, 8)}…</td>
        <td className="px-4 py-3">
          <p className="text-sm font-medium text-gray-800">{credit.user_display_name ?? '—'}</p>
          <p className="text-xs text-gray-400">{credit.user_id.slice(0, 8)}…</p>
        </td>
        <td className="px-4 py-3 text-sm hidden md:table-cell">{credit.doctor_name ?? '—'}</td>
        <td className="px-4 py-3 hidden lg:table-cell">
          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
            credit.subscription_plan === 'glp1'
              ? 'bg-purple-100 text-purple-800'
              : 'bg-blue-100 text-blue-800'
          }`}>
            {credit.subscription_plan === 'glp1' ? 'GLP-1' : 'Essencial'}
          </span>
        </td>
        <td className="px-4 py-3">
          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[credit.status]}`}>
            {statusLabel[credit.status]}
          </span>
        </td>
        <td className="px-4 py-3 text-sm hidden md:table-cell">
          {formatMonthRef(credit.month_reference)}
        </td>
        <td className="px-4 py-3 text-sm hidden lg:table-cell">
          {formatDate(credit.expires_at)}
        </td>
        <td className="px-4 py-3 text-center text-sm">
          {credit.late_cancellations_count > 0 ? (
            <span className={`font-semibold ${credit.late_cancellations_count >= 2 ? 'text-red-600' : 'text-orange-500'}`}>
              {credit.late_cancellations_count}
            </span>
          ) : (
            <span className="text-gray-300">0</span>
          )}
        </td>
        <td className="px-4 py-3 text-right">
          <button
            onClick={handleExpand}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
            title="Ver logs de auditoria"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </td>
      </tr>

      {expanded && (
        <tr className="bg-gray-50">
          <td colSpan={9} className="px-6 py-4">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-gray-400" />
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Logs de Auditoria Admin
              </span>
            </div>
            {loadingLogs ? (
              <p className="text-sm text-gray-400">Carregando...</p>
            ) : logs.length === 0 ? (
              <p className="text-sm text-gray-400">Nenhuma ação admin registrada neste crédito.</p>
            ) : (
              <div className="space-y-2">
                {logs.map(log => (
                  <div key={log.id} className="bg-white rounded-lg border border-gray-200 px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-xs font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded mr-2">
                          {log.action}
                        </span>
                        <span className="text-xs text-gray-500">{log.reason ?? '—'}</span>
                      </div>
                      <span className="text-xs text-gray-400 whitespace-nowrap">
                        {formatDate(log.created_at)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Admin ID: {log.admin_id.slice(0, 8)}…</p>
                  </div>
                ))}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
};

// ─── Componente principal ─────────────────────────────────────────────────────

export const AdminCreditsLog: React.FC = () => {
  const [credits, setCredits] = useState<CreditWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<CreditFilters>({
    status: 'all',
    user_search: '',
  });
  const [selectedMonth, setSelectedMonth] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await adminBillingService.listCredits({
        ...filters,
        month: selectedMonth || undefined,
      });
      setCredits(data);
    } catch (err) {
      console.error('Error loading credits:', err);
      toast.error('Erro ao carregar créditos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [filters.status, selectedMonth]);

  const filtered = credits.filter(c => {
    if (!filters.user_search) return true;
    const q = filters.user_search.toLowerCase();
    return (
      (c.user_display_name?.toLowerCase().includes(q)) ||
      (c.user_id.includes(q)) ||
      (c.doctor_name?.toLowerCase().includes(q))
    );
  });

  // Gerar opções de meses (últimos 6)
  const monthOptions = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return { value: val, label: formatMonthRef(`${val}-01`) };
  });

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl shadow">
        {/* Header + filtros */}
        <div className="p-5 border-b border-gray-100 flex flex-wrap items-center gap-3">
          <h3 className="text-base font-semibold text-gray-800 flex-1">Log de Créditos de Consulta</h3>

          {/* Busca por usuário/médico */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-300" />
            <input
              type="text"
              placeholder="Usuário ou médico..."
              className="pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#9c5d4b] w-44"
              value={filters.user_search}
              onChange={e => setFilters(f => ({ ...f, user_search: e.target.value }))}
            />
          </div>

          {/* Filtro status */}
          <div className="relative">
            <select
              className="appearance-none pl-3 pr-8 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#9c5d4b]"
              value={filters.status}
              onChange={e => setFilters(f => ({ ...f, status: e.target.value as any }))}
            >
              <option value="all">Todos os status</option>
              {Object.entries(statusLabel).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          {/* Filtro mês */}
          <div className="relative">
            <select
              className="appearance-none pl-3 pr-8 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#9c5d4b]"
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
            >
              <option value="">Todos os meses</option>
              {monthOptions.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          <button
            onClick={loadData}
            className="p-2 text-gray-400 hover:text-gray-600 border border-gray-200 rounded-lg"
            title="Atualizar"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Tabela */}
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#9c5d4b]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-500">Nenhum crédito encontrado</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuário</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Médico</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Plano</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Mês Ref.</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Expira em</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Cancel. Tard.</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Logs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(credit => (
                  <CreditRow key={credit.id} credit={credit} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="px-5 py-3 border-t border-gray-100 text-xs text-gray-400">
          Mostrando {filtered.length} de {credits.length} registros
        </div>
      </div>
    </div>
  );
};
