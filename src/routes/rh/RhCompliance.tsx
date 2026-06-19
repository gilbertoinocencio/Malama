// =====================================================
// Malama — Portal do RH · Aba Compliance (NR-1 / Selo Malama)
// Gera, sob demanda, um PDF de evidência documental para o PGR da empresa.
// Métricas sempre AGREGADAS (nunca dado individual). Histórico re-baixável.
// =====================================================

import React, { useEffect, useState, useCallback } from 'react';
import { ShieldCheck, FileDown, Download, AlertCircle, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  rhService,
  type RhComplianceMetricas,
  type ComplianceDoc,
} from '../../services/empresaService';
import { generateCompliancePDF } from '../../lib/complianceDoc';

const fmtDateTime = (d: string) =>
  new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export const RhCompliance: React.FC = () => {
  const [metricas, setMetricas] = useState<RhComplianceMetricas | null>(null);
  const [docs, setDocs] = useState<ComplianceDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [gerando, setGerando] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [m, d] = await Promise.all([rhService.getComplianceMetricas(), rhService.getComplianceDocs()]);
      setMetricas(m);
      setDocs(d);
    } catch (err) {
      console.error('Erro ao carregar compliance:', err);
      toast.error('Erro ao carregar dados de compliance.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const gerarNumero = () => {
    const hoje = new Date();
    const ymd = `${hoje.getFullYear()}${String(hoje.getMonth() + 1).padStart(2, '0')}${String(hoje.getDate()).padStart(2, '0')}`;
    const seq = String(docs.length + 1).padStart(3, '0');
    return `MAL-PGR-${ymd}-${seq}`;
  };

  const handleGerar = async () => {
    if (!metricas) return;
    setGerando(true);
    try {
      const numero = gerarNumero();
      const emitidoEm = new Date();
      const hoje = emitidoEm.toISOString().slice(0, 10);

      generateCompliancePDF({
        empresaNome: metricas.nome,
        empresaCnpj: metricas.cnpj,
        dataInicio: metricas.data_inicio,
        colaboradoresElegiveis: metricas.colaboradores_elegiveis,
        colaboradoresAtivos: metricas.colaboradores_ativos,
        consultasRealizadas: metricas.consultas_realizadas,
        numeroDoc: numero,
        emitidoEm,
      });

      await rhService.saveComplianceDoc({
        empresa_id: metricas.empresa_id,
        periodo_inicio: metricas.data_inicio,
        periodo_fim: hoje,
        colaboradores_elegiveis: metricas.colaboradores_elegiveis,
        colaboradores_ativos: metricas.colaboradores_ativos,
        consultas_realizadas: metricas.consultas_realizadas,
        numero_doc: numero,
      });
      toast.success('Documento gerado e registrado.');
      load();
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao gerar documento.');
    } finally {
      setGerando(false);
    }
  };

  const rebaixar = (d: ComplianceDoc) => {
    if (!metricas) return;
    generateCompliancePDF({
      empresaNome: metricas.nome,
      empresaCnpj: metricas.cnpj,
      dataInicio: d.periodo_inicio,
      colaboradoresElegiveis: d.colaboradores_elegiveis,
      colaboradoresAtivos: d.colaboradores_ativos,
      consultasRealizadas: d.consultas_realizadas,
      numeroDoc: d.numero_doc,
      emitidoEm: new Date(d.emitido_em),
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7d4a3c]" />
      </div>
    );
  }

  if (!metricas) {
    return (
      <div className="bg-white rounded-xl shadow p-10 text-center">
        <AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-600 font-medium">Dados de compliance indisponíveis.</p>
        <p className="text-gray-400 text-sm mt-1">Entre em contato com a Malama.</p>
      </div>
    );
  }

  const taxa = metricas.colaboradores_elegiveis > 0
    ? Math.round((metricas.colaboradores_ativos / metricas.colaboradores_elegiveis) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Cabeçalho + gerar */}
      <div className="bg-white rounded-xl shadow p-5">
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck className="w-5 h-5 text-[#7d4a3c]" />
          <h2 className="font-semibold text-gray-800">Selo Malama — Compliance NR-1</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Gere um documento com os indicadores atuais do programa, como evidência documental
          complementar para o PGR da sua empresa.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-gray-800">{metricas.colaboradores_elegiveis}</p>
            <p className="text-xs text-gray-500 mt-1">Elegíveis</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-green-600">{metricas.colaboradores_ativos}</p>
            <p className="text-xs text-gray-500 mt-1">Ativos</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-[#7d4a3c]">{taxa}%</p>
            <p className="text-xs text-gray-500 mt-1">Adesão</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-gray-800">{metricas.consultas_realizadas}</p>
            <p className="text-xs text-gray-500 mt-1">Consultas</p>
          </div>
        </div>

        <button
          onClick={handleGerar}
          disabled={gerando}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#7d4a3c] hover:bg-[#623a2f] text-white text-sm font-semibold rounded-lg transition disabled:opacity-50"
        >
          <FileDown className="w-4 h-4" />
          {gerando ? 'Gerando...' : 'Gerar documento para PGR'}
        </button>

        <div className="mt-4 flex items-start gap-2 text-xs text-gray-400">
          <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>
            Documento é evidência documental complementar de programa de promoção de saúde — não
            substitui as obrigações legais de NR-1 nem o PGR da empresa.
          </span>
        </div>
      </div>

      {/* Histórico */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-[#7d4a3c]" />
          <h2 className="font-semibold text-gray-800">Documentos gerados</h2>
          <span className="text-xs text-gray-400">{docs.length}</span>
        </div>
        {docs.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">Nenhum documento gerado ainda.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Documento</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Emitido em</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Adesão</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Baixar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {docs.map(d => (
                  <tr key={d.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 text-sm text-gray-800">{d.numero_doc}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 hidden sm:table-cell">{fmtDateTime(d.emitido_em)}</td>
                    <td className="px-4 py-3 text-center text-xs text-gray-500 hidden md:table-cell">
                      {d.colaboradores_ativos}/{d.colaboradores_elegiveis}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => rebaixar(d)} className="inline-flex items-center gap-1 text-xs text-[#7d4a3c] hover:underline">
                        <Download className="w-3.5 h-3.5" /> PDF
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
