// =====================================================
// Malama — Perfil da empresa para o copiloto
//
// Antes, o formulário pedia descrição do NEGÓCIO (produtos, unidades, "o
// que fazemos") em texto livre. O extrator de IA devolvia null para tudo
// que não estivesse explícito, e o copiloto trabalhava no vazio.
//
// Agora a Receita responde o negócio (bloco no topo) e o que se pede é a
// ORGANIZAÇÃO DO TRABALHO, em escolhas fixas: o que mudou nos últimos 12
// meses, liderança, vínculos, jornada, remuneração variável, SST existente.
// É o que muda a leitura de um resultado — "carga alta na Cozinha" vira
// hipótese com contexto (escala 6x1, hora extra rotina, trocou gestão)
// em vez de "a Cozinha está ruim". O texto aberto sobra para o que a
// estrutura não previu — sem IA no meio: o que a pessoa escreve é o que
// fica, sem passar por um extrator.
//
// Setores são cadastrados em Início (SetoresCard), não aqui.
//
// São perguntas DESCRITIVAS. Nada aqui avalia risco: contexto declarado
// gera hipótese e pergunta, nunca prova.
// =====================================================

import React, { useEffect, useState } from 'react';
import { Check, Loader2, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';
import { useRhAccess } from '../../contexts/RhAccessContext';
import {
  EVENTOS_12M, LIDERANCA_FORMAL, PESSOAS_POR_LIDER, VINCULOS, HORA_EXTRA, ESCALAS,
  REMUNERACAO_VARIAVEL, SST_EXISTENTE, ORGANIZACAO_EMPRESA_VAZIA,
  organizacaoEmpresaPreenchida, type OrganizacaoEmpresa,
} from '../../lib/organizacaoTrabalho';
import {
  rhService, type EmpresaContextoOperacional, type EmpresaDadosCnpj,
} from '../../services/empresaService';

type Etapa = 'organizacao' | 'revisao' | 'resumo';

type Rascunho = {
  setor_atuacao: string | null;
  cnae_principal: string | null;
  contexto_adicional: string | null;
};

const vazio: Rascunho = {
  setor_atuacao: null,
  cnae_principal: null,
  contexto_adicional: null,
};

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

// ── Chips ─────────────────────────────────────────────────────────────

const chipClasse = (ativo: boolean) =>
  `rounded-full border px-2.5 py-1 text-xs font-medium transition ${
    ativo
      ? 'border-[#7d4a3c]/30 bg-[#7d4a3c]/10 text-[#7d4a3c]'
      : 'border-gray-200 bg-white text-gray-600 hover:border-[#7d4a3c] hover:text-[#7d4a3c]'
  }`;

function Escolha<K extends string>({ opcoes, valor, onChange }: {
  opcoes: Record<K, string>; valor: K | null | undefined; onChange: (v: K | null) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {(Object.keys(opcoes) as K[]).map(k => (
        <button key={k} type="button" onClick={() => onChange(valor === k ? null : k)} className={chipClasse(valor === k)}>
          {valor === k && <Check className="mr-1 inline h-3 w-3" />}{opcoes[k]}
        </button>
      ))}
    </div>
  );
}

function Varios<K extends string>({ opcoes, valor, onChange, exclusivo }: {
  opcoes: Record<K, string>; valor: K[] | undefined; onChange: (v: K[]) => void;
  /** Opção que exclui as outras (ex.: "nenhum"). */
  exclusivo?: K;
}) {
  const atual = valor ?? [];
  const alternar = (k: K) => {
    if (atual.includes(k)) return onChange(atual.filter(x => x !== k));
    if (exclusivo && k === exclusivo) return onChange([k]);
    onChange([...atual.filter(x => x !== exclusivo), k]);
  };
  return (
    <div className="flex flex-wrap gap-1.5">
      {(Object.keys(opcoes) as K[]).map(k => (
        <button key={k} type="button" onClick={() => alternar(k)} className={chipClasse(atual.includes(k))}>
          {atual.includes(k) && <Check className="mr-1 inline h-3 w-3" />}{opcoes[k]}
        </button>
      ))}
    </div>
  );
}

const SimNao: React.FC<{ valor: boolean | null | undefined; onChange: (v: boolean | null) => void }> = ({ valor, onChange }) => (
  <div className="flex gap-1.5">
    <button type="button" onClick={() => onChange(valor === true ? null : true)} className={chipClasse(valor === true)}>Sim</button>
    <button type="button" onClick={() => onChange(valor === false ? null : false)} className={chipClasse(valor === false)}>Não</button>
  </div>
);

const Grupo: React.FC<{ titulo: string; ajuda?: string; children: React.ReactNode }> = ({ titulo, ajuda, children }) => (
  <div className="rounded-lg border border-gray-100 bg-gray-50/60 p-3">
    <p className="text-xs font-medium text-gray-800">{titulo}</p>
    {ajuda && <p className="mt-0.5 text-xs text-gray-500">{ajuda}</p>}
    <div className="mt-2 space-y-2">{children}</div>
  </div>
);

/** Os seis grupos. Compartilhado entre a etapa de preenchimento e a revisão. */
const OrganizacaoCampos: React.FC<{
  org: OrganizacaoEmpresa;
  onChange: (o: OrganizacaoEmpresa) => void;
}> = ({ org, onChange }) => {
  const set = <K extends keyof OrganizacaoEmpresa>(k: K, v: OrganizacaoEmpresa[K]) => onChange({ ...org, [k]: v });
  const temEvento = (org.eventos_12m ?? []).some(e => e !== 'nenhum');
  return (
    <div className="space-y-2.5">
      <Grupo titulo="O que mudou nos últimos 12 meses?" ajuda="É o que mais explica uma piora que aparece em vários setores ao mesmo tempo.">
        <Varios opcoes={EVENTOS_12M} valor={org.eventos_12m} onChange={v => set('eventos_12m', v)} exclusivo="nenhum" />
        {temEvento && (
          <Input label="Em uma linha, o que foi" maxLength={500} value={org.eventos_12m_detalhe ?? ''}
            onChange={e => set('eventos_12m_detalhe', e.target.value || null)} placeholder="Ex.: troca de gerente na Cozinha em março" />
        )}
      </Grupo>

      <Grupo titulo="Liderança" ajuda="Apoio e autonomia nos resultados são quase sempre sobre isso.">
        <div>
          <p className="mb-1 text-xs text-gray-500">Os setores têm líder formal?</p>
          <Escolha opcoes={LIDERANCA_FORMAL} valor={org.lideranca_formal} onChange={v => set('lideranca_formal', v)} />
        </div>
        <div>
          <p className="mb-1 text-xs text-gray-500">Quantas pessoas por líder, em média?</p>
          <Escolha opcoes={PESSOAS_POR_LIDER} valor={org.pessoas_por_lider} onChange={v => set('pessoas_por_lider', v)} />
        </div>
        <div>
          <p className="mb-1 text-xs text-gray-500">Algum setor trocou de líder nos últimos 12 meses?</p>
          <SimNao valor={org.troca_lideranca_12m} onChange={v => set('troca_lideranca_12m', v)} />
        </div>
      </Grupo>

      <Grupo titulo="Vínculos" ajuda="Terceirizado responde à pesquisa, mas a empresa não controla a jornada dele.">
        <Varios opcoes={VINCULOS} valor={org.vinculos} onChange={v => set('vinculos', v)} />
        {(org.vinculos?.length ?? 0) > 1 && (
          <div>
            <p className="mb-1 text-xs text-gray-500">Qual predomina?</p>
            <Escolha
              opcoes={Object.fromEntries((org.vinculos ?? []).map(v => [v, VINCULOS[v]])) as Record<string, string>}
              valor={org.vinculo_predominante}
              onChange={v => set('vinculo_predominante', v as OrganizacaoEmpresa['vinculo_predominante'])}
            />
          </div>
        )}
      </Grupo>

      <Grupo titulo="Jornada" ajuda="Carga sem jornada é adivinhação.">
        <div>
          <p className="mb-1 text-xs text-gray-500">Hora extra é rotina?</p>
          <Escolha opcoes={HORA_EXTRA} valor={org.hora_extra} onChange={v => set('hora_extra', v)} />
        </div>
        <div>
          <p className="mb-1 text-xs text-gray-500">Existe banco de horas?</p>
          <SimNao valor={org.banco_de_horas} onChange={v => set('banco_de_horas', v)} />
        </div>
        <div>
          <p className="mb-1 text-xs text-gray-500">Escala mais comum</p>
          <Escolha opcoes={ESCALAS} valor={org.escala_predominante} onChange={v => set('escala_predominante', v)} />
        </div>
      </Grupo>

      <Grupo titulo="Remuneração variável ou meta individual" ajuda="Meta com cobrança individual muda a medida sugerida: organizacional, não pessoal.">
        <Escolha opcoes={REMUNERACAO_VARIAVEL} valor={org.remuneracao_variavel} onChange={v => set('remuneracao_variavel', v)} />
        {org.remuneracao_variavel && org.remuneracao_variavel !== 'nao' && (
          <Input label="Em quais setores? (separe por vírgula)" value={(org.remuneracao_variavel_setores ?? []).join(', ')}
            onChange={e => set('remuneracao_variavel_setores', e.target.value.split(',').map(s => s.trim()).filter(Boolean).slice(0, 50))}
            placeholder="Ex.: Vendas, Entregas" />
        )}
      </Grupo>

      <Grupo titulo="O que já existe de SST" ajuda="Define o que o copiloto pode acionar e o que precisa ser criado.">
        <Varios opcoes={SST_EXISTENTE} valor={org.sst_existente} onChange={v => set('sst_existente', v)} exclusivo="nenhum" />
      </Grupo>
    </div>
  );
};

const ResumoOrganizacao: React.FC<{ org: OrganizacaoEmpresa }> = ({ org }) => {
  const linha = (rotulo: string, valor: string | null | undefined) => valor
    ? <div><dt className="inline text-gray-400">{rotulo}: </dt><dd className="inline text-gray-700">{valor}</dd></div>
    : null;
  const eventos = (org.eventos_12m ?? []).map(e => EVENTOS_12M[e]).join(', ');
  return (
    <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
      {linha('Últimos 12 meses', eventos ? `${eventos}${org.eventos_12m_detalhe ? ` — ${org.eventos_12m_detalhe}` : ''}` : null)}
      {linha('Liderança formal', org.lideranca_formal ? LIDERANCA_FORMAL[org.lideranca_formal] : null)}
      {linha('Pessoas por líder', org.pessoas_por_lider ? PESSOAS_POR_LIDER[org.pessoas_por_lider] : null)}
      {linha('Trocou líder no ano', org.troca_lideranca_12m == null ? null : org.troca_lideranca_12m ? 'Sim' : 'Não')}
      {linha('Vínculos', (org.vinculos ?? []).map(v => VINCULOS[v]).join(', ') + (org.vinculo_predominante ? ` (predomina ${VINCULOS[org.vinculo_predominante]})` : '') || null)}
      {linha('Hora extra', org.hora_extra ? HORA_EXTRA[org.hora_extra] : null)}
      {linha('Banco de horas', org.banco_de_horas == null ? null : org.banco_de_horas ? 'Sim' : 'Não')}
      {linha('Escala predominante', org.escala_predominante ? ESCALAS[org.escala_predominante] : null)}
      {linha('Remuneração variável', org.remuneracao_variavel ? `${REMUNERACAO_VARIAVEL[org.remuneracao_variavel]}${org.remuneracao_variavel_setores?.length ? ` (${org.remuneracao_variavel_setores.join(', ')})` : ''}` : null)}
      {linha('SST existente', (org.sst_existente ?? []).map(s => SST_EXISTENTE[s]).join(', ') || null)}
    </dl>
  );
};

// ── Mesclas ───────────────────────────────────────────────────────────

/** CNAE e setor entram da Receita só quando o rascunho não trouxe nada. */
const comDadosDaReceita = (rascunho: Rascunho, dados: EmpresaDadosCnpj | null): Rascunho => {
  if (!dados || dados.sync_status !== 'ok') return rascunho;
  return {
    ...rascunho,
    cnae_principal: rascunho.cnae_principal?.trim() || dados.cnae_principal_codigo,
    setor_atuacao: rascunho.setor_atuacao?.trim() || dados.cnae_principal_descricao,
  };
};

const doContexto = (contexto: EmpresaContextoOperacional): Rascunho => ({
  setor_atuacao: contexto.setor_atuacao,
  cnae_principal: contexto.cnae_principal,
  contexto_adicional: contexto.contexto_adicional,
});

// ── Componente ────────────────────────────────────────────────────────

export const PerfilEmpresaForm: React.FC<{
  onSaved?: () => void;
  mostrarResumo?: boolean;
}> = ({ onSaved, mostrarResumo = true }) => {
  const { acesso, can } = useRhAccess();
  const podeEditar = acesso.principal || can('empresa');
  const [etapa, setEtapa] = useState<Etapa>('organizacao');
  const [contexto, setContexto] = useState<EmpresaContextoOperacional | null>(null);
  const [dadosCnpj, setDadosCnpj] = useState<EmpresaDadosCnpj | null>(null);
  const [organizacao, setOrganizacao] = useState<OrganizacaoEmpresa>(ORGANIZACAO_EMPRESA_VAZIA);
  const [descricao, setDescricao] = useState('');
  const [rascunho, setRascunho] = useState<Rascunho>(vazio);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    Promise.all([
      rhService.getContextoOperacional(),
      rhService.getDadosCnpj().catch(() => null),
    ])
      .then(([perfil, cnpj]) => {
        setContexto(perfil);
        setDadosCnpj(cnpj);
        if (perfil) {
          setRascunho(doContexto(perfil));
          setOrganizacao({ ...ORGANIZACAO_EMPRESA_VAZIA, ...(perfil.organizacao ?? {}) });
          setDescricao(perfil.contexto_adicional ?? '');
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

  const gruposRespondidos = organizacaoEmpresaPreenchida(organizacao);
  const podeAvancar = gruposRespondidos >= 2;

  /** O texto livre vira contexto adicional na revisão. */
  const continuar = () => {
    if (!podeAvancar) {
      setErro('Responda pelo menos dois grupos acima — é o mínimo para o copiloto ter contexto.');
      return;
    }
    setErro('');
    setRascunho(atual => comDadosDaReceita({
      ...atual,
      contexto_adicional: descricao.trim() || atual.contexto_adicional,
    }, dadosCnpj));
    setEtapa('revisao');
  };

  const salvar = async () => {
    if (!rascunho.setor_atuacao?.trim() && !rascunho.contexto_adicional?.trim()) {
      setErro('Confirme ao menos o setor de atuação ou o contexto adicional.');
      return;
    }
    setSalvando(true);
    setErro('');
    try {
      const salvo = await rhService.salvarContextoOperacional({
        setor_atuacao: rascunho.setor_atuacao,
        cnae_principal: rascunho.cnae_principal,
        descricao_negocio: null,
        contexto_adicional: rascunho.contexto_adicional,
        organizacao,
      });
      setContexto(salvo);
      setRascunho(doContexto(salvo));
      setOrganizacao({ ...ORGANIZACAO_EMPRESA_VAZIA, ...(salvo.organizacao ?? {}) });
      setEtapa('resumo');
      toast.success('Perfil da empresa confirmado.');
      onSaved?.();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível salvar o perfil.');
    } finally {
      setSalvando(false);
    }
  };

  const setCampo = <K extends keyof Rascunho>(campo: K, valor: Rascunho[K]) =>
    setRascunho(atual => ({ ...atual, [campo]: valor }));

  if (loading) return <div className="flex min-h-24 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-[#7d4a3c]" /></div>;

  if (!podeEditar) {
    return <p className="rounded-lg bg-gray-50 p-3 text-xs leading-relaxed text-gray-600">O perfil é mantido pelo usuário principal ou por quem tem permissão para editar os dados da empresa.</p>;
  }

  const blocoReceita = dadosCnpj?.sync_status === 'ok' && (
    <div className="rounded-lg border border-green-100 bg-green-50/60 p-3">
      <p className="text-xs font-medium text-green-900">Já sabemos pela Receita Federal</p>
      <dl className="mt-1.5 grid gap-x-4 gap-y-1 text-xs text-gray-700 sm:grid-cols-2">
        <div><dt className="inline text-gray-500">Razão social: </dt><dd className="inline">{dadosCnpj.razao_social ?? '—'}</dd></div>
        <div><dt className="inline text-gray-500">Porte: </dt><dd className="inline">{dadosCnpj.porte ?? '—'}</dd></div>
        <div className="sm:col-span-2">
          <dt className="inline text-gray-500">CNAE principal: </dt>
          <dd className="inline">{dadosCnpj.cnae_principal_codigo} — {dadosCnpj.cnae_principal_descricao}</dd>
        </div>
        <div><dt className="inline text-gray-500">Situação: </dt><dd className="inline">{dadosCnpj.situacao_cadastral ?? '—'}</dd></div>
        {dadosCnpj.grau_risco_estimado && (
          <div>
            <dt className="inline text-gray-500">Grau de risco (NR-4): </dt>
            <dd className="inline">{dadosCnpj.grau_risco_estimado} <span className="text-gray-400">· leitura preliminar pelo CNAE</span></dd>
          </div>
        )}
      </dl>
      <p className="mt-2 text-xs leading-relaxed text-green-900/80">
        Isso entra sozinho. O que falta é como o trabalho é organizado — é isso que muda a leitura dos resultados.
      </p>
    </div>
  );

  if (etapa === 'resumo' && contexto) {
    return (
      <div className="space-y-3">
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <div><p className="text-xs font-medium text-gray-400">Setor de atuação</p><p className="mt-1 text-gray-700">{contexto.setor_atuacao || 'Não informado'}</p></div>
          <div><p className="text-xs font-medium text-gray-400">CNAE</p><p className="mt-1 text-gray-700">{contexto.cnae_principal || 'Não informado'}</p></div>
        </div>
        <div className="border-t border-gray-100 pt-3">
          <p className="mb-2 text-xs font-medium text-gray-400">Organização do trabalho</p>
          {organizacaoEmpresaPreenchida(contexto.organizacao) > 0
            ? <ResumoOrganizacao org={contexto.organizacao} />
            : <p className="text-sm text-gray-500">Ainda não preenchida — o copiloto responde sem esse contexto.</p>}
        </div>
        {contexto.contexto_adicional && (
          <div><p className="text-xs font-medium text-gray-400">Contexto adicional</p><p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">{contexto.contexto_adicional}</p></div>
        )}
        <button type="button" onClick={() => setEtapa('organizacao')} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">
          <Pencil className="h-3.5 w-3.5" /> Editar perfil
        </button>
      </div>
    );
  }

  if (etapa === 'organizacao') {
    return (
      <div className="space-y-3">
        {blocoReceita}

        <OrganizacaoCampos org={organizacao} onChange={setOrganizacao} />

        <Textarea
          label="O que as escolhas acima não contam?"
          rows={4}
          value={descricao}
          onChange={event => setDescricao(event.target.value)}
          placeholder="Ex.: cozinha central abastece três lojas; entregas com motoboys próprios; almoço de sexta dobra o movimento; a Cozinha trocou de gerente em março."
        />
        <p className="-mt-1 text-xs text-gray-500">Opcional — qualquer coisa que ajude o copiloto a entender melhor a rotina.</p>

        {erro && <p className="rounded-lg bg-red-50 p-3 text-xs text-red-700">{erro}</p>}
        <button type="button" disabled={salvando} onClick={continuar}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#7d4a3c] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
          Continuar para revisão
        </button>
        <p className="text-xs text-gray-400">{gruposRespondidos} de 6 grupos respondidos · mínimo 2 para continuar.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="rounded-lg bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">
        Revise antes de confirmar. O que veio da Receita é só pré-preenchimento — a declaração é da empresa.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Setor de atuação" value={rascunho.setor_atuacao ?? ''} onChange={event => setCampo('setor_atuacao', event.target.value || null)} />
        <Input label="CNAE principal" value={rascunho.cnae_principal ?? ''} onChange={event => setCampo('cnae_principal', event.target.value || null)} />
      </div>
      <Textarea label="Contexto adicional" rows={4} value={rascunho.contexto_adicional ?? ''} onChange={event => setCampo('contexto_adicional', event.target.value || null)} />

      <div className="rounded-lg border border-gray-100 p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-medium text-gray-700">Organização do trabalho</p>
          <button type="button" onClick={() => setEtapa('organizacao')} className="text-xs font-medium text-[#7d4a3c] hover:underline">Ajustar</button>
        </div>
        {organizacaoEmpresaPreenchida(organizacao) > 0
          ? <ResumoOrganizacao org={organizacao} />
          : <p className="text-xs text-gray-500">Nenhum grupo respondido.</p>}
      </div>

      {erro && <p className="rounded-lg bg-red-50 p-3 text-xs text-red-700">{erro}</p>}
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={() => setEtapa(contexto ? 'resumo' : 'organizacao')} className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600">
          {contexto ? 'Cancelar' : 'Voltar'}
        </button>
        <button type="button" disabled={salvando} onClick={salvar} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#7d4a3c] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
          {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Confirmar perfil
        </button>
      </div>
    </div>
  );
};
