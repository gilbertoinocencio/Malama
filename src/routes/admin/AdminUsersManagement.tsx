// =====================================================
// NURA — Gestão de Usuários (Admin)
// =====================================================

import React, { useEffect, useState, useCallback } from 'react';
import {
  Search, X, User, Calendar, DollarSign, Activity,
  Stethoscope, Globe, Share2, TrendingUp, Hash
} from 'lucide-react';
import { adminService } from '../../services/doctorPortalService';
import type { AdminUserSummary, AdminUserDetail } from '../../services/doctorPortalService';

// ─── helpers ───────────────────────────────────────────
const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

const fmtCurrency = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const CHANNEL_LABELS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  referral:  { label: 'Indicação médica', color: 'bg-purple-100 text-purple-700', icon: <Stethoscope className="w-3 h-3" /> },
  website:   { label: 'Site',             color: 'bg-blue-100 text-blue-700',     icon: <Globe className="w-3 h-3" /> },
  social:    { label: 'Redes sociais',    color: 'bg-pink-100 text-pink-700',     icon: <Share2 className="w-3 h-3" /> },
  organic:   { label: 'Orgânico',         color: 'bg-gray-100 text-gray-600',     icon: <TrendingUp className="w-3 h-3" /> },
  other:     { label: 'Outro',            color: 'bg-yellow-100 text-yellow-700', icon: <Hash className="w-3 h-3" /> },
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
    completed: 'bg-green-100 text-green-700',
    scheduled: 'bg-blue-100 text-blue-700',
    cancelled: 'bg-red-100 text-red-700',
    no_show:   'bg-orange-100 text-orange-700',
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
    <div className={`${sz} rounded-full bg-[#2ECC71] flex-shrink-0 flex items-center justify-center overflow-hidden`}>
      {url
        ? <img src={url} alt={name ?? ''} className="w-full h-full object-cover" />
        : <span className="text-white font-semibold">{name?.charAt(0)?.toUpperCase() ?? '?'}</span>
      }
    </div>
  );
};

// ─── Drawer de ficha ───────────────────────────────────
const UserDrawer: React.FC<{ userId: string; onClose: () => void }> = ({ userId, onClose }) => {
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService.getUserDetail(userId).then(setUser).finally(() => setLoading(false));
  }, [userId]);

  const goalLabel: Record<string, string> = { aesthetic: 'Estética', health: 'Saúde', performance: 'Performance' };
  const genderLabel: Record<string, string> = { male: 'Masculino', female: 'Feminino' };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-white h-full shadow-2xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="bg-[#1A1A1A] px-6 py-5 flex items-center justify-between flex-shrink-0">
          <h2 className="text-white font-semibold text-lg">Ficha do usuário</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-4 border-[#2ECC71] border-t-transparent animate-spin" />
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
                <div className="mt-1">
                  <ChannelBadge channel={user.acquisition_channel} />
                </div>
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
              <div className="bg-[#F8F9FA] rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-[#2ECC71]">{fmtCurrency(user.ltv)}</p>
                <p className="text-xs text-gray-500 mt-1">LTV total</p>
              </div>
              <div className="bg-[#F8F9FA] rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-gray-800">{user.consultations_count}</p>
                <p className="text-xs text-gray-500 mt-1">Consultas</p>
              </div>
              <div className="bg-[#F8F9FA] rounded-xl p-4 text-center">
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
                  { label: 'Idade', value: user.age ? `${user.age} anos` : null },
                  { label: 'Gênero', value: user.gender ? genderLabel[user.gender] : null },
                  { label: 'Peso', value: user.weight ? `${user.weight} kg` : null },
                  { label: 'Altura', value: user.height ? `${user.height} cm` : null },
                  { label: 'Objetivo', value: user.goal ? goalLabel[user.goal] : null },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-[#F8F9FA] rounded-lg p-3">
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
                <div className="bg-[#F8F9FA] rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-gray-800">Nv. {user.level}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Nível</p>
                </div>
                <div className="bg-[#F8F9FA] rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-gray-800">{user.total_xp.toLocaleString()}</p>
                  <p className="text-xs text-gray-400 mt-0.5">XP total</p>
                </div>
                <div className="bg-[#F8F9FA] rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-gray-800">{user.current_streak}🔥</p>
                  <p className="text-xs text-gray-400 mt-0.5">Sequência</p>
                </div>
              </div>
            </div>

            {/* Histórico de consultas */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                Histórico de consultas
              </h3>
              {user.consultations.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Nenhuma consulta ainda.</p>
              ) : (
                <div className="space-y-2">
                  {user.consultations.map(c => (
                    <div key={c.id} className="bg-[#F8F9FA] rounded-xl p-3 flex items-center justify-between gap-3">
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

// ─── Componente principal ──────────────────────────────
export const AdminUsersManagement: React.FC = () => {
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [channelFilter, setChannelFilter] = useState<string>('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminService.getAllUsers(search || undefined);
      setUsers(data);
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

  const filtered = channelFilter === 'all'
    ? users
    : users.filter(u => (u.acquisition_channel ?? 'organic') === channelFilter);

  const totalLtv = filtered.reduce((sum, u) => sum + u.ltv, 0);
  const totalConsults = filtered.reduce((sum, u) => sum + u.consultations_count, 0);
  const referralCount = filtered.filter(u => u.acquisition_channel === 'referral').length;

  return (
    <div className="space-y-6">

      {/* Cabeçalho com métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: <User className="w-5 h-5 text-[#2ECC71]" />, label: 'Total de usuários', value: filtered.length.toString() },
          { icon: <DollarSign className="w-5 h-5 text-[#2ECC71]" />, label: 'LTV acumulado', value: fmtCurrency(totalLtv) },
          { icon: <Calendar className="w-5 h-5 text-[#2ECC71]" />, label: 'Consultas realizadas', value: totalConsults.toString() },
          { icon: <Stethoscope className="w-5 h-5 text-[#2ECC71]" />, label: 'Via indicação médica', value: referralCount.toString() },
        ].map(({ icon, label, value }) => (
          <div key={label} className="bg-white rounded-xl shadow p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#2ECC71]/10 flex items-center justify-center flex-shrink-0">
              {icon}
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome ou médico indicador..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#2ECC71] focus:border-transparent"
          />
        </div>
        <select
          value={channelFilter}
          onChange={e => setChannelFilter(e.target.value)}
          className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-[#2ECC71] focus:border-transparent"
        >
          <option value="all">Todos os canais</option>
          <option value="referral">Indicação médica</option>
          <option value="website">Site</option>
          <option value="social">Redes sociais</option>
          <option value="organic">Orgânico</option>
          <option value="other">Outro</option>
        </select>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 rounded-full border-4 border-[#2ECC71] border-t-transparent animate-spin" />
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
                        <span className="font-medium text-gray-800 text-sm">
                          {user.display_name ?? <span className="text-gray-400 italic">Sem nome</span>}
                        </span>
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
                      <span className="text-sm font-semibold text-[#2ECC71]">
                        {user.ltv > 0 ? fmtCurrency(user.ltv) : <span className="text-gray-300 font-normal">—</span>}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setSelectedUserId(user.id)}
                        className="px-3 py-1.5 text-xs font-medium bg-[#2ECC71] hover:bg-[#27ae60] text-white rounded-lg transition"
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

      {/* Drawer */}
      {selectedUserId && (
        <UserDrawer userId={selectedUserId} onClose={() => setSelectedUserId(null)} />
      )}
    </div>
  );
};
