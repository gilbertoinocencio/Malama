// =====================================================
// Malama — Dashboard do Portal do RH
// Assentos, colaboradores, convite por e-mail e relatório CSV.
// Sem dados financeiros (valor/assento e MRR são só do super admin).
// =====================================================

import React, { useEffect, useState, useCallback } from 'react';
import {
  Users, UserPlus, Trash2, Download, Mail, AlertCircle, CheckCircle2, Clock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { rhService, type EmpresaColaborador } from '../../services/empresaService';

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

type Empresa = { id: string; nome: string; max_assentos: number | null; status: string };

const ColabStatusBadge: React.FC<{ status: EmpresaColaborador['status'] }> = ({ status }) => {
  if (status === 'ativo') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
        <CheckCircle2 className="w-3 h-3" /> Ativo
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
      <Clock className="w-3 h-3" /> Convidado
    </span>
  );
};

export const RhDashboard: React.FC = () => {
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [colaboradores, setColaboradores] = useState<EmpresaColaborador[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const emp = await rhService.getMyEmpresa();
      setEmpresa(emp);
      if (emp) setColaboradores(await rhService.getColaboradores(emp.id));
    } catch (err) {
      console.error('Erro ao carregar painel do RH:', err);
      toast.error('Erro ao carregar dados.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const usados = colaboradores.length; // ativos + convidados (getColaboradores exclui removidos)
  const limite = empresa?.max_assentos ?? null;
  const cheio = limite != null && usados >= limite;
  const pct = limite ? Math.min(100, (usados / limite) * 100) : 0;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = email.trim().toLowerCase();
    if (!value) return;
    if (cheio) { toast.error('Limite de assentos atingido.'); return; }

    setAdding(true);
    try {
      const res = await rhService.inviteColaborador(value);
      if (res.existing) {
        // Já tem conta Malama → e-mail de ativação; vira "Ativo" quando acessar o app
        toast.success(
          res.emailed
            ? 'Colaborador adicionado! Enviamos um e-mail de ativação — o acesso fica ativo quando ele abrir o app.'
            : 'Colaborador adicionado! Fica ativo quando ele abrir o app.'
        );
        if (!res.emailed && res.warning) toast('O e-mail de ativação não pôde ser enviado agora.', { icon: '⚠️' });
      } else if (res.invited) {
        toast.success('Convite enviado por e-mail. O acesso fica ativo quando o colaborador acessar o app.');
      } else {
        toast.success('Colaborador adicionado.');
        if (res.warning) toast('O e-mail de convite não pôde ser enviado agora.', { icon: '⚠️' });
      }
      setEmail('');
      await load();
    } catch (err: any) {
      toast.error(err?.message || 'Não foi possível adicionar o colaborador.');
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (c: EmpresaColaborador) => {
    if (!confirm(`Remover ${c.email}? O acesso corporativo será encerrado e o assento liberado.`)) return;
    try {
      await rhService.removeColaborador(c.id);
      toast.success('Colaborador removido.');
      setColaboradores(prev => prev.filter(x => x.id !== c.id));
    } catch {
      toast.error('Erro ao remover colaborador.');
    }
  };

  const exportCsv = () => {
    const header = ['email', 'status', 'data_adicao', 'data_ativacao'];
    const rows = colaboradores.map(c => [
      c.email,
      c.status,
      c.data_adicao ? new Date(c.data_adicao).toISOString().slice(0, 10) : '',
      c.data_ativacao ? new Date(c.data_ativacao).toISOString().slice(0, 10) : '',
    ]);
    const csv = [header, ...rows]
      .map(r => r.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `colaboradores-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7d4a3c]"></div>
      </div>
    );
  }

  if (!empresa) {
    return (
      <div className="bg-white rounded-xl shadow p-10 text-center">
        <AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-600 font-medium">Nenhuma empresa vinculada a esta conta.</p>
        <p className="text-gray-400 text-sm mt-1">Entre em contato com a Malama.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Cabeçalho da empresa ── */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-800">{empresa.nome}</h1>
        <p className="text-sm text-gray-500">Gerencie os colaboradores com acesso ao benefício Malama.</p>
      </div>

      {empresa.status !== 'ativa' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-yellow-800">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          A conta da empresa está {empresa.status}. Novos colaboradores não podem ser adicionados no momento.
        </div>
      )}

      {/* ── Assentos ── */}
      <div className="bg-white rounded-xl shadow p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#7d4a3c]" />
            <h2 className="font-semibold text-gray-800">Assentos utilizados</h2>
          </div>
          <span className="text-sm font-medium text-gray-700">
            {usados}{limite != null && <span className="text-gray-400"> / {limite}</span>}
          </span>
        </div>
        {limite != null ? (
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${pct}%`, background: cheio ? '#DC2626' : '#7d4a3c' }}
            />
          </div>
        ) : (
          <p className="text-xs text-gray-400">Sem limite de assentos definido.</p>
        )}
        {cheio && (
          <p className="text-xs text-red-500 mt-2">
            Você atingiu o limite de assentos contratados. Remova um colaborador ou fale com a Malama para ampliar.
          </p>
        )}
      </div>

      {/* ── Adicionar colaborador ── */}
      <div className="bg-white rounded-xl shadow p-5">
        <div className="flex items-center gap-2 mb-3">
          <UserPlus className="w-5 h-5 text-[#7d4a3c]" />
          <h2 className="font-semibold text-gray-800">Adicionar colaborador</h2>
        </div>
        <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="email@colaborador.com"
              disabled={cheio || empresa.status !== 'ativa'}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#7d4a3c] focus:border-transparent disabled:bg-gray-50"
            />
          </div>
          <button
            type="submit" disabled={adding || cheio || empresa.status !== 'ativa'}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#7d4a3c] hover:bg-[#623a2f] text-white text-sm font-semibold rounded-lg transition disabled:opacity-50 whitespace-nowrap"
          >
            {adding ? 'Adicionando...' : 'Adicionar'}
          </button>
        </form>
        <p className="text-xs text-gray-500 mt-2">
          Se o colaborador já tem conta Malama, o acesso é vinculado na hora. Caso contrário, ele recebe um convite por e-mail.
        </p>
      </div>

      {/* ── Lista de colaboradores ── */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#7d4a3c]" />
            <h2 className="font-semibold text-gray-800">Colaboradores</h2>
            <span className="text-xs text-gray-400">{colaboradores.length}</span>
          </div>
          <button
            onClick={exportCsv}
            disabled={colaboradores.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 transition disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar CSV
          </button>
        </div>

        {colaboradores.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Nenhum colaborador ainda.</p>
            <p className="text-gray-400 text-sm mt-1">Adicione o primeiro colaborador pelo e-mail acima.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">E-mail</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Adicionado</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Ativado</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {colaboradores.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 text-sm text-gray-800">{c.email}</td>
                    <td className="px-4 py-3 text-center"><ColabStatusBadge status={c.status} /></td>
                    <td className="px-4 py-3 text-xs text-gray-500 hidden sm:table-cell">{fmtDate(c.data_adicao)}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 hidden md:table-cell">{fmtDate(c.data_ativacao)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleRemove(c)}
                        title="Remover"
                        className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
