// =====================================================
// Malama — Dashboard do Portal do RH
// Dados da empresa, breakdown de assentos, lista de
// colaboradores com reenvio de convite e exportação CSV.
// =====================================================

import React, { useEffect, useState, useCallback } from 'react';
import {
  Users, UserPlus, Trash2, Download, Mail, AlertCircle,
  CheckCircle2, Clock, Building2, Calendar, Send, Brain,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { rhService, type RhEmpresa, type EmpresaColaborador } from '../../services/empresaService';

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

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
  const [empresa, setEmpresa] = useState<RhEmpresa | null>(null);
  const [colaboradores, setColaboradores] = useState<EmpresaColaborador[]>([]);
  const [loading, setLoading] = useState(true);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [setor, setSetor] = useState('');
  const [funcao, setFuncao] = useState('');
  const [adding, setAdding] = useState(false);
  const [resending, setResending] = useState<string | null>(null);
  const [psi, setPsi] = useState<{ plano_ativo: boolean; max_assentos: number; assentos_em_uso: number } | null>(null);
  const [togglingPsi, setTogglingPsi] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const emp = await rhService.getMyEmpresa();
      setEmpresa(emp);
      if (emp) {
        const [colabs, resumoPsi] = await Promise.all([
          rhService.getColaboradores(emp.id),
          rhService.getResumoPsicologico(),
        ]);
        setColaboradores(colabs);
        setPsi(resumoPsi);
      }
    } catch (err) {
      console.error('Erro ao carregar painel do RH:', err);
      toast.error('Erro ao carregar dados.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const ativos = colaboradores.filter(c => c.status === 'ativo').length;
  const convidados = colaboradores.filter(c => c.status === 'convidado').length;
  const usados = colaboradores.length;
  const limite = empresa?.max_assentos ?? null;
  const cheio = limite != null && usados >= limite;
  const pct = limite ? Math.min(100, (usados / limite) * 100) : 0;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = email.trim().toLowerCase();
    const nomeValue = nome.trim();
    if (!value) return;
    if (!nomeValue) { toast.error('Informe o nome do colaborador.'); return; }
    if (cheio) { toast.error('Limite de assentos atingido.'); return; }

    setAdding(true);
    try {
      const res = await rhService.inviteColaborador(value, nomeValue, setor.trim(), funcao.trim());
      if (res.existing) {
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
      setNome('');
      setSetor('');
      setFuncao('');
      await load();
    } catch (err: any) {
      toast.error(err?.message || 'Não foi possível adicionar o colaborador.');
    } finally {
      setAdding(false);
    }
  };

  const psiCheio = psi ? psi.assentos_em_uso >= psi.max_assentos : false;

  const handleTogglePsi = async (c: EmpresaColaborador) => {
    const ativar = !c.plano_psicologico;
    if (ativar && psiCheio) { toast.error('Limite de assentos psicológicos atingido.'); return; }
    setTogglingPsi(c.id);
    try {
      const res = await rhService.alocarPsicologo(c.id, ativar);
      if (!res.ok) { toast.error(res.error || 'Não foi possível atualizar.'); return; }
      setColaboradores(prev => prev.map(x => x.id === c.id ? { ...x, plano_psicologico: ativar } : x));
      setPsi(prev => prev ? { ...prev, assentos_em_uso: prev.assentos_em_uso + (ativar ? 1 : -1) } : prev);
      toast.success(ativar ? 'Acesso psicológico liberado.' : 'Acesso psicológico removido.');
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao atualizar acesso psicológico.');
    } finally {
      setTogglingPsi(null);
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

  const handleResend = async (c: EmpresaColaborador) => {
    setResending(c.id);
    try {
      const res = await rhService.resendInvite(c.id);
      if (res.sent) {
        toast.success(`E-mail reenviado para ${c.email}.`);
      } else {
        toast(`Não foi possível reenviar: ${res.warning ?? 'erro desconhecido'}`, { icon: '⚠️' });
      }
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao reenviar convite.');
    } finally {
      setResending(null);
    }
  };

  const exportCsv = () => {
    const header = ['email', 'setor', 'funcao', 'status', 'data_adicao', 'data_ativacao'];
    const rows = colaboradores.map(c => [
      c.email,
      c.setor ?? '',
      c.funcao ?? '',
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
      {/* ── Cabeçalho ── */}
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

      {/* ── Dados da empresa ── */}
      <div className="bg-white rounded-xl shadow p-5">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="w-5 h-5 text-[#7d4a3c]" />
          <h2 className="font-semibold text-gray-800">Dados da empresa</h2>
        </div>
        <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {empresa.cnpj && (
            <div>
              <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide">CNPJ</dt>
              <dd className="mt-1 text-sm text-gray-700">{empresa.cnpj}</dd>
            </div>
          )}
          {empresa.responsavel_nome && (
            <div>
              <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide">Responsável</dt>
              <dd className="mt-1 text-sm text-gray-700">{empresa.responsavel_nome}</dd>
            </div>
          )}
          {empresa.data_inicio && (
            <div className="flex flex-col">
              <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Início do contrato
              </dt>
              <dd className="mt-1 text-sm text-gray-700">{fmtDate(empresa.data_inicio)}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* ── Breakdown de assentos ── */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{ativos}</p>
          <p className="text-xs text-gray-500 mt-1 flex items-center justify-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Ativos
          </p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <p className="text-2xl font-bold text-yellow-500">{convidados}</p>
          <p className="text-xs text-gray-500 mt-1 flex items-center justify-center gap-1">
            <Clock className="w-3 h-3" /> Convidados
          </p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <p className="text-2xl font-bold text-gray-800">
            {usados}{limite != null && <span className="text-gray-400 text-lg"> / {limite}</span>}
          </p>
          <p className="text-xs text-gray-500 mt-1 flex items-center justify-center gap-1">
            <Users className="w-3 h-3" /> Assentos
          </p>
        </div>
      </div>

      {/* Barra de progresso de assentos */}
      {limite != null && (
        <div className="bg-white rounded-xl shadow px-5 py-3">
          <div className="flex items-center justify-between mb-2 text-xs text-gray-500">
            <span>Ocupação dos assentos contratados</span>
            <span>{Math.round(pct)}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${pct}%`, background: cheio ? '#DC2626' : '#7d4a3c' }}
            />
          </div>
          {cheio && (
            <p className="text-xs text-red-500 mt-2">
              Limite atingido. Remova um colaborador ou fale com a Malama para ampliar.
            </p>
          )}
        </div>
      )}

      {/* ── Plano psicológico (se ativo) ── */}
      {psi?.plano_ativo && (
        <div className="bg-white rounded-xl shadow p-5">
          <div className="flex items-center gap-2 mb-1">
            <Brain className="w-5 h-5 text-[#7d4a3c]" />
            <h2 className="font-semibold text-gray-800">Plano psicológico</h2>
          </div>
          <p className="text-sm text-gray-500 mb-3">
            Sua empresa contratou consultas com psicólogos. Escolha, na lista de colaboradores
            abaixo, quem terá acesso a esse benefício adicional.
          </p>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-600">
              Assentos psicológicos: <strong className="text-[#7d4a3c]">{psi.assentos_em_uso}</strong>
              {' / '}{psi.max_assentos}
            </span>
            {psiCheio && <span className="text-xs text-amber-600">Limite atingido</span>}
          </div>
        </div>
      )}

      {/* ── Adicionar colaborador ── */}
      <div className="bg-white rounded-xl shadow p-5">
        <div className="flex items-center gap-2 mb-3">
          <UserPlus className="w-5 h-5 text-[#7d4a3c]" />
          <h2 className="font-semibold text-gray-800">Adicionar colaborador</h2>
        </div>
        <form onSubmit={handleAdd} className="flex flex-col gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="relative">
              <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text" value={nome} onChange={e => setNome(e.target.value)}
                placeholder="Nome do colaborador"
                disabled={cheio || empresa.status !== 'ativa'}
                className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#7d4a3c] focus:border-transparent disabled:bg-gray-50"
              />
            </div>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="email@colaborador.com"
                disabled={cheio || empresa.status !== 'ativa'}
                className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#7d4a3c] focus:border-transparent disabled:bg-gray-50"
              />
            </div>
            <input
              type="text" value={setor} onChange={e => setSetor(e.target.value)}
              placeholder="Setor (ex.: Operações) — opcional"
              disabled={cheio || empresa.status !== 'ativa'}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#7d4a3c] focus:border-transparent disabled:bg-gray-50"
            />
            <input
              type="text" value={funcao} onChange={e => setFuncao(e.target.value)}
              placeholder="Função (ex.: Analista) — opcional"
              disabled={cheio || empresa.status !== 'ativa'}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#7d4a3c] focus:border-transparent disabled:bg-gray-50"
            />
          </div>
          <button
            type="submit" disabled={adding || cheio || empresa.status !== 'ativa'}
            className="self-start flex items-center justify-center gap-2 px-5 py-2.5 bg-[#7d4a3c] hover:bg-[#623a2f] text-white text-sm font-semibold rounded-lg transition disabled:opacity-50 whitespace-nowrap"
          >
            {adding ? 'Adicionando...' : 'Adicionar'}
          </button>
        </form>
        <p className="text-xs text-gray-500 mt-2">
          Se o colaborador já tem conta Malama, o acesso é vinculado na hora. Caso contrário, ele recebe um convite por e-mail.
          Setor e função alimentam os relatórios agregados de bem-estar (nunca identificam respostas individuais).
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Setor</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Adicionado</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Ativado</th>
                  {psi?.plano_ativo && (
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Psi</th>
                  )}
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {colaboradores.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 text-sm text-gray-800">{c.email}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 hidden lg:table-cell">
                      {c.setor || '—'}{c.funcao ? ` · ${c.funcao}` : ''}
                    </td>
                    <td className="px-4 py-3 text-center"><ColabStatusBadge status={c.status} /></td>
                    <td className="px-4 py-3 text-xs text-gray-500 hidden sm:table-cell">{fmtDate(c.data_adicao)}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 hidden md:table-cell">{fmtDate(c.data_ativacao)}</td>
                    {psi?.plano_ativo && (
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleTogglePsi(c)}
                          disabled={togglingPsi === c.id || (!c.plano_psicologico && psiCheio)}
                          title={c.plano_psicologico ? 'Remover acesso psicológico' : 'Liberar acesso psicológico'}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition disabled:opacity-40 ${
                            c.plano_psicologico ? 'bg-[#7d4a3c]' : 'bg-gray-300'
                          }`}
                        >
                          <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition ${
                            c.plano_psicologico ? 'translate-x-5' : 'translate-x-1'
                          }`} />
                        </button>
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {c.status === 'convidado' && (
                          <button
                            onClick={() => handleResend(c)}
                            disabled={resending === c.id}
                            title="Reenviar convite"
                            className="p-1.5 text-[#7d4a3c] hover:bg-[#7d4a3c]/10 rounded-lg transition disabled:opacity-40"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleRemove(c)}
                          title="Remover"
                          className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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
