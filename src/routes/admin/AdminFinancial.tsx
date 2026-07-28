// =====================================================
// Malama — Financeiro (Admin) — 3 abas
// Visão Geral · Faturas B2B · Repasses Médicos
// =====================================================

import React, { useEffect, useState } from 'react';
import {
  CheckCircle, Download, RefreshCw, AlertTriangle, Loader,
  TrendingUp, DollarSign, ArrowDownLeft, ArrowUpRight, Copy,
  ExternalLink, Building2, Users,
} from 'lucide-react';
import { payoutService, adminService } from '../../services/doctorPortalService';
import { adminBillingService } from '../../services/billingService';
import { empresaAdminService } from '../../services/empresaService';
import type { PendingPayout, FinancialSummary } from '../../types/doctorPortal';
import type { BillingStats } from '../../types/billing';
import type { EmpresaFatura, B2BDashboardStats } from '../../services/empresaService';
import toast from 'react-hot-toast';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const formatDate = (s: string) =>
  new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

const formatMonth = (s: string) => {
  const d = new Date(s + (s.length === 7 ? '-01' : ''));
  return d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
};

// ─── Badges ──────────────────────────────────────────────────────────────────

const payoutStatusCfg: Record<string, { label: string; className: string }> = {
  pending:    { label: 'Pendente',    className: 'bg-gray-100 text-gray-600'     },
  processing: { label: 'Processando', className: 'bg-yellow-100 text-yellow-700' },
  paid:       { label: 'Pago',        className: 'bg-green-100 text-green-700'   },
  failed:     { label: 'Falha',       className: 'bg-red-100 text-red-700'       },
  cancelled:  { label: 'Cancelado',   className: 'bg-gray-100 text-gray-500'     },
};

const faturaStatusCfg: Record<string, { label: string; className: string }> = {
  pendente:  { label: 'Pendente',  className: 'bg-yellow-100 text-yellow-700' },
  pago:      { label: 'Pago',      className: 'bg-green-100 text-green-700'   },
  atrasado:  { label: 'Atrasado',  className: 'bg-red-100 text-red-700'       },
  cancelado: { label: 'Cancelado', className: 'bg-gray-100 text-gray-500'     },
};

const Badge: React.FC<{ label: string; className: string }> = ({ label, className }) => (
  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
    {label}
  </span>
);

// ─── Tipo para fatura com nome da empresa ─────────────────────────────────────

type FaturaComEmpresa = EmpresaFatura & { empresa_nome: string };

// ─── Componente principal ─────────────────────────────────────────────────────

type Tab = 'geral' | 'faturas' | 'repasses';

