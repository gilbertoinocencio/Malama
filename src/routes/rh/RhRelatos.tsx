import React, { useEffect, useState } from 'react';
import { AlertTriangle, ChevronRight, LockKeyhole, RefreshCw, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { rhService, type RhRelatoDetalhe, type RhRelatoLista } from '../../services/empresaService';

const categoriaLabel: Record<string, string> = {
  assedio_moral: 'Assédio moral', assedio_sexual: 'Assédio sexual', violencia: 'Violência ou ameaça',
  discriminacao: 'Discriminação', retaliacao: 'Retaliação', outro: 'Outra situação grave',
};
const statusLabel: Record<string, string> = {
  novo: 'Novo', acolhimento: 'Em acolhimento', em_apuracao: 'Em apuração',
  encaminhado: 'Encaminhado', concluido: 'Concluído', arquivado: 'Arquivado',
};

export const RhRelatos: React.FC = () => {
  const [relatos, setRelatos] = useState<RhRelatoLista[]>([]);
  const [detalhe, setDetalhe] = useState<RhRelatoDetalhe | null>(null);
  const [status, setStatus] = useState('novo');
  const [registro, setRegistro] = useState('');
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = async () => {
    setLoading(true);
    setErro(null);
    try {
      setRelatos(await rhService.getRelatos());
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha desconhecida';
      setErro(message);
      toast.error('Não foi possível consultar os relatos. Nenhum dado foi substituído.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void carregar(); }, []);

  const abrir = async (id: string) => {
    try {
      const r = await rhService.abrirRelato(id);
      setDetalhe(r); setStatus(r.status); setRegistro(r.registro_apuracao ?? '');
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Não foi possível abrir o relato.'); }
  };

  const salvar = async () => {
    if (!detalhe) return;
    setSalvando(true);
    try {
      await rhService.atualizarRelato(detalhe.id, status, registro);
      toast.success('Andamento atualizado.');
      setDetalhe(null); setLoading(true); await carregar();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Não foi possível atualizar.'); }
    finally { setSalvando(false); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Relatos confidenciais</h1>
        <p className="text-sm text-gray-500 mt-1">Fila restrita à equipe de apuração. Cada abertura fica registrada na trilha de auditoria.</p>
      </div>
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex gap-3 text-sm text-red-900">
        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
        <p>Um relato é um sinal grave que exige acolhimento e triagem, mas não deve ser apresentado como acusação comprovada. Preserve sigilo, imparcialidade e proteção contra retaliação. O canal é anônimo e não tem via de volta: o protocolo é o número do caso para o seu arquivo, não um código do relator.</p>
      </div>
      <div className="bg-white border rounded-2xl overflow-hidden">
        {loading ? <div className="p-10 text-center text-gray-400">Carregando...</div> : erro ? (
          <div className="p-10 text-center">
            <AlertTriangle className="w-8 h-8 text-red-500 mx-auto" />
            <p className="text-sm font-medium text-gray-800 mt-2">Não foi possível consultar os relatos</p>
            <p className="text-xs text-gray-500 mt-1">Os registros continuam preservados.</p>
            <p className="text-xs text-red-600 mt-2 break-words">{erro}</p>
            <button type="button" onClick={() => void carregar()}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#7d4a3c] px-4 py-2 text-sm font-semibold text-white">
              <RefreshCw className="w-4 h-4" /> Tentar novamente
            </button>
          </div>
        ) : relatos.length === 0 ? <div className="p-10 text-center"><LockKeyhole className="w-8 h-8 text-gray-300 mx-auto" /><p className="text-sm text-gray-500 mt-2">Nenhum relato recebido.</p></div> : relatos.map(r => (
          <button key={r.id} onClick={() => abrir(r.id)} className="w-full text-left p-4 border-b last:border-0 hover:bg-gray-50 flex items-center gap-4">
            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${r.urgencia === 'imediata' ? 'bg-red-600' : r.urgencia === 'alta' ? 'bg-amber-500' : 'bg-blue-500'}`} />
            <div className="min-w-0 flex-1"><div className="flex gap-2 items-center flex-wrap"><span className="font-semibold text-sm">{categoriaLabel[r.categoria] ?? r.categoria}</span><span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full">{statusLabel[r.status] ?? r.status}</span></div><p className="text-xs text-gray-500 mt-1">{r.protocolo} · {new Date(r.criado_em).toLocaleString('pt-BR')}{r.setor ? ` · Setor informado: ${r.setor}` : ''}</p></div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>
        ))}
      </div>

      {detalhe && <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4" onMouseDown={() => setDetalhe(null)}>
        <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto" onMouseDown={e => e.stopPropagation()}>
          <div className="p-5 border-b flex justify-between gap-4"><div><h2 className="font-bold">{categoriaLabel[detalhe.categoria]}</h2><p className="text-xs text-gray-500 font-mono">{detalhe.protocolo}</p></div><button onClick={() => setDetalhe(null)}><X className="w-5 h-5" /></button></div>
          <div className="p-5 space-y-5">
            <div className="grid sm:grid-cols-3 gap-3 text-sm"><div><p className="text-xs text-gray-500">Urgência</p><p className="font-medium capitalize">{detalhe.urgencia}</p></div><div><p className="text-xs text-gray-500">Setor informado</p><p className="font-medium">{detalhe.setor || 'Não informado'}</p></div><div><p className="text-xs text-gray-500">Quando</p><p className="font-medium">{detalhe.quando_ocorreu || 'Não informado'}</p></div></div>
            <div><p className="text-xs text-gray-500 mb-1">Descrição</p><p className="text-sm whitespace-pre-wrap rounded-xl bg-gray-50 p-4">{detalhe.descricao}</p></div>
            {detalhe.envolvidos && <div><p className="text-xs text-gray-500 mb-1">Pessoas ou funções citadas</p><p className="text-sm whitespace-pre-wrap rounded-xl bg-gray-50 p-4">{detalhe.envolvidos}</p></div>}
            <div className="border-t pt-5 space-y-3"><label className="block text-sm font-medium">Andamento<select value={status} onChange={e => setStatus(e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2 bg-white font-normal"><option value="novo">Novo</option><option value="acolhimento">Em acolhimento</option><option value="em_apuracao">Em apuração</option><option value="encaminhado">Encaminhado</option><option value="concluido">Concluído</option><option value="arquivado">Arquivado</option></select></label><label className="block text-sm font-medium">Registro da apuração<textarea rows={3} value={registro} onChange={e => setRegistro(e.target.value)} placeholder="O que foi apurado e como se concluiu. Fica no arquivo do caso — o relator não lê isto." className="mt-1 w-full border rounded-lg px-3 py-2 font-normal" /></label></div>
          </div>
          <div className="p-5 border-t flex justify-end gap-3"><button onClick={() => setDetalhe(null)} className="px-4 py-2 text-sm">Fechar</button><button disabled={salvando} onClick={salvar} className="px-5 py-2 rounded-lg bg-[#7d4a3c] text-white text-sm font-semibold disabled:opacity-50">{salvando ? 'Salvando...' : 'Salvar andamento'}</button></div>
        </div>
      </div>}
    </div>
  );
};
