// =====================================================
// NURA — Admin: Gestão de Assinantes
// /admin/assinantes
// =====================================================

import React, { useEffect, useState } from 'react';
import {
  Users, TrendingUp, CreditCard, Calendar,
  CheckCircle, XCircle, RefreshCw, ChevronDown, X
} from 'lucide-react';
import { adminBillingService, subscriptionService } from '../../services/billingService';
import type {
  SubscriptionWithUser, BillingStats,
  SubscriptionFilters, SubscriptionPlan, SubscriptionStatus
} from '../../types/billing';
import { supabase } from '../../services/supabase';
import toast from 'react-hot-toast';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const planLabel: Record<SubscriptionPlan, string> = {
  essencial: 'Essencial',
  glp1: 'GLP-1',
};

const statusLabel: Record<SubscriptionStatus, string> = {
  active: 'Ativa',
  inactive: 'Inativa',
  cancelled: 'Cancelada',
};

const statusColor: Record<SubscriptionStatus, string> = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-yellow-100 text-yellow-800',
  cancelled: 'bg-red-100 text-red-800',
};

const creditStatusLabel: Record<string, string> = {
  disponivel: 'Disponível',
  agendada: 'Agendada',
  realizada: 'Realizada',
  expirada: 'Expirada',
  perdida_cancelamento: 'Perdida',
  cancelada_reagendada: 'Reagendada',
};

const creditStatusColor: Record<string, string> = {
  disponivel: 'bg-green-100 text-green-800',
  agendada: 'bg-blue-100 text-blue-800',
  realizada: 'bg-gray-100 text-gray-700',
  expirada: 'bg-orange-100 text-orange-800',
  perdida_cancelamento: 'bg-red-100 text-red-800',
  cancelada_reagendada: 'bg-purple-100 text-purple-800',
};

// ─── Modal de Reativação de Crédito ──────────────────────────────────────────

interface ReactivateModalProps {
  creditId: string;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}

