// =====================================================
// Malama — Financeiro do Médico (modelo de créditos)
// =====================================================

import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Clock,
  CheckCircle,
  Calendar,
  ChevronDown,
  CreditCard,
  Wallet,
  Stethoscope,
  Award,
  BarChart3,
} from 'lucide-react';
import { payoutService } from '../../services/doctorPortalService';
import type { DoctorEarnings } from '../../services/doctorPortalService';
import type { Doctor, Payout, PayoutStatus } from '../../types/doctorPortal';
import toast from 'react-hot-toast';

// Filtros de período (aplicados sobre a data de realização da consulta)
const PERIOD_OPTIONS = [
  { value: '7d', label: 'Últimos 7 dias' },
  { value: '30d', label: 'Últimos 30 dias' },
  { value: '90d', label: 'Últimos 3 meses' },
  { value: '12m', label: 'Últimos 12 meses' },
  { value: 'all', label: 'Todo período' },
];

const NIVEL_CONFIG: Record<string, { label: string; color: string }> = {
  nivel_1: { label: 'Nível 1', color: 'bg-gray-100 text-gray-600' },
  nivel_2: { label: 'Nível 2', color: 'bg-blue-100 text-blue-700' },
  nivel_3: { label: 'Nível 3', color: 'bg-yellow-100 text-yellow-700' },
};

