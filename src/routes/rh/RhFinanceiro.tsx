// =====================================================
// Malama — Portal do RH · Aba Financeiro
// Fatura atual, histórico (download PDF/2ª via), resumo do contrato
// e dados de cobrança editáveis. Sem MRR/valor de plataforma de outras empresas.
// =====================================================

import React, { useEffect, useState, useCallback } from 'react';
import {
  CreditCard, Download, FileText, Users, Pencil, Check, X, AlertCircle, QrCode, Copy,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  rhService,
  type EmpresaFatura,
  modulosDaEmpresa,
  type RhResumoFinanceiro,
} from '../../services/empresaService';
import { LinkSuporte } from '../../components/rh/LinkSuporte';
import { useRhJornada } from '../../contexts/RhJornadaContext';

const fmtCurrency = (v: number | null | undefined) =>
  (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

const statusBadge: Record<EmpresaFatura['status'], { label: string; cls: string }> = {
  pendente: { label: 'Pendente', cls: 'bg-yellow-100 text-yellow-700' },
  pago:     { label: 'Pago',     cls: 'bg-green-100 text-green-700' },
  atrasado: { label: 'Atrasado', cls: 'bg-red-100 text-red-700' },
  cancelado:{ label: 'Cancelado',cls: 'bg-gray-100 text-gray-500' },
};

export const RhFinanceiro: React.FC = () => {
  // Os módulos vêm da empresa já carregada pelo layout — o resumo financeiro
  // é uma RPC própria e não os devolve.
  const { empresa } = useRhJornada();
  const modulos = modulosDaEmpresa(empresa);
  const [resumo, setResumo] = useState<RhResumoFinanceiro | null>(null);
  const [faturas, setFaturas] = useState<EmpresaFatura[]>([]);
  const [loading, setLoading] = useState(true);

  const [editCobranca, setEditCobranca] = useState(false);
  const [cobEmail, setCobEmail] = useState('');
  const [cobResp, setCobResp] = useState('');
  const [savingCob, setSavingCob] = useState(false);

  const [editAssentos, setEditAssentos] = useState(false);
  const [novoAssentos, setNovoAssentos] = useState('');
  const [savingAssentos, setSavingAssentos] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, f] = await Promise.all([rhService.getResumoFinanceiro(), rhService.getFaturas()]);
      setResumo(r);
      setFaturas(f);
      setCobEmail(r?.cobranca_email ?? '');
      setCobResp(r?.cobranca_responsavel ?? '');
    } catch (err) {
      console.error('Erro ao carregar financeiro:', err);
      toast.error('Erro ao carregar dados financeiros.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveCobranca = async () => {
    setSavingCob(true);
    try {
      await rhService.updateCobranca(cobEmail.trim(), cobResp.trim());
      toast.success('Dados de cobrança atualizados.');
      setEditCobranca(false);
      load();
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao salvar dados de cobrança.');
    } finally {
      setSavingCob(false);
    }
  };

  const fmtMesAno = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  const saveAssentos = async () => {
    if (!resumo) return;
    const n = parseInt(novoAssentos, 10);
    if (!Number.isFinite(n)) { toast.error('Informe um número válido.'); return; }
    if (n < resumo.assentos_ocupados) {
      toast.error(`O novo total não pode ser menor que os ${resumo.assentos_ocupados} assentos ocupados.`);
      return;
    }
    if (n === resumo.max_assentos) {
      toast.error('Informe uma quantidade diferente da atual.');
      return;
    }
    setSavingAssentos(true);
    try {
      const vigencia = await rhService.agendarAssentos(n);
      toast.success(`Ajuste agendado para ${fmtMesAno(vigencia)}. A fatura atual não muda.`);
      setEditAssentos(false);
      setNovoAssentos('');
      load();
    } catch (err: any) {
      toast.error(err?.message || 'Não foi possível agendar o ajuste.');
    } finally {
      setSavingAssentos(false);
    }
  };

  const copyPix = (payload: string) => {
    navigator.clipboard.writeText(payload).then(
      () => toast.success('Código PIX copiado.'),
      () => toast.error('Não foi possível copiar.')
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7d4a3c]" />
      </div>
    );
  }

  if (!resumo) {
    return (
      <div className="bg-white rounded-xl shadow p-10 text-center">
        <AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-600 font-medium">Dados financeiros indisponíveis.</p>
        <p className="text-gray-400 text-sm mt-1">
          Cobrança e contrato são mantidos pela Malama — o suporte resolve.
        </p>
        <LinkSuporte
          assunto="Dados financeiros indisponíveis"
          detalhe="A aba Financeiro não consegue carregar os dados do contrato."
        />
      </div>
    );
  }

  // Total mensal = valor por assento × assentos CONTRATADOS (cobra-se o contratado, não o uso).
  // Sem preço definido para alguma modalidade contratada, o valor vem nulo — e aí a tela
  // mostra "—", nunca R$ 0,00: zero se lê como "não custa nada", que é diferente de
  // "ainda não foi precificado" e é justamente o caso em que a cobrança se recusa a emitir.
  const semPreco = resumo.valor_por_assento == null;
  const totalMensal = (resumo.valor_por_assento ?? 0) * (resumo.max_assentos ?? 0);
  const faturaAtual = faturas.find(f => f.status !== 'pago' && f.status !== 'cancelado') ?? faturas[0];

  return (
    <div className="space-y-6">
      {/* Fatura atual */}
      <div className="bg-white rounded-xl shadow p-5">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="w-5 h-5 text-[#7d4a3c]" />
          <h2 className="font-semibold text-gray-800">Fatura atual</h2>
        </div>
        {faturaAtual ? (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-3xl font-bold text-gray-800">{fmtCurrency(faturaAtual.valor)}</p>
              <p className="text-sm text-gray-500 mt-1">
                Competência {faturaAtual.competencia.slice(0, 7)} · Vencimento {fmtDate(faturaAtual.vencimento)}
              </p>
              <span className={`inline-block mt-2 px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge[faturaAtual.status].cls}`}>
                {statusBadge[faturaAtual.status].label}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {faturaAtual.asaas_invoice_url && (
                <a href={faturaAtual.asaas_invoice_url} target="_blank" rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#7d4a3c] hover:bg-[#623a2f] text-white text-sm font-semibold rounded-lg transition">
                  <FileText className="w-4 h-4" /> Ver fatura / boleto
                </a>
              )}
              {faturaAtual.asaas_pix_payload && (
                <button onClick={() => copyPix(faturaAtual.asaas_pix_payload!)}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition">
                  <QrCode className="w-4 h-4" /> Copiar PIX
                </button>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400">Nenhuma fatura em aberto no momento.</p>
        )}
      </div>

      {/* Resumo do contrato */}
      <div className="bg-white rounded-xl shadow p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#7d4a3c]" />
            <h2 className="font-semibold text-gray-800">Resumo do contrato</h2>
          </div>
          {!editAssentos ? (
            <button onClick={() => {
              setEditAssentos(true);
              setNovoAssentos(String(resumo.max_assentos_agendado ?? resumo.max_assentos ?? ''));
            }}
              className="inline-flex items-center gap-1.5 text-sm text-[#7d4a3c] hover:underline">
              <Pencil className="w-3.5 h-3.5" /> Editar assentos
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <input type="number" min={Math.max(1, resumo.assentos_ocupados)} step="1"
                value={novoAssentos} onChange={e => setNovoAssentos(e.target.value)}
                className="w-20 border border-gray-300 rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-[#7d4a3c]" />
              <button onClick={saveAssentos} disabled={savingAssentos}
                className="inline-flex items-center gap-1 text-sm text-green-600 hover:underline disabled:opacity-50">
                <Check className="w-4 h-4" /> Agendar
              </button>
              <button onClick={() => setEditAssentos(false)} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:underline">
                <X className="w-4 h-4" /> Cancelar
              </button>
            </div>
          )}
        </div>
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide">Assentos contratados</dt>
            <dd className="mt-1 text-lg font-semibold text-gray-800">{resumo.max_assentos ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide">Assentos ocupados</dt>
            <dd className="mt-1 text-lg font-semibold text-gray-800">{resumo.assentos_ocupados}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide">Valor por assento</dt>
            <dd className="mt-1 text-lg font-semibold text-gray-800">
              {semPreco ? '—' : fmtCurrency(resumo.valor_por_assento)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide">Total mensal</dt>
            <dd className="mt-1 text-lg font-semibold text-[#7d4a3c]">
              {semPreco ? '—' : fmtCurrency(totalMensal)}
            </dd>
          </div>
        </dl>

        {semPreco && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>
              O valor deste contrato ainda não está definido para todas as modalidades contratadas.
              Enquanto isso, nenhuma fatura é emitida — o suporte da Malama resolve.
            </span>
          </div>
        )}

        {/* O valor do assento aparecia sem dizer do que é composto — e é a
            primeira pergunta de quem confere a fatura. */}
        {modulos.length > 0 && (
          <div className="mt-4 border-t border-gray-100 pt-3">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
              O que está incluído no assento
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {modulos.map(m => (
                <span key={m} className="rounded-full bg-[#7d4a3c]/10 px-2.5 py-1 text-xs font-medium text-[#7d4a3c]">
                  {m}
                </span>
              ))}
            </div>
          </div>
        )}

        {resumo.max_assentos_agendado != null && resumo.max_assentos_vigencia && (
          <div className="mt-4 flex items-start gap-2 text-sm bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-amber-800">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>
              Ajuste agendado: <strong>{resumo.max_assentos_agendado} assentos</strong> a partir de{' '}
              <strong>{fmtMesAno(resumo.max_assentos_vigencia)}</strong>. A fatura do mês atual mantém o valor vigente.
              {!semPreco && (
                <> O novo total mensal será <strong>{fmtCurrency(
                  (resumo.valor_por_assento ?? 0) * resumo.max_assentos_agendado
                )}</strong>.</>
              )}
            </span>
          </div>
        )}
        <p className="text-xs text-gray-400 mt-3">
          Aumentos e reduções passam a valer no mês seguinte. O total não pode ser menor que os assentos ocupados.
        </p>
      </div>

      {/* Dados de cobrança */}
      <div className="bg-white rounded-xl shadow p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-800">Dados de cobrança</h2>
          {!editCobranca ? (
            <button onClick={() => setEditCobranca(true)} className="inline-flex items-center gap-1.5 text-sm text-[#7d4a3c] hover:underline">
              <Pencil className="w-3.5 h-3.5" /> Editar
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={saveCobranca} disabled={savingCob}
                className="inline-flex items-center gap-1.5 text-sm text-green-600 hover:underline disabled:opacity-50">
                <Check className="w-4 h-4" /> Salvar
              </button>
              <button onClick={() => { setEditCobranca(false); setCobEmail(resumo.cobranca_email ?? ''); setCobResp(resumo.cobranca_responsavel ?? ''); }}
                className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:underline">
                <X className="w-4 h-4" /> Cancelar
              </button>
            </div>
          )}
        </div>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide">CNPJ</dt>
            <dd className="mt-1 text-sm text-gray-700">{resumo.cnpj ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide">Responsável financeiro</dt>
            <dd className="mt-1">
              {editCobranca
                ? <input value={cobResp} onChange={e => setCobResp(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-[#7d4a3c]" placeholder="Nome do responsável" />
                : <span className="text-sm text-gray-700">{resumo.cobranca_responsavel ?? '—'}</span>}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide">E-mail de cobrança</dt>
            <dd className="mt-1">
              {editCobranca
                ? <input type="email" value={cobEmail} onChange={e => setCobEmail(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-[#7d4a3c]" placeholder="financeiro@empresa.com" />
                : <span className="text-sm text-gray-700">{resumo.cobranca_email ?? '—'}</span>}
            </dd>
          </div>
        </dl>
      </div>

      {/* Histórico de faturas */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center gap-2">
          <FileText className="w-5 h-5 text-[#7d4a3c]" />
          <h2 className="font-semibold text-gray-800">Histórico de faturas</h2>
          <span className="text-xs text-gray-400">{faturas.length}</span>
        </div>
        {faturas.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">Nenhuma fatura emitida ainda.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Competência</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Valor</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Vencimento</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Fatura</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {faturas.map(f => (
                  <tr key={f.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 text-sm text-gray-800">{f.competencia.slice(0, 7)}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-700">{fmtCurrency(f.valor)}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 hidden sm:table-cell">{fmtDate(f.vencimento)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge[f.status].cls}`}>{statusBadge[f.status].label}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {f.asaas_invoice_url
                        ? <a href={f.asaas_invoice_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-[#7d4a3c] hover:underline"><Download className="w-3.5 h-3.5" /> Abrir</a>
                        : <span className="text-xs text-gray-300">—</span>}
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
