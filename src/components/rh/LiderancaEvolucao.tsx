import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight, CalendarDays, Check, CheckCircle2, Clipboard, GripVertical,
  Lightbulb, Plus, RefreshCw, Sparkles, Target, ThumbsUp, UsersRound, X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  rhService, type JssCortes, type JssItemKey, type JssSetor, type LiderancaCiclo,
  type LiderancaEtapa, type PlanoFator, type PlanoNivel, type PsychosocialSetor, type SetorEmpresa,
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
  const temSinal = (itens: JssItemKey[]) => itens.some(item => (setor.itens_risco?.[item] ?? 0) >= 50);
  const sinalDemanda = temSinal(['a', 'b', 'c', 'd', 'e']);
  const sinalControle = temSinal(['f', 'g', 'h', 'i', 'j', 'k']);
  const sinalApoio = temSinal(['l', 'm', 'n', 'o', 'p', 'q']);
  const fortes: string[] = [];
  const mistos: string[] = [];
  if (setor.demanda < cortes.demanda && !sinalDemanda) fortes.push('A cobrança está mais equilibrada que o ponto de referência atual.');
  if (setor.controle >= cortes.controle && !sinalControle) fortes.push('A equipe demonstra boa autonomia para organizar o trabalho.');
  if (setor.apoio >= cortes.apoio && !sinalApoio) fortes.push('O apoio entre equipe e liderança aparece como ponto positivo.');
  if (setor.demanda < cortes.demanda && sinalDemanda) mistos.push('Resultado misto na cobrança: o geral é favorável, mas há situações específicas para investigar.');
  if (setor.controle >= cortes.controle && sinalControle) mistos.push('Resultado misto na autonomia: o geral é favorável, mas há situações específicas para investigar.');
  if (setor.apoio >= cortes.apoio && sinalApoio) mistos.push('Resultado misto no apoio: o geral é favorável, mas há situações específicas para investigar.');
  const insight = obterInsightJss(setor, cortes);
  const atencao = [...insight.fatores, ...mistos, ...insight.sinais].slice(0, 6);
  const grupos: Sugestao[] = [];
  if (setor.demanda >= cortes.demanda || sinalDemanda) grupos.push(...SUGESTOES.demanda);
  if (setor.controle < cortes.controle || sinalControle) grupos.push(...SUGESTOES.controle);
  if (setor.apoio < cortes.apoio || sinalApoio) grupos.push(...SUGESTOES.apoio);
  if (grupos.length === 0) grupos.push(...SUGESTOES.manutencao);
  return { fortes, atencao, sugestoes: grupos.slice(0, 4) };
}

async function avancarJornada(
  ciclo: LiderancaCiclo,
  destino: LiderancaEtapa,
  onAtualizar: () => Promise<void>,
) {
  const atual = ETAPAS.findIndex(e => e.id === ciclo.etapa);
  const novo = ETAPAS.findIndex(e => e.id === destino);
  if (ciclo.status !== 'ativo') return toast.error('Esta jornada já foi concluída.');
  if (novo !== atual + 1) return toast.error('Mova o cartão somente para o próximo marco.');

  let nota: string | undefined;
  if (destino === 'pratica_incorporada' || destino === 'evolucao_mantida') {
    const resposta = prompt(
      'Registre em uma frase o que foi observado ou aprendido neste marco:',
      ciclo.nota_evolucao ?? '',
    );
    if (resposta === null) return;
    if (!resposta.trim()) return toast.error('Registre o aprendizado para avançar.');
    nota = resposta.trim();
  }
  const res = await rhService.avancarLideranca(ciclo.id, destino, nota);
  if (!res.ok) return toast.error(res.error || 'Não foi possível avançar.');
  toast.success(`Marco alcançado: ${ETAPAS[novo].label}.`);
  await onAtualizar();
}

