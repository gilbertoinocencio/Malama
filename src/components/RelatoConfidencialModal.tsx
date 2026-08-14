import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, Clipboard, Eye, Send, ShieldCheck, X } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  relatoConfidencialService, type CategoriaRelato, type RelatoEnviado, type UrgenciaRelato,
  type AcompanhamentoRelato,
} from '../services/relatoConfidencialService';

const categorias: { value: CategoriaRelato; label: string }[] = [
  { value: 'assedio_moral', label: 'Assédio moral' },
  { value: 'assedio_sexual', label: 'Assédio sexual' },
  { value: 'violencia', label: 'Violência ou ameaça' },
  { value: 'discriminacao', label: 'Discriminação' },
  { value: 'retaliacao', label: 'Retaliação' },
  { value: 'outro', label: 'Outra situação grave' },
];

const statusLabel: Record<string, string> = {
  novo: 'Recebido', acolhimento: 'Em acolhimento', em_apuracao: 'Em apuração',
  encaminhado: 'Encaminhado', concluido: 'Concluído', arquivado: 'Arquivado',
};

export const RelatoConfidencialModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [aba, setAba] = useState<'novo' | 'acompanhar'>('novo');
  const [categoria, setCategoria] = useState<CategoriaRelato>('assedio_moral');
  const [urgencia, setUrgencia] = useState<UrgenciaRelato>('normal');
  const [descricao, setDescricao] = useState('');
  const [setor, setSetor] = useState('');
  const [envolvidos, setEnvolvidos] = useState('');
  const [quando, setQuando] = useState('');
  const [aceite, setAceite] = useState(false);
  const [enviado, setEnviado] = useState<RelatoEnviado | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [protocolo, setProtocolo] = useState('');
  const [chave, setChave] = useState('');
  const [acompanhamento, setAcompanhamento] = useState<AcompanhamentoRelato | null>(null);

  const enviar = async () => {
    if (descricao.trim().length < 20) return toast.error('Descreva o ocorrido com um pouco mais de detalhe.');
    if (!aceite) return toast.error('Confirme que entendeu como o canal funciona.');
    setSalvando(true);
    try {
      const result = await relatoConfidencialService.enviar({
        categoria, urgencia, descricao, setor, envolvidos, quandoOcorreu: quando,
      });
      setEnviado(result);
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Não foi possível enviar.'); }
    finally { setSalvando(false); }
  };

  const acompanhar = async () => {
    if (!protocolo.trim() || !chave.trim()) return toast.error('Informe protocolo e chave.');
    setSalvando(true);
    try { setAcompanhamento(await relatoConfidencialService.acompanhar(protocolo, chave)); }
    catch { toast.error('Protocolo ou chave inválidos.'); }
    finally { setSalvando(false); }
  };

  const copiar = async () => {
    if (!enviado) return;
    await navigator.clipboard.writeText(`Protocolo: ${enviado.protocolo}\nChave: ${enviado.chave}`);
    toast.success('Protocolo e chave copiados.');
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/55 flex items-end sm:items-center justify-center" onMouseDown={onClose}>
      <div className="bg-white dark:bg-surface-dark w-full sm:max-w-xl max-h-[94vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl shadow-2xl" onMouseDown={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white dark:bg-surface-dark z-10 px-5 py-4 border-b dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-[#7d4a3c]" /><h2 className="font-bold text-Malama-main dark:text-white">Canal confidencial</h2></div>
          <button onClick={onClose}><X className="w-5 h-5 text-Malama-muted" /></button>
        </div>

        {!enviado && <div className="px-5 pt-4 flex gap-2">
          <button onClick={() => setAba('novo')} className={`flex-1 py-2 rounded-lg text-sm font-semibold ${aba === 'novo' ? 'bg-[#7d4a3c] text-white' : 'bg-stone-100 text-gray-600'}`}>Fazer relato</button>
          <button onClick={() => setAba('acompanhar')} className={`flex-1 py-2 rounded-lg text-sm font-semibold ${aba === 'acompanhar' ? 'bg-[#7d4a3c] text-white' : 'bg-stone-100 text-gray-600'}`}>Acompanhar</button>
        </div>}

        {enviado ? (
          <div className="p-6 text-center space-y-4">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
            <div><h3 className="font-bold text-lg">Relato recebido</h3><p className="text-sm text-gray-500 mt-1">O alerta aparece para a empresa mesmo sendo um único relato.</p></div>
            <div className="bg-stone-50 border rounded-xl p-4 text-left">
              <p className="text-xs text-gray-500">Protocolo</p><p className="font-mono font-bold break-all">{enviado.protocolo}</p>
              <p className="text-xs text-gray-500 mt-3">Chave de acompanhamento</p><p className="font-mono font-bold break-all">{enviado.chave}</p>
            </div>
            <p className="text-sm text-amber-800 bg-amber-50 rounded-xl p-3">Guarde esses dois códigos. A chave não poderá ser recuperada e é necessária para ver o andamento.</p>
            <button onClick={copiar} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#7d4a3c] text-white font-semibold"><Clipboard className="w-4 h-4" /> Copiar códigos</button>
          </div>
        ) : aba === 'novo' ? (
          <div className="p-5 space-y-4">
            <div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900 flex gap-2"><Eye className="w-5 h-5 flex-shrink-0" /><p>Sua identidade não integra o relato nem é mostrada à empresa. A equipe autorizada verá o que você escrever; evite detalhes que possam identificá-lo se não forem necessários à apuração.</p></div>
            <div className="rounded-xl bg-red-50 p-3 text-sm text-red-800 flex gap-2"><AlertTriangle className="w-5 h-5 flex-shrink-0" /><p>Se houver risco imediato à sua segurança, procure um local seguro e ligue 190 ou 192. Este canal não é atendimento de emergência.</p></div>
            <label className="block text-sm font-medium">O que aconteceu?<select value={categoria} onChange={e => setCategoria(e.target.value as CategoriaRelato)} className="mt-1 w-full rounded-lg border px-3 py-2 bg-white font-normal">{categorias.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select></label>
            <label className="block text-sm font-medium">Precisa de atenção com qual urgência?<select value={urgencia} onChange={e => setUrgencia(e.target.value as UrgenciaRelato)} className="mt-1 w-full rounded-lg border px-3 py-2 bg-white font-normal"><option value="normal">Pode seguir a triagem normal</option><option value="alta">Alta — há repetição ou risco de retaliação</option><option value="imediata">Imediata — há risco atual</option></select></label>
            <label className="block text-sm font-medium">Conte o ocorrido<textarea value={descricao} onChange={e => setDescricao(e.target.value)} rows={6} maxLength={10000} placeholder="Descreva fatos, local, frequência e qualquer informação importante..." className="mt-1 w-full rounded-lg border px-3 py-2 font-normal resize-y" /></label>
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="block text-sm font-medium">Setor (opcional)<input value={setor} onChange={e => setSetor(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 font-normal" /></label>
              <label className="block text-sm font-medium">Quando ocorreu? (opcional)<input value={quando} onChange={e => setQuando(e.target.value)} placeholder="Ex.: julho, no turno da noite" className="mt-1 w-full rounded-lg border px-3 py-2 font-normal" /></label>
            </div>
            <label className="block text-sm font-medium">Pessoas ou funções envolvidas (opcional)<textarea value={envolvidos} onChange={e => setEnvolvidos(e.target.value)} rows={2} className="mt-1 w-full rounded-lg border px-3 py-2 font-normal" /></label>
            <label className="flex items-start gap-2 text-xs text-gray-600"><input type="checkbox" checked={aceite} onChange={e => setAceite(e.target.checked)} className="mt-0.5" /><span>Entendi que o relato inicia uma triagem, não comprova sozinho a acusação, e deve ser tratado com sigilo, imparcialidade e proteção contra retaliação.</span></label>
            <button disabled={salvando} onClick={enviar} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#7d4a3c] text-white font-semibold disabled:opacity-50"><Send className="w-4 h-4" />{salvando ? 'Enviando...' : 'Enviar relato confidencial'}</button>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            <p className="text-sm text-gray-500">Use os códigos entregues após o envio. A consulta não revela sua identidade.</p>
            <label className="block text-sm font-medium">Protocolo<input value={protocolo} onChange={e => setProtocolo(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 font-mono font-normal uppercase" /></label>
            <label className="block text-sm font-medium">Chave<input value={chave} onChange={e => setChave(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 font-mono font-normal uppercase" /></label>
            <button disabled={salvando} onClick={acompanhar} className="w-full py-3 rounded-xl bg-[#7d4a3c] text-white font-semibold disabled:opacity-50">Consultar andamento</button>
            {acompanhamento && <div className="rounded-xl border bg-stone-50 p-4"><p className="text-xs text-gray-500">Situação</p><p className="font-bold text-gray-900">{statusLabel[acompanhamento.status] ?? acompanhamento.status}</p>{acompanhamento.retorno && <><p className="text-xs text-gray-500 mt-3">Retorno da equipe</p><p className="text-sm whitespace-pre-wrap">{acompanhamento.retorno}</p></>}</div>}
          </div>
        )}
      </div>
    </div>
  );
};
