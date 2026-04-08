// =====================================================
// NURA — Financeiro do Médico
// =====================================================

import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Filter,
  Download,
  Eye,
  ChevronDown,
  CreditCard,
  Wallet,
  BarChart3,
  PieChart
} from 'lucide-react';
import { consultationService, payoutService } from '../../services/doctorPortalService';
import type { Doctor, Consultation, Payout, PaymentStatus, PayoutStatus } from '../../types/doctorPortal';
import toast from 'react-hot-toast';

// Filtros de período
const PERIOD_OPTIONS = [
  { value: '7d', label: 'Últimos 7 dias' },
  { value: '30d', label: 'Últimos 30 dias' },
  { value: '90d', label: 'Últimos 3 meses' },
  { value: '12m', label: 'Últimos 12 meses' },
  { value: 'all', label: 'Todo período' }
];

export const DoctorFinancial: React.FC = () => {
  const { doctor } = useOutletContext<{ doctor: Doctor }>();
  const [loading, setLoading] = useState(true);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [period, setPeriod] = useState('30d');
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | PaymentStatus>('all');
  const [payoutFilter, setPayoutFilter] = useState<'all' | PayoutStatus>('all');

  useEffect(() => {
    if (!doctor) return;
    loadData();
  }, [doctor, period]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Calcular datas baseado no período
      const now = new Date();
      let fromDate: string;

      switch (period) {
        case '7d':
          fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          break;
        case '30d':
          fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          break;
        case '90d':
          fromDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          break;
        case '12m':
          fromDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          break;
        default:
          fromDate = '2020-01-01';
      }

      const [consultsData, payoutsData] = await Promise.all([
        consultationService.getDoctorConsultations(doctor.id, {
          fromDate,
          toDate: now.toISOString().split('T')[0]
        }),
        payoutService.getDoctorPayouts(doctor.id)
      ]);

      setConsultations(consultsData || []);
      setPayouts(payoutsData || []);
    } catch (error) {
      console.error('Error loading financial data:', error);
      toast.error('Erro ao carregar dados financeiros');
    } finally {
      setLoading(false);
    }
  };

  // Cálculos financeiros
  const totalRevenue = consultations
    .filter(c => c.status !== 'cancelled')
    .reduce((sum, c) => sum + (c.price || 0), 0);

  const totalPlatformFee = consultations
    .filter(c => c.status !== 'cancelled')
    .reduce((sum, c) => sum + (c.platform_fee || 0), 0);

  const totalDoctorEarnings = consultations
    .filter(c => c.status !== 'cancelled')
    .reduce((sum, c) => sum + (c.doctor_payout || 0), 0);

  const paidAmount = consultations
    .filter(c => c.payment_status === 'paid' && c.status !== 'cancelled')
    .reduce((sum, c) => sum + (c.doctor_payout || 0), 0);

  const pendingAmount = consultations
    .filter(c => c.payment_status === 'pending' && c.status !== 'cancelled')
    .reduce((sum, c) => sum + (c.doctor_payout || 0), 0);

  const refundedAmount = consultations
    .filter(c => c.payment_status === 'refunded' || c.status === 'cancelled')
    .reduce((sum, c) => sum + (c.doctor_payout || 0), 0);

  const totalPayoutsReceived = payouts
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0);

  const pendingPayouts = payouts
    .filter(p => p.status === 'pending')
    .reduce((sum, p) => sum + p.amount, 0);

  // Consultas filtradas
  const filteredConsultations = consultations.filter(c => {
    if (filterStatus === 'all') return true;
    return c.payment_status === filterStatus;
  });

  // Repasses filtrados
  const filteredPayouts = payouts.filter(p => {
    if (payoutFilter === 'all') return true;
    return p.status === payoutFilter;
  });

  // Formatação
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getPaymentStatusBadge = (status: PaymentStatus) => {
    const config = {
      pending: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-700' },
      paid: { label: 'Pago', color: 'bg-green-100 text-green-700' },
      refunded: { label: 'Reembolsado', color: 'bg-red-100 text-red-700' },
      external: { label: 'Externo', color: 'bg-blue-100 text-blue-700' }
    };
    const { label, color } = config[status];
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${color}`}>{label}</span>;
  };

  const getPayoutStatusBadge = (status: PayoutStatus) => {
    const config = {
      pending: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-700' },
      paid: { label: 'Pago', color: 'bg-green-100 text-green-700' },
      cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-700' }
    };
    const { label, color } = config[status];
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${color}`}>{label}</span>;
  };

  const getConsultationTypeLabel = (type: string) => {
    const config = {
      initial: 'Inicial',
      follow_up: 'Retorno',
      prescription_renewal: 'Renovação'
    };
    return config[type as keyof typeof config] || type;
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Financeiro</h2>
          <p className="text-sm text-gray-500 mt-1">Acompanhe seus ganhos, repasses e histórico de consultas</p>
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
                  onClick={() => {
                    setPeriod(option.value);
                    setShowPeriodDropdown(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition ${
                    period === option.value ? 'bg-[#2ECC71]/10 text-[#2ECC71] font-medium' : 'text-gray-700'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cards de Resumo Financeiro */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Faturado */}
        <div className="bg-white rounded-xl shadow p-5 border-l-4 border-[#2ECC71]">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-[#2ECC71]/10 rounded-lg">
              <DollarSign className="w-5 h-5 text-[#2ECC71]" />
            </div>
            <span className="text-xs text-gray-500">Bruto</span>
          </div>
          <div className="text-2xl font-bold text-gray-800">{formatCurrency(totalRevenue)}</div>
          <div className="text-xs text-gray-500 mt-1">
            {consultations.filter(c => c.status !== 'cancelled').length} consultas
          </div>
        </div>

        {/* Taxa da Plataforma */}
        <div className="bg-white rounded-xl shadow p-5 border-l-4 border-orange-500">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-orange-50 rounded-lg">
              <ArrowDownRight className="w-5 h-5 text-orange-500" />
            </div>
            <span className="text-xs text-gray-500">Taxa</span>
          </div>
          <div className="text-2xl font-bold text-gray-800">{formatCurrency(totalPlatformFee)}</div>
          <div className="text-xs text-gray-500 mt-1">
            {doctor.platform_fee_percent}% de comissão
          </div>
        </div>

        {/* A Receber */}
        <div className="bg-white rounded-xl shadow p-5 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-yellow-50 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-500" />
            </div>
            <span className="text-xs text-gray-500">Pendente</span>
          </div>
          <div className="text-2xl font-bold text-gray-800">{formatCurrency(pendingAmount)}</div>
          <div className="text-xs text-gray-500 mt-1">
            {consultations.filter(c => c.payment_status === 'pending' && c.status !== 'cancelled').length} consultas
          </div>
        </div>

        {/* Líquido Recebido */}
        <div className="bg-white rounded-xl shadow p-5 border-l-4 border-blue-500">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Wallet className="w-5 h-5 text-blue-500" />
            </div>
            <span className="text-xs text-gray-500">Líquido</span>
          </div>
          <div className="text-2xl font-bold text-gray-800">{formatCurrency(paidAmount)}</div>
          <div className="text-xs text-gray-500 mt-1">
            {consultations.filter(c => c.payment_status === 'paid' && c.status !== 'cancelled').length} pagas
          </div>
        </div>
      </div>

      {/* Seção: Repasses (Payouts) */}
      <div className="bg-white rounded-xl shadow">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#2ECC71]/10 rounded-lg">
                <CreditCard className="w-5 h-5 text-[#2ECC71]" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Repasses (Payouts)</h3>
                <p className="text-sm text-gray-500">Transferências para sua conta</p>
              </div>
            </div>

            {/* Filtro de status de repasse */}
            <select
              value={payoutFilter}
              onChange={e => setPayoutFilter(e.target.value as 'all' | PayoutStatus)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg"
            >
              <option value="all">Todos os status</option>
              <option value="pending">Pendentes</option>
              <option value="paid">Pagos</option>
              <option value="cancelled">Cancelados</option>
            </select>
          </div>

          {/* Resumo de repasses */}
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-lg font-bold text-gray-800">{formatCurrency(totalPayoutsReceived)}</div>
              <div className="text-xs text-gray-500">Total recebido</div>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <div className="text-lg font-bold text-yellow-600">{formatCurrency(pendingPayouts)}</div>
              <div className="text-xs text-gray-500">Pendente</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-lg font-bold text-gray-800">{payouts.length}</div>
              <div className="text-xs text-gray-500">Total de repasses</div>
            </div>
          </div>
        </div>

        {/* Tabela de Repasses */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Período</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Consultas</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Chave PIX</th>
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
                    <p className="text-xs text-gray-400 mt-1">Os repasses aparecem aqui após processamento</p>
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
                    <td className="px-4 py-3 text-sm text-gray-600 font-mono">
                      {payout.pix_key || '-'}
                    </td>
                    <td className="px-4 py-3">
                      {getPayoutStatusBadge(payout.status)}
                    </td>
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

      {/* Seção: Histórico de Consultas */}
      <div className="bg-white rounded-xl shadow">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <BarChart3 className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Histórico de Consultas</h3>
                <p className="text-sm text-gray-500">Detalhamento financeiro por consulta</p>
              </div>
            </div>

            {/* Filtro de status de pagamento */}
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value as 'all' | PaymentStatus)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg"
            >
              <option value="all">Todos os pagamentos</option>
              <option value="paid">Pagos</option>
              <option value="pending">Pendentes</option>
              <option value="refunded">Reembolsados</option>
            </select>
          </div>
        </div>

        {/* Tabela de Consultas */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paciente</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Tipo</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Valor</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Taxa</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Você recebe</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pagamento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredConsultations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                    <BarChart3 className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm font-medium">Nenhuma consulta encontrada</p>
                    <p className="text-xs text-gray-400 mt-1">As consultas aparecem aqui após realização</p>
                  </td>
                </tr>
              ) : (
                filteredConsultations.map(consult => (
                  <tr key={consult.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {formatDate(consult.scheduled_at)}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-800">
                      {consult.patient_name || 'Paciente'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell">
                      <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                        {getConsultationTypeLabel(consult.type)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-gray-800">
                      {formatCurrency(consult.price)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-red-500 hidden lg:table-cell">
                      -{formatCurrency(consult.platform_fee)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-semibold text-[#2ECC71]">
                      {formatCurrency(consult.doctor_payout)}
                    </td>
                    <td className="px-4 py-3">
                      {getPaymentStatusBadge(consult.payment_status)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Rodapé da tabela com totais */}
        {filteredConsultations.length > 0 && (
          <div className="p-4 bg-gray-50 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="text-sm text-gray-500">
                Mostrando {filteredConsultations.length} de {consultations.length} consultas
              </div>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="text-xs text-gray-500">Total bruto</div>
                  <div className="text-sm font-semibold text-gray-800">{formatCurrency(
                    filteredConsultations.reduce((sum, c) => sum + (c.price || 0), 0)
                  )}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-500">Total taxas</div>
                  <div className="text-sm font-semibold text-red-500">-{formatCurrency(
                    filteredConsultations.reduce((sum, c) => sum + (c.platform_fee || 0), 0)
                  )}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-500">Total líquido</div>
                  <div className="text-sm font-bold text-[#2ECC71]">{formatCurrency(
                    filteredConsultations.reduce((sum, c) => sum + (c.doctor_payout || 0), 0)
                  )}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Seção: Resumo do Período */}
      <div className="bg-gradient-to-r from-[#2ECC71] to-[#27ae60] rounded-xl shadow p-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <PieChart className="w-6 h-6" />
          <h3 className="text-lg font-semibold">Resumo do Período</h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <div className="text-sm text-white/80">Consultas realizadas</div>
            <div className="text-2xl font-bold mt-1">
              {consultations.filter(c => c.status !== 'cancelled').length}
            </div>
          </div>
          <div>
            <div className="text-sm text-white/80">Taxa média por consulta</div>
            <div className="text-2xl font-bold mt-1">
              {formatCurrency(
                consultations.filter(c => c.status !== 'cancelled').length > 0
                  ? totalRevenue / consultations.filter(c => c.status !== 'cancelled').length
                  : 0
              )}
            </div>
          </div>
          <div>
            <div className="text-sm text-white/80">Sua comissão líquida</div>
            <div className="text-2xl font-bold mt-1">
              {formatCurrency(totalDoctorEarnings)}
            </div>
          </div>
          <div>
            <div className="text-sm text-white/80">Percentual recebido</div>
            <div className="text-2xl font-bold mt-1">
              {totalRevenue > 0 ? Math.round((paidAmount / totalDoctorEarnings) * 100) : 0}%
            </div>
          </div>
        </div>
      </div>

      {/* Nota informativa */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
            <DollarSign className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-blue-800">Como funcionam os repasses</h4>
            <p className="text-sm text-blue-700 mt-1">
              Os valores das consultas são acumulados e repassados para sua chave PIX periodicamente.
              A taxa da plataforma de {doctor.platform_fee_percent}% é deduzida automaticamente.
              Você pode acompanhar todos os repasses na tabela acima.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
