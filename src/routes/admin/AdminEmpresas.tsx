// =====================================================
// Malama — Gestão de Empresas B2B (Super Admin)
// =====================================================

import React, { useEffect, useState, useCallback } from 'react';
import {
  Plus, Search, X, Building2, Users, DollarSign, TrendingUp,
  Pause, Play, Ban, Inbox, ExternalLink,
} from 'lucide-react';
import {
  empresaAdminService,
  type EmpresaSummary,
  type Empresa,
  type EmpresaLead,
  type B2BDashboard,
} from '../../services/empresaService';
import toast from 'react-hot-toast';

const fmtCurrency = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

// ─── Status badge ──────────────────────────────────────
const StatusBadge: React.FC<{ status: Empresa['status'] }> = ({ status }) => {
  const map = {
    ativa: 'bg-green-100 text-green-700',
    pausada: 'bg-yellow-100 text-yellow-700',
    encerrada: 'bg-red-100 text-red-700',
  };
  const label = { ativa: 'Ativa', pausada: 'Pausada', encerrada: 'Encerrada' };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[status]}`}>
      {label[status]}
    </span>
  );
};

const LeadBadge: React.FC<{ status: EmpresaLead['status'] }> = ({ status }) => {
  const map = {
    novo: 'bg-blue-100 text-blue-700',
    em_contato: 'bg-yellow-100 text-yellow-700',
    convertido: 'bg-green-100 text-green-700',
    descartado: 'bg-gray-100 text-gray-500',
  };
  const label = { novo: 'Novo', em_contato: 'Em contato', convertido: 'Convertido', descartado: 'Descartado' };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[status]}`}>{label[status]}</span>;
};

// ─── Modal criar / editar ──────────────────────────────
type EmpresaForm = {
  nome: string;
  cnpj: string;
  responsavel_nome: string;
  responsavel_email: string;
  responsavel_telefone: string;
  valor_por_assento: string;
  max_assentos: string;
  status: Empresa['status'];
  data_inicio: string;
  rh_password: string; // apenas na criação
};

const EMPTY_FORM: EmpresaForm = {
  nome: '', cnpj: '', responsavel_nome: '', responsavel_email: '',
  responsavel_telefone: '', valor_por_assento: '', max_assentos: '',
  status: 'ativa', data_inicio: new Date().toISOString().slice(0, 10), rh_password: '',
};

