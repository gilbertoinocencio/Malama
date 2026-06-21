// =====================================================
// Malama — Gestão de Usuários (Admin)
// =====================================================

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  Search, X, User, Calendar, DollarSign,
  Stethoscope, Globe, Share2, TrendingUp, Hash, Mail, Clock, CheckCircle,
  Building2, UserCheck,
} from 'lucide-react';
import { adminService } from '../../services/doctorPortalService';
import type { AdminUserSummary, AdminUserDetail, AdminColaboradorB2B } from '../../services/doctorPortalService';
import { planPricesService, adminBillingService } from '../../services/billingService';
import type { PlanPrice } from '../../services/billingService';
import type { CreditWithDetails, CreditStatus } from '../../types/billing';
import { AdminSubscriptions } from './AdminSubscriptions';
import { supabase } from '../../services/supabase';
import toast from 'react-hot-toast';

interface PatientLead {
  id: string;
  nome: string;
  email: string;
  objetivo: string;
  origem: string | null;
  status: 'pendente' | 'convidado';
  invited_at: string | null;
  created_at: string;
}

const OBJETIVO_LABELS: Record<string, string> = {
  perda_peso: 'Perda de peso',
  ganho_muscular: 'Ganho muscular',
  saude_longevidade: 'Saúde e longevidade',
  condicao_clinica: 'Condição clínica',
  acompanhamento_glp1: 'Acompanhamento GLP-1',
  outro: 'Outro',
};

// ─── helpers ───────────────────────────────────────────
const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

const fmtCurrency = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const CHANNEL_LABELS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  referral: { label: 'Indicação médica', color: 'bg-purple-100 text-purple-700', icon: <Stethoscope className="w-3 h-3" /> },
  website:  { label: 'Site',             color: 'bg-blue-100 text-blue-700',     icon: <Globe className="w-3 h-3" /> },
  social:   { label: 'Redes sociais',    color: 'bg-pink-100 text-pink-700',     icon: <Share2 className="w-3 h-3" /> },
  organic:  { label: 'Orgânico',         color: 'bg-gray-100 text-gray-600',     icon: <TrendingUp className="w-3 h-3" /> },
  other:    { label: 'Outro',            color: 'bg-yellow-100 text-yellow-700', icon: <Hash className="w-3 h-3" /> },
};

const ChannelBadge: React.FC<{ channel: string | null }> = ({ channel }) => {
  const c = channel ? CHANNEL_LABELS[channel] : null;
  if (!c) return <span className="text-gray-400 text-xs">—</span>;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${c.color}`}>
      {c.icon}{c.label}
    </span>
  );
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, string> = {
    completed:   'bg-green-100 text-green-700',
    scheduled:   'bg-blue-100 text-blue-700',
    cancelled:   'bg-red-100 text-red-700',
    no_show:     'bg-orange-100 text-orange-700',
    in_progress: 'bg-yellow-100 text-yellow-700',
  };
  const labelMap: Record<string, string> = {
    completed: 'Concluída', scheduled: 'Agendada', cancelled: 'Cancelada',
    no_show: 'Faltou', in_progress: 'Em andamento',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {labelMap[status] ?? status}
    </span>
  );
};

const TypeLabel: Record<string, string> = {
  initial: 'Inicial', follow_up: 'Retorno', prescription_renewal: 'Renovação',
};

// ─── Avatar ────────────────────────────────────────────
const Avatar: React.FC<{ name: string | null; url: string | null; size?: 'sm' | 'md' | 'lg' }> = ({ name, url, size = 'sm' }) => {
  const sz = size === 'lg' ? 'w-16 h-16 text-2xl' : size === 'md' ? 'w-10 h-10 text-base' : 'w-8 h-8 text-sm';
  return (
    <div className={`${sz} rounded-full bg-[#7d4a3c] flex-shrink-0 flex items-center justify-center overflow-hidden`}>
      {url
        ? <img src={url} alt={name ?? ''} className="w-full h-full object-cover" />
        : <span className="text-white font-semibold">{name?.charAt(0)?.toUpperCase() ?? '?'}</span>
      }
    </div>
  );
};

