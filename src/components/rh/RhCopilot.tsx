import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowRight, Bot, Loader2, MessageCircle, Send, Sparkles, X,
} from 'lucide-react';
import { useRhJornada } from '../../contexts/RhJornadaContext';
import { proximoPasso } from '../../lib/rhJornada';
import {
  rhAgentService, type RhAgentHistoryItem, type RhAgentSuggestion,
} from '../../services/rhAgentService';

type Props = { open: boolean; onOpenChange: (open: boolean) => void };
type ChatItem = RhAgentHistoryItem & { suggestions?: RhAgentSuggestion[] };

export const RhCopilot: React.FC<Props> = ({ open, onOpenChange }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { dados, loading: jornadaLoading } = useRhJornada();
  const passo = useMemo(() => proximoPasso(dados), [dados]);
  const [mensagem, setMensagem] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [chat, setChat] = useState<ChatItem[]>([]);
  const fimRef = useRef<HTMLDivElement>(null);
  const warmedRef = useRef(false);

  useEffect(() => {
    if (!open || warmedRef.current) return;
    warmedRef.current = true;
    rhAgentService.warmup().catch(() => { /* a conversa tem fallback próprio */ });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const fecharNoEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onOpenChange(false);
    };
    window.addEventListener('keydown', fecharNoEscape);
    return () => window.removeEventListener('keydown', fecharNoEscape);
  }, [open, onOpenChange]);

  useEffect(() => { fimRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chat, enviando]);

  useEffect(() => {
    if (!open || chat.length > 0 || jornadaLoading) return;
    setChat([{
      role: 'assistant',
      content: `Posso explicar o painel e ajudar a organizar o trabalho. Agora, o próximo passo calculado pelo Malama é: ${passo.titulo}. ${passo.descricao}`,
      suggestions: passo.destino ? [{ label: passo.acao, action: 'navigate', target: passo.destino }] : [],
    }]);
  }, [open, chat.length, jornadaLoading, passo]);

  const enviar = async (texto?: string) => {
    const conteudo = (texto ?? mensagem).trim();
    if (!conteudo || enviando) return;
    const userItem: ChatItem = { role: 'user', content: conteudo };
    const historico = [...chat, userItem].map(({ role, content }) => ({ role, content }));
    setChat(items => [...items, userItem]);
    setMensagem('');
    setEnviando(true);
    try {
      const resposta = await rhAgentService.conversar({
        message: conteudo,
        history: historico.slice(0, -1),
        screen: `${location.pathname}${location.search}${location.hash}`,
        visibleStep: passo,
      });
      setChat(items => [...items, {
        role: 'assistant', content: resposta.message, suggestions: resposta.suggestions,
      }]);
    } catch {
      setChat(items => [...items, {
        role: 'assistant',
        content: `Não consegui consultar o copiloto agora. A orientação segura do próprio painel continua sendo: ${passo.titulo}. ${passo.descricao}`,
        suggestions: passo.destino ? [{ label: passo.acao, action: 'navigate', target: passo.destino }] : [],
      }]);
    } finally {
      setEnviando(false);
    }
  };

  const usarSugestao = (s: RhAgentSuggestion) => {
    if (s.action === 'navigate') {
      navigate(s.target);
      onOpenChange(false);
    } else {
      void enviar(s.prompt);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => onOpenChange(true)}
        aria-label="Abrir copiloto do RH"
        className="fixed bottom-5 right-5 z-30 inline-flex items-center gap-2 rounded-full bg-[#7d4a3c] px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-[#623a2f] focus:outline-none focus:ring-2 focus:ring-[#7d4a3c]/30"
      >
        <Sparkles className="h-4 w-4" />
        <span className="hidden sm:inline">Copiloto do RH</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-40 flex justify-end bg-black/20" role="presentation" onMouseDown={() => onOpenChange(false)}>
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Copiloto do RH"
            onMouseDown={event => event.stopPropagation()}
            className="flex h-full w-full max-w-lg flex-col bg-white shadow-2xl"
          >
            <header className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#7d4a3c]/10 text-[#7d4a3c]">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">Copiloto do RH</h2>
                  <p className="text-xs text-gray-500">Apoio sênior em RH e SST</p>
                </div>
              </div>
              <button type="button" onClick={() => onOpenChange(false)} aria-label="Fechar copiloto" className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="flex-1 space-y-4 overflow-y-auto bg-gray-50/50 p-5">
              {chat.map((item, i) => (
                <div key={i} className={`flex ${item.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${item.role === 'user' ? 'bg-[#7d4a3c] text-white' : 'border border-gray-100 bg-white text-gray-700 shadow-sm'}`}>
                    <p className="whitespace-pre-wrap">{item.content}</p>
                    {!!item.suggestions?.length && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {item.suggestions.map((s, si) => (
                          <button key={si} type="button" onClick={() => usarSugestao(s)} className="inline-flex items-center gap-1 rounded-full border border-[#7d4a3c]/20 bg-[#7d4a3c]/5 px-3 py-1.5 text-xs font-medium text-[#7d4a3c] hover:bg-[#7d4a3c]/10">
                            {s.label} <ArrowRight className="h-3 w-3" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {enviando && <div className="flex items-center gap-2 text-xs text-gray-500"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Analisando o contexto disponível...</div>}
              <div ref={fimRef} />
            </div>

            <div className="border-t border-gray-100 bg-white p-4">
              <form onSubmit={event => { event.preventDefault(); void enviar(); }} className="flex items-end gap-2">
                <textarea
                  rows={2}
                  value={mensagem}
                  onChange={event => setMensagem(event.target.value)}
                  onKeyDown={event => {
                    if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void enviar(); }
                  }}
                  placeholder="Pergunte sobre o painel ou o próximo passo..."
                  className="min-h-[44px] flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#7d4a3c]"
                />
                <button type="submit" disabled={!mensagem.trim() || enviando} aria-label="Enviar pergunta" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#7d4a3c] text-white disabled:opacity-40">
                  <Send className="h-4 w-4" />
                </button>
              </form>
              <p className="mt-2 flex items-center gap-1 text-[10px] text-gray-400"><MessageCircle className="h-3 w-3" /> Apoio operacional; decisões formais continuam com a empresa.</p>
            </div>
          </aside>
        </div>
      )}
    </>
  );
};
