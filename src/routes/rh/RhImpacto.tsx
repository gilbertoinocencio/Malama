// =====================================================
// Malama — Portal do RH · Aba Impacto (ESG)
// Lista os certificados de doação emitidos (um por mês) com download em PDF.
// A aba só aparece no layout quando há ≥1 certificado.
// =====================================================

import React, { useEffect, useState, useCallback } from 'react';
import { Leaf, Download, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { rhService, type CertificadoEsg, type RhEmpresa } from '../../services/empresaService';
import { generateCertificadoPDF } from '../../lib/certificadoEsg';

const fmtMes = (comp: string) =>
  new Date(comp + 'T00:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

export const RhImpacto: React.FC = () => {
  const [certificados, setCertificados] = useState<CertificadoEsg[]>([]);
  const [empresa, setEmpresa] = useState<RhEmpresa | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [certs, emp] = await Promise.all([rhService.getCertificados(), rhService.getMyEmpresa()]);
      setCertificados(certs);
      setEmpresa(emp);
    } catch (err) {
      console.error('Erro ao carregar certificados:', err);
      toast.error('Erro ao carregar certificados de impacto.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const baixar = (c: CertificadoEsg) => {
    generateCertificadoPDF({
      empresaNome: empresa?.nome ?? '',
      empresaCnpj: empresa?.cnpj ?? null,
      competencia: c.competencia,
      colaboradoresAtivos: c.colaboradores_ativos,
      kgPerdido: Number(c.kg_perdido),
      kgDoado: Number(c.kg_doado),
      bancoNome: c.banco_nome,
      bancoCnpj: c.banco_cnpj,
      dataRepasse: c.data_repasse,
      numeroSequencial: c.numero_sequencial,
      hashVerificacao: c.hash_verificacao,
    });
  };

  const totalDoado = certificados.reduce((s, c) => s + Number(c.kg_doado), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7d4a3c]" />
      </div>
    );
  }

  if (certificados.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow p-10 text-center">
        <AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-600 font-medium">Nenhum certificado disponível ainda.</p>
        <p className="text-gray-400 text-sm mt-1">Os certificados são emitidos mensalmente após a confirmação do repasse.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Resumo */}
      <div className="bg-white rounded-xl shadow p-5">
        <div className="flex items-center gap-2 mb-4">
          <Leaf className="w-5 h-5 text-[#7d4a3c]" />
          <h2 className="font-semibold text-gray-800">Impacto social acumulado</h2>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-[#7d4a3c]">{totalDoado.toLocaleString('pt-BR')} kg</p>
            <p className="text-xs text-gray-500 mt-1">de alimentos doados</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-gray-800">{certificados.length}</p>
            <p className="text-xs text-gray-500 mt-1">certificados emitidos</p>
          </div>
        </div>
      </div>

      {/* Lista de certificados */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center gap-2">
          <Leaf className="w-5 h-5 text-[#7d4a3c]" />
          <h2 className="font-semibold text-gray-800">Certificados mensais</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Competência</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Kg doados</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Parceiro</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Nº</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Certificado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {certificados.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3 text-sm text-gray-800 capitalize">{fmtMes(c.competencia)}</td>
                  <td className="px-4 py-3 text-sm text-right font-semibold text-[#7d4a3c]">{Number(c.kg_doado).toLocaleString('pt-BR')} kg</td>
                  <td className="px-4 py-3 text-sm text-gray-600 hidden sm:table-cell">{c.banco_nome ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-400 hidden md:table-cell">{c.numero_sequencial}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => baixar(c)} className="inline-flex items-center gap-1 text-xs text-[#7d4a3c] hover:underline">
                      <Download className="w-3.5 h-3.5" /> PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
