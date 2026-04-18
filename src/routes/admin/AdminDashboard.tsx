// =====================================================
// Malama — Dashboard do Super Admin
// =====================================================

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Calendar, DollarSign, Clock, CheckCircle, XCircle, CreditCard, TrendingUp } from 'lucide-react';
import { adminService, doctorService } from '../../services/doctorPortalService';
import { adminBillingService } from '../../services/billingService';
import type { AdminDashboardSummary } from '../../types/doctorPortal';
import type { BillingStats } from '../../types/billing';
import toast from 'react-hot-toast';

export const AdminDashboard: React.FC = () => {
  const [summary, setSummary] = useState<AdminDashboardSummary | null>(null);
  const [billingStats, setBillingStats] = useState<BillingStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSummary = async () => {
      try {
        const [data, billing] = await Promise.all([
          adminService.getDashboardSummary(),
          adminBillingService.getBillingStats().catch(() => null),
        ]);
        setSummary(data);
        setBillingStats(billing);
      } catch (error) {
        console.error('Error loading admin dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSummary();
  }, []);

  const handleApproveDoctor = async (doctorId: string) => {
    try {
      await doctorService.approveDoctor(doctorId);
      toast.success('Médico aprovado com sucesso!');

      // Recarregar resumo
      const data = await adminService.getDashboardSummary();
      setSummary(data);
    } catch (error) {
      toast.error('Erro ao aprovar médico');
    }
  };

  const handleRejectDoctor = async (doctorId: string) => {
    try {
      await doctorService.suspendDoctor(doctorId);
      toast.success('Médico suspenso');

      const data = await adminService.getDashboardSummary();
      setSummary(data);
    } catch (error) {
      toast.error('Erro ao suspender médico');
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
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#9c5d4b]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cards de resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-800">{summary?.approvedDoctors || 0}</p>
          <p className="text-gray-600 text-sm">Médicos aprovados</p>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-800">{summary?.monthConsultations || 0}</p>
          <p className="text-gray-600 text-sm">Consultas este mês</p>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-800">{formatCurrency(summary?.platformRevenue || 0)}</p>
          <p className="text-gray-600 text-sm">Receita plataforma</p>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-yellow-100 flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-800">{formatCurrency(summary?.pendingPayouts || 0)}</p>
          <p className="text-gray-600 text-sm">Repasses pendentes</p>
        </div>
      </div>

      {/* Cadastros pendentes de aprovação */}
      <div className="bg-white rounded-xl shadow">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800">Cadastros pendentes de aprovação</h3>
        </div>

        {summary?.pendingDoctors.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <p className="text-gray-600">Nenhum cadastro pendente</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {summary?.pendingDoctors.map(doctor => (
              <div key={doctor.id} className="p-4 flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium text-gray-800">{doctor.name}</p>
                  <p className="text-sm text-gray-600">
                    CRM: {doctor.crm}/{doctor.crm_state} • {doctor.specialty}
                  </p>
                  <p className="text-xs text-gray-500">{formatDate(doctor.created_at)}</p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleApproveDoctor(doctor.id)}
                    className="px-4 py-2 bg-[#9c5d4b] hover:bg-[#7a4839] text-white rounded-lg text-sm font-medium flex items-center gap-1 transition"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Aprovar
                  </button>
                  <button
                    onClick={() => handleRejectDoctor(doctor.id)}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium flex items-center gap-1 transition"
                  >
                    <XCircle className="w-4 h-4" />
                    Rejeitar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cards de billing (assinaturas e créditos) */}
      {billingStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow p-5">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-[#9c5d4b]" />
              <p className="text-xs text-gray-500">MRR Total</p>
            </div>
            <p className="text-2xl font-bold text-gray-800">{formatCurrency(billingStats.mrr_total)}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {billingStats.active_subscribers} assinantes ativos
            </p>
          </div>

          <div className="bg-white rounded-xl shadow p-5">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-blue-500" />
              <p className="text-xs text-gray-500">Assinantes</p>
            </div>
            <p className="text-2xl font-bold text-gray-800">{billingStats.active_subscribers}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {billingStats.active_subscribers_essencial} Essencial · {billingStats.active_subscribers_glp1} GLP-1
            </p>
          </div>

          <div className="bg-white rounded-xl shadow p-5">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="w-4 h-4 text-purple-500" />
              <p className="text-xs text-gray-500">Créditos do Mês</p>
            </div>
            <p className="text-2xl font-bold text-gray-800">{billingStats.credits_realizadas_mes}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {billingStats.credits_disponivel} disponíveis · {billingStats.credits_agendada} agendados
            </p>
          </div>

          <div className="bg-white rounded-xl shadow p-5">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-yellow-500" />
              <p className="text-xs text-gray-500">Próximo Split</p>
            </div>
            <p className="text-2xl font-bold text-gray-800">{formatCurrency(billingStats.next_split_estimate)}</p>
            <p className="text-xs text-gray-400 mt-0.5">Previsto {billingStats.next_split_date}</p>
          </div>
        </div>
      )}

      {/* Links rápidos */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Link
          to="/admin/medicos"
          className="bg-white rounded-xl shadow p-6 hover:shadow-lg transition"
        >
          <Users className="w-8 h-8 text-[#9c5d4b] mb-2" />
          <h4 className="font-semibold text-gray-800">Médicos</h4>
          <p className="text-sm text-gray-600">Aprovar e gerenciar</p>
        </Link>

        <Link
          to="/admin/financeiro"
          className="bg-white rounded-xl shadow p-6 hover:shadow-lg transition"
        >
          <DollarSign className="w-8 h-8 text-purple-600 mb-2" />
          <h4 className="font-semibold text-gray-800">Financeiro</h4>
          <p className="text-sm text-gray-600">Repasses e receita</p>
        </Link>

        <Link
          to="/admin/assinantes"
          className="bg-white rounded-xl shadow p-6 hover:shadow-lg transition"
        >
          <CreditCard className="w-8 h-8 text-blue-600 mb-2" />
          <h4 className="font-semibold text-gray-800">Assinantes</h4>
          <p className="text-sm text-gray-600">Planos e cobrança</p>
        </Link>

        <Link
          to="/admin/creditos"
          className="bg-white rounded-xl shadow p-6 hover:shadow-lg transition"
        >
          <TrendingUp className="w-8 h-8 text-orange-500 mb-2" />
          <h4 className="font-semibold text-gray-800">Créditos</h4>
          <p className="text-sm text-gray-600">Log e auditoria</p>
        </Link>

        <Link
          to="/admin/configuracoes"
          className="bg-white rounded-xl shadow p-6 hover:shadow-lg transition"
        >
          <Calendar className="w-8 h-8 text-gray-500 mb-2" />
          <h4 className="font-semibold text-gray-800">Configurações</h4>
          <p className="text-sm text-gray-600">Configurações globais</p>
        </Link>
      </div>
    </div>
  );
};