export const LiderancaEvolucao: React.FC<{
  setores: SetorEmpresa[];
  abrirNovo?: boolean;
  setorInicial?: string | null;
}> = ({ setores, abrirNovo = false, setorInicial = null }) => {
  const [ciclos, setCiclos] = useState<LiderancaCiclo[]>([]);
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [jss, setJss] = useState<Awaited<ReturnType<typeof rhService.getRelatorioJss>>>(null);
  const [who5, setWho5] = useState<Awaited<ReturnType<typeof rhService.getRelatorioPsicossocial>>>(null);
  const [loading, setLoading] = useState(true);
  const [novo, setNovo] = useState(abrirNovo);
  const [editando, setEditando] = useState(false);
  const [acao, setAcao] = useState<Sugestao | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    const fim = new Date();
    const inicioJss = new Date(); inicioJss.setMonth(inicioJss.getMonth() - 3);
    const inicioWho5 = new Date(); inicioWho5.setMonth(inicioWho5.getMonth() - 1);
    try {
      const [lista, relatorio, bemEstar] = await Promise.all([
        rhService.getLiderancaCiclos(),
        rhService.getRelatorioJss(inicioJss.toISOString().slice(0, 10), fim.toISOString().slice(0, 10)).catch(() => null),
        rhService.getRelatorioPsicossocial(inicioWho5.toISOString().slice(0, 10), fim.toISOString().slice(0, 10)).catch(() => null),
      ]);
      setCiclos(lista); setJss(relatorio); setWho5(bemEstar);
      setSelecionado(atual => atual && lista.some(c => c.id === atual) ? atual : null);
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Não foi possível carregar as jornadas.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void carregar(); }, [carregar]);

  const ciclo = ciclos.find(c => c.id === selecionado) ?? null;
  const setorJss = jss?.setores.find(s => s.setor === ciclo?.setor);
  const setorWho5 = who5?.setores.find(s => s.setor === ciclo?.setor);
  const leitura = useMemo(() => diagnostico(setorJss, jss?.cortes), [setorJss, jss?.cortes]);
  const mover = useCallback(async (item: LiderancaCiclo, destino: LiderancaEtapa) => {
    await avancarJornada(item, destino, carregar);
  }, [carregar]);

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

      {ciclos.length === 0
        ? <div className="rounded-xl bg-white p-10 text-center shadow"><Sparkles className="mx-auto h-9 w-9 text-gray-300" /><p className="mt-3 font-medium text-gray-600">Nenhuma jornada iniciada.</p><p className="mt-1 text-sm text-gray-400">Comece por um setor e leve sugestões práticas para a primeira conversa.</p></div>
        : <KanbanLideranca ciclos={ciclos} selecionado={selecionado} onSelecionar={setSelecionado} onMover={mover} />}

      {ciclo && <div className="fixed inset-0 z-40 flex justify-end bg-black/35" onMouseDown={() => setSelecionado(null)}><aside className="h-full w-full max-w-3xl overflow-y-auto bg-gray-50 p-4 shadow-2xl sm:p-6" onMouseDown={e => e.stopPropagation()}><div className="mb-3 flex justify-end"><button onClick={() => setSelecionado(null)} className="rounded-lg p-2 text-gray-400 hover:bg-white hover:text-gray-700" aria-label="Fechar detalhes"><X className="h-5 w-5" /></button></div><JornadaDetalhe ciclo={ciclo} sugestoes={leitura.sugestoes} who5={setorWho5} onEditar={() => setEditando(true)} onAcao={setAcao} onAtualizar={carregar} /></aside></div>}

      {novo && <CicloForm setores={setores} jss={jss} setorInicial={setorInicial} onClose={() => setNovo(false)} onSaved={async id => { setNovo(false); await carregar(); setSelecionado(id); }} />}
      {editando && ciclo && <PontosForm ciclo={ciclo} onClose={() => setEditando(false)} onSaved={() => { setEditando(false); void carregar(); }} />}
      {acao && ciclo && <AcaoForm ciclo={ciclo} sugestao={acao} onClose={() => setAcao(null)} onSaved={() => { setAcao(null); void carregar(); }} />}
    </div>
  );
};