export const DoctorFinancial: React.FC = () => {
  const { doctor } = useOutletContext<{ doctor: Doctor }>();
  const [loading, setLoading] = useState(true);
  const [earnings, setEarnings] = useState<DoctorEarnings | null>(null);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [period, setPeriod] = useState('30d');
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);
  const [payoutFilter, setPayoutFilter] = useState<'all' | PayoutStatus>('all');

  useEffect(() => {
    if (!doctor) return;
    loadData();
  }, [doctor]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [earningsData, payoutsData] = await Promise.all([
        payoutService.getDoctorEarnings(doctor.id),
        payoutService.getDoctorPayouts(doctor.id),
      ]);
      setEarnings(earningsData);
      setPayouts(payoutsData || []);
    } catch (error) {
      console.error('Error loading financial data:', error);
      toast.error('Erro ao carregar dados financeiros');
    } finally {
      setLoading(false);
    }
  };

  // ── Helpers ──────────────────────────────────────────────────────────────
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

  const getPayoutStatusBadge = (status: PayoutStatus) => {
    const config: Record<string, { label: string; color: string }> = {
      pending:   { label: 'Pendente', color: 'bg-yellow-100 text-yellow-700' },
      processing:{ label: 'Processando', color: 'bg-blue-100 text-blue-700' },
      paid:      { label: 'Pago', color: 'bg-green-100 text-green-700' },
      failed:    { label: 'Falhou', color: 'bg-red-100 text-red-700' },
      cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-700' },
    };
    const { label, color } = config[status] ?? { label: status, color: 'bg-gray-100 text-gray-600' };
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${color}`}>{label}</span>;
  };

  // ── Derivados ────────────────────────────────────────────────────────────
  const periodCutoff = (() => {
    const now = Date.now();
    switch (period) {
      case '7d':  return now - 7 * 864e5;
      case '30d': return now - 30 * 864e5;
      case '90d': return now - 90 * 864e5;
      case '12m': return now - 365 * 864e5;
      default:    return 0;
    }
  })();

  const realizedInPeriod = (earnings?.realizedCredits ?? []).filter(c =>
    c.realized_at ? new Date(c.realized_at).getTime() >= periodCutoff : true
  );

  const totalPayoutsReceived = payouts
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0);

  const filteredPayouts = payouts.filter(p => payoutFilter === 'all' || p.status === payoutFilter);

  const nivel = earnings?.nivel ?? 'nivel_2';
  const valuePerConsultation = earnings?.valuePerConsultation ?? 0;
  // O que efetivamente cai na conta: o repasse sai com a taxa de
  // transação do gateway já descontada.
  const feePercent = earnings?.transactionFeePercent ?? 0;
  const netPerConsultation = earnings?.netPerConsultation ?? valuePerConsultation;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7d4a3c]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Financeiro</h2>
          <p className="text-sm text-gray-500 mt-1">
            Você recebe um valor fixo por consulta realizada, conforme seu nível.
          </p>
        </div>

        {/* Filtro de Período */}
        <div className="relative">
          <button
            onClick={() => setShowPeriodDropdown(!showPeriodDropdown)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
          >
            <Calendar className="w-4 h-4" />
            {PERIOD_OPTIONS.find(p => p.value === period)?.label}
            <ChevronDown className="w-4 h-4" />
          </button>

          {showPeriodDropdown && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
              {PERIOD_OPTIONS.map(option => (
                <button
                  key={option.value}
                  onClick={() => { setPeriod(option.value); setShowPeriodDropdown(false); }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition ${period === option.value ? 'bg-[#7d4a3c]/10 text-[#7d4a3c] font-medium' : 'text-gray-700'}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Consultas realizadas */}
        <div className="bg-white rounded-xl shadow p-5 border-l-4 border-[#7d4a3c]">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-[#7d4a3c]/10 rounded-lg">
              <Stethoscope className="w-5 h-5 text-[#7d4a3c]" />
            </div>
            <span className="text-xs text-gray-500">Realizadas</span>
          </div>
          <div className="text-2xl font-bold text-gray-800">{earnings?.realizedCount ?? 0}</div>
          <div className="text-xs text-gray-500 mt-1">consultas concluídas</div>
        </div>

        {/* Valor por consulta (nível) */}
        <div className="bg-white rounded-xl shadow p-5 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-yellow-50 rounded-lg">
              <Award className="w-5 h-5 text-yellow-500" />
            </div>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${NIVEL_CONFIG[nivel]?.color}`}>
              {NIVEL_CONFIG[nivel]?.label}
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-800">{formatCurrency(netPerConsultation)}</div>
          <div className="text-xs text-gray-500 mt-1">
            líquido por consulta
            {feePercent > 0 && (
              <> · {formatCurrency(valuePerConsultation)} − {feePercent}% de taxa</>
            )}
          </div>
        </div>

        {/* A receber */}
        <div className="bg-white rounded-xl shadow p-5 border-l-4 border-orange-500">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-orange-50 rounded-lg">
              <Clock className="w-5 h-5 text-orange-500" />
            </div>
            <span className="text-xs text-gray-500">A receber</span>
          </div>
          <div className="text-2xl font-bold text-gray-800">{formatCurrency(earnings?.pendingReceivable ?? 0)}</div>
          <div className="text-xs text-gray-500 mt-1">
            {earnings?.unpaidCount ?? 0} aguardando repasse
            {feePercent > 0 && (earnings?.pendingFee ?? 0) > 0 && (
              <> · líquido de {formatCurrency(earnings!.pendingFee)} de taxa</>
            )}
          </div>
        </div>

        {/* Recebido total */}
        <div className="bg-white rounded-xl shadow p-5 border-l-4 border-green-500">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <Wallet className="w-5 h-5 text-green-500" />
            </div>
            <span className="text-xs text-gray-500">Recebido</span>
          </div>
          <div className="text-2xl font-bold text-gray-800">{formatCurrency(totalPayoutsReceived)}</div>
          <div className="text-xs text-gray-500 mt-1">total em repasses pagos</div>
        </div>
      </div>

      {/* Seção: Repasses (Payouts) */}
      <div className="bg-white rounded-xl shadow">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#7d4a3c]/10 rounded-lg">
                <CreditCard className="w-5 h-5 text-[#7d4a3c]" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Repasses (Payouts)</h3>
                <p className="text-sm text-gray-500">Transferências PIX para sua conta</p>
              </div>
            </div>

            <select
              value={payoutFilter}
              onChange={e => setPayoutFilter(e.target.value as 'all' | PayoutStatus)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg"
            >
              <option value="all">Todos os status</option>
              <option value="pending">Pendentes</option>
              <option value="paid">Pagos</option>
              <option value="failed">Falhos</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Período</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Consultas</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Chave PIX</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Data pagamento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredPayouts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                    <CreditCard className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm font-medium">Nenhum repasse encontrado</p>
                    <p className="text-xs text-gray-400 mt-1">Os repasses aparecem aqui após o processamento (dias 15 e 30)</p>
                  </td>
                </tr>
              ) : (
                filteredPayouts.map(payout => (
                  <tr key={payout.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {formatDate(payout.period_start)} - {formatDate(payout.period_end)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 hidden sm:table-cell">
                      {payout.consultations_count}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-800">
                      {formatCurrency(payout.amount)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 font-mono hidden md:table-cell">
                      {payout.pix_key || '-'}
                    </td>
                    <td className="px-4 py-3">{getPayoutStatusBadge(payout.status)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell">
                      {payout.paid_at ? formatDate(payout.paid_at) : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Seção: Consultas realizadas */}
      <div className="bg-white rounded-xl shadow">
        <div className="p-6 border-b border-gray-100 flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            <BarChart3 className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Consultas realizadas</h3>
            <p className="text-sm text-gray-500">
              Cada consulta realizada gera {formatCurrency(valuePerConsultation)}
              {feePercent > 0 && <> — {formatCurrency(netPerConsultation)} após a taxa de transação</>}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data de realização</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Valor</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Repasse</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {realizedInPeriod.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-12 text-center text-gray-500">
                    <Stethoscope className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm font-medium">Nenhuma consulta realizada no período</p>
                  </td>
                </tr>
              ) : (
                realizedInPeriod.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {c.realized_at ? formatDate(c.realized_at) : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-semibold text-[#7d4a3c]">
                      {formatCurrency(valuePerConsultation)}
                    </td>
                    <td className="px-4 py-3">
                      {c.paid ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          <CheckCircle className="w-3 h-3" /> Pago
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                          <Clock className="w-3 h-3" /> A receber
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Nota informativa */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
            <Award className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-blue-800">Como funcionam os repasses</h4>
            <p className="text-sm text-blue-700 mt-1">
              Cada consulta realizada vale {formatCurrency(valuePerConsultation)} ({NIVEL_CONFIG[nivel]?.label}).
              {feePercent > 0 && <> Sobre o total do repasse incide a taxa de transação de {feePercent}% cobrada pelo banco, então você recebe {formatCurrency(netPerConsultation)} líquidos por consulta.</>}
              {' '}Os repasses são processados via PIX duas vezes por mês:
              consultas realizadas nos dias 1–14 são pagas no dia 30; as dos dias 15–fim, no dia 15 do mês seguinte.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
