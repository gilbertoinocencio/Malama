import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowRight, Bot, Building2, Check, Loader2, MessageCircle, Pencil,
  Send, Sparkles, X,
} from 'lucide-react';
import { useRhAccess } from '../../contexts/RhAccessContext';
import { useRhJornada } from '../../contexts/RhJornadaContext';
import { proximoPasso } from '../../lib/rhJornada';
import {
  rhService, type EmpresaContextoOperacional, type EmpresaContextoOperacionalInput,
} from '../../services/empresaService';
import {
  rhAgentService, type RhAgentHistoryItem, type RhAgentSuggestion,
} from '../../services/rhAgentService';

type Props = { open: boolean; onOpenChange: (open: boolean) => void };
type ChatItem = RhAgentHistoryItem & { suggestions?: RhAgentSuggestion[] };

const vazio: EmpresaContextoOperacionalInput = {
  setor_atuacao: null,
  cnae_principal: null,
  descricao_negocio: null,
  produtos_servicos: [],
  processos_principais: [],
  unidades: [],
  areas_funcoes: [],
  modelo_trabalho: null,
  turnos: [],
  sazonalidade: null,
  contexto_adicional: null,
};

const linhas = (items: string[]) => items.join('\n');
const emLista = (value: string, max = 20) => value.split('\n').map(x => x.trim()).filter(Boolean).slice(0, max);

const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, ...props }) => (
  <label className="block text-xs font-medium text-gray-700">
    {label}
    <input {...props} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-[#7d4a3c] focus:ring-2 focus:ring-[#7d4a3c]/10" />
  </label>
);

const Textarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }> = ({ label, ...props }) => (
  <label className="block text-xs font-medium text-gray-700">
    {label}
    <textarea {...props} className="mt-1 w-full resize-y rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-[#7d4a3c] focus:ring-2 focus:ring-[#7d4a3c]/10" />
  </label>
);

