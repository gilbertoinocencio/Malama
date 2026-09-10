import React, { useEffect, useState } from 'react';
import { Check, Loader2, Pencil, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { useRhAccess } from '../../contexts/RhAccessContext';
import { rhSetorSugestoes } from '../../lib/rhSetorSugestoes';
import { rhService, type EmpresaContextoOperacional } from '../../services/empresaService';
import { rhAgentService, type RhProfileDraft } from '../../services/rhAgentService';

type Etapa = 'descricao' | 'revisao' | 'resumo';

/**
 * Roteiro da descrição livre.
 *
 * O extrator (RH_PROFILE_DRAFT_PROMPT) tem uma regra dura: "extraia apenas o
 * que estiver explícito, use null quando faltar informação". Então tudo que a
 * pessoa não escrever vira campo vazio, e o copiloto passa a trabalhar sem
 * contexto — o que aparecia como IA fraca era, na verdade, entrada pobre.
 * Cada item aqui existe porque alimenta um campo que o extrator devolve ou um
 * assunto que o copiloto articula (organização do trabalho, jornada, turnos).
 *
 * São perguntas DESCRITIVAS de propósito. Nada aqui pede que o RH avalie
 * risco: contexto declarado gera hipótese e pergunta, nunca prova de risco.
 */
const ROTEIRO: { rotulo: string; pergunta: string }[] = [
  { rotulo: 'O que fazemos', pergunta: 'Qual é o produto ou serviço principal?' },
  { rotulo: 'Equipes e setores', pergunta: 'Quais equipes existem e o que cada uma faz no dia a dia?' },
  { rotulo: 'Como o trabalho é organizado', pergunta: 'Turnos, escalas, presencial ou home office?' },
  { rotulo: 'Onde atuamos', pergunta: 'Uma unidade ou várias? Loja, fábrica, escritório, rua?' },
  { rotulo: 'Picos e sazonalidade', pergunta: 'Há períodos previsíveis de pico (fim de mês, safra, feriados)?' },
  { rotulo: 'Rotina', pergunta: 'Algo que ajude a entender o dia a dia: atendimento ao público, metas, esforço físico.' },
];

const EXEMPLO = `O que fazemos: rede de restaurantes de comida havaiana, com produção própria e três lojas de rua na região metropolitana.

Equipes e setores: cozinha (montagem e preparo), atendimento (balcão e caixa), entregas (motoboys próprios), compras e administrativo.

Como o trabalho é organizado: cozinha e atendimento trabalham em dois turnos, 11h-15h e 18h-23h, escala 6x1. Administrativo e compras são horário comercial, híbrido com dois dias em casa.

Onde atuamos: três lojas, mais uma cozinha central que abastece as três.

Picos e sazonalidade: almoço de sexta e todo fim de semana. Dezembro e janeiro dobram o volume de entrega.

Rotina: atendimento ao público direto o tempo todo, meta de tempo de preparo por pedido, trabalho em pé na cozinha.`;

const vazio: RhProfileDraft = {
  setor_atuacao: null,
  cnae_principal: null,
  descricao_negocio: null,
  produtos_servicos: [],
  unidades: [],
  setores_sugeridos: [],
  contexto_adicional: null,
};

const linhas = (items: string[]) => items.join('\n');
const emLista = (value: string, max = 20) => value.split('\n')
  .map(item => item.trim()).filter(Boolean).slice(0, max);

const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, ...props }) => (
  <label className="block text-xs font-medium text-gray-700">
    {label}
    <input {...props} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-[#7d4a3c] focus:ring-2 focus:ring-[#7d4a3c]/10" />
  </label>
);

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }
>(({ label, ...props }, ref) => (
  <label className="block text-xs font-medium text-gray-700">
    {label}
    <textarea {...props} ref={ref} className="mt-1 w-full resize-y rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-[#7d4a3c] focus:ring-2 focus:ring-[#7d4a3c]/10" />
  </label>
));
Textarea.displayName = 'Textarea';

/** Texto sem os rótulos do roteiro. Um roteiro inserido e não preenchido tem
 *  caracteres de sobra para passar no mínimo, mas nenhum fato dentro — e o
 *  extrator devolveria um perfil vazio depois de gastar uma chamada de IA. */
const conteudoUtil = (texto: string) =>
  ROTEIRO.reduce((acc, item) => acc.split(`${item.rotulo}:`).join(' '), texto).trim();

const doContexto = (contexto: EmpresaContextoOperacional): RhProfileDraft => ({
  setor_atuacao: contexto.setor_atuacao,
  cnae_principal: contexto.cnae_principal,
  descricao_negocio: contexto.descricao_negocio,
  produtos_servicos: contexto.produtos_servicos,
  unidades: contexto.unidades,
  setores_sugeridos: [],
  contexto_adicional: contexto.contexto_adicional,
});