// ─── Tooltip customizado ───────────────────────────────
const CustomTooltip: React.FC<any> = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0].payload;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow px-3 py-2 text-sm">
      <p className="font-medium text-gray-800">{name}</p>
      <p className="text-[#7d4a3c] font-bold">{value} usuário{value !== 1 ? 's' : ''}</p>
    </div>
  );
};

// ─── Gráfico de pizza simples com legenda própria ──────
const COLORS = ['#7d4a3c', '#3498DB', '#9B59B6', '#E74C3C', '#F39C12', '#1ABC9C', '#95A5A6'];

const MiniPie: React.FC<{ data: { name: string; value: number }[]; title: string }> = ({ data, title }) => {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return (
    <div className="bg-white rounded-xl shadow p-5">
      <p className="text-sm font-semibold text-gray-700 mb-4">{title}</p>
      <p className="text-center text-gray-400 text-sm py-6">Sem dados</p>
    </div>
  );
  return (
    <div className="bg-white rounded-xl shadow p-5">
      <p className="text-sm font-semibold text-gray-700 mb-3">{title}</p>
      <div className="flex items-center gap-4">
        <ResponsiveContainer width={110} height={110}>
          <PieChart>
            <Pie data={data} dataKey="value" cx="50%" cy="50%" innerRadius={30} outerRadius={50} strokeWidth={0}>
              {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
          {data.map((d, i) => (
            <div key={d.name} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                <span className="text-xs text-gray-600 truncate">{d.name}</span>
              </div>
              <span className="text-xs font-semibold text-gray-700 flex-shrink-0">
                {d.value} <span className="text-gray-400 font-normal">({Math.round(d.value / total * 100)}%)</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── Gráfico de barras horizontal simples ─────────────
const MiniBar: React.FC<{ data: { name: string; value: number }[]; title: string; color?: string }> = ({
  data, title, color = '#7d4a3c'
}) => {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="bg-white rounded-xl shadow p-5">
      <p className="text-sm font-semibold text-gray-700 mb-4">{title}</p>
      <div className="space-y-2.5">
        {data.map(d => (
          <div key={d.name}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-600">{d.name}</span>
              <span className="font-semibold text-gray-700">{d.value}</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${(d.value / max) * 100}%`, background: color }}
              />
            </div>
          </div>
        ))}
        {data.every(d => d.value === 0) && (
          <p className="text-center text-gray-400 text-sm py-4">Sem dados</p>
        )}
      </div>
    </div>
  );
};

// ─── hook: dados derivados para gráficos ───────────────
function useChartData(users: AdminUserSummary[]) {
  return useMemo(() => {
    // Gênero
    const genderCount = { male: 0, female: 0, unknown: 0 };
    users.forEach(u => {
      if (u.gender === 'male') genderCount.male++;
      else if (u.gender === 'female') genderCount.female++;
      else genderCount.unknown++;
    });
    const gender = [
      { name: 'Masculino', value: genderCount.male },
      { name: 'Feminino',  value: genderCount.female },
      { name: 'N/D',       value: genderCount.unknown },
    ].filter(d => d.value > 0);

    // Faixa etária
    const ageBuckets: Record<string, number> = {
      '< 20':  0, '20–29': 0, '30–39': 0,
      '40–49': 0, '50+':   0, 'N/D':   0,
    };
    users.forEach(u => {
      const a = u.age;
      if (a == null)     ageBuckets['N/D']++;
      else if (a < 20)   ageBuckets['< 20']++;
      else if (a < 30)   ageBuckets['20–29']++;
      else if (a < 40)   ageBuckets['30–39']++;
      else if (a < 50)   ageBuckets['40–49']++;
      else               ageBuckets['50+']++;
    });
    const ageData = Object.entries(ageBuckets).map(([name, value]) => ({ name, value }));

    // Objetivos
    const goalMap: Record<string, string> = {
      aesthetic: 'Estética', health: 'Saúde', performance: 'Performance',
    };
    const goalCount: Record<string, number> = { aesthetic: 0, health: 0, performance: 0, other: 0 };
    users.forEach(u => {
      const k = u.goal && goalCount[u.goal] !== undefined ? u.goal : 'other';
      goalCount[k]++;
    });
    const goalData = [
      { name: 'Estética',    value: goalCount.aesthetic   },
      { name: 'Saúde',       value: goalCount.health      },
      { name: 'Performance', value: goalCount.performance },
      { name: 'N/D',         value: goalCount.other       },
    ].filter(d => d.value > 0);

    // Tempo no app (desde o cadastro até hoje)
    const now = Date.now();
    const timeBuckets: Record<string, number> = {
      '< 1 mês': 0, '1–3 meses': 0, '3–6 meses': 0, '6–12 meses': 0, '> 1 ano': 0,
    };
    users.forEach(u => {
      const days = (now - new Date(u.created_at).getTime()) / 86_400_000;
      if (days < 30)        timeBuckets['< 1 mês']++;
      else if (days < 90)   timeBuckets['1–3 meses']++;
      else if (days < 180)  timeBuckets['3–6 meses']++;
      else if (days < 365)  timeBuckets['6–12 meses']++;
      else                  timeBuckets['> 1 ano']++;
    });
    const timeData = Object.entries(timeBuckets).map(([name, value]) => ({ name, value }));

    // Canal de aquisição
    const channelCount: Record<string, number> = {
      referral: 0, website: 0, social: 0, organic: 0, other: 0,
    };
    users.forEach(u => {
      const k = u.acquisition_channel ?? 'organic';
      channelCount[k] = (channelCount[k] ?? 0) + 1;
    });
    const channelData = [
      { name: 'Indicação',    value: channelCount.referral },
      { name: 'Site',         value: channelCount.website  },
      { name: 'Redes sociais',value: channelCount.social   },
      { name: 'Orgânico',     value: channelCount.organic  },
      { name: 'Outro',        value: channelCount.other    },
    ].filter(d => d.value > 0);

    // Média de idade
    const ages = users.map(u => u.age).filter((a): a is number => a != null);
    const avgAge = ages.length ? Math.round(ages.reduce((s, a) => s + a, 0) / ages.length) : null;

    return { gender, ageData, goalData, timeData, channelData, avgAge };
  }, [users]);
}

// ─── helpers de crédito (usados só no drawer) ──────────
const CREDIT_STATUS_LABEL: Record<CreditStatus, string> = {
  disponivel:             'Disponível',
  agendada:               'Agendada',
  realizada:              'Realizada',
  expirada:               'Expirada',
  perdida_cancelamento:   'Perdida',
  cancelada_reagendada:   'Reagendada',
};
const CREDIT_STATUS_COLOR: Record<CreditStatus, string> = {
  disponivel:             'bg-green-100 text-green-700',
  agendada:               'bg-blue-100 text-blue-700',
  realizada:              'bg-gray-100 text-gray-600',
  expirada:               'bg-orange-100 text-orange-700',
  perdida_cancelamento:   'bg-red-100 text-red-700',
  cancelada_reagendada:   'bg-purple-100 text-purple-700',
};
function fmtMonthRef(d: string) {
  const [y, m] = d.split('-');
  return ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][parseInt(m,10)-1] + '/' + y;
}

// ─── Drawer de ficha ───────────────────────────────────
const UserDrawer: React.FC<{ userId: string; onClose: () => void }> = ({ userId, onClose }) => {
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [credits, setCredits] = useState<CreditWithDetails[]>([]);

  useEffect(() => {
    Promise.all([
      adminService.getUserDetail(userId),
      adminBillingService.listCredits({ user_id: userId }),
    ]).then(([u, c]) => {
      setUser(u);
      setCredits(c);
    }).finally(() => setLoading(false));
  }, [userId]);

  const goalLabel: Record<string, string> = { aesthetic: 'Estética', health: 'Saúde', performance: 'Performance' };
  const genderLabel: Record<string, string> = { male: 'Masculino', female: 'Feminino' };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-white h-full shadow-2xl flex flex-col overflow-hidden">
        <div className="bg-[#1A1A1A] px-6 py-5 flex items-center justify-between flex-shrink-0">
          <h2 className="text-white font-semibold text-lg">Ficha do usuário</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-4 border-[#7d4a3c] border-t-transparent animate-spin" />
          </div>
        ) : !user ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">Usuário não encontrado.</div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Identidade */}
            <div className="flex items-center gap-4">
              <Avatar name={user.display_name} url={user.avatar_url} size="lg" />
              <div>
                <p className="text-gray-800 font-semibold text-xl">{user.display_name ?? 'Sem nome'}</p>
                <p className="text-gray-500 text-sm mt-0.5">Desde {fmtDate(user.created_at)}</p>
                <div className="mt-1"><ChannelBadge channel={user.acquisition_channel} /></div>
              </div>
            </div>

            {/* Indicação */}
            {user.referred_by_doctor_name && (
              <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 flex items-start gap-3">
                <Stethoscope className="w-5 h-5 text-purple-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-purple-800">Indicado por</p>
                  <p className="text-purple-700 font-semibold">{user.referred_by_doctor_name}</p>
                </div>
              </div>
            )}

            {/* LTV Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[#FDFBF9] rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-[#7d4a3c]">{fmtCurrency(user.ltv)}</p>
                <p className="text-xs text-gray-500 mt-1">LTV total</p>
              </div>
              <div className="bg-[#FDFBF9] rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-gray-800">{user.consultations_count}</p>
                <p className="text-xs text-gray-500 mt-1">Consultas</p>
              </div>
              <div className="bg-[#FDFBF9] rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-gray-800">
                  {user.consultations_count > 0 ? fmtCurrency(user.ltv / user.consultations_count) : '—'}
                </p>
                <p className="text-xs text-gray-500 mt-1">Ticket médio</p>
              </div>
            </div>

            {/* Dados pessoais */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Dados pessoais</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Idade',    value: user.age ? `${user.age} anos` : null },
                  { label: 'Gênero',   value: user.gender ? genderLabel[user.gender] : null },
                  { label: 'Peso',     value: user.weight ? `${user.weight} kg` : null },
                  { label: 'Altura',   value: user.height ? `${user.height} cm` : null },
                  { label: 'Objetivo', value: user.goal ? goalLabel[user.goal] : null },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-[#FDFBF9] rounded-lg p-3">
                    <p className="text-xs text-gray-400">{label}</p>
                    <p className="text-sm font-medium text-gray-700 mt-0.5">{value ?? '—'}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Gamificação */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Engajamento</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-[#FDFBF9] rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-gray-800">Nv. {user.level}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Nível</p>
                </div>
                <div className="bg-[#FDFBF9] rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-gray-800">{user.total_xp.toLocaleString()}</p>
                  <p className="text-xs text-gray-400 mt-0.5">XP total</p>
                </div>
                <div className="bg-[#FDFBF9] rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-gray-800">{user.current_streak}🔥</p>
                  <p className="text-xs text-gray-400 mt-0.5">Sequência</p>
                </div>
              </div>
            </div>

            {/* Créditos de consulta */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Créditos de consulta</h3>
              {credits.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-3">Nenhum crédito registrado.</p>
              ) : (
                <div className="space-y-1.5">
                  {credits.map(c => (
                    <div key={c.id} className="bg-[#FDFBF9] rounded-xl px-3 py-2.5 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-gray-600">{fmtMonthRef(c.month_reference)}</p>
                        {c.doctor_name && <p className="text-xs text-gray-400 truncate">{c.doctor_name}</p>}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {c.late_cancellations_count > 0 && (
                          <span className={`text-xs font-semibold ${c.late_cancellations_count >= 2 ? 'text-red-500' : 'text-orange-400'}`}>
                            {c.late_cancellations_count}× cancel. tardio
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CREDIT_STATUS_COLOR[c.status]}`}>
                          {CREDIT_STATUS_LABEL[c.status]}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Consultas */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Histórico de consultas</h3>
              {user.consultations.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Nenhuma consulta ainda.</p>
              ) : (
                <div className="space-y-2">
                  {user.consultations.map(c => (
                    <div key={c.id} className="bg-[#FDFBF9] rounded-xl p-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{c.doctor_name ?? 'Médico'}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {fmtDate(c.scheduled_at)} · {TypeLabel[c.type] ?? c.type}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <StatusBadge status={c.status} />
                        {c.price != null && (
                          <span className="text-sm font-semibold text-gray-700">{fmtCurrency(c.price)}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Editor de preços de planos B2C ───────────────────
const PLAN_CYCLES = ['mensal', 'semestral', 'anual'] as const;
const PLAN_TYPES  = ['essencial', 'glp1'] as const;
const PLAN_LABELS: Record<string, string> = { essencial: 'Essencial', glp1: 'GLP-1' };
const CYCLE_LABELS: Record<string, string> = { mensal: 'Mensal', semestral: 'Semestral', anual: 'Anual' };

const PlanPricesEditor: React.FC = () => {
  const [prices, setPrices] = React.useState<Record<string, string>>({});
  const [loadingPrices, setLoadingPrices] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    planPricesService.getAll()
      .then((data: PlanPrice[]) => {
        const map: Record<string, string> = {};
        data.forEach(p => { map[`${p.plan_type}_${p.billing_cycle}`] = String(p.price); });
        setPrices(map);
      })
      .catch(() => {})
      .finally(() => setLoadingPrices(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all(
        PLAN_TYPES.flatMap(plan =>
          PLAN_CYCLES.map(cycle =>
            planPricesService.upsert(plan, cycle, parseFloat(prices[`${plan}_${cycle}`] || '0'))
          )
        )
      );
      toast.success('Preços salvos!');
    } catch {
      toast.error('Erro ao salvar preços. Verifique se a tabela plan_prices existe no banco.');
    } finally {
      setSaving(false);
    }
  };

  if (loadingPrices) return (
    <div className="bg-white rounded-xl shadow p-5 flex justify-center py-10">
      <div className="w-6 h-6 rounded-full border-2 border-[#7d4a3c] border-t-transparent animate-spin" />
    </div>
  );

  return (
    <div className="bg-white rounded-xl shadow p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-gray-800">Preços dos Planos B2C</h3>
          <p className="text-xs text-gray-500 mt-0.5">Valores cobrados por plano e ciclo de cobrança.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-[#7d4a3c] hover:bg-[#623a2f] text-white text-sm font-semibold rounded-lg transition disabled:opacity-50"
        >
          {saving ? 'Salvando...' : 'Salvar preços'}
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PLAN_TYPES.map(plan => (
          <div key={plan} className="border border-gray-100 rounded-xl p-4">
            <p className="text-sm font-semibold text-gray-700 mb-3">
              {plan === 'glp1' ? '💊' : '⚡'} Plano {PLAN_LABELS[plan]}
            </p>
            <div className="space-y-3">
              {PLAN_CYCLES.map(cycle => (
                <div key={cycle} className="flex items-center gap-3">
                  <label className="text-xs text-gray-500 w-20">{CYCLE_LABELS[cycle]}</label>
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">R$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={prices[`${plan}_${cycle}`] ?? ''}
                      onChange={e => setPrices(p => ({ ...p, [`${plan}_${cycle}`]: e.target.value }))}
                      placeholder="0,00"
                      className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#7d4a3c] focus:border-transparent"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Componente principal ──────────────────────────────
export const AdminUsersManagement: React.FC = () => {
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [vinculos, setVinculos] = useState<Record<string, string>>({});

  // Fila de espera
  const [activeTab, setActiveTab] = useState<'usuarios' | 'fila' | 'b2b' | 'assinantes'>('usuarios');
  const [patientLeads, setPatientLeads] = useState<PatientLead[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [leadSearch, setLeadSearch] = useState('');
  const [invitingLeadId, setInvitingLeadId] = useState<string | null>(null);

  // Colaboradores B2B
  const [colabsB2B, setColabsB2B] = useState<AdminColaboradorB2B[]>([]);
  const [b2bLoading, setB2bLoading] = useState(false);
  const [b2bSearch, setB2bSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, vinc] = await Promise.all([
        adminService.getAllUsers(search || undefined),
        adminService.getVinculosEmpresa(),
      ]);
      setUsers(data);
      setVinculos(vinc);
    } catch (err) {
      console.error('Erro ao carregar usuários:', err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => {
    if (activeTab === 'fila') loadPatientLeads();
    if (activeTab === 'b2b') loadColabsB2B();
  }, [activeTab]);

  const loadColabsB2B = async () => {
    setB2bLoading(true);
    try {
      const data = await adminService.getAllColaboradoresB2B();
      setColabsB2B(data);
    } catch (err) {
      console.error('Erro ao carregar colaboradores B2B:', err);
    } finally {
      setB2bLoading(false);
    }
  };

  const loadPatientLeads = async () => {
    setLeadsLoading(true);
    try {
      const { data, error } = await supabase
        .from('patient_leads')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error) setPatientLeads(data ?? []);
    } finally {
      setLeadsLoading(false);
    }
  };

  const handleInvitePatientLead = async (lead: PatientLead) => {
    setInvitingLeadId(lead.id);
    try {
      const { error } = await supabase.functions.invoke('invite-lead', {
        body: {
          email: lead.email,
          type: 'patient',
          lead_id: lead.id,
          redirect_to: `${window.location.origin}/entrar?signup=true`,
        },
      });
      if (error) throw error;
      toast.success(`Convite enviado para ${lead.email}`);
      loadPatientLeads();
    } catch {
      toast.error('Erro ao enviar convite. Tente novamente.');
    } finally {
      setInvitingLeadId(null);
    }
  };

  const filtered = channelFilter === 'all'
    ? users
    : channelFilter === 'b2b'
      ? users.filter(u => !!vinculos[u.id])
      : users.filter(u => (u.acquisition_channel ?? 'organic') === channelFilter);

  const charts = useChartData(filtered);

  const totalLtv      = filtered.reduce((sum, u) => sum + u.ltv, 0);
  const totalConsults = filtered.reduce((sum, u) => sum + u.consultations_count, 0);
  const referralCount = filtered.filter(u => u.acquisition_channel === 'referral').length;
  const b2bCount      = users.filter(u => !!vinculos[u.id]).length;
  const b2cCount      = users.length - b2bCount;

  return (
    <div className="space-y-6">

      {/* ── Abas ── */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('usuarios')}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'usuarios' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Usuários Cadastrados
        </button>
        <button
          onClick={() => setActiveTab('b2b')}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'b2b' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Colaboradores B2B
          {Object.keys(vinculos).length > 0 && (
            <span className="ml-2 px-1.5 py-0.5 bg-blue-600 text-white text-xs rounded-full">
              {Object.keys(vinculos).length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('fila')}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'fila' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Fila de Espera
          {patientLeads.filter(l => l.status === 'pendente').length > 0 && (
            <span className="ml-2 px-1.5 py-0.5 bg-[#7d4a3c] text-white text-xs rounded-full">
              {patientLeads.filter(l => l.status === 'pendente').length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('assinantes')}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'assinantes' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Assinantes B2C
        </button>
      </div>

      {activeTab === 'b2b' ? (
        <div className="space-y-4">
          {/* Cards de resumo */}
          <div className="grid grid-cols-3 gap-4">
            {[
              {
                icon: <Building2 className="w-5 h-5 text-blue-600" />,
                label: 'Total de colaboradores',
                value: colabsB2B.length,
                bg: 'bg-blue-50',
              },
              {
                icon: <UserCheck className="w-5 h-5 text-green-600" />,
                label: 'Ativos (cadastrados)',
                value: colabsB2B.filter(c => c.status === 'ativo').length,
                bg: 'bg-green-50',
              },
              {
                icon: <Clock className="w-5 h-5 text-yellow-600" />,
                label: 'Aguardando cadastro',
                value: colabsB2B.filter(c => c.status === 'convidado').length,
                bg: 'bg-yellow-50',
              },
            ].map(({ icon, label, value, bg }) => (
              <div key={label} className={`${bg} rounded-xl p-4 flex items-center gap-3`}>
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center flex-shrink-0 shadow-sm">
                  {icon}
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-800">{value}</p>
                  <p className="text-xs text-gray-500">{label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Busca */}
          <div className="bg-white rounded-xl shadow p-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={b2bSearch}
                onChange={e => setB2bSearch(e.target.value)}
                placeholder="Buscar por nome, email ou empresa..."
                className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>

          {/* Tabela */}
          <div className="bg-white rounded-xl shadow overflow-hidden">
            {b2bLoading ? (
              <div className="flex items-center justify-center h-40">
                <div className="w-8 h-8 rounded-full border-4 border-[#7d4a3c] border-t-transparent animate-spin" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Colaborador</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Empresa</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Adicionado em</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Ativado em</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {colabsB2B
                      .filter(c => {
                        if (!b2bSearch) return true;
                        const q = b2bSearch.toLowerCase();
                        return (
                          c.email.toLowerCase().includes(q) ||
                          (c.display_name ?? '').toLowerCase().includes(q) ||
                          c.empresa_nome.toLowerCase().includes(q)
                        );
                      })
                      .map(c => (
                        <tr key={c.id} className="hover:bg-gray-50 transition">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <Avatar name={c.display_name ?? c.email} url={c.avatar_url} size="sm" />
                              <div>
                                <p className="font-medium text-gray-800 text-sm">
                                  {c.display_name ?? <span className="text-gray-400 italic">Sem nome</span>}
                                </p>
                                <p className="text-xs text-gray-400">{c.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1 text-sm text-blue-700 font-medium">
                              <Building2 className="w-3.5 h-3.5" />
                              {c.empresa_nome}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {c.status === 'ativo' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                                <UserCheck className="w-3 h-3" /> Ativo
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs">
                                <Clock className="w-3 h-3" /> Aguardando
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500 hidden md:table-cell">
                            {fmtDate(c.data_adicao)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500 hidden lg:table-cell">
                            {c.data_ativacao ? fmtDate(c.data_ativacao) : <span className="text-gray-300">—</span>}
                          </td>
                        </tr>
                      ))}
                    {colabsB2B.length === 0 && !b2bLoading && (
                      <tr>
                        <td colSpan={5} className="px-4 py-12 text-center text-gray-400 text-sm">
                          Nenhum colaborador B2B encontrado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : activeTab === 'fila' ? (
        <div className="space-y-4">
          {/* Busca leads */}
          <div className="bg-white rounded-xl shadow p-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={leadSearch}
                onChange={e => setLeadSearch(e.target.value)}
                placeholder="Buscar por nome ou email..."
                className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>

          {/* Tabela de leads */}
          <div className="bg-white rounded-xl shadow overflow-hidden">
            {leadsLoading ? (
              <div className="flex items-center justify-center h-40">
                <div className="w-8 h-8 rounded-full border-4 border-[#7d4a3c] border-t-transparent animate-spin" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Email</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Objetivo</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Origem</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Cadastro</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {patientLeads
                      .filter(l => !leadSearch ||
                        l.nome.toLowerCase().includes(leadSearch.toLowerCase()) ||
                        l.email.toLowerCase().includes(leadSearch.toLowerCase()))
                      .map(lead => (
                        <tr key={lead.id} className="hover:bg-gray-50 transition">
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-800">{lead.nome}</p>
                            <p className="text-xs text-gray-500 md:hidden">{lead.email}</p>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell">{lead.email}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 hidden lg:table-cell">
                            {OBJETIVO_LABELS[lead.objetivo] ?? lead.objetivo}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500 hidden md:table-cell">
                            {lead.origem ?? <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-4 py-3">
                            {lead.status === 'convidado' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                                <CheckCircle className="w-3 h-3" /> Convidado
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs">
                                <Clock className="w-3 h-3" /> Pendente
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500 hidden lg:table-cell">
                            {fmtDate(lead.created_at)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {lead.status === 'pendente' && (
                              <button
                                onClick={() => handleInvitePatientLead(lead)}
                                disabled={invitingLeadId === lead.id}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#7d4a3c] hover:bg-[#623a2f] text-white text-xs font-medium rounded-lg transition disabled:opacity-50"
                              >
                                <Mail className="w-3.5 h-3.5" />
                                {invitingLeadId === lead.id ? 'Enviando...' : 'Convidar'}
                              </button>
                            )}
                            {lead.status === 'convidado' && lead.invited_at && (
                              <span className="text-xs text-gray-400">{fmtDate(lead.invited_at)}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    {patientLeads.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-gray-400 text-sm">
                          Nenhum paciente na fila de espera ainda.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : activeTab === 'assinantes' ? (
        <div className="space-y-6">
          <PlanPricesEditor />
          <AdminSubscriptions />
        </div>
      ) : (
        <>
      {/* ── Cards de métricas ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {[
          { icon: <User className="w-5 h-5 text-[#7d4a3c]" />,        label: 'Total de usuários',     value: users.length.toString(),     accent: false },
          { icon: <User className="w-5 h-5 text-blue-600" />,          label: 'B2B (empresas)',         value: b2bCount.toString(),          accent: false, color: 'bg-blue-50 text-blue-600' },
          { icon: <User className="w-5 h-5 text-green-600" />,         label: 'B2C (direto)',           value: b2cCount.toString(),          accent: false, color: 'bg-green-50 text-green-600' },
          { icon: <DollarSign className="w-5 h-5 text-[#7d4a3c]" />,  label: 'LTV acumulado',         value: fmtCurrency(totalLtv),        accent: false },
          { icon: <Calendar className="w-5 h-5 text-[#7d4a3c]" />,    label: 'Consultas realizadas',  value: totalConsults.toString(),      accent: false },
          { icon: <Stethoscope className="w-5 h-5 text-[#7d4a3c]" />, label: 'Via indicação médica',  value: referralCount.toString(),      accent: false },
        ].map(({ icon, label, value, color }) => (
          <div key={label} className="bg-white rounded-xl shadow p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${color ? color : 'bg-[#7d4a3c]/10'}`}>
              {icon}
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Gráficos de perfil da base ── */}
      {!loading && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide px-1">
            Perfil da base {channelFilter !== 'all' && `· ${CHANNEL_LABELS[channelFilter]?.label ?? channelFilter}`}
            {charts.avgAge != null && (
              <span className="ml-3 text-gray-400 font-normal normal-case">Idade média: <strong className="text-gray-600">{charts.avgAge} anos</strong></span>
            )}
          </h2>

          {/* Linha 1: Gênero + Objetivo + Canal */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MiniPie data={charts.gender}      title="Distribuição por sexo" />
            <MiniPie data={charts.goalData}    title="Objetivo no app" />
            <MiniPie data={charts.channelData} title="Canal de aquisição" />
          </div>

          {/* Linha 2: Faixa etária + Tempo no app */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <MiniBar data={charts.ageData}  title="Faixa etária" />
            <MiniBar data={charts.timeData} title="Tempo no app" color="#3498DB" />
          </div>
        </div>
      )}

      {/* ── Filtros ── */}
      <div className="bg-white rounded-xl shadow p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome ou médico indicador..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#7d4a3c] focus:border-transparent"
          />
        </div>
        <select
          value={channelFilter}
          onChange={e => setChannelFilter(e.target.value)}
          className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-[#7d4a3c] focus:border-transparent"
        >
          <option value="all">Todos os canais</option>
          <option value="b2b">B2B (empresas)</option>
          <option value="referral">Indicação médica</option>
          <option value="website">Site</option>
          <option value="social">Redes sociais</option>
          <option value="organic">Orgânico</option>
          <option value="other">Outro</option>
        </select>
      </div>

      {/* ── Tabela ── */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 rounded-full border-4 border-[#7d4a3c] border-t-transparent animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <User className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Nenhum usuário encontrado.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuário</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Canal</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Indicado por</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Cadastro</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Consultas</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">LTV</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ficha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(user => (
                  <tr key={user.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={user.display_name} url={user.avatar_url} size="sm" />
                        <div>
                          <span className="font-medium text-gray-800 text-sm">
                            {user.display_name ?? <span className="text-gray-400 italic">Sem nome</span>}
                          </span>
                          {vinculos[user.id] && (
                            <p className="text-xs text-blue-600 flex items-center gap-1 mt-0.5">
                              <Building2 className="w-3 h-3 flex-shrink-0" />
                              {vinculos[user.id]}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <ChannelBadge channel={user.acquisition_channel} />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 hidden lg:table-cell">
                      {user.referred_by_doctor_name ?? <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 hidden md:table-cell">
                      {fmtDate(user.created_at)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm font-medium text-gray-700">{user.consultations_count}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-semibold text-[#7d4a3c]">
                        {user.ltv > 0 ? fmtCurrency(user.ltv) : <span className="text-gray-300 font-normal">—</span>}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setSelectedUserId(user.id)}
                        className="px-3 py-1.5 text-xs font-medium bg-[#7d4a3c] hover:bg-[#623a2f] text-white rounded-lg transition"
                      >
                        Ver ficha
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Drawer de ficha ── */}
      {selectedUserId && (
        <UserDrawer userId={selectedUserId} onClose={() => setSelectedUserId(null)} />
      )}
        </>
      )}
    </div>
  );
};
