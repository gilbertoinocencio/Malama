import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, Eye, Scale, Send, ShieldCheck, X } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  relatoConfidencialService, type CategoriaRelato, type UrgenciaRelato,
} from '../services/relatoConfidencialService';

const categorias: { value: CategoriaRelato; label: string }[] = [
  { value: 'assedio_moral', label: 'Assédio moral' },
  { value: 'assedio_sexual', label: 'Assédio sexual' },
  { value: 'violencia', label: 'Violência ou ameaça' },
  { value: 'discriminacao', label: 'Discriminação' },
  { value: 'retaliacao', label: 'Retaliação' },
  { value: 'outro', label: 'Outra situação grave' },
];

interface Props {
  onClose: () => void;
  /**
   * Token do link do questionário. Presente quando o canal é aberto de dentro
   * de /q/:token, por quem não tem app — o envio então não exige login.
   */
  tokenPublico?: string;
  /** Rótulo do botão de saída. No caminho público, ele volta ao questionário. */
  rotuloFechar?: string;
}

/**
 * Canal confidencial de assédio, violência e discriminação.
 *
 * Não há acompanhamento: ver o cabeçalho de relatoConfidencialService. A tela
 * de confirmação diz isso na cara, porque um envio que some sem número parece
 * envio perdido — e quem acabou de relatar assédio não merece essa dúvida.
 *
 * O aviso sobre uso indevido separa DE PROPÓSITO boa-fé que não se confirma de
 * mentira deliberada. Sem essa distinção, o texto assusta justamente quem tem
 * medo de retaliação — a vítima insegura — e não muda nada para quem age de
 * má-fé.
 */
