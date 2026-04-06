// =====================================================
// NURA — Financeiro (Admin)
// =====================================================

import React, { useEffect, useState } from 'react';
import { CheckCircle, Download } from 'lucide-react';
import { payoutService } from '../../services/doctorPortalService';
import type { PendingPayout, FinancialSummary } from '../../types/doctorPortal';
import toast from 'react-hot-toast';

export const AdminFinancial: React.FC = () => {
  const [financial, setFinancial] = useState<FinancialSummary | null>(null);
  const [pendingPayouts, setPendingPayouts] = useState<PendingPayout[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

    loadData();
  }, []);

  const handleMarkAsPaid = async (payoutId: string) => {
    try {
      await payoutService.markAsPaid(payoutId);
      toast.success('Repassado marcado como pago');
      
      const payouts = await payoutService.getPendingPayouts();
      setPendingPayouts(payouts);
    } catch (error) {
      toast.error('Erro ao marcar como pago');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      month: 'short',
      year: '2-digit'
    });
  };

  const exportToCSV = () => {
    const headers = ['Médico', 'Período', 'Consultas', 'Valor Bruto', 'Taxa', 'Líquido', 'PIX'];
    const rows = pendingPayouts.map(p => [
      p.doctor_name,
      `${formatDate(p.period_start)} - ${formatDate(p.period_end)}`,
      p.consultations_count,
      p.gross_amount,
      `${p.fee_percent}%`,
      p.net_amount,
      p.pix_key
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'repasses_pendentes.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exportado!');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2ECC71]"></div>
      </div>
    );
  }

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

      {/* Repasses pendentes */}
      <div className="bg-white rounded-xl shadow">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800">Repasses Pendentes</h3>
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-[#2ECC71] hover:bg-[#27ae60] text-white rounded-lg text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            Exportar CSV
          </button>
        </div>

        {pendingPayouts.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-600">Nenhum repasse pendente</p>
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
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pendingPayouts.map(payout => (
                  <tr key={payout.id}>
                    <td className="px-4 py-3 font-medium text-gray-800">{payout.doctor_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell">
                      {formatDate(payout.period_start)} - {formatDate(payout.period_end)}
                    </td>
                    <td className="px-4 py-3 text-sm">{payout.consultations_count}</td>
                    <td className="px-4 py-3 text-sm hidden lg:table-cell">{formatCurrency(payout.gross_amount)}</td>
                    <td className="px-4 py-3 text-sm hidden lg:table-cell">{payout.fee_percent}%</td>
                    <td className="px-4 py-3 font-medium text-[#2ECC71]">{formatCurrency(payout.net_amount)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell truncate max-w-[150px]">
                      {payout.pix_key || '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleMarkAsPaid(payout.id)}
                        className="px-3 py-1 bg-[#2ECC71] hover:bg-[#27ae60] text-white rounded text-xs font-medium flex items-center gap-1 ml-auto"
                      >
                        <CheckCircle className="w-3 h-3" />
                        Pagar
                      </button>
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