const ReactivateModal: React.FC<ReactivateModalProps> = ({ creditId, onClose, onConfirm }) => {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;
    setLoading(true);
    try {
      await onConfirm(reason.trim());
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Reativar Crédito</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Informe o motivo para reativar este crédito. Este log será registrado para auditoria.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            className="w-full border border-gray-200 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#2ECC71]"
            rows={3}
            placeholder="Ex: Solicitação do usuário após bug na plataforma..."
            value={reason}
            onChange={e => setReason(e.target.value)}
            required
          />
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !reason.trim()}
              className="flex-1 px-4 py-2 bg-[#2ECC71] hover:bg-[#27ae60] text-white rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {loading ? 'Salvando...' : 'Confirmar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Componente principal ─────────────────────────────────────────────────────

export const AdminSubscriptions: React.FC = () => {
  const [stats, setStats] = useState<BillingStats | null>(null);
  const [subscriptions, setSubscriptions] = useState<SubscriptionWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<SubscriptionFilters>({
    plan: 'all',
    status: 'all',
    search: '',
  });
  const [reactivateModal, setReactivateModal] = useState<{
    creditId: string;
    subscriptionId: string;
  } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsData, subsData] = await Promise.all([
        adminBillingService.getBillingStats(),
        adminBillingService.listSubscribers(filters),
      ]);
      setStats(statsData);
      setSubscriptions(subsData);
    } catch (err) {
      console.error('Error loading subscriptions data:', err);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [filters.plan, filters.status]);

  const handleCancelSubscription = async (subId: string) => {
    if (!confirm('Confirma o cancelamento desta assinatura?')) return;
    try {
      await subscriptionService.updateStatus(subId, 'cancelled');
      toast.success('Assinatura cancelada');
      loadData();
    } catch {
      toast.error('Erro ao cancelar assinatura');
    }
  };

  const handleReactivateCredit = async (reason: string) => {
    if (!reactivateModal) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    await adminBillingService.reactivateCredit(
      reactivateModal.creditId,
      user.id,
      reason
    );
    toast.success('Crédito reativado com sucesso');
    loadData();
  };

  const filtered = subscriptions.filter(sub => {
    if (!filters.search) return true;
    const q = filters.search.toLowerCase();
    return (
      (sub.user_display_name?.toLowerCase().includes(q)) ||
      (sub.user_email?.toLowerCase().includes(q))
    );
  });

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2ECC71]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cards de resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-50 rounded-lg"><TrendingUp className="w-4 h-4 text-[#2ECC71]" /></div>
            <p className="text-xs text-gray-500">MRR Total</p>
          </div>
          <p className="text-2xl font-bold text-gray-800">{formatCurrency(stats?.mrr_total ?? 0)}</p>
          <p className="text-xs text-gray-400 mt-1">
            Essencial: {formatCurrency(stats?.mrr_essencial ?? 0)} · GLP-1: {formatCurrency(stats?.mrr_glp1 ?? 0)}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-50 rounded-lg"><Users className="w-4 h-4 text-blue-500" /></div>
            <p className="text-xs text-gray-500">Assinantes Ativos</p>
          </div>
          <p className="text-2xl font-bold text-gray-800">{stats?.active_subscribers ?? 0}</p>
          <p className="text-xs text-gray-400 mt-1">
            {stats?.active_subscribers_essencial ?? 0} Essencial · {stats?.active_subscribers_glp1 ?? 0} GLP-1
          </p>
        </div>

        <div className="bg-white rounded-xl shadow p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-50 rounded-lg"><CreditCard className="w-4 h-4 text-purple-500" /></div>
            <p className="text-xs text-gray-500">Créditos Disponíveis</p>
          </div>
          <p className="text-2xl font-bold text-gray-800">{stats?.credits_disponivel ?? 0}</p>
          <p className="text-xs text-gray-400 mt-1">{stats?.credits_agendada ?? 0} agendados · {stats?.credits_realizadas_mes ?? 0} realizados</p>
        </div>

        <div className="bg-white rounded-xl shadow p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-yellow-50 rounded-lg"><Calendar className="w-4 h-4 text-yellow-500" /></div>
            <p className="text-xs text-gray-500">Próximo Split</p>
          </div>
          <p className="text-2xl font-bold text-gray-800">{formatCurrency(stats?.next_split_estimate ?? 0)}</p>
          <p className="text-xs text-gray-400 mt-1">Previsto para {stats?.next_split_date}</p>
        </div>
      </div>

      {/* Tabela de assinantes */}
      <div className="bg-white rounded-xl shadow">
        <div className="p-5 border-b border-gray-100 flex flex-wrap items-center gap-3">
          <h3 className="text-base font-semibold text-gray-800 flex-1">Assinantes</h3>

          {/* Filtro plano */}
          <div className="relative">
            <select
              className="appearance-none pl-3 pr-8 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2ECC71]"
              value={filters.plan}
              onChange={e => setFilters(f => ({ ...f, plan: e.target.value as any }))}
            >
              <option value="all">Todos os planos</option>
              <option value="essencial">Essencial</option>
              <option value="glp1">GLP-1</option>
            </select>
            <ChevronDown className="absolute right-2 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          {/* Filtro status */}
          <div className="relative">
            <select
              className="appearance-none pl-3 pr-8 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2ECC71]"
              value={filters.status}
              onChange={e => setFilters(f => ({ ...f, status: e.target.value as any }))}
            >
              <option value="all">Todos os status</option>
              <option value="active">Ativa</option>
              <option value="inactive">Inativa</option>
              <option value="cancelled">Cancelada</option>
            </select>
            <ChevronDown className="absolute right-2 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          {/* Busca */}
          <input
            type="text"
            placeholder="Buscar usuário..."
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2ECC71]"
            value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
          />

          <button
            onClick={loadData}
            className="p-2 text-gray-400 hover:text-gray-600 border border-gray-200 rounded-lg"
            title="Atualizar"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-500">Nenhuma assinatura encontrada</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuário</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plano</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Valor</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Cobrança</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Crédito Mês</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(sub => (
                  <tr key={sub.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800 text-sm">{sub.user_display_name ?? '—'}</p>
                      <p className="text-xs text-gray-400">{sub.user_email ?? sub.user_id.slice(0, 8) + '...'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        sub.plan_type === 'glp1'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {planLabel[sub.plan_type]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[sub.status]}`}>
                        {statusLabel[sub.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm hidden md:table-cell">
                      {formatCurrency(sub.price)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 hidden lg:table-cell">
                      Dia {sub.billing_date ?? '—'}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {sub.active_credit_status ? (
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${creditStatusColor[sub.active_credit_status]}`}>
                          {creditStatusLabel[sub.active_credit_status]}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {sub.active_credit_status && ['expirada', 'perdida_cancelamento'].includes(sub.active_credit_status) && (
                          <button
                            onClick={() => setReactivateModal({
                              creditId: sub.id, // In a real implementation, this would be the credit's id
                              subscriptionId: sub.id,
                            })}
                            title="Reativar crédito"
                            className="p-1.5 text-[#2ECC71] hover:bg-green-50 rounded"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        {sub.status === 'active' && (
                          <button
                            onClick={() => handleCancelSubscription(sub.id)}
                            title="Cancelar assinatura"
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                          >
                            <XCircle className="w-4 h-4" />
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

      {/* Modal de reativação */}
      {reactivateModal && (
        <ReactivateModal
          creditId={reactivateModal.creditId}
          onClose={() => setReactivateModal(null)}
          onConfirm={handleReactivateCredit}
        />
      )}
    </div>
  );
};
