// =====================================================
// Malama — Moderação da Comunidade (Admin)
// =====================================================

import React, { useEffect, useState, useCallback } from 'react';
import { Search, Trash2, CheckCircle, Award, Send, Loader2, RefreshCw } from 'lucide-react';
import {
  getModerationQueue,
  resolveReport,
  grantManualBadge,
  sendDoctorBroadcast,
  type ModerationReportItem,
} from '../../services/communityService';
import { supabase } from '../../services/supabase';
import toast from 'react-hot-toast';

type ModerationStatus = 'pending' | 'reviewed' | 'dismissed';

const REASON_LABELS: Record<string, string> = {
  misinformation: 'Info. médica incorreta',
  spam:           'Spam / publi',
  inappropriate:  'Conteúdo inapropriado',
  harassment:     'Outro',
};

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export const AdminCommunityModeration: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ModerationStatus>('pending');
  const [reports, setReports] = useState<ModerationReportItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Badge management
  const [badgeQuery, setBadgeQuery] = useState('');
  const [badgeUsers, setBadgeUsers] = useState<Array<{ id: string; display_name: string; avatar_url: string | null }>>([]);
  const [badgeSearching, setBadgeSearching] = useState(false);
  const [selectedBadgeUser, setSelectedBadgeUser] = useState<{ id: string; display_name: string } | null>(null);
  const [selectedBadgeCode, setSelectedBadgeCode] = useState<'embaixador' | 'medico_Malama'>('embaixador');
  const [grantingBadge, setGrantingBadge] = useState(false);

  // Broadcast
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [broadcastTarget, setBroadcastTarget] = useState<'all' | 'glp1'>('all');
  const [broadcasting, setBroadcasting] = useState(false);

  const loadReports = useCallback(async () => {
    setLoading(true);
    const result = await getModerationQueue(activeTab, 30, 0);
    setReports(result.reports);
    setTotal(result.total);
    setLoading(false);
  }, [activeTab]);

  useEffect(() => { loadReports(); }, [loadReports]);

  const handleResolve = async (reportId: string, action: 'remove' | 'dismiss') => {
    setActionLoading(reportId);
    // Get admin user id from supabase auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error('Sessão expirada.'); setActionLoading(null); return; }

    const ok = await resolveReport(user.id, reportId, action);
    if (ok) {
      toast.success(action === 'remove' ? 'Post removido.' : 'Denúncia dispensada.');
      setReports(prev => prev.filter(r => r.id !== reportId));
    } else {
      toast.error('Erro ao processar ação.');
    }
    setActionLoading(null);
  };

  const handleBadgeSearch = async () => {
    if (!badgeQuery.trim()) return;
    setBadgeSearching(true);
    const { data } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .ilike('display_name', `%${badgeQuery}%`)
      .limit(5);
    setBadgeUsers(data ?? []);
    setBadgeSearching(false);
  };

  const handleGrantBadge = async () => {
    if (!selectedBadgeUser) return;
    setGrantingBadge(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error('Sessão expirada.'); setGrantingBadge(false); return; }

    const ok = await grantManualBadge(user.id, selectedBadgeUser.id, selectedBadgeCode);
    if (ok) {
      toast.success(`Badge ${selectedBadgeCode} concedido para ${selectedBadgeUser.display_name}!`);
      setSelectedBadgeUser(null);
      setBadgeQuery('');
      setBadgeUsers([]);
    } else {
      toast.error('Erro ao conceder badge.');
    }
    setGrantingBadge(false);
  };

  const handleBroadcast = async () => {
    if (!broadcastMsg.trim()) return;
    setBroadcasting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error('Sessão expirada.'); setBroadcasting(false); return; }

    const result = await sendDoctorBroadcast(user.id, broadcastMsg, broadcastTarget);
    toast.success(`Broadcast enviado para ${result.sent} usuário${result.sent !== 1 ? 's' : ''}!`);
    setBroadcastMsg('');
    setBroadcasting(false);
  };

  return (
    <div className="w-full space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Moderação da Comunidade</h1>
          <p className="text-sm text-gray-500 mt-0.5">Fila de denúncias, badges manuais e broadcasts</p>
        </div>
        <button onClick={loadReports} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">
          <RefreshCw size={16} /> Atualizar
        </button>
      </div>

      {/* ── Fila de moderação ── */}
      <section className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Fila de Denúncias</h2>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          {(['pending', 'reviewed', 'dismissed'] as ModerationStatus[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'border-b-2 border-[#7d4a3c] text-[#7d4a3c]'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'pending' ? `Pendentes ${total > 0 && activeTab === 'pending' ? `(${total})` : ''}` :
               tab === 'reviewed' ? 'Revisados' : 'Dispensados'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="p-8 flex items-center justify-center">
            <Loader2 size={24} className="animate-spin text-gray-400" />
          </div>
        ) : reports.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            Nenhuma denúncia {activeTab === 'pending' ? 'pendente' : activeTab === 'reviewed' ? 'revisada' : 'dispensada'}.
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {reports.map(r => (
              <div key={r.id} className="px-6 py-4 flex items-start gap-4">
                {/* Preview do post */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-red-500 bg-red-50 px-2 py-0.5 rounded-full">
                      {REASON_LABELS[r.reason] ?? r.reason}
                    </span>
                    {r.post && (r.post as { report_count?: number }).report_count !== undefined && (
                      <span className="text-xs text-gray-400">
                        {(r.post as { report_count?: number }).report_count} denúncia{((r.post as { report_count?: number }).report_count ?? 0) !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  {r.post?.caption && (
                    <p className="text-sm text-gray-700 line-clamp-2 mb-1">{r.post.caption}</p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span>Denunciado por: <strong className="text-gray-600">{r.reporter?.display_name ?? '—'}</strong></span>
                    <span>{fmtDate(r.created_at)}</span>
                  </div>
                  {r.detail && (
                    <p className="text-xs text-gray-500 mt-1 italic">"{r.detail}"</p>
                  )}
                </div>

                {/* Ações */}
                {activeTab === 'pending' && (
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleResolve(r.id, 'remove')}
                      disabled={actionLoading === r.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100
                        rounded-lg text-xs font-medium transition-colors disabled:opacity-60"
                    >
                      {actionLoading === r.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                      Remover
                    </button>
                    <button
                      onClick={() => handleResolve(r.id, 'dismiss')}
                      disabled={actionLoading === r.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 text-gray-600 hover:bg-gray-100
                        rounded-lg text-xs font-medium transition-colors disabled:opacity-60"
                    >
                      <CheckCircle size={12} />
                      Dispensar
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Gerenciamento de badges manuais ── */}
      <section className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Award size={18} className="text-yellow-500" />
          <h2 className="font-semibold text-gray-800">Conceder Badge Manual</h2>
        </div>

        <div className="flex gap-3 mb-4">
          <div className="flex-1 flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 border border-gray-200">
            <Search size={15} className="text-gray-400 shrink-0" />
            <input
              type="text"
              value={badgeQuery}
              onChange={e => setBadgeQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleBadgeSearch()}
              placeholder="Buscar usuário por nome…"
              className="flex-1 bg-transparent text-sm text-gray-700 outline-none placeholder-gray-400"
            />
          </div>
          <button
            onClick={handleBadgeSearch}
            disabled={badgeSearching}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm text-gray-700 font-medium transition-colors"
          >
            {badgeSearching ? <Loader2 size={14} className="animate-spin" /> : 'Buscar'}
          </button>
        </div>

        {badgeUsers.length > 0 && !selectedBadgeUser && (
          <div className="space-y-1 mb-4 border border-gray-100 rounded-xl overflow-hidden">
            {badgeUsers.map(u => (
              <button
                key={u.id}
                onClick={() => { setSelectedBadgeUser(u); setBadgeUsers([]); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left"
              >
                {u.avatar_url ? (
                  <img src={u.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#7d4a3c]/20 flex items-center justify-center text-[#7d4a3c] font-bold text-sm">
                    {u.display_name[0]?.toUpperCase()}
                  </div>
                )}
                <span className="text-sm text-gray-800">{u.display_name}</span>
              </button>
            ))}
          </div>
        )}

        {selectedBadgeUser && (
          <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl mb-4">
            <div className="w-8 h-8 rounded-full bg-[#7d4a3c]/20 flex items-center justify-center text-[#7d4a3c] font-bold text-sm">
              {selectedBadgeUser.display_name[0]?.toUpperCase()}
            </div>
            <span className="text-sm font-medium text-gray-800 flex-1">{selectedBadgeUser.display_name}</span>
            <button onClick={() => setSelectedBadgeUser(null)} className="text-xs text-gray-400 hover:text-gray-600">Trocar</button>
          </div>
        )}

        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="text-xs font-medium text-gray-500 mb-1 block">Badge</label>
            <select
              value={selectedBadgeCode}
              onChange={e => setSelectedBadgeCode(e.target.value as 'embaixador' | 'medico_Malama')}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 outline-none"
            >
              <option value="embaixador">👑 Embaixador Malama</option>
              <option value="medico_Malama">🩺 Médico Malama</option>
            </select>
          </div>
          <button
            onClick={handleGrantBadge}
            disabled={!selectedBadgeUser || grantingBadge}
            className="flex items-center gap-2 px-5 py-2 bg-[#7d4a3c] text-white rounded-xl text-sm font-semibold
              disabled:bg-gray-200 disabled:text-gray-400 transition-colors hover:bg-[#623a2f]"
          >
            {grantingBadge ? <Loader2 size={14} className="animate-spin" /> : <Award size={14} />}
            Conceder
          </button>
        </div>
      </section>

      {/* ── Broadcast médico ── */}
      <section className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Send size={18} className="text-teal-500" />
          <h2 className="font-semibold text-gray-800">Broadcast para Usuários</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Audiência</label>
            <div className="flex gap-2">
              {(['all', 'glp1'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setBroadcastTarget(t)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                    broadcastTarget === t ? 'bg-teal-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {t === 'all' ? 'Todos os usuários' : 'Apenas GLP-1'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Mensagem</label>
            <textarea
              value={broadcastMsg}
              onChange={e => setBroadcastMsg(e.target.value)}
              placeholder="Digite a mensagem para enviar como notificação…"
              rows={3}
              maxLength={500}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700
                placeholder-gray-400 resize-none outline-none focus:ring-2 focus:ring-teal-400/30"
            />
            <div className="flex justify-end mt-0.5">
              <span className="text-xs text-gray-400">{broadcastMsg.length}/500</span>
            </div>
          </div>
          <button
            onClick={handleBroadcast}
            disabled={!broadcastMsg.trim() || broadcasting}
            className="flex items-center gap-2 px-6 py-2.5 bg-teal-500 text-white rounded-xl text-sm font-semibold
              disabled:bg-gray-200 disabled:text-gray-400 transition-colors hover:bg-teal-600"
          >
            {broadcasting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            Enviar broadcast
          </button>
        </div>
      </section>
    </div>
  );
};

export default AdminCommunityModeration;
