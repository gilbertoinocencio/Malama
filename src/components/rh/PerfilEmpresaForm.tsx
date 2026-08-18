import React, { useEffect, useState } from 'react';
import { Check, Loader2, Pencil, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { useRhAccess } from '../../contexts/RhAccessContext';
import { rhSetorSugestoes } from '../../lib/rhSetorSugestoes';
import { rhService, type EmpresaContextoOperacional } from '../../services/empresaService';
import { rhAgentService, type RhProfileDraft } from '../../services/rhAgentService';

type Etapa = 'descricao' | 'revisao' | 'resumo';

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

const Textarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }> = ({ label, ...props }) => (
  <label className="block text-xs font-medium text-gray-700">
    {label}
    <textarea {...props} className="mt-1 w-full resize-y rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-[#7d4a3c] focus:ring-2 focus:ring-[#7d4a3c]/10" />
  </label>
);

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

  const gerar = async () => {
    if (descricao.trim().length < 20) {
      setErro('Conte um pouco mais: o que a empresa faz, o que produz ou presta e quais setores possui.');
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
        <Textarea
          label="Descreva a empresa com suas palavras"
          rows={5}
          value={descricao}
          onChange={event => setDescricao(event.target.value)}
          placeholder="Ex.: Somos uma padaria com produção própria e atendimento no balcão. Vendemos pães, refeições e encomendas. Temos os setores de produção, atendimento e administrativo..."
        />
        <p className="text-xs text-gray-500">Inclua o que produz ou presta, onde atua e quais setores ou equipes possui.</p>
        {erro && <p className="rounded-lg bg-red-50 p-3 text-xs text-red-700">{erro}</p>}
        <button type="button" disabled={gerando} onClick={gerar} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#7d4a3c] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
          {gerando ? <><Loader2 className="h-4 w-4 animate-spin" /> Organizando...</> : <><Sparkles className="h-4 w-4" /> Organizar para revisão</>}
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
