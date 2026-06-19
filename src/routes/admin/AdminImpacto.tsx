// =====================================================
// Malama — Super Admin · Impacto (ESG)
// Confirma o repasse mensal ao banco de alimentos e emite o certificado.
// O cálculo de kg perdido é agregado (RPC). Só após confirmar, o RH vê.
// =====================================================

import React, { useEffect, useState, useCallback } from 'react';
import { Leaf, Plus, CheckCircle2, Calculator, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  empresaAdminService,
  type EmpresaSummary,
  type BancoAlimentos,
  type CertificadoEsg,
} from '../../services/empresaService';

const fmtMes = (comp: string) =>
  new Date(comp + 'T00:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

const mesAtualCompetencia = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export const AdminImpacto: React.FC = () => {
  const [empresas, setEmpresas] = useState<EmpresaSummary[]>([]);
  const [bancos, setBancos] = useState<BancoAlimentos[]>([]);
  const [certificados, setCertificados] = useState<CertificadoEsg[]>([]);
  const [loading, setLoading] = useState(true);

  // Formulário de confirmação
  const [empresaId, setEmpresaId] = useState('');
  const [mes, setMes] = useState(mesAtualCompetencia());        // YYYY-MM
  const [bancoId, setBancoId] = useState('');
  const [dataRepasse, setDataRepasse] = useState(new Date().toISOString().slice(0, 10));
  const [preview, setPreview] = useState<{ kg_perdido: number; colaboradores_ativos: number } | null>(null);
  const [calculando, setCalculando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);

  // Novo banco
  const [novoBanco, setNovoBanco] = useState(false);
  const [bancoNome, setBancoNome] = useState('');
  const [bancoCnpj, setBancoCnpj] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [emps, bks, certs] = await Promise.all([
        empresaAdminService.getAll(),
        empresaAdminService.getBancosAlimentos(),
        empresaAdminService.getCertificadosEsg(),
      ]);
      setEmpresas(emps);
      setBancos(bks);
      setCertificados(certs);
    } catch (err) {
      console.error('Erro ao carregar impacto:', err);
      toast.error('Erro ao carregar dados de impacto.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const competencia = `${mes}-01`;

  const handlePreview = async () => {
    if (!empresaId) { toast.error('Selecione a empresa.'); return; }
    setCalculando(true);
    setPreview(null);
    try {
      setPreview(await empresaAdminService.previewKgPerdido(empresaId, competencia));
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao calcular kg perdido.');
    } finally {
      setCalculando(false);
    }
  };

  const handleAddBanco = async () => {
    if (!bancoNome.trim()) { toast.error('Informe o nome do banco de alimentos.'); return; }
    try {
      const novo = await empresaAdminService.addBancoAlimentos(bancoNome.trim(), bancoCnpj.trim() || null);
      setBancos(prev => [...prev, novo]);
      setBancoId(novo.id);
      setNovoBanco(false);
      setBancoNome(''); setBancoCnpj('');
      toast.success('Banco de alimentos cadastrado.');
    } catch {
      toast.error('Erro ao cadastrar banco de alimentos.');
    }
  };

  const handleConfirmar = async () => {
    if (!empresaId) { toast.error('Selecione a empresa.'); return; }
    if (!bancoId) { toast.error('Selecione o banco de alimentos.'); return; }
    if (!dataRepasse) { toast.error('Informe a data do repasse.'); return; }
    if (!confirm('Confirmar o repasse e emitir o certificado? O RH passará a visualizá-lo.')) return;
    setConfirmando(true);
    try {
      await empresaAdminService.confirmarRepasse(empresaId, competencia, bancoId, dataRepasse);
      toast.success('Repasse confirmado e certificado emitido.');
      setPreview(null);
      load();
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao confirmar repasse.');
    } finally {
      setConfirmando(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="w-8 h-8 rounded-full border-4 border-[#7d4a3c] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Leaf className="w-6 h-6 text-[#7d4a3c]" />
        <h1 className="text-xl font-bold text-gray-800">Impacto (ESG) — repasses e certificados</h1>
      </div>

      {/* Confirmação de repasse */}
      <div className="bg-white rounded-xl shadow p-5 space-y-4">
        <h2 className="font-semibold text-gray-800 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-[#7d4a3c]" /> Confirmar repasse mensal
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Empresa</label>
            <select value={empresaId} onChange={e => { setEmpresaId(e.target.value); setPreview(null); }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#7d4a3c]">
              <option value="">Selecione…</option>
              {empresas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Competência (mês)</label>
            <input type="month" value={mes} onChange={e => { setMes(e.target.value); setPreview(null); }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#7d4a3c]" />
          </div>
        </div>

        {/* Preview do cálculo */}
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={handlePreview} disabled={calculando || !empresaId}
            className="inline-flex items-center gap-2 px-4 py-2 border border-[#7d4a3c] text-[#7d4a3c] text-sm font-medium rounded-lg hover:bg-[#7d4a3c]/5 transition disabled:opacity-50">
            <Calculator className="w-4 h-4" /> {calculando ? 'Calculando…' : 'Calcular kg perdido'}
          </button>
          {preview && (
            <span className="text-sm text-gray-700">
              <strong>{preview.kg_perdido.toLocaleString('pt-BR')} kg</strong> perdidos ·
              {' '}{preview.colaboradores_ativos} colaboradores ativos · doação 1:1
            </span>
          )}
        </div>

        {/* Banco de alimentos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Banco de alimentos parceiro</label>
            {!novoBanco ? (
              <div className="flex gap-2">
                <select value={bancoId} onChange={e => setBancoId(e.target.value)}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#7d4a3c]">
                  <option value="">Selecione…</option>
                  {bancos.map(b => <option key={b.id} value={b.id}>{b.nome}</option>)}
                </select>
                <button onClick={() => setNovoBanco(true)} title="Novo banco"
                  className="px-3 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <input value={bancoNome} onChange={e => setBancoNome(e.target.value)} placeholder="Nome do banco"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#7d4a3c]" />
                <input value={bancoCnpj} onChange={e => setBancoCnpj(e.target.value)} placeholder="CNPJ (opcional)"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#7d4a3c]" />
                <div className="flex gap-2">
                  <button onClick={handleAddBanco} className="px-3 py-1.5 bg-[#7d4a3c] text-white text-xs rounded-lg">Salvar</button>
                  <button onClick={() => setNovoBanco(false)} className="px-3 py-1.5 border border-gray-200 text-gray-600 text-xs rounded-lg">Cancelar</button>
                </div>
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Data do repasse</label>
            <input type="date" value={dataRepasse} onChange={e => setDataRepasse(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#7d4a3c]" />
          </div>
        </div>

        <button onClick={handleConfirmar} disabled={confirmando}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#7d4a3c] hover:bg-[#623a2f] text-white text-sm font-semibold rounded-lg transition disabled:opacity-50">
          <CheckCircle2 className="w-4 h-4" /> {confirmando ? 'Confirmando…' : 'Confirmar repasse e emitir certificado'}
        </button>
      </div>

      {/* Certificados emitidos */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-[#7d4a3c]" />
          <h2 className="font-semibold text-gray-800">Certificados emitidos</h2>
          <span className="text-xs text-gray-400">{certificados.length}</span>
        </div>
        {certificados.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">Nenhum certificado emitido ainda.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nº</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Competência</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Kg doados</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Parceiro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {certificados.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 text-xs text-gray-500">{c.numero_sequencial}</td>
                    <td className="px-4 py-3 text-sm text-gray-800 capitalize">{fmtMes(c.competencia)}</td>
                    <td className="px-4 py-3 text-sm text-right font-semibold text-[#7d4a3c]">{Number(c.kg_doado).toLocaleString('pt-BR')} kg</td>
                    <td className="px-4 py-3 text-sm text-gray-600 hidden sm:table-cell">{c.banco_nome ?? '—'}</td>
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