const KanbanLideranca: React.FC<{
  ciclos: LiderancaCiclo[];
  selecionado: string | null;
  onSelecionar: (id: string) => void;
  onMover: (ciclo: LiderancaCiclo, destino: LiderancaEtapa) => Promise<void>;
}> = ({ ciclos, selecionado, onSelecionar, onMover }) => {
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [sobre, setSobre] = useState<LiderancaEtapa | null>(null);

  return <div>
    <div className="mb-2 flex items-center gap-2 text-xs text-gray-500">
      <GripVertical className="h-4 w-4" />
      Arraste um cartão para o próximo marco ou abra os detalhes para avançar.
    </div>
    <div className="-mx-1 overflow-x-auto pb-3">
      <div className="flex min-w-max gap-3 px-1">
        {ETAPAS.map((etapa, indice) => {
          const itens = ciclos.filter(c => c.etapa === etapa.id);
          return <section
            key={etapa.id}
            className={`w-[270px] rounded-xl border p-3 transition ${
              sobre === etapa.id ? 'border-[#7d4a3c] bg-[#7d4a3c]/5' : 'border-gray-200 bg-gray-100/70'
            }`}
            onDragOver={e => { e.preventDefault(); setSobre(etapa.id); }}
            onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setSobre(null); }}
            onDrop={e => {
              e.preventDefault();
              const id = e.dataTransfer.getData('text/plain') || arrastando;
              const item = ciclos.find(c => c.id === id);
              setSobre(null); setArrastando(null);
              if (item && item.etapa !== etapa.id) void onMover(item, etapa.id);
            }}
          >
            <header className="mb-3 flex items-center justify-between gap-2 px-1">
              <div><p className="text-sm font-semibold text-gray-800">{etapa.label}</p><p className="text-[11px] text-gray-400">Marco {indice + 1} de 5</p></div>
              <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-white px-1.5 text-xs font-semibold text-gray-500 shadow-sm">{itens.length}</span>
            </header>
            <div className="min-h-32 space-y-2">
              {itens.length === 0 && <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-gray-300 px-4 text-center text-xs text-gray-400">Solte aqui quando o requisito estiver pronto.</div>}
              {itens.map(ciclo => {
                const proximaAcao = [...ciclo.acoes]
                  .filter(a => a.status === 'planejada' || a.status === 'em_andamento')
                  .sort((a, b) => a.prazo.localeCompare(b.prazo))[0];
                const concluidas = ciclo.acoes.filter(a => a.status === 'concluida').length;
                return <button
                  key={ciclo.id}
                  type="button"
                  draggable={ciclo.status === 'ativo'}
                  aria-pressed={selecionado === ciclo.id}
                  onDragStart={e => {
                    setArrastando(ciclo.id);
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', ciclo.id);
                  }}
                  onDragEnd={() => { setArrastando(null); setSobre(null); }}
                  onClick={() => onSelecionar(ciclo.id)}
                  className={`w-full rounded-lg border bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow ${
                    selecionado === ciclo.id ? 'border-[#7d4a3c] ring-1 ring-[#7d4a3c]/20' : 'border-gray-200'
                  } ${arrastando === ciclo.id ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0"><p className="truncate text-sm font-semibold text-gray-800">{ciclo.setor}</p><p className="mt-0.5 truncate text-[11px] text-gray-500">RH: {ciclo.responsavel_rh}</p></div>
                    {ciclo.status === 'concluido' ? <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-green-600" /> : <GripVertical className="h-4 w-4 flex-shrink-0 cursor-grab text-gray-300" />}
                  </div>
                  {ciclo.pontos_fortes[0] && <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-green-700"><span className="font-semibold">Bom:</span> {ciclo.pontos_fortes[0]}</p>}
                  {ciclo.pontos_atencao[0] && <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-amber-700"><span className="font-semibold">Atenção:</span> {ciclo.pontos_atencao[0]}</p>}
                  <div className="mt-3 border-t border-gray-100 pt-2">
                    {proximaAcao
                      ? <div className="flex items-center justify-between gap-2 text-[11px]"><span className={proximaAcao.atrasada ? 'font-semibold text-red-600' : 'text-gray-500'}>{proximaAcao.status === 'em_andamento' ? 'Em prática' : 'Planejada'}</span><span className="inline-flex items-center gap-1 text-gray-400"><CalendarDays className="h-3 w-3" />{dataBr(proximaAcao.prazo)}</span></div>
                      : <p className="text-[11px] text-gray-400">{ciclo.acoes.length ? `${concluidas} combinado(s) concluído(s)` : 'Sem combinado ainda'}</p>}
                  </div>
                </button>;
              })}
            </div>
          </section>;
        })}
      </div>
    </div>
  </div>;
};

const JornadaDetalhe: React.FC<{
  ciclo: LiderancaCiclo; sugestoes: Sugestao[]; who5?: PsychosocialSetor; onEditar: () => void;
  onAcao: (s: Sugestao) => void; onAtualizar: () => Promise<void>;
}> = ({ ciclo, sugestoes, who5, onEditar, onAcao, onAtualizar }) => {
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
    await avancarJornada(ciclo, proxima.id, onAtualizar);
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
    <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <div><p className="text-sm font-semibold text-blue-900">Termômetro mensal de bem-estar</p><p className="mt-1 text-xs leading-relaxed text-blue-800">O WHO-5 ajuda o RH a acompanhar o ambiente entre um JSS e outro. Ele mostra como as pessoas estão, não prova a causa.</p></div>
        {who5 ? <div className="shrink-0 text-right"><p className="text-2xl font-bold text-blue-900">{who5.score_medio}</p><p className="text-[10px] uppercase tracking-wide text-blue-700">WHO-5 agregado</p></div> : <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[10px] font-medium text-blue-700">Sem recorte publicado</span>}
      </div>
    </div>
    {ciclo.status === 'ativo' && <button onClick={onEditar} className="text-xs font-semibold text-[#7d4a3c]">Editar pontos da conversa</button>}

    {ciclo.status === 'ativo' && <div className="rounded-xl bg-white p-5 shadow"><div className="flex items-center gap-2"><Lightbulb className="h-5 w-5 text-amber-500" /><h4 className="font-semibold text-gray-800">Ideias práticas</h4></div><p className="mt-1 text-xs text-gray-500">Sugestões curtas para o RH adaptar junto com o gestor.</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{sugestoes.map((s,i) => <div key={`${s.titulo}-${i}`} className="rounded-lg border p-3"><p className="text-sm font-semibold text-gray-800">{s.titulo}</p><p className="mt-1 text-xs leading-relaxed text-gray-500">{s.medida}</p><button onClick={() => onAcao(s)} className="mt-2 text-xs font-semibold text-[#7d4a3c]">Usar esta ideia</button></div>)}</div><button onClick={() => onAcao({ fator:'outro', titulo:'Ação personalizada', objetivo:'', medida:'', nivel:'organizacional' })} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#7d4a3c]"><Plus className="h-3.5 w-3.5" /> Criar outra ação</button></div>}

    <div className="rounded-xl bg-white p-5 shadow"><h4 className="font-semibold text-gray-800">Combinados com a liderança</h4>{ciclo.acoes.length === 0 ? <p className="mt-3 text-sm text-gray-400">Nenhum combinado registrado.</p> : <div className="mt-3 space-y-2">{ciclo.acoes.map(a => <div key={a.id} className="rounded-lg border p-3"><div className="flex items-start justify-between gap-3"><div><p className="text-sm text-gray-800">{a.medida}</p><p className="mt-1 text-xs text-gray-500">{a.responsavel} · até {dataBr(a.prazo)}</p>{a.evidencia && <p className="mt-1 text-xs text-green-700">Evidência: {a.evidencia}</p>}</div><span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${a.status==='concluida'?'bg-green-100 text-green-700':a.status==='em_andamento'?'bg-blue-50 text-blue-700':a.status==='cancelada'?'bg-gray-100 text-gray-400':'bg-gray-100 text-gray-600'}`}>{a.status==='concluida'?'Concluído':a.status==='em_andamento'?'Em prática':a.status==='cancelada'?'Cancelado':'Planejado'}</span></div>{ciclo.status === 'ativo' && a.status==='planejada' && <button onClick={() => statusAcao(a.id,'em_andamento')} className="mt-2 text-xs font-semibold text-[#7d4a3c]">Iniciar ação</button>}{ciclo.status === 'ativo' && a.status==='em_andamento' && <button onClick={() => statusAcao(a.id,'concluida')} className="mt-2 text-xs font-semibold text-green-700">Concluir com evidência</button>}</div>)}</div>}</div>
  </div>;
};

const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" onMouseDown={onClose}><div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-xl" onMouseDown={e => e.stopPropagation()}><div className="flex items-center justify-between border-b p-5"><h3 className="font-bold text-gray-900">{title}</h3><button onClick={onClose}><X className="h-5 w-5 text-gray-400" /></button></div>{children}</div></div>;

const CicloForm: React.FC<{ setores:SetorEmpresa[]; jss:Awaited<ReturnType<typeof rhService.getRelatorioJss>>; setorInicial?:string|null; onClose:()=>void; onSaved:(id:string)=>void }> = ({ setores,jss,setorInicial,onClose,onSaved }) => {
  const fimPadrao=new Date();fimPadrao.setMonth(fimPadrao.getMonth()+3);
  const [setor,setSetor]=useState(setorInicial??'');const [fim,setFim]=useState(fimPadrao.toISOString().slice(0,10));const [rh,setRh]=useState('');const [fortes,setFortes]=useState('');const [atencao,setAtencao]=useState('');const [saving,setSaving]=useState(false);
  const preencher=()=>{const d=diagnostico(jss?.setores.find(s=>s.setor===setor),jss?.cortes);setFortes(d.fortes.join('\n'));setAtencao(d.atencao.join('\n'));};
  useEffect(()=>{if(!setorInicial)return;const d=diagnostico(jss?.setores.find(s=>s.setor===setorInicial),jss?.cortes);setFortes(d.fortes.join('\n'));setAtencao(d.atencao.join('\n'));},[jss,setorInicial]);
  const salvar=async()=>{setSaving(true);const res=await rhService.criarLiderancaCiclo({setor,fim,responsavelRh:rh,pontosFortes:linhas(fortes),pontosAtencao:linhas(atencao)});setSaving(false);if(!res.ok||!res.id)return toast.error(res.error||'Não foi possível iniciar.');toast.success('Jornada iniciada.');onSaved(res.id);};
  return <Modal title="Iniciar jornada de liderança" onClose={onClose}><div className="space-y-4 p-5"><label className="block text-sm font-medium">Setor<select className={`${input} mt-1`} value={setor} onChange={e=>setSetor(e.target.value)}><option value="">Escolha...</option>{setores.map(s=><option key={s.setor}>{s.setor}</option>)}</select></label>{setor&&<button onClick={preencher} className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#7d4a3c]"><RefreshCw className="h-3.5 w-3.5" /> Usar diagnóstico agregado atual</button>}<label className="block text-sm font-medium">O que está funcionando<textarea className={`${input} mt-1`} rows={3} value={fortes} onChange={e=>setFortes(e.target.value)} placeholder="Um ponto por linha" /></label><label className="block text-sm font-medium">O que precisa melhorar<textarea className={`${input} mt-1`} rows={3} value={atencao} onChange={e=>setAtencao(e.target.value)} placeholder="Um ponto por linha" /></label><div className="grid gap-3 sm:grid-cols-2"><label className="block text-sm font-medium">Responsável do RH<input className={`${input} mt-1`} value={rh} onChange={e=>setRh(e.target.value)} /></label><label className="block text-sm font-medium">Fim do ciclo<input type="date" className={`${input} mt-1`} value={fim} onChange={e=>setFim(e.target.value)} /></label></div><p className="text-xs text-gray-500">Esses textos podem ser ajustados junto com o gestor. Nenhuma nota ou quantidade de respostas será levada ao resumo.</p></div><div className="flex justify-end gap-2 border-t p-5"><button onClick={onClose} className="px-4 py-2 text-sm">Cancelar</button><button disabled={saving} onClick={salvar} className="rounded-lg bg-[#7d4a3c] px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving?'Salvando...':'Iniciar jornada'}</button></div></Modal>;
};

const PontosForm: React.FC<{ ciclo:LiderancaCiclo;onClose:()=>void;onSaved:()=>void }> = ({ciclo,onClose,onSaved}) => {const[fortes,setFortes]=useState(ciclo.pontos_fortes.join('\n'));const[atencao,setAtencao]=useState(ciclo.pontos_atencao.join('\n'));const[rh,setRh]=useState(ciclo.responsavel_rh);const[fim,setFim]=useState(ciclo.fim);const salvar=async()=>{const res=await rhService.atualizarLiderancaPontos({id:ciclo.id,fim,responsavelRh:rh,pontosFortes:linhas(fortes),pontosAtencao:linhas(atencao)});if(!res.ok)return toast.error(res.error||'Não foi possível salvar.');toast.success('Pontos atualizados.');onSaved();};return <Modal title="Pontos da conversa" onClose={onClose}><div className="space-y-4 p-5"><label className="block text-sm font-medium">O que está funcionando<textarea className={`${input} mt-1`} rows={4} value={fortes} onChange={e=>setFortes(e.target.value)} /></label><label className="block text-sm font-medium">O que precisa melhorar<textarea className={`${input} mt-1`} rows={4} value={atencao} onChange={e=>setAtencao(e.target.value)} /></label><div className="grid gap-3 sm:grid-cols-2"><label className="block text-sm font-medium">Responsável do RH<input className={`${input} mt-1`} value={rh} onChange={e=>setRh(e.target.value)} /></label><label className="block text-sm font-medium">Fim do ciclo<input type="date" className={`${input} mt-1`} value={fim} onChange={e=>setFim(e.target.value)} /></label></div></div><div className="flex justify-end gap-2 border-t p-5"><button onClick={onClose} className="px-4 py-2 text-sm">Cancelar</button><button onClick={salvar} className="rounded-lg bg-[#7d4a3c] px-5 py-2 text-sm font-semibold text-white">Salvar</button></div></Modal>;};

const AcaoForm: React.FC<{ciclo:LiderancaCiclo;sugestao:Sugestao;onClose:()=>void;onSaved:()=>void}> = ({ciclo,sugestao,onClose,onSaved}) => {const prazoPadrao=new Date();prazoPadrao.setMonth(prazoPadrao.getMonth()+1);const[objetivo,setObjetivo]=useState(sugestao.objetivo);const[medida,setMedida]=useState(sugestao.medida);const[responsavel,setResponsavel]=useState('Gestor do setor');const[prazo,setPrazo]=useState(prazoPadrao.toISOString().slice(0,10));const[saving,setSaving]=useState(false);const salvar=async()=>{setSaving(true);const res=await rhService.adicionarLiderancaAcao({cicloId:ciclo.id,fator:sugestao.fator,objetivo,medida,nivelControle:sugestao.nivel,responsavel,prazo});setSaving(false);if(!res.ok)return toast.error(res.error||'Não foi possível registrar.');toast.success('Combinado adicionado ao plano de ação.');onSaved();};return <Modal title={`Novo combinado — ${ciclo.setor}`} onClose={onClose}><div className="space-y-4 p-5"><label className="block text-sm font-medium">Objetivo<textarea className={`${input} mt-1`} rows={2} value={objetivo} onChange={e=>setObjetivo(e.target.value)} /></label><label className="block text-sm font-medium">Ação combinada<textarea className={`${input} mt-1`} rows={3} value={medida} onChange={e=>setMedida(e.target.value)} /></label><div className="grid gap-3 sm:grid-cols-2"><label className="block text-sm font-medium">Responsável<input className={`${input} mt-1`} value={responsavel} onChange={e=>setResponsavel(e.target.value)} /></label><label className="block text-sm font-medium">Prazo<input type="date" className={`${input} mt-1`} value={prazo} onChange={e=>setPrazo(e.target.value)} /></label></div><p className="text-xs text-gray-500">O combinado também será registrado no Plano de Ação formal, com prazo e evidência.</p></div><div className="flex justify-end gap-2 border-t p-5"><button onClick={onClose} className="px-4 py-2 text-sm">Cancelar</button><button disabled={saving} onClick={salvar} className="rounded-lg bg-[#7d4a3c] px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving?'Salvando...':'Adicionar combinado'}</button></div></Modal>;};