const EmpresaModal: React.FC<{
  initial?: EmpresaSummary | null;
  onSave: (data: EmpresaForm) => Promise<void>;
  onClose: () => void;
}> = ({ initial, onSave, onClose }) => {
  const [form, setForm] = useState<EmpresaForm>(
    initial
      ? {
          nome: initial.nome,
          cnpj: initial.cnpj ?? '',
          responsavel_nome: initial.responsavel_nome ?? '',
          responsavel_email: initial.responsavel_email ?? '',
          responsavel_telefone: initial.responsavel_telefone ?? '',
          valor_por_assento: initial.valor_por_assento != null ? String(initial.valor_por_assento) : '',
          max_assentos: initial.max_assentos != null ? String(initial.max_assentos) : '',
          status: initial.status,
          data_inicio: initial.data_inicio ?? '',
          rh_password: '',
        }
      : { ...EMPTY_FORM }
  );
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const set = (k: keyof EmpresaForm, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!form.nome.trim()) { setFormError('Informe o nome da empresa.'); return; }
    if (!initial) {
      if (!form.responsavel_email.trim()) { setFormError('Informe o e-mail do responsável de RH.'); return; }
      if (!form.rh_password || form.rh_password.length < 8) { setFormError('A senha do RH deve ter ao menos 8 caracteres.'); return; }
    }
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch (err: any) {
      setFormError(err?.message ?? 'Erro ao salvar empresa.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
        <div className="bg-[#1A1A1A] px-6 py-4 flex items-center justify-between flex-shrink-0">
          <h2 className="text-white font-semibold">{initial ? 'Editar empresa' : 'Nova empresa'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Nome da empresa *</label>
              <input
                required value={form.nome} onChange={e => set('nome', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#7d4a3c] focus:border-transparent"
                placeholder="Acme S.A."
              />
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">CNPJ</label>
              <input
                value={form.cnpj} onChange={e => set('cnpj', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#7d4a3c] focus:border-transparent"
                placeholder="00.000.000/0001-00"
              />
            </div>

            <div className="col-span-2 border-t border-gray-100 pt-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Responsável de RH</p>
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Nome do responsável</label>
              <input
                value={form.responsavel_nome} onChange={e => set('responsavel_nome', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#7d4a3c] focus:border-transparent"
                placeholder="Maria Oliveira"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">E-mail {!initial && '*'}</label>
              <input
                type="email" value={form.responsavel_email} onChange={e => set('responsavel_email', e.target.value)}
                disabled={!!initial}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#7d4a3c] focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400"
                placeholder="rh@empresa.com"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Telefone</label>
              <input
                value={form.responsavel_telefone} onChange={e => set('responsavel_telefone', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#7d4a3c] focus:border-transparent"
                placeholder="(11) 90000-0000"
              />
            </div>

            {/* Senha do RH — apenas na criação */}
            {!initial && (
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Senha de acesso do RH *</label>
                <input
                  type="password" value={form.rh_password} onChange={e => set('rh_password', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#7d4a3c] focus:border-transparent"
                  placeholder="Mínimo 8 caracteres" minLength={8}
                />
                <p className="text-xs text-gray-500 mt-1">
                  O RH acessa em <strong>{window.location.origin}/rh</strong> com este e-mail e senha.
                </p>
              </div>
            )}

            <div className="col-span-2 border-t border-gray-100 pt-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Contrato</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Valor por assento (R$)</label>
              <input
                type="number" min="0" step="0.01" value={form.valor_por_assento}
                onChange={e => set('valor_por_assento', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#7d4a3c] focus:border-transparent"
                placeholder="49.90"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Máx. de assentos</label>
              <input
                type="number" min="0" step="1" value={form.max_assentos}
                onChange={e => set('max_assentos', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#7d4a3c] focus:border-transparent"
                placeholder="100"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Data de início</label>
              <input
                type="date" value={form.data_inicio} onChange={e => set('data_inicio', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#7d4a3c] focus:border-transparent"
              />
            </div>

            {initial && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                <select
                  value={form.status} onChange={e => set('status', e.target.value as Empresa['status'])}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#7d4a3c] focus:border-transparent"
                >
                  <option value="ativa">Ativa</option>
                  <option value="pausada">Pausada</option>
                  <option value="encerrada">Encerrada</option>
                </select>
              </div>
            )}
          </div>

          {formError && (
            <p className="text-red-500 text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2">{formError}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 bg-[#7d4a3c] hover:bg-[#623a2f] text-white text-sm font-semibold rounded-xl transition disabled:opacity-60">
              {saving ? 'Salvando...' : initial ? 'Salvar alterações' : 'Criar empresa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Componente principal ──────────────────────────────
export const AdminEmpresas: React.FC = () => {
  const [empresas, setEmpresas] = useState<EmpresaSummary[]>([]);
  const [leads, setLeads] = useState<EmpresaLead[]>([]);
  const [dashboard, setDashboard] = useState<B2BDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<EmpresaSummary | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, dash, leadList] = await Promise.all([
        empresaAdminService.getAll(),
        empresaAdminService.getDashboard(),
        empresaAdminService.getLeads(),
      ]);
      setEmpresas(list);
      setDashboard(dash);
      setLeads(leadList);
    } catch (err) {
      console.error('Erro ao carregar empresas:', err);
      toast.error('Erro ao carregar empresas.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = empresas.filter(e =>
    !search ||
    e.nome.toLowerCase().includes(search.toLowerCase()) ||
    (e.cnpj ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async (form: EmpresaForm) => {
    await empresaAdminService.create({
      empresa: {
        nome: form.nome,
        cnpj: form.cnpj || null,
        responsavel_nome: form.responsavel_nome || null,
        responsavel_email: form.responsavel_email || null,
        responsavel_telefone: form.responsavel_telefone || null,
        valor_por_assento: form.valor_por_assento ? parseFloat(form.valor_por_assento) : null,
        max_assentos: form.max_assentos ? parseInt(form.max_assentos, 10) : null,
        status: form.status,
        data_inicio: form.data_inicio || null,
      },
      rh: {
        email: form.responsavel_email,
        password: form.rh_password,
        nome: form.responsavel_nome || undefined,
      },
    });
    toast.success('Empresa criada! O RH já pode acessar em /rh com o e-mail e senha definidos.', { duration: 6000 });
    load();
  };

  const handleEdit = async (form: EmpresaForm) => {
    if (!editing) return;
    await empresaAdminService.update(editing.id, {
      nome: form.nome,
      cnpj: form.cnpj || null,
      responsavel_nome: form.responsavel_nome || null,
      responsavel_telefone: form.responsavel_telefone || null,
      valor_por_assento: form.valor_por_assento ? parseFloat(form.valor_por_assento) : null,
      max_assentos: form.max_assentos ? parseInt(form.max_assentos, 10) : null,
      status: form.status,
      data_inicio: form.data_inicio || null,
    });
    toast.success('Empresa atualizada!');
    load();
  };

  const handleStatus = async (e: EmpresaSummary, status: Empresa['status']) => {
    try {
      await empresaAdminService.setStatus(e.id, status);
      toast.success('Status atualizado.');
      load();
    } catch {
      toast.error('Erro ao atualizar status.');
    }
  };

  const handleLeadStatus = async (lead: EmpresaLead, status: EmpresaLead['status']) => {
    try {
      await empresaAdminService.updateLeadStatus(lead.id, status);
      setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, status } : l));
    } catch {
      toast.error('Erro ao atualizar lead.');
    }
  };

  const cards = [
    { icon: <Building2 className="w-5 h-5 text-[#7d4a3c]" />, label: 'Empresas ativas', value: String(dashboard?.empresas_ativas ?? 0) },
    { icon: <Users className="w-5 h-5 text-[#7d4a3c]" />, label: 'Colaboradores com acesso', value: String(dashboard?.total_colaboradores ?? 0) },
    { icon: <TrendingUp className="w-5 h-5 text-[#7d4a3c]" />, label: 'MRR B2B', value: fmtCurrency(dashboard?.mrr_total ?? 0) },
    { icon: <Inbox className="w-5 h-5 text-[#7d4a3c]" />, label: 'Leads pendentes', value: String(dashboard?.leads_pendentes ?? 0) },
  ];

  return (
    <div className="space-y-6">
      {/* ── Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map(({ icon, label, value }) => (
          <div key={label} className="bg-white rounded-xl shadow p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#7d4a3c]/10 flex items-center justify-center flex-shrink-0">{icon}</div>
            <div>
              <p className="text-xl font-bold text-gray-800">{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Barra de ações ── */}
      <div className="flex gap-3 flex-col sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome ou CNPJ..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#7d4a3c] focus:border-transparent"
          />
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#7d4a3c] hover:bg-[#623a2f] text-white text-sm font-semibold rounded-lg transition whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          Nova empresa
        </button>
      </div>

      {/* ── Tabela de empresas ── */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 rounded-full border-4 border-[#7d4a3c] border-t-transparent animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Nenhuma empresa ainda.</p>
            <p className="text-gray-400 text-sm mt-1">Clique em "Nova empresa" para começar.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Empresa</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Assentos</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Valor/assento</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">MRR</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(e => (
                  <tr key={e.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800 text-sm">{e.nome}</p>
                      {e.cnpj && <p className="text-xs text-gray-400 mt-0.5">{e.cnpj}</p>}
                    </td>
                    <td className="px-4 py-3 text-center hidden sm:table-cell">
                      <span className="text-sm font-medium text-gray-700">
                        {e.assentos_ativos}{e.max_assentos != null && <span className="text-gray-400"> / {e.max_assentos}</span>}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-700 hidden md:table-cell">
                      {e.valor_por_assento != null ? fmtCurrency(e.valor_por_assento) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-semibold text-[#7d4a3c]">{fmtCurrency(e.mrr)}</span>
                    </td>
                    <td className="px-4 py-3 text-center"><StatusBadge status={e.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setEditing(e)}
                          className="px-2.5 py-1 text-xs font-medium border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition"
                        >
                          Editar
                        </button>
                        {e.status === 'ativa' && (
                          <button onClick={() => handleStatus(e, 'pausada')} title="Pausar"
                            className="p-1 text-yellow-500 hover:bg-yellow-50 rounded-lg transition">
                            <Pause className="w-4 h-4" />
                          </button>
                        )}
                        {e.status === 'pausada' && (
                          <button onClick={() => handleStatus(e, 'ativa')} title="Reativar"
                            className="p-1 text-[#7d4a3c] hover:bg-green-50 rounded-lg transition">
                            <Play className="w-4 h-4" />
                          </button>
                        )}
                        {e.status !== 'encerrada' && (
                          <button onClick={() => handleStatus(e, 'encerrada')} title="Encerrar"
                            className="p-1 text-red-400 hover:bg-red-50 rounded-lg transition">
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

      {/* ── Leads B2B ── */}
      <div className="bg-white rounded-xl shadow">
        <div className="p-5 border-b border-gray-100 flex items-center gap-2">
          <Inbox className="w-5 h-5 text-[#7d4a3c]" />
          <h2 className="font-semibold text-gray-800">Leads da landing /empresas</h2>
          <span className="text-xs text-gray-400 ml-1">{leads.length}</span>
        </div>
        {leads.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">Nenhum lead recebido ainda.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contato</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Empresa</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Colaboradores</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Recebido</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {leads.map(l => (
                  <tr key={l.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-800">{l.nome ?? '—'}</p>
                      {l.email && (
                        <a href={`mailto:${l.email}`} className="inline-flex items-center gap-1 text-xs text-[#7d4a3c] hover:underline mt-0.5">
                          {l.email}<ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 hidden sm:table-cell">{l.empresa ?? '—'}</td>
                    <td className="px-4 py-3 text-center text-sm text-gray-700 hidden md:table-cell">{l.num_colaboradores ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-400 hidden md:table-cell">{fmtDate(l.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <LeadBadge status={l.status} />
                        <select
                          value={l.status}
                          onChange={ev => handleLeadStatus(l, ev.target.value as EmpresaLead['status'])}
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1 text-gray-600 focus:ring-1 focus:ring-[#7d4a3c]"
                        >
                          <option value="novo">Novo</option>
                          <option value="em_contato">Em contato</option>
                          <option value="convertido">Convertido</option>
                          <option value="descartado">Descartado</option>
                        </select>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modais ── */}
      {showCreate && <EmpresaModal onSave={handleCreate} onClose={() => setShowCreate(false)} />}
      {editing && <EmpresaModal initial={editing} onSave={handleEdit} onClose={() => setEditing(null)} />}
    </div>
  );
};
