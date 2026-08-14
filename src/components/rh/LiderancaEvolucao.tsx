import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight, Check, CheckCircle2, Clipboard, Lightbulb, Plus, RefreshCw,
  Sparkles, Target, ThumbsUp, UsersRound, X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  rhService, type JssCortes, type JssSetor, type LiderancaCiclo, type LiderancaEtapa,
  type PlanoFator, type PlanoNivel, type SetorEmpresa,
} from '../../services/empresaService';
import { obterInsightJss } from '../../lib/jssInsights';

const ETAPAS: { id: LiderancaEtapa; label: string; curto: string }[] = [
  { id: 'iniciada', label: 'Jornada iniciada', curto: 'Início' },
  { id: 'plano_definido', label: 'Plano definido', curto: 'Plano' },
  { id: 'em_acao', label: 'Ação em prática', curto: 'Ação' },
  { id: 'pratica_incorporada', label: 'Prática incorporada', curto: 'Prática' },
  { id: 'evolucao_mantida', label: 'Evolução mantida', curto: 'Evolução' },
];

type Sugestao = {
  fator: PlanoFator; titulo: string; objetivo: string; medida: string; nivel: PlanoNivel;
};

const SUGESTOES: Record<'demanda' | 'controle' | 'apoio' | 'manutencao', Sugestao[]> = {
  demanda: [
    { fator: 'demanda', titulo: 'Três prioridades por semana', objetivo: 'Dar clareza ao que realmente precisa ser entregue.', medida: 'No início da semana, definir com a equipe as três prioridades e o que pode esperar.', nivel: 'organizacional' },
    { fator: 'demanda', titulo: 'Revisão rápida da carga', objetivo: 'Evitar acúmulo e prazos incompatíveis.', medida: 'Fazer uma conversa de 20 minutos para listar tarefas, retirar duplicidades e redistribuir o excesso.', nivel: 'fonte' },
    { fator: 'jornada', titulo: 'Pausas e turnos previsíveis', objetivo: 'Reduzir desgaste durante a jornada.', medida: 'Revisar pausas, trocas de turno e horas extras; comunicar a escala com antecedência.', nivel: 'fonte' },
  ],
  controle: [
    { fator: 'controle', titulo: 'Escolha de como fazer', objetivo: 'Aumentar a autonomia nas tarefas.', medida: 'Definir o resultado esperado e deixar a equipe escolher o melhor modo de executar.', nivel: 'organizacional' },
    { fator: 'controle', titulo: 'Ouvir antes de mudar', objetivo: 'Incluir quem executa o trabalho nas decisões.', medida: 'Antes de alterar rotina, meta ou escala, ouvir impactos e sugestões da equipe.', nivel: 'organizacional' },
    { fator: 'controle', titulo: 'Papéis mais claros', objetivo: 'Reduzir ordens conflitantes e retrabalho.', medida: 'Registrar quem decide, quem executa e qual é o critério de conclusão das tarefas principais.', nivel: 'fonte' },
  ],
  apoio: [
    { fator: 'apoio', titulo: 'Conversa individual curta', objetivo: 'Criar espaço seguro para pedir ajuda.', medida: 'Realizar uma conversa individual de 20 minutos por mês, com escuta e próximo passo registrado.', nivel: 'organizacional' },
    { fator: 'apoio', titulo: 'Acordos de convivência', objetivo: 'Melhorar respeito e cooperação no dia a dia.', medida: 'Construir com a equipe três acordos simples de convivência e revisá-los mensalmente.', nivel: 'organizacional' },
    { fator: 'reconhecimento', titulo: 'Reconhecimento específico', objetivo: 'Valorizar entregas e atitudes positivas.', medida: 'Toda semana, reconhecer de forma específica uma entrega, colaboração ou melhoria observada.', nivel: 'organizacional' },
  ],
  manutencao: [
    { fator: 'apoio', titulo: 'Preservar o que funciona', objetivo: 'Manter as práticas positivas do setor.', medida: 'Perguntar à equipe qual prática ajuda mais o trabalho e combinar como mantê-la no próximo ciclo.', nivel: 'organizacional' },
    { fator: 'reconhecimento', titulo: 'Compartilhar uma boa prática', objetivo: 'Transformar um ponto forte em rotina consciente.', medida: 'Registrar uma prática que funciona, explicar por que ajuda e reforçá-la nas reuniões do setor.', nivel: 'organizacional' },
  ],
};