export const RelatoConfidencialModal: React.FC<Props> = ({
  onClose, tokenPublico, rotuloFechar,
}) => {
  const [categoria, setCategoria] = useState<CategoriaRelato>('assedio_moral');
  const [urgencia, setUrgencia] = useState<UrgenciaRelato>('normal');
  const [descricao, setDescricao] = useState('');
  const [setor, setSetor] = useState('');
  const [envolvidos, setEnvolvidos] = useState('');
  const [quando, setQuando] = useState('');
  const [aceite, setAceite] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const enviar = async () => {
    if (descricao.trim().length < 20) return toast.error('Descreva o ocorrido com um pouco mais de detalhe.');
    if (!aceite) return toast.error('Confirme a declaração de boa-fé para enviar.');
    setSalvando(true);
    try {
      const dados = { categoria, urgencia, descricao, setor, envolvidos, quandoOcorreu: quando };
      if (tokenPublico) await relatoConfidencialService.enviarPublico(tokenPublico, dados);
      else await relatoConfidencialService.enviar(dados);
      setEnviado(true);
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Não foi possível enviar.'); }
    finally { setSalvando(false); }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/55 flex items-end sm:items-center justify-center" onMouseDown={onClose}>
      <div className="bg-white dark:bg-surface-dark w-full sm:max-w-xl max-h-[94vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl shadow-2xl" onMouseDown={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white dark:bg-surface-dark z-10 px-5 py-4 border-b dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-[#7d4a3c]" /><h2 className="font-bold text-Malama-main dark:text-white">Canal confidencial</h2></div>
          {/* Saída em um toque: fechar devolve à tela de onde veio, sem deixar
              nada para trás. No caminho público isso é o questionário. */}
          <button onClick={onClose} aria-label={rotuloFechar ?? 'Fechar'} className="flex items-center gap-1 text-Malama-muted">
            {rotuloFechar && <span className="text-xs font-medium">{rotuloFechar}</span>}
            <X className="w-5 h-5" />
          </button>
        </div>

        {enviado ? (
          <div className="p-6 text-center space-y-4">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
            <div>
              <h3 className="font-bold text-lg">Relato recebido</h3>
              <p className="text-sm text-gray-500 mt-1">Ele chega à equipe de apuração da empresa. Um único relato já aciona o alerta, sem esperar mais nenhum.</p>
            </div>
            <div className="bg-stone-50 dark:bg-white/5 border dark:border-white/10 rounded-xl p-4 text-left text-sm text-gray-600 dark:text-slate-300 leading-snug">
              É anônimo de verdade: nada aqui liga este relato a você. Por isso também não existe código para guardar, nem consulta de andamento — e não temos como te dar retorno. Se quiser acrescentar informação depois, envie um novo relato dizendo que é complemento deste.
            </div>
            <button onClick={onClose} className="w-full py-3 rounded-xl bg-[#7d4a3c] text-white font-semibold">
              {rotuloFechar ?? 'Fechar'}
            </button>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            <div className="rounded-xl bg-red-50 dark:bg-red-900/15 p-3 text-sm text-red-800 dark:text-red-300 flex gap-2"><AlertTriangle className="w-5 h-5 flex-shrink-0" /><p>Se houver risco imediato à sua segurança, procure um local seguro e ligue 190 ou 192. Este canal não é atendimento de emergência.</p></div>

            {/* Vem ANTES do formulário de propósito: ninguém deve digitar um
                relato inteiro para só então descobrir a regra do canal. */}
            <div className="rounded-xl border border-stone-200 dark:border-white/10 bg-stone-50 dark:bg-white/5 p-4 space-y-3 text-sm leading-snug">
              <div className="flex items-center gap-2 font-semibold text-Malama-main dark:text-white">
                <Scale className="w-4 h-4 text-[#7d4a3c]" /> Antes de escrever
              </div>
              <p className="text-gray-700 dark:text-slate-300">Este canal é para <strong>assédio moral ou sexual, violência, discriminação e retaliação</strong> no trabalho.</p>
              <p className="text-gray-700 dark:text-slate-300">Relatar de boa-fé não te expõe a punição. Se a apuração não confirmar o que você contou, nada acontece com você — perceber errado e ter dúvida faz parte, e a proteção contra retaliação continua valendo.</p>
              <p className="text-gray-700 dark:text-slate-300">Inventar um fato ou acusar alguém sabendo que é mentira é outra coisa. Um relato deliberadamente falso pode gerar responsabilização disciplinar e, conforme o caso, responder na lei por calúnia ou denunciação caluniosa.</p>
              <p className="text-gray-700 dark:text-slate-300">Desentendimento de convivência, discordância com decisão da chefia ou insatisfação com avaliação não entram aqui — para isso, procure o RH pelos canais normais da empresa.</p>
            </div>

            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/15 p-3 text-sm text-emerald-900 dark:text-emerald-300 flex gap-2"><Eye className="w-5 h-5 flex-shrink-0" /><p>Sua identidade não integra o relato nem é mostrada à empresa. A equipe autorizada verá o que você escrever; evite detalhes que possam identificá-lo se não forem necessários à apuração.</p></div>

            <label className="block text-sm font-medium">O que aconteceu?<select value={categoria} onChange={e => setCategoria(e.target.value as CategoriaRelato)} className="mt-1 w-full rounded-lg border px-3 py-2 bg-white font-normal">{categorias.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select></label>
            <label className="block text-sm font-medium">Precisa de atenção com qual urgência?<select value={urgencia} onChange={e => setUrgencia(e.target.value as UrgenciaRelato)} className="mt-1 w-full rounded-lg border px-3 py-2 bg-white font-normal"><option value="normal">Pode seguir a triagem normal</option><option value="alta">Alta — há repetição ou risco de retaliação</option><option value="imediata">Imediata — há risco atual</option></select></label>
            <label className="block text-sm font-medium">Conte o ocorrido<textarea value={descricao} onChange={e => setDescricao(e.target.value)} rows={6} maxLength={10000} placeholder="Descreva fatos, local, frequência e qualquer informação importante..." className="mt-1 w-full rounded-lg border px-3 py-2 font-normal resize-y" /></label>
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="block text-sm font-medium">Setor (opcional)<input value={setor} onChange={e => setSetor(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 font-normal" /></label>
              <label className="block text-sm font-medium">Quando ocorreu? (opcional)<input value={quando} onChange={e => setQuando(e.target.value)} placeholder="Ex.: julho, no turno da noite" className="mt-1 w-full rounded-lg border px-3 py-2 font-normal" /></label>
            </div>
            <label className="block text-sm font-medium">Pessoas ou funções envolvidas (opcional)<textarea value={envolvidos} onChange={e => setEnvolvidos(e.target.value)} rows={2} className="mt-1 w-full rounded-lg border px-3 py-2 font-normal" /></label>
            <label className="flex items-start gap-2 text-xs text-gray-600 dark:text-slate-400"><input type="checkbox" checked={aceite} onChange={e => setAceite(e.target.checked)} className="mt-0.5" /><span>Declaro que este relato é feito de boa-fé e que os fatos, até onde eu sei, são verdadeiros. Entendi que ele inicia uma triagem, não comprova sozinho a acusação, e deve ser tratado com sigilo, imparcialidade e proteção contra retaliação.</span></label>
            <button disabled={salvando} onClick={enviar} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#7d4a3c] text-white font-semibold disabled:opacity-50"><Send className="w-4 h-4" />{salvando ? 'Enviando...' : 'Enviar relato confidencial'}</button>
          </div>
        )}
      </div>
    </div>
  );
};