export const RhCopilot: React.FC<Props> = ({ open, onOpenChange }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { acesso, can } = useRhAccess();
  const { dados, loading: jornadaLoading } = useRhJornada();
  const passo = useMemo(() => proximoPasso(dados), [dados]);
  const podeEditarPerfil = acesso.principal || can('empresa');
  const [contexto, setContexto] = useState<EmpresaContextoOperacional | null>(null);
  const [carregandoPerfil, setCarregandoPerfil] = useState(false);
  const [perfilConsultado, setPerfilConsultado] = useState(false);
  const [modoPerfil, setModoPerfil] = useState(false);
  const [descricao, setDescricao] = useState('');
  const [rascunho, setRascunho] = useState<EmpresaContextoOperacionalInput | null>(null);
  const [gerando, setGerando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erroPerfil, setErroPerfil] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [chat, setChat] = useState<ChatItem[]>([]);
  const fimRef = useRef<HTMLDivElement>(null);
  const warmedRef = useRef(false);

  useEffect(() => {
    if (!open || perfilConsultado) return;
    setCarregandoPerfil(true);
    rhService.getContextoOperacional()
      .then(perfil => {
        setContexto(perfil);
        setModoPerfil(!perfil && podeEditarPerfil);
      })
      .catch(() => {
        // Falha aqui não bloqueia o portal nem a bússola determinística.
        setErroPerfil('Não consegui carregar o perfil operacional agora. O restante do painel continua disponível.');
      })
      .finally(() => {
        setPerfilConsultado(true);
        setCarregandoPerfil(false);
      });
  }, [open, perfilConsultado, podeEditarPerfil]);

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

  const iniciarEdicao = () => {
    if (contexto) {
      setRascunho({
        setor_atuacao: contexto.setor_atuacao,
        cnae_principal: contexto.cnae_principal,
        descricao_negocio: contexto.descricao_negocio,
        produtos_servicos: contexto.produtos_servicos,
        processos_principais: contexto.processos_principais,
        unidades: contexto.unidades,
        areas_funcoes: contexto.areas_funcoes,
        modelo_trabalho: contexto.modelo_trabalho,
        turnos: contexto.turnos,
        sazonalidade: contexto.sazonalidade,
        contexto_adicional: contexto.contexto_adicional,
      });
    }
    setErroPerfil('');
    setModoPerfil(true);
  };

  const gerarRascunho = async () => {
    if (descricao.trim().length < 20) {
      setErroPerfil('Conte um pouco mais: o que a empresa faz, como o trabalho se organiza e se há turnos ou períodos de pico.');
      return;
    }
    setGerando(true);
    setErroPerfil('');
    try {
      setRascunho(await rhAgentService.criarRascunhoPerfil(descricao));
    } catch (err) {
      setErroPerfil(err instanceof Error ? err.message : 'Não foi possível estruturar a descrição.');
    } finally {
      setGerando(false);
    }
  };

  const salvarPerfil = async () => {
    if (!rascunho) return;
    if (!rascunho.descricao_negocio?.trim() && !rascunho.setor_atuacao?.trim()) {
      setErroPerfil('Confirme ao menos o setor de atuação ou a descrição do negócio.');
      return;
    }
    setSalvando(true);
    setErroPerfil('');
    try {
      const salvo = await rhService.salvarContextoOperacional(rascunho);
      setContexto(salvo);
      setModoPerfil(false);
      setDescricao('');
      setChat(items => [...items, {
        role: 'assistant',
        content: 'Perfil operacional confirmado. Vou usá-lo como contexto para formular perguntas melhores — nunca como prova ou classificação de risco.',
      }]);
    } catch (err) {
      setErroPerfil(err instanceof Error ? err.message : 'Não foi possível salvar o perfil.');
    } finally {
      setSalvando(false);
    }
  };

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

  const setCampo = <K extends keyof EmpresaContextoOperacionalInput>(
    campo: K, valor: EmpresaContextoOperacionalInput[K],
  ) => setRascunho(atual => ({ ...(atual ?? vazio), [campo]: valor }));

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
            onMouseDown={e => e.stopPropagation()}
            className="flex h-full w-full max-w-lg flex-col bg-white shadow-2xl"
          >
            <header className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#7d4a3c]/10 text-[#7d4a3c]">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">Copiloto do RH</h2>
                  <p className="text-xs text-gray-500">Apoio sênior em RH e SST · Caramel</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {podeEditarPerfil && contexto && !modoPerfil && (
                  <button type="button" onClick={iniciarEdicao} title="Editar perfil operacional" className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
                    <Pencil className="h-4 w-4" />
                  </button>
                )}
                <button type="button" onClick={() => onOpenChange(false)} aria-label="Fechar copiloto" className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </header>

            {carregandoPerfil ? (
              <div className="flex flex-1 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-[#7d4a3c]" /></div>
            ) : modoPerfil && podeEditarPerfil ? (
              <div className="flex-1 overflow-y-auto p-5">
                <div className="mb-5 flex gap-3 rounded-xl bg-[#7d4a3c]/5 p-4">
                  <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-[#7d4a3c]" />
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">Conte como a empresa funciona</h3>
                    <p className="mt-1 text-xs leading-relaxed text-gray-600">
                      Isso ajuda o copiloto a contextualizar as orientações. Não é avaliação de risco nem documento técnico.
                    </p>
                  </div>
                </div>

                {!rascunho ? (
                  <div className="space-y-4">
                    <Textarea
                      label="Descreva a operação com suas palavras"
                      rows={8}
                      value={descricao}
                      onChange={e => setDescricao(e.target.value)}
                      placeholder="Ex.: Somos uma padaria com produção própria e atendimento no balcão. Temos dois turnos, pico pela manhã e aos fins de semana..."
                    />
                    <p className="text-xs text-gray-500">Inclua o que produz ou presta, processos principais, modelo de trabalho, turnos e períodos de pico.</p>
                    {erroPerfil && <p className="rounded-lg bg-red-50 p-3 text-xs text-red-700">{erroPerfil}</p>}
                    <button type="button" disabled={gerando} onClick={gerarRascunho} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#7d4a3c] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
                      {gerando ? <><Loader2 className="h-4 w-4 animate-spin" /> Organizando...</> : <><Sparkles className="h-4 w-4" /> Organizar para revisão</>}
                    </button>
                    {contexto && <button type="button" onClick={() => setModoPerfil(false)} className="w-full text-center text-xs font-medium text-gray-500">Cancelar edição</button>}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs leading-relaxed text-amber-800 rounded-lg bg-amber-50 p-3">
                      Revise antes de confirmar. O Caramel apenas estruturou o que entendeu e pode ter deixado campos incompletos.
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Input label="Setor de atuação" value={rascunho.setor_atuacao ?? ''} onChange={e => setCampo('setor_atuacao', e.target.value || null)} />
                      <Input label="CNAE (se souber)" value={rascunho.cnae_principal ?? ''} onChange={e => setCampo('cnae_principal', e.target.value || null)} />
                    </div>
                    <Textarea label="O que a empresa faz" rows={3} value={rascunho.descricao_negocio ?? ''} onChange={e => setCampo('descricao_negocio', e.target.value || null)} />
                    <Textarea label="Produtos ou serviços · um por linha" rows={3} value={linhas(rascunho.produtos_servicos)} onChange={e => setCampo('produtos_servicos', emLista(e.target.value))} />
                    <Textarea label="Processos principais · um por linha" rows={3} value={linhas(rascunho.processos_principais)} onChange={e => setCampo('processos_principais', emLista(e.target.value))} />
                    <Textarea label="Unidades ou locais · um por linha" rows={2} value={linhas(rascunho.unidades)} onChange={e => setCampo('unidades', emLista(e.target.value, 30))} />
                    <Textarea label="Áreas e funções principais · uma por linha" rows={3} value={linhas(rascunho.areas_funcoes)} onChange={e => setCampo('areas_funcoes', emLista(e.target.value, 50))} />
                    <Input label="Modelo de trabalho" value={rascunho.modelo_trabalho ?? ''} onChange={e => setCampo('modelo_trabalho', e.target.value || null)} />
                    <Textarea label="Turnos · um por linha" rows={2} value={linhas(rascunho.turnos)} onChange={e => setCampo('turnos', emLista(e.target.value).slice(0, 12))} />
                    <Textarea label="Sazonalidade e períodos de pico" rows={2} value={rascunho.sazonalidade ?? ''} onChange={e => setCampo('sazonalidade', e.target.value || null)} />
                    <Textarea label="Contexto adicional" rows={2} value={rascunho.contexto_adicional ?? ''} onChange={e => setCampo('contexto_adicional', e.target.value || null)} />
                    {erroPerfil && <p className="rounded-lg bg-red-50 p-3 text-xs text-red-700">{erroPerfil}</p>}
                    <div className="flex gap-2 pt-2">
                      <button type="button" onClick={() => setRascunho(null)} className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600">Voltar</button>
                      <button type="button" disabled={salvando} onClick={salvarPerfil} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#7d4a3c] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
                        {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Confirmar perfil
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="flex-1 space-y-4 overflow-y-auto bg-gray-50/50 p-5">
                  {erroPerfil && <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">{erroPerfil}</p>}
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
                  {!contexto && podeEditarPerfil && (
                    <button type="button" onClick={iniciarEdicao} className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-[#7d4a3c]">
                      <Building2 className="h-3.5 w-3.5" /> Completar perfil operacional
                    </button>
                  )}
                  <form onSubmit={e => { e.preventDefault(); void enviar(); }} className="flex items-end gap-2">
                    <textarea
                      rows={2}
                      value={mensagem}
                      onChange={e => setMensagem(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void enviar(); }
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
              </>
            )}
          </aside>
        </div>
      )}
    </>
  );
};