export const PerfilEmpresaForm: React.FC<{
  onSaved?: () => void;
  mostrarResumo?: boolean;
}> = ({ onSaved, mostrarResumo = true }) => {
  const { acesso, can } = useRhAccess();
  const podeEditar = acesso.principal || can('empresa');
  const [etapa, setEtapa] = useState<Etapa>('descricao');
  const [contexto, setContexto] = useState<EmpresaContextoOperacional | null>(null);
  const [descricao, setDescricao] = useState('');
  const [rascunho, setRascunho] = useState<RhProfileDraft>(vazio);
  const [loading, setLoading] = useState(true);
  const [gerando, setGerando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [verExemplo, setVerExemplo] = useState(false);
  const campoDescricao = React.useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    rhService.getContextoOperacional()
      .then(perfil => {
        setContexto(perfil);
        if (perfil) {
          setRascunho(doContexto(perfil));
          setEtapa(mostrarResumo ? 'resumo' : 'revisao');
          onSaved?.();
        }
      })
      .catch(() => setErro('Não consegui carregar o perfil da empresa agora.'))
      .finally(() => setLoading(false));
    // `onSaved` só comunica o estado ao contêiner; não deve refazer a
    // consulta quando a função inline do onboarding ganhar nova identidade.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mostrarResumo]);

  /** Acrescenta o tópico ao texto e deixa o cursor pronto para responder.
   *  Não duplica o que já foi inserido. */
  const inserirTopico = (rotulo: string) => {
    setDescricao(atual => {
      if (atual.includes(`${rotulo}:`)) return atual;
      const base = atual.trimEnd();
      return `${base}${base ? '\n\n' : ''}${rotulo}: `;
    });
    window.setTimeout(() => {
      const campo = campoDescricao.current;
      if (!campo) return;
      campo.focus();
      campo.setSelectionRange(campo.value.length, campo.value.length);
    }, 0);
  };

  /**
   * Caminho sem IA para o mesmo destino.
   *
   * A etapa de revisão é um formulário comum — a IA só a pré-preenche. Sem
   * esta porta, um provedor generativo fora do ar impede CONFIRMAR o perfil,
   * e no onboarding (onde o perfil é obrigatório) isso trancaria a pessoa
   * fora do painel por uma falha que não é dela. O texto já digitado vai
   * junto, para ninguém perder o que escreveu.
   */
  const preencherManualmente = () => {
    setErro('');
    setRascunho(atual => ({
      ...atual,
      descricao_negocio: atual.descricao_negocio ?? (descricao.trim() || null),
    }));
    setEtapa('revisao');
  };

  const gerar = async () => {
    if (conteudoUtil(descricao).length < 20) {
      setErro('Conte um pouco mais: o que a empresa faz, quais equipes existem e como o trabalho é organizado. Os tópicos acima ajudam a montar o texto.');
      return;
    }
    setGerando(true);
    setErro('');
    try {
      setRascunho(await rhAgentService.criarRascunhoPerfil(descricao));
      setEtapa('revisao');
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível organizar a descrição.');
    } finally {
      setGerando(false);
    }
  };

  const salvar = async () => {
    if (!rascunho.descricao_negocio?.trim() && !rascunho.setor_atuacao?.trim()) {
      setErro('Confirme ao menos o setor de atuação ou a descrição do negócio.');
      return;
    }
    setSalvando(true);
    setErro('');
    try {
      const salvo = await rhService.salvarContextoOperacional(rascunho);
      if (rascunho.setores_sugeridos.length > 0) {
        rhSetorSugestoes.adicionar(acesso.empresa_id, rascunho.setores_sugeridos);
      }
      setContexto(salvo);
      setRascunho(doContexto(salvo));
      setEtapa('resumo');
      toast.success('Perfil da empresa confirmado.');
      onSaved?.();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível salvar o perfil.');
    } finally {
      setSalvando(false);
    }
  };

  const setCampo = <K extends keyof RhProfileDraft>(campo: K, valor: RhProfileDraft[K]) =>
    setRascunho(atual => ({ ...atual, [campo]: valor }));

  if (loading) return <div className="flex min-h-24 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-[#7d4a3c]" /></div>;

  if (!podeEditar) {
    return <p className="rounded-lg bg-gray-50 p-3 text-xs leading-relaxed text-gray-600">O perfil é mantido pelo usuário principal ou por quem tem permissão para editar os dados da empresa.</p>;
  }

  if (etapa === 'resumo' && contexto) {
    return (
      <div className="space-y-3">
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <div><p className="text-xs font-medium text-gray-400">Setor de atuação</p><p className="mt-1 text-gray-700">{contexto.setor_atuacao || 'Não informado'}</p></div>
          <div><p className="text-xs font-medium text-gray-400">CNAE</p><p className="mt-1 text-gray-700">{contexto.cnae_principal || 'Não informado'}</p></div>
          <div className="sm:col-span-2"><p className="text-xs font-medium text-gray-400">O que a empresa faz</p><p className="mt-1 whitespace-pre-wrap text-gray-700">{contexto.descricao_negocio || 'Não informado'}</p></div>
          <div><p className="text-xs font-medium text-gray-400">Produtos ou serviços</p><p className="mt-1 text-gray-700">{contexto.produtos_servicos.join(' · ') || 'Não informado'}</p></div>
          <div><p className="text-xs font-medium text-gray-400">Unidades ou locais</p><p className="mt-1 text-gray-700">{contexto.unidades.join(' · ') || 'Não informado'}</p></div>
        </div>
        <button type="button" onClick={() => setEtapa('revisao')} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">
          <Pencil className="h-3.5 w-3.5" /> Editar perfil
        </button>
      </div>
    );
  }

  if (etapa === 'descricao') {
    return (
      <div className="space-y-3">
        {/* O roteiro fica FORA do placeholder de propósito: placeholder some
            no primeiro caractere, justamente quando a pessoa precisa saber o
            que ainda falta contar. */}
        <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
          <p className="text-xs font-medium text-gray-700">Responda estes pontos no texto</p>
          <p className="mt-0.5 text-xs text-gray-500">
            O copiloto só usa o que estiver escrito aqui — o que faltar vira campo vazio. Clique num
            tópico para adicioná-lo ao texto.
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {ROTEIRO.map(item => {
              const jaNoTexto = descricao.includes(`${item.rotulo}:`);
              return (
                <button
                  key={item.rotulo}
                  type="button"
                  onClick={() => inserirTopico(item.rotulo)}
                  title={item.pergunta}
                  className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                    jaNoTexto
                      ? 'border-[#7d4a3c]/30 bg-[#7d4a3c]/10 text-[#7d4a3c]'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-[#7d4a3c] hover:text-[#7d4a3c]'
                  }`}
                >
                  {jaNoTexto && <Check className="mr-1 inline h-3 w-3" />}
                  {item.rotulo}
                </button>
              );
            })}
          </div>
        </div>

        <Textarea
          ref={campoDescricao}
          label="Descreva a empresa com suas palavras"
          rows={8}
          value={descricao}
          onChange={event => setDescricao(event.target.value)}
          placeholder="Ex.: Somos uma padaria com produção própria e atendimento no balcão. Vendemos pães, refeições e encomendas. Temos os setores de produção, atendimento e administrativo..."
        />

        <button
          type="button"
          onClick={() => setVerExemplo(v => !v)}
          className="text-xs font-medium text-[#7d4a3c] hover:underline"
        >
          {verExemplo ? 'Ocultar exemplo' : 'Ver um exemplo completo'}
        </button>
        {verExemplo && (
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
            <p className="mb-2 text-xs text-gray-500">
              Exemplo de outra empresa, só para mostrar a profundidade que ajuda. Escreva com os
              fatos da sua.
            </p>
            <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-gray-600">{EXEMPLO}</pre>
          </div>
        )}

        {erro && <p className="rounded-lg bg-red-50 p-3 text-xs text-red-700">{erro}</p>}
        <button type="button" disabled={gerando} onClick={gerar} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#7d4a3c] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
          {gerando ? <><Loader2 className="h-4 w-4 animate-spin" /> Organizando...</> : <><Sparkles className="h-4 w-4" /> Organizar para revisão</>}
        </button>
        <button type="button" onClick={preencherManualmente} className="w-full text-xs font-medium text-gray-500 hover:text-[#7d4a3c]">
          Preencher os campos manualmente
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="rounded-lg bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">Revise antes de confirmar. A IA apenas estruturou o que entendeu e pode ter deixado campos incompletos.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Setor de atuação" value={rascunho.setor_atuacao ?? ''} onChange={event => setCampo('setor_atuacao', event.target.value || null)} />
        <Input label="CNAE (se souber)" value={rascunho.cnae_principal ?? ''} onChange={event => setCampo('cnae_principal', event.target.value || null)} />
      </div>
      <Textarea label="O que a empresa faz" rows={3} value={rascunho.descricao_negocio ?? ''} onChange={event => setCampo('descricao_negocio', event.target.value || null)} />
      <Textarea label="Produtos ou serviços · um por linha" rows={3} value={linhas(rascunho.produtos_servicos)} onChange={event => setCampo('produtos_servicos', emLista(event.target.value))} />
      <Textarea label="Unidades ou locais · um por linha" rows={2} value={linhas(rascunho.unidades)} onChange={event => setCampo('unidades', emLista(event.target.value, 30))} />
      <Textarea label="Setores sugeridos para revisar · um por linha" rows={3} value={linhas(rascunho.setores_sugeridos)} onChange={event => setCampo('setores_sugeridos', emLista(event.target.value, 50))} />
      <p className="-mt-1 text-xs text-gray-500">As sugestões seguem para a área Setores. Você decide quais criar e configura modalidade e turnos de cada uma.</p>
      <Textarea label="Contexto adicional" rows={2} value={rascunho.contexto_adicional ?? ''} onChange={event => setCampo('contexto_adicional', event.target.value || null)} />
      {erro && <p className="rounded-lg bg-red-50 p-3 text-xs text-red-700">{erro}</p>}
      <div className="flex gap-2 pt-1">
        {!contexto && <button type="button" onClick={() => setEtapa('descricao')} className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600">Voltar</button>}
        {contexto && <button type="button" onClick={() => setEtapa('resumo')} className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600">Cancelar</button>}
        <button type="button" disabled={salvando} onClick={salvar} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#7d4a3c] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
          {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Confirmar perfil
        </button>
      </div>
    </div>
  );
};