export const AdminFinancial: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('geral');

  // dados
  const [financial, setFinancial] = useState<FinancialSummary | null>(null);
  const [billingStats, setBillingStats] = useState<BillingStats | null>(null);
  const [b2bStats, setB2bStats] = useState<B2BDashboardStats | null>(null);
  const [faturas, setFaturas] = useState<FaturaComEmpresa[]>([]);
  const [payouts, setPayouts] = useState<PendingPayout[]>([]);
  const [reprocessingId, setReprocessingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // filtros aba faturas
  const [faturaFilter, setFaturaFilter] = useState<string>('');

  const loadData = async () => {
    try {
      const [fin, billing, b2b, fats, pays] = await Promise.all([
        payoutService.getFinancialSummary(),
        adminBillingService.getBillingStats().catch(() => null),
        empresaAdminService.getDashboardStats().catch(() => null),
        empresaAdminService.getAllFaturas().catch(() => [] as FaturaComEmpresa[]),
        payoutService.getPendingPayouts(),
      ]);
      setFinancial(fin);
      setBillingStats(billing);
      setB2bStats(b2b);
      setFaturas(fats);
      setPayouts(pays);
    } catch (err) {
      console.error('Erro ao carregar financeiro:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleMarkAsPaid = async (payoutId: string) => {
    try {
      await payoutService.markAsPaid(payoutId);
      toast.success('Repasse marcado como pago');
      const pays = await payoutService.getPendingPayouts();
      setPayouts(pays);
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
    } finally {
      setReprocessingId(null);
    }
  };

  const exportCSV = () => {
    const headers = ['Médico', 'Período', 'Consultas', 'Valor Bruto', 'Taxa', 'Líquido', 'PIX', 'Status', 'Transfer Asaas'];
    const rows = payouts.map(p => [
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
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url; a.download = 'repasses.csv'; a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exportado!');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7d4a3c]" />
      </div>
    );
  }

  // ── Cálculos para Visão Geral ─────────────────────────────────────────────
  const mesAtual = new Date().toISOString().slice(0, 7);
  const faturasPagesMes = faturas
    .filter(f => f.status === 'pago' && f.competencia.slice(0, 7) === mesAtual)
    .reduce((s, f) => s + Number(f.valor), 0);

  const repassesPagosMes = payouts
    .filter(p => p.status === 'paid')
    .reduce((s, p) => s + p.net_amount, 0);

  const mrrTotal = (billingStats?.mrr_total ?? 0) + (b2bStats?.mrr_b2b ?? 0);
  const margemEstimada = (financial?.platformFee ?? 0) + faturasPagesMes - repassesPagosMes;

  // mini-extrato: últimas 8 movimentações
  const entradas: { tipo: 'entrada'; label: string; valor: number; data: string }[] = faturas
    .filter(f => f.status === 'pago')
    .slice(0, 20)
    .map(f => ({ tipo: 'entrada', label: f.empresa_nome, valor: Number(f.valor), data: f.pago_em ?? f.created_at }));

  const saidas: { tipo: 'saida'; label: string; valor: number; data: string }[] = payouts
    .filter(p => p.status === 'paid')
    .slice(0, 20)
    .map(p => ({ tipo: 'saida', label: p.doctor_name, valor: p.net_amount, data: p.period_end }));

  const extrato = [...entradas, ...saidas]
    .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
    .slice(0, 8);

  // filtro de faturas
  const faturasFiltradas = faturas.filter(f =>
    (!faturaFilter || f.status === faturaFilter)
  );
  const totalPendente = faturas.filter(f => f.status === 'pendente').reduce((s, f) => s + Number(f.valor), 0);
  const totalPago     = faturas.filter(f => f.status === 'pago').reduce((s, f) => s + Number(f.valor), 0);
  const totalAtrasado = faturas.filter(f => f.status === 'atrasado').reduce((s, f) => s + Number(f.valor), 0);

  const failedPayouts = payouts.filter(p => p.status === 'failed');

  const tabs: { id: Tab; label: string }[] = [
    { id: 'geral',    label: 'Visão Geral' },
    { id: 'faturas',  label: 'Faturas B2B' },
    { id: 'repasses', label: 'Repasses Médicos' },
  ];

  return (
    <div className="space-y-6">

      {/* ── Navegação por abas ─────────────────────────────────────── */}
      <div className="border-b border-gray-200 flex gap-6">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`pb-3 text-sm font-medium transition border-b-2 -mb-px ${
              activeTab === t.id
                ? 'border-[#7d4a3c] text-[#7d4a3c]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════
          ABA 1 — VISÃO GERAL
      ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'geral' && (
        <div className="space-y-6">
          {/* Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white rounded-xl shadow p-5">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-[#7d4a3c]" />
                <p className="text-xs text-gray-500">MRR Total</p>
              </div>
              <p className="text-2xl font-bold text-gray-800">{formatCurrency(mrrTotal)}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                B2C {formatCurrency(billingStats?.mrr_total ?? 0)} + B2B {formatCurrency(b2bStats?.mrr_b2b ?? 0)}
              </p>
            </div>

            <div className="bg-white rounded-xl shadow p-5">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-purple-500" />
                <p className="text-xs text-gray-500">Receita plataforma (mês)</p>
              </div>
              <p className="text-2xl font-bold text-gray-800">{formatCurrency(financial?.platformFee ?? 0)}</p>
              <p className="text-xs text-gray-400 mt-0.5">25% das consultas</p>
            </div>

            <div className="bg-white rounded-xl shadow p-5">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="w-4 h-4 text-indigo-500" />
                <p className="text-xs text-gray-500">Faturas B2B pagas (mês)</p>
              </div>
              <p className="text-2xl font-bold text-gray-800">{formatCurrency(faturasPagesMes)}</p>
              <p className="text-xs text-gray-400 mt-0.5">{mesAtual.slice(0, 7).replace('-', '/')}</p>
            </div>

            <div className="bg-white rounded-xl shadow p-5">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-orange-500" />
                <p className="text-xs text-gray-500">Repasses pagos</p>
              </div>
              <p className="text-2xl font-bold text-gray-800">{formatCurrency(repassesPagosMes)}</p>
              <p className="text-xs text-gray-400 mt-0.5">Acumulado histórico</p>
            </div>

            <div className={`bg-white rounded-xl shadow p-5 ${margemEstimada < 0 ? 'border border-red-200' : ''}`}>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className={`w-4 h-4 ${margemEstimada >= 0 ? 'text-green-500' : 'text-red-500'}`} />
                <p className="text-xs text-gray-500">Margem estimada</p>
              </div>
              <p className={`text-2xl font-bold ${margemEstimada >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {formatCurrency(margemEstimada)}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">Receitas − repasses</p>
            </div>
          </div>

          {/* Mini-extrato */}
          <div className="bg-white rounded-xl shadow">
            <div className="p-5 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700">Últimas movimentações</h3>
            </div>
            {extrato.length === 0 ? (
              <div className="p-10 text-center text-sm text-gray-400">Nenhuma movimentação registrada</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {extrato.map((mov, i) => (
                  <div key={i} className="px-5 py-3 flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      mov.tipo === 'entrada' ? 'bg-green-50' : 'bg-red-50'
                    }`}>
                      {mov.tipo === 'entrada'
                        ? <ArrowDownLeft className="w-4 h-4 text-green-600" />
                        : <ArrowUpRight className="w-4 h-4 text-red-500" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{mov.label}</p>
                      <p className="text-xs text-gray-400">{formatDate(mov.data)}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${mov.tipo === 'entrada' ? 'text-green-700' : 'text-red-600'}`}>
                        {mov.tipo === 'entrada' ? '+' : '−'}{formatCurrency(mov.valor)}
                      </p>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        mov.tipo === 'entrada' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
                      }`}>
                        {mov.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          ABA 2 — FATURAS B2B
      ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'faturas' && (
        <div className="space-y-4">
          {/* Totalizadores */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-xl shadow p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">Pendente</p>
              <p className="text-xl font-bold text-yellow-600">{formatCurrency(totalPendente)}</p>
            </div>
            <div className="bg-white rounded-xl shadow p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">Pago</p>
              <p className="text-xl font-bold text-green-700">{formatCurrency(totalPago)}</p>
            </div>
            <div className="bg-white rounded-xl shadow p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">Atrasado</p>
              <p className="text-xl font-bold text-red-600">{formatCurrency(totalAtrasado)}</p>
            </div>
          </div>

          {/* Filtro de status */}
          <div className="flex gap-2 flex-wrap">
            {(['', 'pendente', 'pago', 'atrasado', 'cancelado'] as const).map(s => (
              <button
                key={s}
                onClick={() => setFaturaFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  faturaFilter === s
                    ? 'bg-[#7d4a3c] text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {s === '' ? 'Todos' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>

          {/* Tabela */}
          <div className="bg-white rounded-xl shadow overflow-hidden">
            {faturasFiltradas.length === 0 ? (
              <div className="p-10 text-center text-sm text-gray-400">Nenhuma fatura encontrada</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Empresa</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Competência</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Vencimento</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {faturasFiltradas.map(f => {
                      const cfg = faturaStatusCfg[f.status] ?? faturaStatusCfg.pendente;
                      return (
                        <tr key={f.id} className={f.status === 'atrasado' ? 'bg-red-50' : ''}>
                          <td className="px-4 py-3 font-medium text-gray-800">{f.empresa_nome}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{formatMonth(f.competencia)}</td>
                          <td className="px-4 py-3 font-medium text-[#7d4a3c]">{formatCurrency(Number(f.valor))}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell">{formatDate(f.vencimento)}</td>
                          <td className="px-4 py-3">
                            <Badge label={cfg.label} className={cfg.className} />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {f.asaas_invoice_url && (
                                <a
                                  href={f.asaas_invoice_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-600 border border-gray-200 rounded hover:bg-gray-50"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  Boleto
                                </a>
                              )}
                              {f.asaas_pix_payload && (
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(f.asaas_pix_payload!);
                                    toast.success('PIX copiado!');
                                  }}
                                  className="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-600 border border-gray-200 rounded hover:bg-gray-50"
                                >
                                  <Copy className="w-3 h-3" />
                                  PIX
                                </button>
                              )}
                              {!f.asaas_invoice_url && !f.asaas_pix_payload && (
                                <span className="text-xs text-gray-400">—</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          ABA 3 — REPASSES MÉDICOS
      ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'repasses' && (
        <div className="space-y-4">
          {/* Cards de contexto */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow p-5">
              <p className="text-xs text-gray-500 mb-1">Receita bruta total</p>
              <p className="text-xl font-bold text-gray-800">{formatCurrency(financial?.grossRevenue ?? 0)}</p>
            </div>
            <div className="bg-white rounded-xl shadow p-5">
              <p className="text-xs text-gray-500 mb-1">Taxa retida (plataforma)</p>
              <p className="text-xl font-bold text-gray-800">{formatCurrency(financial?.platformFee ?? 0)}</p>
            </div>
            <div className="bg-white rounded-xl shadow p-5">
              <p className="text-xs text-gray-500 mb-1">Total repassado</p>
              <p className="text-xl font-bold text-gray-800">{formatCurrency(financial?.totalPaid ?? 0)}</p>
            </div>
            <div className="bg-white rounded-xl shadow p-5">
              <p className="text-xs text-gray-500 mb-1">Pendente de repasse</p>
              <p className="text-xl font-bold text-yellow-600">{formatCurrency(financial?.pendingPayouts ?? 0)}</p>
            </div>
          </div>

          {/* Alerta de falhas */}
          {failedPayouts.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
              <p className="text-sm text-red-700">
                <strong>{failedPayouts.length} repasse(s) com falha.</strong> Clique em "Reprocessar" para tentar novamente.
              </p>
            </div>
          )}

          {/* Tabela de repasses */}
          <div className="bg-white rounded-xl shadow">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">Repasses</h3>
              <div className="flex gap-2">
                <button
                  onClick={loadData}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={exportCSV}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#7d4a3c] hover:bg-[#623a2f] text-white rounded-lg text-sm font-medium"
                >
                  <Download className="w-3.5 h-3.5" />
                  Exportar CSV
                </button>
              </div>
            </div>

            {payouts.length === 0 ? (
              <div className="p-10 text-center text-sm text-gray-400">Nenhum repasse encontrado</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Médico</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Período</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Consultas</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Bruto</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Taxa</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Líquido</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">PIX</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden xl:table-cell">Transfer ID</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {payouts.map(p => {
                      const cfg = payoutStatusCfg[p.status] ?? payoutStatusCfg.pending;
                      return (
                        <tr key={p.id} className={p.status === 'failed' ? 'bg-red-50' : ''}>
                          <td className="px-4 py-3 font-medium text-gray-800">{p.doctor_name}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell">
                            {formatDate(p.period_start)} - {formatDate(p.period_end)}
                          </td>
                          <td className="px-4 py-3 text-sm">{p.consultations_count}</td>
                          <td className="px-4 py-3 text-sm hidden lg:table-cell">{formatCurrency(p.gross_amount)}</td>
                          <td className="px-4 py-3 text-sm hidden lg:table-cell">{p.fee_percent}%</td>
                          <td className="px-4 py-3 font-medium text-[#7d4a3c]">{formatCurrency(p.net_amount)}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell truncate max-w-[150px]">
                            {p.pix_key || '—'}
                          </td>
                          <td className="px-4 py-3">
                            <Badge label={cfg.label} className={cfg.className} />
                            {p.status === 'failed' && p.processing_error && (
                              <p className="text-xs text-red-600 mt-1 max-w-[160px] truncate" title={p.processing_error}>
                                {p.processing_error}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs font-mono text-gray-400 hidden xl:table-cell">
                            {p.asaas_transfer_id
                              ? <span title={p.asaas_transfer_id}>{p.asaas_transfer_id.slice(0, 12)}…</span>
                              : '—'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {p.status === 'failed' && (
                                <button
                                  onClick={() => handleReprocess(p.id)}
                                  disabled={reprocessingId === p.id}
                                  className="px-3 py-1 bg-orange-500 hover:bg-orange-600 text-white rounded text-xs font-medium flex items-center gap-1 disabled:opacity-50"
                                >
                                  {reprocessingId === p.id
                                    ? <Loader className="w-3 h-3 animate-spin" />
                                    : <RefreshCw className="w-3 h-3" />}
                                  Reprocessar
                                </button>
                              )}
                              {p.status === 'pending' && (
                                <button
                                  onClick={() => handleMarkAsPaid(p.id)}
                                  className="px-3 py-1 bg-[#7d4a3c] hover:bg-[#623a2f] text-white rounded text-xs font-medium flex items-center gap-1"
                                >
                                  <CheckCircle className="w-3 h-3" />
                                  Pagar
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
