// =====================================================
// Malama — Financeiro (Admin)
// =====================================================

import React, { useEffect, useState } from 'react';
import { CheckCircle, Download, RefreshCw, AlertTriangle, Loader } from 'lucide-react';
import { payoutService } from '../../services/doctorPortalService';
import { adminBillingService } from '../../services/billingService';
import type { PendingPayout, FinancialSummary } from '../../types/doctorPortal';
import toast from 'react-hot-toast';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });

// ─── Badge de status de payout ────────────────────────────────────────────────

const statusConfig: Record<string, { label: string; className: string }> = {
  pending:    { label: 'Pendente',    className: 'bg-gray-100 text-gray-600'    },
  processing: { label: 'Processando', className: 'bg-yellow-100 text-yellow-700' },
  paid:       { label: 'Pago',        className: 'bg-green-100 text-green-700'   },
  failed:     { label: 'Falha',       className: 'bg-red-100 text-red-700'       },
  cancelled:  { label: 'Cancelado',   className: 'bg-gray-100 text-gray-500'     },
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const cfg = statusConfig[status] ?? statusConfig.pending;
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${cfg.className}`}>
      {cfg.label}
    </span>
  );
};

// ─── Componente principal ─────────────────────────────────────────────────────

export const AdminFinancial: React.FC = () => {
  const [financial, setFinancial] = useState<FinancialSummary | null>(null);
  const [pendingPayouts, setPendingPayouts] = useState<PendingPayout[]>([]);
  const [reprocessingId, setReprocessingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [financialData, payouts] = await Promise.all([
        payoutService.getFinancialSummary(),
        payoutService.getPendingPayouts()
      ]);
      setFinancial(financialData);
      setPendingPayouts(payouts);
    } catch (error) {
      console.error('Error loading financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleMarkAsPaid = async (payoutId: string) => {
    try {
      await payoutService.markAsPaid(payoutId);
      toast.success('Repassado marcado como pago');
      const payouts = await payoutService.getPendingPayouts();
      setPendingPayouts(payouts);
    } catch {
      toast.error('Erro ao marcar como pago');
    }
  };

  const handleReprocess = async (payoutId: string) => {
    setReprocessingId(payoutId);
    try {
      await adminBillingService.reprocessPayout(payoutId);
      toast.success('Reprocessamento iniciado');
      await loadData();
    } catch (err) {
      toast.error('Erro ao reprocessar repasse');
      console.error(err);
    } finally {
      setReprocessingId(null);
    }
  };

  const exportToCSV = () => {
    const headers = ['Médico', 'Período', 'Consultas', 'Valor Bruto', 'Taxa', 'Líquido', 'PIX', 'Status', 'Transfer Asaas'];
    const rows = pendingPayouts.map(p => [
      p.doctor_name,
      `${formatDate(p.period_start)} - ${formatDate(p.period_end)}`,
      p.consultations_count,
      p.gross_amount,
      `${p.fee_percent}%`,
      p.net_amount,
      p.pix_key ?? '',
      p.status,
      p.asaas_transfer_id ?? '',
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'repasses.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exportado!');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#9c5d4b]" />
      </div>
    );
  }

  const failedPayouts    = pendingPayouts.filter(p => p.status === 'failed');
  const processingPayouts = pendingPayouts.filter(p => p.status === 'processing');
  const otherPayouts     = pendingPayouts.filter(p => !['failed','processing'].includes(p.status));

  return (
    <div className="space-y-6">
      {/* Cards financeiros */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow p-6">
          <p className="text-sm text-gray-600">Receita bruta total</p>
          <p className="text-2xl font-bold text-gray-800 mt-2">{formatCurrency(financial?.grossRevenue || 0)}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-6">
          <p className="text-sm text-gray-600">Taxa retida (plataforma)</p>
          <p className="text-2xl font-bold text-gray-800 mt-2">{formatCurrency(financial?.platformFee || 0)}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-6">
          <p className="text-sm text-gray-600">Total repassado</p>
          <p className="text-2xl font-bold text-gray-800 mt-2">{formatCurrency(financial?.totalPaid || 0)}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-6">
          <p className="text-sm text-gray-600">Pendente de repasse</p>
          <p className="text-2xl font-bold text-yellow-600 mt-2">{formatCurrency(financial?.pendingPayouts || 0)}</p>
        </div>
      </div>

      {/* Alertas de falhas */}
      {failedPayouts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">
            <strong>{failedPayouts.length} repasse(s) com falha.</strong> Clique em "Reprocessar" para tentar novamente.
          </p>
        </div>
      )}

      {/* Tabela de todos os repasses */}
      <div className="bg-white rounded-xl shadow">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800">Repasses</h3>
          <div className="flex gap-2">
            <button
              onClick={loadData}
              className="flex items-center gap-2 px-3 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2 bg-[#9c5d4b] hover:bg-[#7a4839] text-white rounded-lg text-sm font-medium"
            >
              <Download className="w-4 h-4" />
              Exportar CSV
            </button>
          </div>
        </div>

        {pendingPayouts.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-600">Nenhum repasse encontrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Médico</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Período</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Consultas</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Valor bruto</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Taxa</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Líquido</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">PIX</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden xl:table-cell">Transfer ID</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pendingPayouts.map(payout => (
                  <tr key={payout.id} className={payout.status === 'failed' ? 'bg-red-50' : ''}>
                    <td className="px-4 py-3 font-medium text-gray-800">{payout.doctor_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell">
                      {formatDate(payout.period_start)} - {formatDate(payout.period_end)}
                    </td>
                    <td className="px-4 py-3 text-sm">{payout.consultations_count}</td>
                    <td className="px-4 py-3 text-sm hidden lg:table-cell">{formatCurrency(payout.gross_amount)}</td>
                    <td className="px-4 py-3 text-sm hidden lg:table-cell">{payout.fee_percent}%</td>
                    <td className="px-4 py-3 font-medium text-[#9c5d4b]">{formatCurrency(payout.net_amount)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell truncate max-w-[150px]">
                      {payout.pix_key || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={payout.status} />
                      {payout.status === 'failed' && payout.processing_error && (
                        <p className="text-xs text-red-600 mt-1 max-w-[160px] truncate" title={payout.processing_error}>
                          {payout.processing_error}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-400 hidden xl:table-cell">
                      {payout.asaas_transfer_id ? (
                        <span title={payout.asaas_transfer_id}>{payout.asaas_transfer_id.slice(0, 12)}…</span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Reprocessar repasses com falha */}
                        {payout.status === 'failed' && (
                          <button
                            onClick={() => handleReprocess(payout.id)}
                            disabled={reprocessingId === payout.id}
                            className="px-3 py-1 bg-orange-500 hover:bg-orange-600 text-white rounded text-xs font-medium flex items-center gap-1 disabled:opacity-50"
                          >
                            {reprocessingId === payout.id ? (
                              <Loader className="w-3 h-3 animate-spin" />
                            ) : (
                              <RefreshCw className="w-3 h-3" />
                            )}
                            Reprocessar
                          </button>
                        )}
                        {/* Marcar como pago manualmente (repasses pendentes) */}
                        {payout.status === 'pending' && (
                          <button
                            onClick={() => handleMarkAsPaid(payout.id)}
                            className="px-3 py-1 bg-[#9c5d4b] hover:bg-[#7a4839] text-white rounded text-xs font-medium flex items-center gap-1 ml-auto"
                          >
                            <CheckCircle className="w-3 h-3" />
                            Pagar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
