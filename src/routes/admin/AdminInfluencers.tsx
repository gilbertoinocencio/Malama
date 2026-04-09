// =====================================================
// NURA — Gestão de Influenciadores (Super Admin)
// =====================================================

import React, { useEffect, useState, useCallback } from 'react';
import {
  Plus, Search, X, Copy, Check, Instagram,
  ExternalLink, DollarSign, Users, TrendingUp, Pause, Ban, Play,
  Trophy, Link as LinkIcon
} from 'lucide-react';
import { influencerService, settingsService } from '../../services/doctorPortalService';
import type { Influencer, InfluencerSummary, InfluencerReferral } from '../../services/doctorPortalService';
import toast from 'react-hot-toast';

// ─── helpers ───────────────────────────────────────────
const fmtCurrency = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

// ─── Status badge ──────────────────────────────────────
const StatusBadge: React.FC<{ status: Influencer['status'] }> = ({ status }) => {
  const map = {
    active: 'bg-green-100 text-green-700',
    paused: 'bg-yellow-100 text-yellow-700',
    cancelled: 'bg-red-100 text-red-700',
  };
  const label = { active: 'Ativo', paused: 'Pausado', cancelled: 'Cancelado' };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[status]}`}>
      {label[status]}
    </span>
  );
};

// ─── Botão copiar link ─────────────────────────────────
const CopyLinkButton: React.FC<{ token: string; prefix?: string }> = ({ token, prefix = 'i' }) => {
  const [copied, setCopied] = useState(false);
  const link = `${window.location.origin}/${prefix === 'convite' ? 'influencer/convite' : prefix}/${token}`;
  const handleCopy = async () => {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      title={link}
      className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
    >
      {copied ? <Check className="w-3 h-3 text-[#2ECC71]" /> : <Copy className="w-3 h-3" />}
      {copied ? 'Copiado!' : 'Link'}
    </button>
  );
};

// ─── Botão copiar link de ativação ────────────────────
const ActivationLinkButton: React.FC<{ token: string }> = ({ token }) => {
  const [copied, setCopied] = useState(false);
  const link = `${window.location.origin}/influencer/ativar/${token}`;
  const handleCopy = async () => {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="flex gap-2">
      <div className="flex-1 bg-white border border-amber-200 rounded-lg px-2 py-1.5 text-xs text-gray-600 truncate">
        {link}
      </div>
      <button
        onClick={handleCopy}
        className="flex items-center gap-1 px-2 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-700 text-xs font-medium rounded-lg transition whitespace-nowrap"
      >
        {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
        {copied ? 'Copiado!' : 'Copiar'}
      </button>
    </div>
  );
};

// ─── Drawer de conversões ──────────────────────────────
const ReferralsDrawer: React.FC<{ influencer: InfluencerSummary; onClose: () => void }> = ({ influencer, onClose }) => {
  const [refs, setRefs] = useState<InfluencerReferral[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const link = `${window.location.origin}/i/${influencer.referral_token}`;
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    influencerService.getReferrals(influencer.id).then(setRefs).finally(() => setLoading(false));
  }, [influencer.id]);

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePay = async () => {
    if (influencer.pending_amount === 0) return;
    setPaying(true);
    try {
      await influencerService.markPaid(influencer.id);
      toast.success(`Comissões de ${influencer.name} marcadas como pagas!`);
      // Atualizar lista local
      setRefs(prev => prev.map(r => r.status === 'pending' ? { ...r, status: 'paid', paid_at: new Date().toISOString() } : r));
    } catch {
      toast.error('Erro ao marcar como pago.');
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-white h-full shadow-2xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="bg-[#1A1A1A] px-6 py-5 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-white font-semibold text-lg">{influencer.name}</h2>
            {influencer.instagram_handle && (
              <p className="text-[#2ECC71] text-sm mt-0.5">
                {influencer.instagram_handle.startsWith('@') ? influencer.instagram_handle : `@${influencer.instagram_handle}`}
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Métricas */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[#F8F9FA] rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-gray-800">{influencer.total_referrals}</p>
              <p className="text-xs text-gray-400 mt-0.5">Conversões</p>
            </div>
            <div className="bg-[#F8F9FA] rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-[#2ECC71]">{fmtCurrency(influencer.pending_amount)}</p>
              <p className="text-xs text-gray-400 mt-0.5">Pendente</p>
            </div>
            <div className="bg-[#F8F9FA] rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-gray-800">{fmtCurrency(influencer.total_earned - influencer.pending_amount)}</p>
              <p className="text-xs text-gray-400 mt-0.5">Pago</p>
            </div>
          </div>

          {/* Link de indicação */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Link de indicação</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 truncate">
                {link}
              </div>
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition whitespace-nowrap"
              >
                {copied ? <Check className="w-4 h-4 text-[#2ECC71]" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copiado!' : 'Copiar'}
              </button>
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 transition"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Status da conta */}
          <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-2 flex items-center gap-2 text-sm text-green-700 mb-3">
            <Check className="w-4 h-4 flex-shrink-0" />
            Conta ativa — influenciador pode acessar com o link de convite.
          </div>

          {/* Link de convite */}
          {influencer.access_token && (
            <div className="mb-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Link de convite para o influencer</p>
              <CopyLinkButton token={influencer.access_token} prefix="convite" />
            </div>
          )}

          {/* Link de indicação (para seguidores) */}
          {influencer.referral_token && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Link de indicação (para seguidores)</p>
              <CopyLinkButton token={influencer.referral_token} prefix="i" />
            </div>
          )}

          {/* Dados financeiros */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Comissão por cadastro</span>
              <span className="font-semibold text-gray-800">{fmtCurrency(influencer.commission_per_referral)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Chave PIX</span>
              <span className="font-medium text-gray-700">{influencer.pix_key ?? <span className="text-gray-300 italic">não informada</span>}</span>
            </div>
          </div>

          {/* Botão pagar */}
          {influencer.pending_amount > 0 && (
            <button
              onClick={handlePay}
              disabled={paying}
              className="w-full py-3 bg-[#2ECC71] hover:bg-[#27ae60] text-white font-semibold rounded-xl transition disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {paying
                ? <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                : <DollarSign className="w-4 h-4" />}
              Marcar {fmtCurrency(influencer.pending_amount)} como pago
            </button>
          )}

          {/* Histórico de conversões */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Histórico de conversões</p>
            {loading ? (
              <div className="flex justify-center py-6">
                <div className="w-6 h-6 rounded-full border-4 border-[#2ECC71] border-t-transparent animate-spin" />
              </div>
            ) : refs.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-6">Nenhuma conversão ainda.</p>
            ) : (
              <div className="space-y-2">
                {refs.map(r => (
                  <div key={r.id} className="bg-[#F8F9FA] rounded-xl p-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs text-gray-400">{fmtDate(r.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.status === 'paid'
                        ? 'bg-green-100 text-green-700'
                        : r.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                        }`}>
                        {r.status === 'paid' ? 'Pago' : r.status === 'pending' ? 'Pendente' : 'Cancelado'}
                      </span>
                      <span className="text-sm font-semibold text-gray-700">{fmtCurrency(r.commission_amount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notas */}
          {influencer.notes && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Notas internas</p>
              <p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-3">{influencer.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Modal de criação / edição ─────────────────────────
type InfluencerForm = {
  name: string; email: string; instagram_handle: string;
  pix_key: string; commission_per_referral: string; notes: string;
  status: Influencer['status'];
  password?: string; // Senha para criar conta auth do influencer
};

const EMPTY_FORM: InfluencerForm = {
  name: '', email: '', instagram_handle: '', pix_key: '',
  commission_per_referral: '10', notes: '', status: 'active',
  password: '',
};

const InfluencerModal: React.FC<{
  initial?: InfluencerSummary | null;
  defaultCommission: string;
  onSave: (data: InfluencerForm) => Promise<void>;
  onClose: () => void;
}> = ({ initial, defaultCommission, onSave, onClose }) => {
  const [form, setForm] = useState<InfluencerForm>(
    initial
      ? {
        name: initial.name,
        email: initial.email,
        instagram_handle: initial.instagram_handle ?? '',
        pix_key: initial.pix_key ?? '',
        commission_per_referral: String(initial.commission_per_referral),
        notes: initial.notes ?? '',
        status: initial.status,
      }
      : { ...EMPTY_FORM, commission_per_referral: defaultCommission }
  );
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const set = (k: keyof InfluencerForm, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!form.name.trim() || !form.email.trim()) return;
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch (err: any) {
      toast.error('Erro ao salvar influenciador.');
      setFormError(err?.message ?? 'Erro ao salvar influenciador.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-[#1A1A1A] px-6 py-4 flex items-center justify-between">
          <h2 className="text-white font-semibold">
            {initial ? 'Editar influenciador' : 'Novo influenciador'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Nome completo *</label>
              <input
                required value={form.name} onChange={e => set('name', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#2ECC71] focus:border-transparent"
                placeholder="Nome do influenciador"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">E-mail *</label>
              <input
                required type="email" value={form.email} onChange={e => set('email', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#2ECC71] focus:border-transparent"
                placeholder="email@exemplo.com"
              />
            </div>

            {/* Aviso de ativação — apenas na criação */}
            {!initial && (
              <div className="col-span-2 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2.5 flex items-start gap-2 text-xs text-blue-700">
                <LinkIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold mb-1">Após criar, envie estas informações ao influencer:</p>
                  <p>• <strong>Link de acesso:</strong> http://localhost:3000/influencer/login</p>
                  <p>• <strong>Email:</strong> (o que você preencher abaixo)</p>
                  <p>• <strong>Senha:</strong> (a que você definir abaixo)</p>
                  <p className="mt-1 text-blue-600">⚠️ O influencer NÃO deve acessar o link de indicação (/i/:token). Esse link é para os seguidores dele.</p>
                </div>
              </div>
            )}

            {/* Senha — apenas na criação */}
            {!initial && (
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Senha *</label>
                <input
                  required={!initial} type="password"
                  value={form.password || ''} onChange={e => set('password', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#2ECC71] focus:border-transparent"
                  placeholder="Senha para o influencer fazer login"
                  minLength={8}
                />
                <p className="text-xs text-gray-500 mt-1">Mínimo 8 caracteres.</p>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Instagram</label>
              <div className="relative">
                <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  value={form.instagram_handle} onChange={e => set('instagram_handle', e.target.value)}
                  className="w-full pl-9 pr-3 border border-gray-300 rounded-lg py-2 text-sm focus:ring-2 focus:ring-[#2ECC71] focus:border-transparent"
                  placeholder="@handle"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Comissão por cadastro (R$) *</label>
              <input
                required type="number" min="0" step="0.01"
                value={form.commission_per_referral}
                onChange={e => set('commission_per_referral', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#2ECC71] focus:border-transparent"
                placeholder="10.00"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Chave PIX</label>
              <input
                value={form.pix_key} onChange={e => set('pix_key', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#2ECC71] focus:border-transparent"
                placeholder="CPF, e-mail, telefone ou chave aleatória"
              />
            </div>

            {initial && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                <select
                  value={form.status} onChange={e => set('status', e.target.value as Influencer['status'])}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#2ECC71] focus:border-transparent"
                >
                  <option value="active">Ativo</option>
                  <option value="paused">Pausado</option>
                  <option value="cancelled">Cancelado</option>
                </select>
              </div>
            )}

            <div className={initial ? '' : 'col-span-2'}>
              <label className="block text-xs font-medium text-gray-600 mb-1">Notas internas</label>
              <textarea
                value={form.notes} onChange={e => set('notes', e.target.value)}
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#2ECC71] focus:border-transparent resize-none"
                placeholder="Observações sobre o influenciador..."
              />
            </div>
          </div>

          {formError && (
            <p className="text-red-500 text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {formError}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button" onClick={onClose}
              className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit" disabled={saving}
              className="flex-1 py-2.5 bg-[#2ECC71] hover:bg-[#27ae60] text-white text-sm font-semibold rounded-xl transition disabled:opacity-60"
            >
              {saving ? 'Salvando...' : initial ? 'Salvar alterações' : 'Criar influenciador'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Componente principal ──────────────────────────────
export const AdminInfluencers: React.FC = () => {
  const [influencers, setInfluencers] = useState<InfluencerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [defaultCommission, setDefaultCommission] = useState('10');

  // Modals / Drawer
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<InfluencerSummary | null>(null);
  const [viewing, setViewing] = useState<InfluencerSummary | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, def] = await Promise.all([
        influencerService.getAll(),
        settingsService.getSetting('influencer_default_commission'),
      ]);
      setInfluencers(data);
      if (def) setDefaultCommission(def);
    } catch (err) {
      console.error('Erro ao carregar influenciadores:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = influencers.filter(i =>
    !search ||
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    (i.instagram_handle ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const totalActive = influencers.filter(i => i.status === 'active').length;
  const totalRefs = influencers.reduce((s, i) => s + i.total_referrals, 0);
  const totalPending = influencers.reduce((s, i) => s + i.pending_amount, 0);
  const totalPaid = influencers.reduce((s, i) => s + (i.total_earned - i.pending_amount), 0);

  const handleCreate = async (form: InfluencerForm) => {
    if (!form.password || form.password.length < 8) {
      throw new Error('A senha deve ter pelo menos 8 caracteres.');
    }

    await influencerService.createWithAuth({
      name: form.name,
      email: form.email,
      password: form.password,
      instagram_handle: form.instagram_handle || null,
      pix_key: form.pix_key || null,
      commission_per_referral: parseFloat(form.commission_per_referral),
      notes: form.notes || null,
      status: 'active',
    });

    toast.success(
      'Influenciador criado! Clique em "Ver" para copiar o link de convite e enviar ao influencer.',
      { duration: 5000 }
    );
    load();
  };

  const handleEdit = async (form: InfluencerForm) => {
    if (!editing) return;
    await influencerService.update(editing.id, {
      name: form.name,
      email: form.email,
      instagram_handle: form.instagram_handle || null,
      pix_key: form.pix_key || null,
      commission_per_referral: parseFloat(form.commission_per_referral),
      notes: form.notes || null,
      status: form.status,
    });
    toast.success('Influenciador atualizado!');
    load();
  };

  const handleQuickStatus = async (inf: InfluencerSummary, status: Influencer['status']) => {
    try {
      await influencerService.update(inf.id, { status });
      toast.success(`Status atualizado para ${status === 'active' ? 'ativo' : status === 'paused' ? 'pausado' : 'cancelado'}.`);
      load();
    } catch {
      toast.error('Erro ao atualizar status.');
    }
  };

  return (
    <div className="space-y-6">

      {/* ── Cards de métricas ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: <Users className="w-5 h-5 text-[#2ECC71]" />, label: 'Influenciadores ativos', value: totalActive.toString() },
          { icon: <TrendingUp className="w-5 h-5 text-[#2ECC71]" />, label: 'Total de conversões', value: totalRefs.toString() },
          { icon: <DollarSign className="w-5 h-5 text-[#2ECC71]" />, label: 'Comissões pendentes', value: fmtCurrency(totalPending) },
          { icon: <Check className="w-5 h-5 text-[#2ECC71]" />, label: 'Total pago', value: fmtCurrency(totalPaid) },
        ].map(({ icon, label, value }) => (
          <div key={label} className="bg-white rounded-xl shadow p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#2ECC71]/10 flex items-center justify-center flex-shrink-0">
              {icon}
            </div>
            <div>
              <p className="text-xl font-bold text-gray-800">{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Ranking de conversões ── */}
      {!loading && filtered.length > 0 && (
        <div className="bg-white rounded-xl shadow p-5">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-5 h-5 text-yellow-500" />
            <h2 className="font-semibold text-gray-800">Ranking de conversões</h2>
            <span className="text-xs text-gray-400 ml-1">top {Math.min(filtered.length, 5)}</span>
          </div>
          <div className="space-y-2">
            {[...filtered]
              .sort((a, b) => b.total_referrals - a.total_referrals)
              .slice(0, 5)
              .map((inf, i) => {
                const medals = ['🥇', '🥈', '🥉'];
                const pct = filtered[0]?.total_referrals > 0
                  ? (inf.total_referrals / [...filtered].sort((a, b) => b.total_referrals - a.total_referrals)[0].total_referrals) * 100
                  : 0;
                return (
                  <div key={inf.id} className="flex items-center gap-3">
                    <span className="text-lg w-8 text-center flex-shrink-0">
                      {medals[i] ?? <span className="text-sm font-bold text-gray-400">#{i + 1}</span>}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm font-medium text-gray-800 truncate">{inf.name}</span>
                          {inf.instagram_handle && (
                            <span className="text-xs text-[#2ECC71] hidden sm:inline">
                              {inf.instagram_handle.startsWith('@') ? inf.instagram_handle : `@${inf.instagram_handle}`}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                          <span className="text-xs text-gray-500">{inf.total_referrals} conv.</span>
                          <span className="text-xs font-semibold text-[#2ECC71]">{fmtCurrency(inf.total_earned)}</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${pct}%`,
                            background: i === 0 ? '#F59E0B' : i === 1 ? '#9CA3AF' : i === 2 ? '#CD7C2F' : '#2ECC71'
                          }}
                        />
                      </div>
                    </div>
                    <StatusBadge status={inf.status} />
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ── Barra de ações ── */}
      <div className="flex gap-3 flex-col sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome ou @instagram..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#2ECC71] focus:border-transparent"
          />
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#2ECC71] hover:bg-[#27ae60] text-white text-sm font-semibold rounded-lg transition whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          Novo influenciador
        </button>
      </div>

      {/* ── Tabela ── */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 rounded-full border-4 border-[#2ECC71] border-t-transparent animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Nenhum influenciador ainda.</p>
            <p className="text-gray-400 text-sm mt-1">Clique em "Novo influenciador" para começar.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Influenciador</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Comissão</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Conversões</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Pendente</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(inf => (
                  <tr key={inf.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-800 text-sm">{inf.name}</p>
                        {inf.instagram_handle && (
                          <a
                            href={`https://instagram.com/${inf.instagram_handle.replace('@', '')}`}
                            target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-[#2ECC71] hover:underline mt-0.5"
                          >
                            <Instagram className="w-3 h-3" />
                            {inf.instagram_handle.startsWith('@') ? inf.instagram_handle : `@${inf.instagram_handle}`}
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 hidden md:table-cell">
                      {fmtCurrency(inf.commission_per_referral)}<span className="text-gray-400 text-xs">/cadastro</span>
                    </td>
                    <td className="px-4 py-3 text-center hidden sm:table-cell">
                      <span className="text-sm font-medium text-gray-700">{inf.total_referrals}</span>
                    </td>
                    <td className="px-4 py-3 text-right hidden md:table-cell">
                      <span className={`text-sm font-semibold ${inf.pending_amount > 0 ? 'text-[#2ECC71]' : 'text-gray-300'}`}>
                        {inf.pending_amount > 0 ? fmtCurrency(inf.pending_amount) : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={inf.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <CopyLinkButton token={inf.referral_token} />
                        <button
                          onClick={() => setViewing(inf)}
                          className="px-2.5 py-1 text-xs font-medium border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition"
                        >
                          Ver
                        </button>
                        <button
                          onClick={() => setEditing(inf)}
                          className="px-2.5 py-1 text-xs font-medium border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition"
                        >
                          Editar
                        </button>
                        {inf.status === 'active' && (
                          <button
                            onClick={() => handleQuickStatus(inf, 'paused')}
                            title="Pausar"
                            className="p-1 text-yellow-500 hover:bg-yellow-50 rounded-lg transition"
                          >
                            <Pause className="w-4 h-4" />
                          </button>
                        )}
                        {inf.status === 'paused' && (
                          <button
                            onClick={() => handleQuickStatus(inf, 'active')}
                            title="Reativar"
                            className="p-1 text-[#2ECC71] hover:bg-green-50 rounded-lg transition"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                        )}
                        {inf.status !== 'cancelled' && (
                          <button
                            onClick={() => handleQuickStatus(inf, 'cancelled')}
                            title="Cancelar"
                            className="p-1 text-red-400 hover:bg-red-50 rounded-lg transition"
                          >
                            <Ban className="w-4 h-4" />
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

      {/* ── Modals / Drawer ── */}
      {showCreate && (
        <InfluencerModal
          defaultCommission={defaultCommission}
          onSave={handleCreate}
          onClose={() => setShowCreate(false)}
        />
      )}
      {editing && (
        <InfluencerModal
          initial={editing}
          defaultCommission={defaultCommission}
          onSave={handleEdit}
          onClose={() => setEditing(null)}
        />
      )}
      {viewing && (
        <ReferralsDrawer influencer={viewing} onClose={() => setViewing(null)} />
      )}
    </div>
  );
};
