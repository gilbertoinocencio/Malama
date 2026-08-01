// =====================================================
// Malama — Dashboard do Super Admin
// =====================================================

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, Calendar, DollarSign, Clock, CheckCircle, XCircle,
  CreditCard, TrendingUp, Building2, Armchair, AlertTriangle,
  Lock, BarChart2, Leaf, Brain, ClipboardCheck, Activity, MessageSquare
} from 'lucide-react';
import { adminService, doctorService } from '../../services/doctorPortalService';
import type { ClinicalLoopHealth } from '../../services/doctorPortalService';
import { adminBillingService } from '../../services/billingService';
import { empresaAdminService } from '../../services/empresaService';
import type { AdminDashboardSummary } from '../../types/doctorPortal';
import type { BillingStats } from '../../types/billing';
import type { B2BDashboardStats } from '../../services/empresaService';
import toast from 'react-hot-toast';

export const AdminDashboard: React.FC = () => {
  const [summary, setSummary] = useState<AdminDashboardSummary | null>(null);
  const [billingStats, setBillingStats] = useState<BillingStats | null>(null);
  const [b2bStats, setB2bStats] = useState<B2BDashboardStats | null>(null);
  const [loopHealth, setLoopHealth] = useState<ClinicalLoopHealth | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSummary = async () => {
      try {
        const [data, billing, b2b, loop] = await Promise.all([
          adminService.getDashboardSummary(),
          adminBillingService.getBillingStats().catch(() => null),
          empresaAdminService.getDashboardStats().catch(() => null),
          adminService.getClinicalLoopHealth().catch(() => null),
        ]);
        setSummary(data);
        setBillingStats(billing);
        setB2bStats(b2b);
        setLoopHealth(loop);
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
      const data = await adminService.getDashboardSummary();
      setSummary(data);
    } catch {
      toast.error('Erro ao aprovar médico');
    }
  };

  const handleRejectDoctor = async (doctorId: string) => {
    try {
      await doctorService.suspendDoctor(doctorId);
      toast.success('Médico suspenso');
      const data = await adminService.getDashboardSummary();
      setSummary(data);
    } catch {
      toast.error('Erro ao suspender médico');
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const pct = (a: number, b: number) =>
    b === 0 ? '–' : `${Math.round((a / b) * 100)}%`;

  const mrrTotal = (billingStats?.mrr_total ?? 0) + (b2bStats?.mrr_b2b ?? 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7d4a3c]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">

      {/* ── HEADLINE ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-[#7d4a3c]" />
            <p className="text-xs text-gray-500 uppercase tracking-wide">MRR Total</p>
          </div>
          <p className="text-2xl font-bold text-gray-800">{formatCurrency(mrrTotal)}</p>
          <p className="text-xs text-gray-400 mt-0.5">B2C + B2B</p>
        </div>

        <div className="bg-white rounded-xl shadow p-5">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-purple-500" />
            <p className="text-xs text-gray-500 uppercase tracking-wide">Receita do mês</p>
          </div>
          <p className="text-2xl font-bold text-gray-800">{formatCurrency(summary?.platformRevenue ?? 0)}</p>
          <p className="text-xs text-gray-400 mt-0.5">Faturas B2B pagas</p>
        </div>

        <div className="bg-white rounded-xl shadow p-5">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-yellow-500" />
            <p className="text-xs text-gray-500 uppercase tracking-wide">Repasses pendentes</p>
          </div>
          <p className="text-2xl font-bold text-gray-800">{formatCurrency(summary?.pendingPayouts ?? 0)}</p>
          <p className="text-xs text-gray-400 mt-0.5">Aguardando split</p>
        </div>

        <div className="bg-white rounded-xl shadow p-5">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-blue-500" />
            <p className="text-xs text-gray-500 uppercase tracking-wide">Médicos aprovados</p>
          </div>
          <p className="text-2xl font-bold text-gray-800">{summary?.approvedDoctors ?? 0}</p>
          <p className="text-xs text-gray-400 mt-0.5">Na plataforma</p>
        </div>

        {/* Psicólogos contam à parte: rede, conselho e valor de repasse
            são distintos dos médicos. */}
        <div className="bg-white rounded-xl shadow p-5">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-[#7d4a3c]" />
            <p className="text-xs text-gray-500 uppercase tracking-wide">Psicólogos aprovados</p>
          </div>
          <p className="text-2xl font-bold text-gray-800">{summary?.approvedPsychologists ?? 0}</p>
          <p className="text-xs text-gray-400 mt-0.5">Modo Saúde Mental</p>
        </div>
      </div>

      {/* ── B2C ──────────────────────────────────────────── */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Assinantes Malama — B2C
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow p-5">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-[#7d4a3c]" />
              <p className="text-xs text-gray-500">MRR B2C</p>
            </div>
            <p className="text-2xl font-bold text-gray-800">{formatCurrency(billingStats?.mrr_total ?? 0)}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Essencial {formatCurrency(billingStats?.mrr_essencial ?? 0)} · GLP-1 {formatCurrency(billingStats?.mrr_glp1 ?? 0)}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow p-5">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-blue-500" />
              <p className="text-xs text-gray-500">Assinantes</p>
            </div>
            <p className="text-2xl font-bold text-gray-800">{billingStats?.active_subscribers ?? 0}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {billingStats?.active_subscribers_essencial ?? 0} Essencial · {billingStats?.active_subscribers_glp1 ?? 0} GLP-1
            </p>
          </div>

          <div className="bg-white rounded-xl shadow p-5">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-green-500" />
              <p className="text-xs text-gray-500">Consultas este mês</p>
            </div>
            <p className="text-2xl font-bold text-gray-800">{summary?.monthConsultations ?? 0}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {billingStats?.credits_realizadas_mes ?? 0} realizadas · {billingStats?.credits_agendada ?? 0} agendadas
            </p>
          </div>

          <div className="bg-white rounded-xl shadow p-5">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="w-4 h-4 text-yellow-500" />
              <p className="text-xs text-gray-500">Próximo Split</p>
            </div>
            <p className="text-2xl font-bold text-gray-800">{formatCurrency(billingStats?.next_split_estimate ?? 0)}</p>
            <p className="text-xs text-gray-400 mt-0.5">Previsto {billingStats?.next_split_date ?? '–'}</p>
          </div>
        </div>
      </section>

      {/* ── B2B ──────────────────────────────────────────── */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Empresas Corporativas — B2B
        </h2>

        {/* Alertas operacionais */}
        {b2bStats && (b2bStats.inadimplentes > 0 || b2bStats.leads_pendentes > 0) && (
          <div className="mb-4 flex flex-col gap-2">
            {b2bStats.inadimplentes > 0 && (
              <Link
                to="/admin/empresas"
                className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800 hover:bg-amber-100 transition"
              >
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  <strong>{b2bStats.inadimplentes}</strong> empresa{b2bStats.inadimplentes > 1 ? 's' : ''} com fatura atrasada aguardando decisão de bloqueio
                </span>
              </Link>
            )}
            {b2bStats.leads_pendentes > 0 && (
              <Link
                to="/admin/empresas"
                className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-800 hover:bg-blue-100 transition"
              >
                <BarChart2 className="w-4 h-4 shrink-0" />
                <span>
                  <strong>{b2bStats.leads_pendentes}</strong> lead{b2bStats.leads_pendentes > 1 ? 's' : ''} pendente{b2bStats.leads_pendentes > 1 ? 's' : ''} de contato
                </span>
              </Link>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* MRR B2B */}
          <div className="bg-white rounded-xl shadow p-5">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-[#7d4a3c]" />
              <p className="text-xs text-gray-500">MRR B2B</p>
            </div>
            <p className="text-2xl font-bold text-gray-800">{formatCurrency(b2bStats?.mrr_b2b ?? 0)}</p>
            <p className="text-xs text-gray-400 mt-0.5">Assentos contratados × valor</p>
          </div>

          {/* Empresas ativas */}
          <div className="bg-white rounded-xl shadow p-5">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="w-4 h-4 text-indigo-500" />
              <p className="text-xs text-gray-500">Empresas ativas</p>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold text-gray-800">{b2bStats?.empresas_ativas ?? 0}</p>
              {(b2bStats?.novas_mes ?? 0) > 0 && (
                <span className="text-xs font-medium text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                  +{b2bStats!.novas_mes} este mês
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-0.5">{b2bStats?.leads_pendentes ?? 0} leads pendentes</p>
          </div>

          {/* Assentos */}
          <div className="bg-white rounded-xl shadow p-5">
            <div className="flex items-center gap-2 mb-2">
              <Armchair className="w-4 h-4 text-sky-500" />
              <p className="text-xs text-gray-500">Assentos</p>
            </div>
            <p className="text-2xl font-bold text-gray-800">{b2bStats?.total_assentos ?? 0}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {b2bStats?.total_colaboradores ?? 0} ocupados · {pct(b2bStats?.total_colaboradores ?? 0, b2bStats?.total_assentos ?? 0)} taxa
            </p>
          </div>

          {/* Inadimplentes */}
          <div className="bg-white rounded-xl shadow p-5">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className={`w-4 h-4 ${(b2bStats?.inadimplentes ?? 0) > 0 ? 'text-amber-500' : 'text-gray-300'}`} />
              <p className="text-xs text-gray-500">Inadimplentes</p>
            </div>
            <p className={`text-2xl font-bold ${(b2bStats?.inadimplentes ?? 0) > 0 ? 'text-amber-600' : 'text-gray-800'}`}>
              {b2bStats?.inadimplentes ?? 0}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">Faturas atrasadas</p>
          </div>

          {/* Bloqueadas */}
          <div className="bg-white rounded-xl shadow p-5">
            <div className="flex items-center gap-2 mb-2">
              <Lock className={`w-4 h-4 ${(b2bStats?.bloqueadas ?? 0) > 0 ? 'text-red-400' : 'text-gray-300'}`} />
              <p className="text-xs text-gray-500">Bloqueadas</p>
            </div>
            <p className={`text-2xl font-bold ${(b2bStats?.bloqueadas ?? 0) > 0 ? 'text-red-600' : 'text-gray-800'}`}>
              {b2bStats?.bloqueadas ?? 0}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">Acesso suspenso</p>
          </div>

          {/* Reduções agendadas */}
          <div className="bg-white rounded-xl shadow p-5">
            <div className="flex items-center gap-2 mb-2">
              <BarChart2 className="w-4 h-4 text-orange-400" />
              <p className="text-xs text-gray-500">Reduções agendadas</p>
            </div>
            <p className="text-2xl font-bold text-gray-800">{b2bStats?.reducoes_agendadas ?? 0}</p>
            <p className="text-xs text-gray-400 mt-0.5">Assentos caem no próximo mês</p>
          </div>
        </div>
      </section>

      {/* ── Saúde do Loop Clínico (IA / RLHF) ────────────── */}
      {loopHealth && (
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Saúde do Loop Clínico — IA
          </h2>

          {/* Alerta: pouca supervisão médica trava o aprendizado do modelo */}
          {loopHealth.total_reports > 0 && loopHealth.supervision_rate < 20 && (
            <div className="mb-4 flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                Apenas <strong>{loopHealth.supervision_rate}%</strong> dos relatórios de IA foram
                supervisionados por um médico. O loop de aprendizado precisa de mais feedback
                clínico — {loopHealth.active_reviewers === 0 ? 'nenhum médico revisou até agora' : `só ${loopHealth.active_reviewers} médico(s) revisando`}.
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="bg-white rounded-xl shadow p-5">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="w-4 h-4 text-[#7d4a3c]" />
                <p className="text-xs text-gray-500 uppercase tracking-wide">Relatórios de IA</p>
              </div>
              <p className="text-2xl font-bold text-gray-800">{loopHealth.total_reports}</p>
              <p className="text-xs text-gray-400 mt-0.5">Briefings + planos gerados</p>
            </div>

            <div className="bg-white rounded-xl shadow p-5">
              <div className="flex items-center gap-2 mb-2">
                <Clock className={`w-4 h-4 ${loopHealth.awaiting_feedback > 0 ? 'text-yellow-500' : 'text-gray-300'}`} />
                <p className="text-xs text-gray-500 uppercase tracking-wide">Aguardando feedback</p>
              </div>
              <p className="text-2xl font-bold text-gray-800">{loopHealth.awaiting_feedback}</p>
              <p className="text-xs text-gray-400 mt-0.5">Sem veredito médico</p>
            </div>

            <div className="bg-white rounded-xl shadow p-5">
              <div className="flex items-center gap-2 mb-2">
                <ClipboardCheck className={`w-4 h-4 ${loopHealth.supervision_rate >= 20 ? 'text-green-500' : 'text-amber-500'}`} />
                <p className="text-xs text-gray-500 uppercase tracking-wide">Taxa de supervisão</p>
              </div>
              <p className="text-2xl font-bold text-gray-800">{loopHealth.supervision_rate}%</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {loopHealth.verdict_accept}✓ · {loopHealth.verdict_accept_with_edits}✎ · {loopHealth.verdict_reject}✗
              </p>
            </div>

            <div className="bg-white rounded-xl shadow p-5">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-blue-500" />
                <p className="text-xs text-gray-500 uppercase tracking-wide">Revisores ativos</p>
              </div>
              <p className="text-2xl font-bold text-gray-800">{loopHealth.active_reviewers}</p>
              <p className="text-xs text-gray-400 mt-0.5">Médicos dando feedback</p>
            </div>

            <div className="bg-white rounded-xl shadow p-5">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-purple-500" />
                <p className="text-xs text-gray-500 uppercase tracking-wide">Condutas c/ desfecho</p>
              </div>
              <p className="text-2xl font-bold text-gray-800">
                {loopHealth.conducts_with_outcome}<span className="text-base font-normal text-gray-400">/{loopHealth.conducts_total}</span>
              </p>
              <p className="text-xs text-gray-400 mt-0.5">Resultado já medido (7/30/90d)</p>
            </div>
          </div>
        </section>
      )}

      {/* ── Cadastros pendentes de aprovação ─────────────── */}
      <div className="bg-white rounded-xl shadow">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800">Cadastros pendentes de aprovação</h3>
        </div>

        {(summary?.pendingDoctors.length ?? 0) === 0 ? (
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
                    CRM: {doctor.crm}/{doctor.crm_state} · {doctor.specialty}
                  </p>
                  <p className="text-xs text-gray-500">{formatDate(doctor.created_at)}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApproveDoctor(doctor.id)}
                    className="px-4 py-2 bg-[#7d4a3c] hover:bg-[#623a2f] text-white rounded-lg text-sm font-medium flex items-center gap-1 transition"
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

      {/* ── Links rápidos ─────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Link to="/admin/medicos" className="bg-white rounded-xl shadow p-5 hover:shadow-lg transition">
          <Users className="w-7 h-7 text-[#7d4a3c] mb-2" />
          <h4 className="font-semibold text-gray-800 text-sm">Médicos</h4>
          <p className="text-xs text-gray-500">Aprovar e gerenciar</p>
        </Link>
        <Link to="/admin/empresas" className="bg-white rounded-xl shadow p-5 hover:shadow-lg transition">
          <Building2 className="w-7 h-7 text-[#7d4a3c] mb-2" />
          <h4 className="font-semibold text-gray-800 text-sm">Empresas</h4>
          <p className="text-xs text-gray-500">B2B, assentos e MRR</p>
        </Link>
        <Link to="/admin/impacto" className="bg-white rounded-xl shadow p-5 hover:shadow-lg transition">
          <Leaf className="w-7 h-7 text-green-600 mb-2" />
          <h4 className="font-semibold text-gray-800 text-sm">Impacto</h4>
          <p className="text-xs text-gray-500">ESG e certificados</p>
        </Link>
        <Link to="/admin/financeiro" className="bg-white rounded-xl shadow p-5 hover:shadow-lg transition">
          <DollarSign className="w-7 h-7 text-purple-600 mb-2" />
          <h4 className="font-semibold text-gray-800 text-sm">Financeiro</h4>
          <p className="text-xs text-gray-500">Repasses e receita</p>
        </Link>
        <Link to="/admin/usuarios" className="bg-white rounded-xl shadow p-5 hover:shadow-lg transition">
          <CreditCard className="w-7 h-7 text-blue-600 mb-2" />
          <h4 className="font-semibold text-gray-800 text-sm">Assinantes</h4>
          <p className="text-xs text-gray-500">Planos e cobrança</p>
        </Link>
        <Link to="/admin/suporte" className="bg-white rounded-xl shadow p-5 hover:shadow-lg transition">
          <MessageSquare className="w-7 h-7 text-indigo-500 mb-2" />
          <h4 className="font-semibold text-gray-800 text-sm">Suporte</h4>
          <p className="text-xs text-gray-500">Chamados e tickets</p>
        </Link>
        <Link to="/admin/configuracoes" className="bg-white rounded-xl shadow p-5 hover:shadow-lg transition">
          <BarChart2 className="w-7 h-7 text-gray-500 mb-2" />
          <h4 className="font-semibold text-gray-800 text-sm">Configurações</h4>
          <p className="text-xs text-gray-500">Configurações globais</p>
        </Link>
      </div>
    </div>
  );
};