const input = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-[#7d4a3c]';
const linhas = (texto: string) => texto.split('\n').map(x => x.trim()).filter(Boolean);
const dataBr = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString('pt-BR');

function diagnostico(setor: JssSetor | undefined, cortes: JssCortes | null | undefined) {
  if (!setor || !cortes) return { fortes: [] as string[], atencao: [] as string[], sugestoes: SUGESTOES.manutencao };
  const fortes: string[] = [];
  if (setor.demanda < cortes.demanda) fortes.push('A carga de trabalho está mais equilibrada que o ponto de referência atual.');
  if (setor.controle >= cortes.controle) fortes.push('A equipe demonstra boa autonomia para organizar o trabalho.');
  if (setor.apoio >= cortes.apoio) fortes.push('O apoio entre equipe e liderança aparece como ponto positivo.');
  const insight = obterInsightJss(setor, cortes);
  const atencao = [...insight.fatores, ...insight.sinais].slice(0, 4);
  const grupos: Sugestao[] = [];
  if (insight.fatores.some(x => x.includes('Cobrança'))) grupos.push(...SUGESTOES.demanda);
  if (insight.fatores.some(x => x.includes('autonomia'))) grupos.push(...SUGESTOES.controle);
  if (insight.fatores.some(x => x.includes('apoio'))) grupos.push(...SUGESTOES.apoio);
  if (grupos.length === 0) grupos.push(...SUGESTOES.manutencao);
  return { fortes, atencao, sugestoes: grupos.slice(0, 4) };
}

export const LiderancaEvolucao: React.FC<{ setores: SetorEmpresa[] }> = ({ setores }) => {
  const [ciclos, setCiclos] = useState<LiderancaCiclo[]>([]);
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [jss, setJss] = useState<Awaited<ReturnType<typeof rhService.getRelatorioJss>>>(null);
  const [loading, setLoading] = useState(true);
  const [novo, setNovo] = useState(false);
  const [editando, setEditando] = useState(false);
  const [acao, setAcao] = useState<Sugestao | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    const fim = new Date(); const inicio = new Date(); inicio.setMonth(inicio.getMonth() - 6);
    try {
      const [lista, relatorio] = await Promise.all([
        rhService.getLiderancaCiclos(),
        rhService.getRelatorioJss(inicio.toISOString().slice(0, 10), fim.toISOString().slice(0, 10)).catch(() => null),
      ]);
      setCiclos(lista); setJss(relatorio);
      setSelecionado(atual => atual && lista.some(c => c.id === atual) ? atual : lista[0]?.id ?? null);
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Não foi possível carregar as jornadas.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void carregar(); }, [carregar]);

  const ciclo = ciclos.find(c => c.id === selecionado) ?? null;
  const setorJss = jss?.setores.find(s => s.setor === ciclo?.setor);
  const leitura = useMemo(() => diagnostico(setorJss, jss?.cortes), [setorJss, jss?.cortes]);

  if (loading) return <div className="flex h-56 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[#7d4a3c] border-t-transparent" /></div>;

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-[#7d4a3c]/20 bg-[#7d4a3c]/5 p-4">
        <div className="flex items-start gap-3"><UsersRound className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#7d4a3c]" /><div><p className="text-sm font-semibold text-gray-800">Uma jornada particular para cada liderança</p><p className="mt-1 text-xs leading-relaxed text-gray-600">Não existe ranking entre setores. O RH usa esta área para reconhecer o que está bom, combinar melhorias e acompanhar ações com o gestor. Nenhuma resposta individual ou relato confidencial aparece aqui.</p></div></div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div><h2 className="text-lg font-semibold text-gray-800">Jornadas por setor</h2><p className="text-sm text-gray-500">Escolha uma jornada para preparar a conversa com a liderança.</p></div>
        <button onClick={() => setNovo(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-[#7d4a3c] px-4 py-2 text-sm font-semibold text-white"><Plus className="h-4 w-4" /> Iniciar jornada</button>
      </div>

      {ciclos.length === 0 ? <div className="rounded-xl bg-white p-10 text-center shadow"><Sparkles className="mx-auto h-9 w-9 text-gray-300" /><p className="mt-3 font-medium text-gray-600">Nenhuma jornada iniciada.</p><p className="mt-1 text-sm text-gray-400">Comece por um setor e leve sugestões práticas para a primeira conversa.</p></div> : <div className="grid gap-5 lg:grid-cols-[250px_1fr]">
        <div className="space-y-2">{ciclos.map(c => <button key={c.id} onClick={() => setSelecionado(c.id)} className={`w-full rounded-xl border p-3 text-left transition ${c.id === selecionado ? 'border-[#7d4a3c] bg-[#7d4a3c]/5' : 'border-gray-200 bg-white hover:border-gray-300'}`}><div className="flex items-center justify-between gap-2"><span className="font-semibold text-gray-800">{c.setor}</span>{c.status === 'concluido' && <CheckCircle2 className="h-4 w-4 text-green-600" />}</div><p className="mt-1 text-xs text-gray-500">{ETAPAS.find(e => e.id === c.etapa)?.label}</p><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100"><div className="h-full bg-[#7d4a3c]" style={{ width: `${((ETAPAS.findIndex(e => e.id === c.etapa) + 1) / ETAPAS.length) * 100}%` }} /></div></button>)}</div>
        {ciclo && <JornadaDetalhe ciclo={ciclo} sugestoes={leitura.sugestoes} onEditar={() => setEditando(true)} onAcao={setAcao} onAtualizar={carregar} />}
      </div>}

      {novo && <CicloForm setores={setores} jss={jss} onClose={() => setNovo(false)} onSaved={async id => { setNovo(false); await carregar(); setSelecionado(id); }} />}
      {editando && ciclo && <PontosForm ciclo={ciclo} onClose={() => setEditando(false)} onSaved={() => { setEditando(false); void carregar(); }} />}
      {acao && ciclo && <AcaoForm ciclo={ciclo} sugestao={acao} onClose={() => setAcao(null)} onSaved={() => { setAcao(null); void carregar(); }} />}
    </div>
  );
};

const JornadaDetalhe: React.FC<{
  ciclo: LiderancaCiclo; sugestoes: Sugestao[]; onEditar: () => void;
  onAcao: (s: Sugestao) => void; onAtualizar: () => Promise<void>;
}> = ({ ciclo, sugestoes, onEditar, onAcao, onAtualizar }) => {
  const indice = ETAPAS.findIndex(e => e.id === ciclo.etapa);
  const proxima = ETAPAS[indice + 1];
  const temAcao = ciclo.acoes.some(a => a.status !== 'cancelada');
  const temAcaoIniciada = ciclo.acoes.some(a => a.status === 'em_andamento' || a.status === 'concluida');
  const temAcaoConcluida = ciclo.acoes.some(a => a.status === 'concluida');
  const podeAvancar = !proxima
    ? false
    : proxima.id === 'plano_definido'
      ? temAcao
      : proxima.id === 'em_acao'
        ? temAcaoIniciada
        : temAcaoConcluida;
  const orientacao = proxima?.id === 'plano_definido'
    ? 'Adicione um combinado para alcançar o próximo marco.'
    : proxima?.id === 'em_acao'
      ? 'Inicie ao menos um combinado para avançar.'
      : 'Conclua uma ação com evidência para avançar.';

  const copiar = async () => {
    const texto = [
      `EVOLUÇÃO DA LIDERANÇA — ${ciclo.setor}`,
      `Ciclo: ${dataBr(ciclo.inicio)} a ${dataBr(ciclo.fim)}`,
      '', 'O QUE ESTÁ FUNCIONANDO', ...(ciclo.pontos_fortes.length ? ciclo.pontos_fortes.map(x => `• ${x}`) : ['• A definir com a liderança']),
      '', 'O QUE PRECISA MELHORAR', ...(ciclo.pontos_atencao.length ? ciclo.pontos_atencao.map(x => `• ${x}`) : ['• A definir com a liderança']),
      '', 'COMBINADOS', ...(ciclo.acoes.length ? ciclo.acoes.map(a => `• ${a.medida} — ${a.responsavel}, até ${dataBr(a.prazo)} (${a.status === 'concluida' ? 'concluído' : a.status === 'em_andamento' ? 'em andamento' : a.status === 'cancelada' ? 'cancelado' : 'planejado'})`) : ['• Ainda não definidos']),
      '', `Próximo marco: ${proxima?.label ?? 'Ciclo concluído'}`,
      `Acompanhamento do RH: ${ciclo.responsavel_rh}`,
    ].join('\n');
    await navigator.clipboard.writeText(texto); toast.success('Resumo seguro copiado.');
  };

  const avancar = async () => {
    if (!proxima) return;
    let nota: string | undefined;
    if (proxima.id === 'pratica_incorporada' || proxima.id === 'evolucao_mantida') {
      const resposta = prompt('Registre em uma frase o que foi observado ou aprendido neste marco:', ciclo.nota_evolucao ?? '');
      if (resposta === null) return; nota = resposta.trim();
    }
    const res = await rhService.avancarLideranca(ciclo.id, proxima.id, nota);
    if (!res.ok) return toast.error(res.error || 'Não foi possível avançar.');
    toast.success(`Marco alcançado: ${proxima.label}.`); await onAtualizar();
  };

  const statusAcao = async (id: string, status: 'em_andamento' | 'concluida') => {
    let evidencia: string | undefined;
    if (status === 'concluida') {
      const r = prompt('O que mostra que este combinado foi colocado em prática?');
      if (r === null || !r.trim()) return; evidencia = r.trim();
    }
    const res = await rhService.atualizarPlanoAcao(id, status, evidencia);
    if (!res.ok) return toast.error(res.error || 'Não foi possível atualizar.');
    await onAtualizar();
  };

  return <div className="space-y-4">
    <div className="rounded-xl bg-white p-5 shadow">
      <div className="flex items-start justify-between gap-3"><div><p className="text-xs uppercase tracking-wide text-gray-400">Jornada de liderança</p><h3 className="text-xl font-bold text-gray-800">{ciclo.setor}</h3><p className="mt-1 text-xs text-gray-500">{dataBr(ciclo.inicio)} a {dataBr(ciclo.fim)} · RH: {ciclo.responsavel_rh}</p></div><button onClick={copiar} className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold text-gray-600"><Clipboard className="h-4 w-4" /> Copiar resumo</button></div>
      <div className="mt-5 grid grid-cols-5 gap-1">{ETAPAS.map((e, i) => <div key={e.id} className="text-center"><div className={`mx-auto flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${i <= indice ? 'bg-[#7d4a3c] text-white' : 'bg-gray-100 text-gray-400'}`}>{i < indice ? <Check className="h-4 w-4" /> : i + 1}</div><p className={`mt-1 text-[10px] ${i <= indice ? 'font-medium text-[#7d4a3c]' : 'text-gray-400'}`}>{e.curto}</p></div>)}</div>
      {proxima && (podeAvancar
        ? <button onClick={avancar} className="mx-auto mt-4 flex items-center gap-1.5 text-xs font-semibold text-[#7d4a3c]">Avançar para “{proxima.label}” <ArrowRight className="h-3.5 w-3.5" /></button>
        : <p className="mt-4 text-center text-xs text-gray-500">{orientacao}</p>)}
    </div>

    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-xl border border-green-100 bg-green-50/60 p-4"><div className="flex items-center gap-2"><ThumbsUp className="h-4 w-4 text-green-700" /><h4 className="text-sm font-semibold text-green-900">O que está funcionando</h4></div><ul className="mt-2 space-y-1.5 text-sm text-green-900">{ciclo.pontos_fortes.length ? ciclo.pontos_fortes.map((x,i) => <li key={i}>• {x}</li>) : <li className="text-green-700">Definir na conversa com o gestor.</li>}</ul></div>
      <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-4"><div className="flex items-center gap-2"><Target className="h-4 w-4 text-amber-700" /><h4 className="text-sm font-semibold text-amber-900">O que precisa melhorar</h4></div><ul className="mt-2 space-y-1.5 text-sm text-amber-900">{ciclo.pontos_atencao.length ? ciclo.pontos_atencao.map((x,i) => <li key={i}>• {x}</li>) : <li className="text-amber-700">Definir na conversa com o gestor.</li>}</ul></div>
    </div>
    {ciclo.status === 'ativo' && <button onClick={onEditar} className="text-xs font-semibold text-[#7d4a3c]">Editar pontos da conversa</button>}

    {ciclo.status === 'ativo' && <div className="rounded-xl bg-white p-5 shadow"><div className="flex items-center gap-2"><Lightbulb className="h-5 w-5 text-amber-500" /><h4 className="font-semibold text-gray-800">Ideias práticas</h4></div><p className="mt-1 text-xs text-gray-500">Sugestões curtas para o RH adaptar junto com o gestor.</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{sugestoes.map((s,i) => <div key={`${s.titulo}-${i}`} className="rounded-lg border p-3"><p className="text-sm font-semibold text-gray-800">{s.titulo}</p><p className="mt-1 text-xs leading-relaxed text-gray-500">{s.medida}</p><button onClick={() => onAcao(s)} className="mt-2 text-xs font-semibold text-[#7d4a3c]">Usar esta ideia</button></div>)}</div><button onClick={() => onAcao({ fator:'outro', titulo:'Ação personalizada', objetivo:'', medida:'', nivel:'organizacional' })} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#7d4a3c]"><Plus className="h-3.5 w-3.5" /> Criar outra ação</button></div>}

    <div className="rounded-xl bg-white p-5 shadow"><h4 className="font-semibold text-gray-800">Combinados com a liderança</h4>{ciclo.acoes.length === 0 ? <p className="mt-3 text-sm text-gray-400">Nenhum combinado registrado.</p> : <div className="mt-3 space-y-2">{ciclo.acoes.map(a => <div key={a.id} className="rounded-lg border p-3"><div className="flex items-start justify-between gap-3"><div><p className="text-sm text-gray-800">{a.medida}</p><p className="mt-1 text-xs text-gray-500">{a.responsavel} · até {dataBr(a.prazo)}</p>{a.evidencia && <p className="mt-1 text-xs text-green-700">Evidência: {a.evidencia}</p>}</div><span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${a.status==='concluida'?'bg-green-100 text-green-700':a.status==='em_andamento'?'bg-blue-50 text-blue-700':a.status==='cancelada'?'bg-gray-100 text-gray-400':'bg-gray-100 text-gray-600'}`}>{a.status==='concluida'?'Concluído':a.status==='em_andamento'?'Em prática':a.status==='cancelada'?'Cancelado':'Planejado'}</span></div>{ciclo.status === 'ativo' && a.status==='planejada' && <button onClick={() => statusAcao(a.id,'em_andamento')} className="mt-2 text-xs font-semibold text-[#7d4a3c]">Iniciar ação</button>}{ciclo.status === 'ativo' && a.status==='em_andamento' && <button onClick={() => statusAcao(a.id,'concluida')} className="mt-2 text-xs font-semibold text-green-700">Concluir com evidência</button>}</div>)}</div>}</div>
  </div>;
};

const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" onMouseDown={onClose}><div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-xl" onMouseDown={e => e.stopPropagation()}><div className="flex items-center justify-between border-b p-5"><h3 className="font-bold text-gray-900">{title}</h3><button onClick={onClose}><X className="h-5 w-5 text-gray-400" /></button></div>{children}</div></div>;

const CicloForm: React.FC<{ setores:SetorEmpresa[]; jss:Awaited<ReturnType<typeof rhService.getRelatorioJss>>; onClose:()=>void; onSaved:(id:string)=>void }> = ({ setores,jss,onClose,onSaved }) => {
  const fimPadrao=new Date();fimPadrao.setMonth(fimPadrao.getMonth()+3);
  const [setor,setSetor]=useState('');const [fim,setFim]=useState(fimPadrao.toISOString().slice(0,10));const [rh,setRh]=useState('');const [fortes,setFortes]=useState('');const [atencao,setAtencao]=useState('');const [saving,setSaving]=useState(false);
  const preencher=()=>{const d=diagnostico(jss?.setores.find(s=>s.setor===setor),jss?.cortes);setFortes(d.fortes.join('\n'));setAtencao(d.atencao.join('\n'));};
  const salvar=async()=>{setSaving(true);const res=await rhService.criarLiderancaCiclo({setor,fim,responsavelRh:rh,pontosFortes:linhas(fortes),pontosAtencao:linhas(atencao)});setSaving(false);if(!res.ok||!res.id)return toast.error(res.error||'Não foi possível iniciar.');toast.success('Jornada iniciada.');onSaved(res.id);};
  return <Modal title="Iniciar jornada de liderança" onClose={onClose}><div className="space-y-4 p-5"><label className="block text-sm font-medium">Setor<select className={`${input} mt-1`} value={setor} onChange={e=>setSetor(e.target.value)}><option value="">Escolha...</option>{setores.map(s=><option key={s.setor}>{s.setor}</option>)}</select></label>{setor&&<button onClick={preencher} className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#7d4a3c]"><RefreshCw className="h-3.5 w-3.5" /> Usar diagnóstico agregado atual</button>}<label className="block text-sm font-medium">O que está funcionando<textarea className={`${input} mt-1`} rows={3} value={fortes} onChange={e=>setFortes(e.target.value)} placeholder="Um ponto por linha" /></label><label className="block text-sm font-medium">O que precisa melhorar<textarea className={`${input} mt-1`} rows={3} value={atencao} onChange={e=>setAtencao(e.target.value)} placeholder="Um ponto por linha" /></label><div className="grid gap-3 sm:grid-cols-2"><label className="block text-sm font-medium">Responsável do RH<input className={`${input} mt-1`} value={rh} onChange={e=>setRh(e.target.value)} /></label><label className="block text-sm font-medium">Fim do ciclo<input type="date" className={`${input} mt-1`} value={fim} onChange={e=>setFim(e.target.value)} /></label></div><p className="text-xs text-gray-500">Esses textos podem ser ajustados junto com o gestor. Nenhuma nota ou quantidade de respostas será levada ao resumo.</p></div><div className="flex justify-end gap-2 border-t p-5"><button onClick={onClose} className="px-4 py-2 text-sm">Cancelar</button><button disabled={saving} onClick={salvar} className="rounded-lg bg-[#7d4a3c] px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving?'Salvando...':'Iniciar jornada'}</button></div></Modal>;
};

const PontosForm: React.FC<{ ciclo:LiderancaCiclo;onClose:()=>void;onSaved:()=>void }> = ({ciclo,onClose,onSaved}) => {const[fortes,setFortes]=useState(ciclo.pontos_fortes.join('\n'));const[atencao,setAtencao]=useState(ciclo.pontos_atencao.join('\n'));const[rh,setRh]=useState(ciclo.responsavel_rh);const[fim,setFim]=useState(ciclo.fim);const salvar=async()=>{const res=await rhService.atualizarLiderancaPontos({id:ciclo.id,fim,responsavelRh:rh,pontosFortes:linhas(fortes),pontosAtencao:linhas(atencao)});if(!res.ok)return toast.error(res.error||'Não foi possível salvar.');toast.success('Pontos atualizados.');onSaved();};return <Modal title="Pontos da conversa" onClose={onClose}><div className="space-y-4 p-5"><label className="block text-sm font-medium">O que está funcionando<textarea className={`${input} mt-1`} rows={4} value={fortes} onChange={e=>setFortes(e.target.value)} /></label><label className="block text-sm font-medium">O que precisa melhorar<textarea className={`${input} mt-1`} rows={4} value={atencao} onChange={e=>setAtencao(e.target.value)} /></label><div className="grid gap-3 sm:grid-cols-2"><label className="block text-sm font-medium">Responsável do RH<input className={`${input} mt-1`} value={rh} onChange={e=>setRh(e.target.value)} /></label><label className="block text-sm font-medium">Fim do ciclo<input type="date" className={`${input} mt-1`} value={fim} onChange={e=>setFim(e.target.value)} /></label></div></div><div className="flex justify-end gap-2 border-t p-5"><button onClick={onClose} className="px-4 py-2 text-sm">Cancelar</button><button onClick={salvar} className="rounded-lg bg-[#7d4a3c] px-5 py-2 text-sm font-semibold text-white">Salvar</button></div></Modal>;};

const AcaoForm: React.FC<{ciclo:LiderancaCiclo;sugestao:Sugestao;onClose:()=>void;onSaved:()=>void}> = ({ciclo,sugestao,onClose,onSaved}) => {const prazoPadrao=new Date();prazoPadrao.setMonth(prazoPadrao.getMonth()+1);const[objetivo,setObjetivo]=useState(sugestao.objetivo);const[medida,setMedida]=useState(sugestao.medida);const[responsavel,setResponsavel]=useState('Gestor do setor');const[prazo,setPrazo]=useState(prazoPadrao.toISOString().slice(0,10));const[saving,setSaving]=useState(false);const salvar=async()=>{setSaving(true);const res=await rhService.adicionarLiderancaAcao({cicloId:ciclo.id,fator:sugestao.fator,objetivo,medida,nivelControle:sugestao.nivel,responsavel,prazo});setSaving(false);if(!res.ok)return toast.error(res.error||'Não foi possível registrar.');toast.success('Combinado adicionado ao plano de ação.');onSaved();};return <Modal title={`Novo combinado — ${ciclo.setor}`} onClose={onClose}><div className="space-y-4 p-5"><label className="block text-sm font-medium">Objetivo<textarea className={`${input} mt-1`} rows={2} value={objetivo} onChange={e=>setObjetivo(e.target.value)} /></label><label className="block text-sm font-medium">Ação combinada<textarea className={`${input} mt-1`} rows={3} value={medida} onChange={e=>setMedida(e.target.value)} /></label><div className="grid gap-3 sm:grid-cols-2"><label className="block text-sm font-medium">Responsável<input className={`${input} mt-1`} value={responsavel} onChange={e=>setResponsavel(e.target.value)} /></label><label className="block text-sm font-medium">Prazo<input type="date" className={`${input} mt-1`} value={prazo} onChange={e=>setPrazo(e.target.value)} /></label></div><p className="text-xs text-gray-500">O combinado também será registrado no Plano de Ação formal, com prazo e evidência.</p></div><div className="flex justify-end gap-2 border-t p-5"><button onClick={onClose} className="px-4 py-2 text-sm">Cancelar</button><button disabled={saving} onClick={salvar} className="rounded-lg bg-[#7d4a3c] px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving?'Salvando...':'Adicionar combinado'}</button></div></Modal>;};
