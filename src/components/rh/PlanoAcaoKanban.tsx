import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, ArrowRight, Bell, CalendarClock, CalendarDays, Check, CheckCircle2, Clipboard,
  ClipboardList, Clock3, GripVertical, History, Lightbulb, Plus, RefreshCw, Sparkles, Target,
  ThumbsUp, Trash2, UsersRound, X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  rhService, type LiderancaCiclo,
  type LiderancaEtapa, type LiderancaVerificacaoResultado, type PlanoAcao, type PlanoFator,
  type PlanoNivel, type PlanoStatus, type PsychosocialSetor, type SetorEmpresa,
} from '../../services/empresaService';
import { gerarDiagnostico, type Sugestao } from '../../lib/planoSugestoes';
import { FATOR_LABEL, FATORES, NIVEIS, NIVEL_LABEL, STATUS_INFO } from '../../lib/planoAcaoLabels';

const ETAPAS: { id: LiderancaEtapa; label: string; curto: string }[] = [
  { id: 'iniciada', label: 'Jornada iniciada', curto: 'Início' },
  { id: 'plano_definido', label: 'Plano definido', curto: 'Plano' },
  { id: 'em_acao', label: 'Ação em prática', curto: 'Ação' },
  { id: 'pratica_incorporada', label: 'Prática incorporada', curto: 'Prática' },
  { id: 'evolucao_mantida', label: 'Evolução mantida', curto: 'Evolução' },
];

const input = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-[#7d4a3c]';
const linhas = (texto: string) => texto.split('\n').map(x => x.trim()).filter(Boolean);
const dataBr = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString('pt-BR');
const hojeIso = () => new Date().toISOString().slice(0, 10);
const somarDias = (dias: number, limite?: string) => {
  const data = new Date(); data.setDate(data.getDate() + dias);
  const valor = data.toISOString().slice(0, 10);
  return limite && valor > limite ? limite : valor;
};

function estadoMarco(ciclo: LiderancaCiclo) {
  if (ciclo.status === 'concluido') return { tipo: 'concluido', label: 'Ciclo concluído', classe: '!border-l-green-500 bg-green-50/40', texto: 'text-green-700', alerta: false };
  if (ciclo.marco_status === 'verificado') return { tipo: 'verificado', label: 'Verificado · pronto para avançar', classe: '!border-l-blue-500 bg-blue-50/40', texto: 'text-blue-700', alerta: true };
  const prazo = ciclo.marco_prazo || ciclo.fim;
  const dias = Math.ceil((new Date(`${prazo}T00:00:00`).getTime() - new Date(`${hojeIso()}T00:00:00`).getTime()) / 86400000);
  if (dias < 0) return { tipo: 'atrasado', label: `Verificação atrasada há ${Math.abs(dias)} dia(s)`, classe: '!border-l-red-500 bg-red-50/40', texto: 'text-red-700', alerta: true };
  if (dias === 0) return { tipo: 'hoje', label: 'Verificar hoje', classe: '!border-l-amber-500 bg-amber-50/50', texto: 'text-amber-700', alerta: true };
  if (dias <= 7) return { tipo: 'proximo', label: `Verificar em ${dias} dia(s)`, classe: '!border-l-amber-400 bg-amber-50/40', texto: 'text-amber-700', alerta: true };
  return { tipo: 'em_dia', label: 'Acompanhamento em dia', classe: '!border-l-gray-300 bg-white', texto: 'text-gray-500', alerta: false };
}

export const PlanoAcaoKanban: React.FC<{
  setores: SetorEmpresa[];
  abrirNovo?: boolean;
  setorInicial?: string | null;
  /** Ciclo a abrir já selecionado. É por aqui que uma medida do plano de
   *  ação leva de volta à conversa que a originou. */
  cicloFoco?: string | null;
  /** Abre o formulário de ação geral pré-preenchido — usado pelo deep link
   *  do Copiloto do RH (?novaAcao=1&setor=&fator=&medida=&nivel=&risco=). */
  novaAcaoInicial?: boolean;
  novaAcaoSetorInicial?: string | null;
  novaAcaoFatorInicial?: PlanoFator | null;
  novaAcaoRiscoInicial?: string | null;
  novaAcaoMedidaInicial?: string | null;
  novaAcaoNivelInicial?: PlanoNivel | null;
}> = ({
  setores, abrirNovo = false, setorInicial = null, cicloFoco = null,
  novaAcaoInicial = false, novaAcaoSetorInicial = null, novaAcaoFatorInicial = null,
  novaAcaoRiscoInicial = null, novaAcaoMedidaInicial = null, novaAcaoNivelInicial = null,
}) => {
  const [ciclos, setCiclos] = useState<LiderancaCiclo[]>([]);
  const [planos, setPlanos] = useState<PlanoAcao[]>([]);
  const [selecionado, setSelecionado] = useState<string | null>(cicloFoco);
  const [acaoSelecionada, setAcaoSelecionada] = useState<string | null>(null);
  const [jss, setJss] = useState<Awaited<ReturnType<typeof rhService.getRelatorioJss>>>(null);
  const [who5, setWho5] = useState<Awaited<ReturnType<typeof rhService.getRelatorioPsicossocial>>>(null);
  const [loading, setLoading] = useState(true);
  const [novo, setNovo] = useState(abrirNovo);
  const [novaAcao, setNovaAcao] = useState(novaAcaoInicial);
  // Um botão só, com a escolha explicada no momento em que ela é feita.
  // Dois botões lado a lado exigiam saber de antemão que uma jornada CONTÉM
  // ações — e sem isso as duas pareciam a mesma coisa.
  const [escolhendo, setEscolhendo] = useState(false);
  const [editando, setEditando] = useState(false);
  const [acao, setAcao] = useState<Sugestao | null>(null);
  const [verificando, setVerificando] = useState<LiderancaCiclo | null>(null);
  const [transicao, setTransicao] = useState<{ ciclo: LiderancaCiclo; destino: LiderancaEtapa } | null>(null);

  // O foco pode chegar depois da montagem (o RH clica no selo de uma medida
  // já estando nesta tela), então não basta o valor inicial do useState.
  useEffect(() => { if (cicloFoco) setSelecionado(cicloFoco); }, [cicloFoco]);

  const carregar = useCallback(async () => {
    setLoading(true);
    const fim = new Date();
    const inicioJss = new Date(); inicioJss.setMonth(inicioJss.getMonth() - 3);
    const inicioWho5 = new Date(); inicioWho5.setMonth(inicioWho5.getMonth() - 1);
    try {
      const [lista, relatorio, bemEstar, itensPlano] = await Promise.all([
        rhService.getLiderancaCiclos(),
        rhService.getRelatorioJss(inicioJss.toISOString().slice(0, 10), fim.toISOString().slice(0, 10)).catch(() => null),
        rhService.getRelatorioPsicossocial(inicioWho5.toISOString().slice(0, 10), fim.toISOString().slice(0, 10)).catch(() => null),
        rhService.getPlanosAcao().catch(() => []),
      ]);
      setCiclos(lista); setJss(relatorio); setWho5(bemEstar); setPlanos(itensPlano);
      setSelecionado(atual => atual && lista.some(c => c.id === atual) ? atual : null);
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Não foi possível carregar o plano de ação.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void carregar(); }, [carregar]);

  // Ações sem jornada de liderança associada — a coluna "Ações gerais" do
  // quadro. Tudo que nasce dentro de um ciclo já vem embutido em `ciclo.acoes`.
  const acoesGerais = useMemo(() => planos.filter(p => !p.lideranca_ciclo_id), [planos]);
  const acaoAtual = acoesGerais.find(a => a.id === acaoSelecionada) ?? null;

  const ciclo = ciclos.find(c => c.id === selecionado) ?? null;
  const setorJss = jss?.setores.find(s => s.setor === ciclo?.setor);
  const setorWho5 = who5?.setores.find(s => s.setor === ciclo?.setor);
  const leitura = useMemo(() => gerarDiagnostico(setorJss, jss?.cortes, setorWho5), [setorJss, jss?.cortes, setorWho5]);
  const mover = useCallback(async (item: LiderancaCiclo, destino: LiderancaEtapa) => {
    const atual = ETAPAS.findIndex(e => e.id === item.etapa);
    const novoIndice = ETAPAS.findIndex(e => e.id === destino);
    if (item.status !== 'ativo') { toast.error('Esta jornada já foi concluída.'); return; }
    if (novoIndice !== atual + 1) { toast.error('Mova o cartão somente para o próximo marco.'); return; }
    if (item.marco_status !== 'verificado') { toast.error('Verifique o combinado deste marco antes de avançar.'); return; }
    setTransicao({ ciclo: item, destino });
  }, []);

  const mudarStatusAcaoGeral = useCallback(async (item: PlanoAcao, status: PlanoStatus) => {
    let evidencia: string | undefined;
    if (status === 'concluida') {
      const resp = prompt(
        'O que comprova que esta medida foi executada?\n' +
        '(ex.: ata da reunião de 12/08, nova escala publicada, turma treinada em 03/09)',
        item.evidencia ?? '',
      );
      if (resp === null) return;
      if (!resp.trim()) { toast.error('Sem evidência não dá para concluir o item.'); return; }
      evidencia = resp.trim();
    }
    const res = await rhService.atualizarPlanoAcao(item.id, status, evidencia);
    if (!res.ok) { toast.error(res.error || 'Não foi possível atualizar.'); return; }
    toast.success('Item atualizado.');
    await carregar();
  }, [carregar]);

  const excluirAcaoGeral = useCallback(async (item: PlanoAcao) => {
    if (!confirm('Excluir este item do plano de ação?')) return;
    const res = await rhService.excluirPlanoAcao(item.id);
    if (!res.ok) { toast.error(res.error || 'Não foi possível excluir.'); return; }
    setAcaoSelecionada(null);
    await carregar();
  }, [carregar]);

  const alertas = ciclos.filter(c => estadoMarco(c).alerta && c.status === 'ativo');

  if (loading) return <div className="flex h-56 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[#7d4a3c] border-t-transparent" /></div>;

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-[#7d4a3c]/20 bg-[#7d4a3c]/5 p-4">
        <div className="flex items-start gap-3"><UsersRound className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#7d4a3c]" /><div><p className="text-sm font-semibold text-gray-800">Um quadro só para o plano de ação</p><p className="mt-1 text-xs leading-relaxed text-gray-600">Ações gerais e jornadas de liderança convivem aqui. Não existe ranking entre setores — o RH usa este espaço para reconhecer o que está bom, combinar melhorias e acompanhar execução. Nenhuma resposta individual ou relato confidencial aparece aqui.</p></div></div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-lg font-semibold text-gray-800">Plano de ação</h2><p className="text-sm text-gray-500">Escolha um cartão para ver os detalhes ou registre algo novo.</p></div>
        <button onClick={() => setEscolhendo(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-[#7d4a3c] px-4 py-2 text-sm font-semibold text-white"><Plus className="h-4 w-4" /> Adicionar</button>
      </div>

      {alertas.length > 0 && <button onClick={() => setSelecionado(alertas[0].id)} className="flex w-full items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left">
        <Bell className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <span><span className="block text-sm font-semibold text-amber-900">{alertas.length} acompanhamento(s) pedem atenção do RH</span><span className="mt-0.5 block text-xs text-amber-800">Abra o primeiro cartão para verificar o combinado ou definir a próxima data. Isso não é uma nota para o gestor.</span></span>
      </button>}

      <KanbanPlano
        ciclos={ciclos}
        acoesGerais={acoesGerais}
        selecionado={selecionado}
        selecionadoAcao={acaoSelecionada}
        onSelecionar={setSelecionado}
        onSelecionarAcao={setAcaoSelecionada}
        onMover={mover}
      />

      {ciclo && <div className="fixed inset-0 z-40 flex justify-end bg-black/35" onMouseDown={() => setSelecionado(null)}><aside className="h-full w-full max-w-3xl overflow-y-auto bg-gray-50 p-4 shadow-2xl sm:p-6" onMouseDown={e => e.stopPropagation()}><div className="mb-3 flex items-center justify-end">
        <button onClick={() => setSelecionado(null)} className="rounded-lg p-2 text-gray-400 hover:bg-white hover:text-gray-700" aria-label="Fechar detalhes"><X className="h-5 w-5" /></button></div><JornadaDetalhe ciclo={ciclo} sugestoes={leitura.sugestoes} who5={setorWho5} onEditar={() => setEditando(true)} onAcao={setAcao} onVerificar={() => setVerificando(ciclo)} onAvancar={destino => setTransicao({ ciclo, destino })} onAtualizar={carregar} /></aside></div>}

      {acaoAtual && <AcaoGeralDetalhe item={acaoAtual} onFechar={() => setAcaoSelecionada(null)} onStatus={mudarStatusAcaoGeral} onExcluir={excluirAcaoGeral} />}

      {escolhendo && <EscolhaTipo
        onMedida={() => { setEscolhendo(false); setNovaAcao(true); }}
        onJornada={() => { setEscolhendo(false); setNovo(true); }}
        onClose={() => setEscolhendo(false)}
      />}

      {novo && <CicloForm setores={setores} jss={jss} setorInicial={setorInicial} onClose={() => setNovo(false)} onSaved={async id => { setNovo(false); await carregar(); setSelecionado(id); }} />}
      {editando && ciclo && <PontosForm ciclo={ciclo} onClose={() => setEditando(false)} onSaved={() => { setEditando(false); void carregar(); }} />}
      {acao && ciclo && <AcaoForm ciclo={ciclo} sugestao={acao} onClose={() => setAcao(null)} onSaved={() => { setAcao(null); void carregar(); }} />}
      {verificando && <VerificacaoForm ciclo={verificando} onClose={() => setVerificando(null)} onSaved={() => { setVerificando(null); void carregar(); }} />}
      {transicao && <PrazoMarcoForm ciclo={transicao.ciclo} destino={transicao.destino} onClose={() => setTransicao(null)} onSaved={() => { setTransicao(null); void carregar(); }} />}
      {novaAcao && <NovaAcaoGeralForm
        setores={setores} jss={jss} who5={who5}
        setorInicial={novaAcaoSetorInicial} fatorInicial={novaAcaoFatorInicial}
        riscoInicial={novaAcaoRiscoInicial} medidaInicial={novaAcaoMedidaInicial}
        nivelInicial={novaAcaoNivelInicial}
        onClose={() => setNovaAcao(false)}
        onSaved={async () => { setNovaAcao(false); await carregar(); }}
      />}
    </div>
  );
};

const KanbanPlano: React.FC<{
  ciclos: LiderancaCiclo[];
  acoesGerais: PlanoAcao[];
  selecionado: string | null;
  selecionadoAcao: string | null;
  onSelecionar: (id: string) => void;
  onSelecionarAcao: (id: string) => void;
  onMover: (ciclo: LiderancaCiclo, destino: LiderancaEtapa) => Promise<void>;
}> = ({ ciclos, acoesGerais, selecionado, selecionadoAcao, onSelecionar, onSelecionarAcao, onMover }) => {
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [sobre, setSobre] = useState<LiderancaEtapa | null>(null);

  return <div>
    <div className="mb-2 flex items-center gap-2 text-xs text-gray-500">
      <GripVertical className="h-4 w-4" />
      Depois de verificar o combinado, arraste o cartão de jornada para o próximo marco ou abra os detalhes.
    </div>
    <div className="-mx-1 overflow-x-auto pb-3">
      <div className="flex min-w-max gap-3 px-1">
        <section className="w-[270px] shrink-0 rounded-xl border border-gray-200 bg-gray-100/70 p-3">
          <header className="mb-3 flex items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-1.5"><ClipboardList className="h-3.5 w-3.5 text-gray-400" /><div><p className="text-sm font-semibold text-gray-800">Ações gerais</p><p className="text-[11px] text-gray-400">Sem jornada de liderança</p></div></div>
            <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-white px-1.5 text-xs font-semibold text-gray-500 shadow-sm">{acoesGerais.length}</span>
          </header>
          <div className="min-h-32 space-y-2">
            {acoesGerais.length === 0 && <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-gray-300 px-4 text-center text-xs text-gray-400">Nenhuma ação avulsa registrada.</div>}
            {acoesGerais.map(item => {
              const info = STATUS_INFO[item.status];
              return <button
                key={item.id}
                type="button"
                aria-pressed={selecionadoAcao === item.id}
                onClick={() => onSelecionarAcao(item.id)}
                className={`w-full rounded-lg border border-l-4 p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow ${
                  item.atrasada ? '!border-l-red-400 bg-red-50/40' : item.status === 'concluida' ? '!border-l-green-400 bg-green-50/40' : 'border-l-transparent bg-white'
                } ${selecionadoAcao === item.id ? 'border-[#7d4a3c] ring-1 ring-[#7d4a3c]/20' : 'border-gray-200'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-gray-800">{item.setor ?? 'Toda a empresa'}</p>
                  <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${info.cls}`}>{info.label}</span>
                </div>
                <p className="mt-0.5 text-[11px] text-gray-500">{FATOR_LABEL[item.fator]}</p>
                <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-gray-600">{item.risco_descricao}</p>
                <div className="mt-2 flex items-center justify-between gap-2 text-[11px]">
                  <span className={item.atrasada ? 'font-semibold text-red-600' : 'text-gray-400'}>{item.atrasada ? 'Fora do prazo' : `prazo ${dataBr(item.prazo)}`}</span>
                </div>
              </button>;
            })}
          </div>
        </section>

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
                const marco = estadoMarco(ciclo);
                const proximaAcao = [...ciclo.acoes]
                  .filter(a => a.status === 'planejada' || a.status === 'em_andamento')
                  .sort((a, b) => a.prazo.localeCompare(b.prazo))[0];
                const concluidas = ciclo.acoes.filter(a => a.status === 'concluida').length;
                return <button
                  key={ciclo.id}
                  type="button"
                  draggable={ciclo.status === 'ativo' && ciclo.marco_status === 'verificado'}
                  aria-pressed={selecionado === ciclo.id}
                  onDragStart={e => {
                    setArrastando(ciclo.id);
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', ciclo.id);
                  }}
                  onDragEnd={() => { setArrastando(null); setSobre(null); }}
                  onClick={() => onSelecionar(ciclo.id)}
                  className={`w-full rounded-lg border border-l-4 p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow ${marco.classe} ${
                    selecionado === ciclo.id ? 'border-[#7d4a3c] ring-1 ring-[#7d4a3c]/20' : 'border-gray-200'
                  } ${arrastando === ciclo.id ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0"><p className="truncate text-sm font-semibold text-gray-800">{ciclo.setor}</p><p className="mt-0.5 truncate text-[11px] text-gray-500">RH: {ciclo.responsavel_rh}</p></div>
                    {ciclo.status === 'concluido' ? <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-green-600" /> : ciclo.marco_status === 'verificado' ? <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-blue-600" /> : <GripVertical className="h-4 w-4 flex-shrink-0 cursor-grab text-gray-300" />}
                  </div>
                  {ciclo.pontos_fortes[0] && <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-green-700"><span className="font-semibold">Bom:</span> {ciclo.pontos_fortes[0]}</p>}
                  {ciclo.pontos_atencao[0] && <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-amber-700"><span className="font-semibold">Atenção:</span> {ciclo.pontos_atencao[0]}</p>}
                  <div className="mt-3 border-t border-gray-100 pt-2">
                    <div className={`mb-2 flex items-center justify-between gap-2 text-[11px] font-semibold ${marco.texto}`}><span>{marco.label}</span><span className="inline-flex shrink-0 items-center gap-1"><CalendarDays className="h-3 w-3" />{dataBr(ciclo.marco_prazo || ciclo.fim)}</span></div>
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

const AcaoGeralDetalhe: React.FC<{
  item: PlanoAcao;
  onFechar: () => void;
  onStatus: (item: PlanoAcao, status: PlanoStatus) => Promise<void>;
  onExcluir: (item: PlanoAcao) => Promise<void>;
}> = ({ item, onFechar, onStatus, onExcluir }) => {
  const info = STATUS_INFO[item.status];
  return <div className="fixed inset-0 z-40 flex justify-end bg-black/35" onMouseDown={onFechar}>
    <aside className="h-full w-full max-w-lg overflow-y-auto bg-gray-50 p-4 shadow-2xl sm:p-6" onMouseDown={e => e.stopPropagation()}>
      <div className="mb-3 flex items-center justify-end"><button onClick={onFechar} className="rounded-lg p-2 text-gray-400 hover:bg-white hover:text-gray-700" aria-label="Fechar detalhes"><X className="h-5 w-5" /></button></div>
      <div className="rounded-xl bg-white p-5 shadow">
        <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400">Ação geral</p>
            <h3 className="text-xl font-bold text-gray-800">{item.setor ?? 'Toda a empresa'}</h3>
            <p className="mt-1 text-xs text-gray-500">{FATOR_LABEL[item.fator]} · {NIVEL_LABEL[item.nivel_controle]}</p>
          </div>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${info.cls}`}>{info.label}</span>
        </div>
        {item.atrasada && <p className="mb-2 inline-flex items-center gap-1 rounded bg-red-50 px-1.5 py-0.5 text-[11px] font-medium text-red-600"><CalendarClock className="h-3 w-3" /> Fora do prazo</p>}
        <p className="text-sm leading-relaxed text-gray-800">{item.risco_descricao}</p>
        <p className="mt-2 text-sm leading-relaxed text-gray-600"><span className="text-gray-400">Medida:</span> {item.medida}</p>
        <p className="mt-2 text-xs text-gray-400">{item.responsavel} · prazo {dataBr(item.prazo)}{item.concluida_em && ` · concluída em ${dataBr(item.concluida_em)}`}</p>
        {item.evidencia && <p className="mt-2 rounded-lg bg-gray-50 px-2.5 py-1.5 text-xs leading-snug text-gray-500"><span className="text-gray-400">Evidência:</span> {item.evidencia}</p>}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {item.status === 'planejada' && <button onClick={() => onStatus(item, 'em_andamento')} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">Iniciar</button>}
          {(item.status === 'planejada' || item.status === 'em_andamento') && <>
            <button onClick={() => onStatus(item, 'concluida')} className="rounded-lg bg-[#7d4a3c] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#623a2f]">Concluir com evidência</button>
            <button onClick={() => onStatus(item, 'cancelada')} className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-400 hover:bg-gray-50">Cancelar</button>
          </>}
          <button onClick={() => onExcluir(item)} className="ml-auto inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /> Excluir</button>
        </div>
      </div>
    </aside>
  </div>;
};

const JornadaDetalhe: React.FC<{
  ciclo: LiderancaCiclo; sugestoes: Sugestao[]; who5?: PsychosocialSetor; onEditar: () => void;
  onAcao: (s: Sugestao) => void; onVerificar: () => void; onAvancar: (destino: LiderancaEtapa) => void;
  onAtualizar: () => Promise<void>;
}> = ({ ciclo, sugestoes, who5, onEditar, onAcao, onVerificar, onAvancar, onAtualizar }) => {
  const indice = ETAPAS.findIndex(e => e.id === ciclo.etapa);
  const proxima = ETAPAS[indice + 1];
  const temAcao = ciclo.acoes.some(a => a.status !== 'cancelada');
  const temAcaoIniciada = ciclo.acoes.some(a => a.status === 'em_andamento' || a.status === 'concluida');
  const temAcaoConcluida = ciclo.acoes.some(a => a.status === 'concluida');
  const requisitoPronto = !proxima
    ? false
    : proxima.id === 'plano_definido'
      ? temAcao
      : proxima.id === 'em_acao'
        ? temAcaoIniciada
      : temAcaoConcluida;
  const podeAvancar = requisitoPronto && ciclo.marco_status === 'verificado';
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
        ? <button onClick={() => onAvancar(proxima.id)} className="mx-auto mt-4 flex items-center gap-1.5 text-xs font-semibold text-[#7d4a3c]">Avançar para “{proxima.label}” <ArrowRight className="h-3.5 w-3.5" /></button>
        : <p className="mt-4 text-center text-xs text-gray-500">{ciclo.marco_status !== 'verificado' ? 'Verifique este marco antes de avançar.' : orientacao}</p>)}
    </div>

    <MarcoAcompanhamento ciclo={ciclo} onVerificar={onVerificar} />

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

const RESULTADOS: { id: LiderancaVerificacaoResultado; label: string; ajuda: string }[] = [
  { id: 'realizado', label: 'Combinado realizado', ajuda: 'Confirma este marco e libera o próximo passo.' },
  { id: 'parcial', label: 'Realizado em parte', ajuda: 'Registra o avanço e agenda uma nova checagem.' },
  { id: 'nao_realizado', label: 'Ainda não realizado', ajuda: 'Registra o motivo e combina uma nova data.' },
  { id: 'nao_verificado', label: 'Não foi possível verificar', ajuda: 'Mantém o marco e agenda outra conversa.' },
];

const MarcoAcompanhamento: React.FC<{ ciclo: LiderancaCiclo; onVerificar: () => void }> = ({ ciclo, onVerificar }) => {
  const marco = estadoMarco(ciclo);
  return <div className={`rounded-xl border border-l-4 p-4 ${marco.classe}`}>
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
      <div className="flex min-w-0 gap-3">
        {marco.tipo === 'atrasado' ? <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" /> : marco.tipo === 'concluido' || marco.tipo === 'verificado' ? <CheckCircle2 className={`mt-0.5 h-5 w-5 shrink-0 ${marco.texto}`} /> : <Clock3 className={`mt-0.5 h-5 w-5 shrink-0 ${marco.texto}`} />}
        <div><p className={`text-sm font-semibold ${marco.texto}`}>{marco.label}</p><p className="mt-1 text-xs leading-relaxed text-gray-600">Prazo combinado com a liderança: <strong>{dataBr(ciclo.marco_prazo || ciclo.fim)}</strong>. A cor serve para lembrar o RH de conversar e checar; não avalia o gestor.</p>{ciclo.marco_nota && <p className="mt-2 text-xs text-gray-600"><span className="font-semibold">Último registro:</span> {ciclo.marco_nota}</p>}</div>
      </div>
      {ciclo.status === 'ativo' && ciclo.marco_status === 'pendente' && <button onClick={onVerificar} className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[#7d4a3c] px-3 py-2 text-xs font-semibold text-white"><Check className="h-3.5 w-3.5" /> Verificar combinado</button>}
    </div>
    {ciclo.historico_marcos?.length > 0 && <details className="mt-3 border-t border-black/5 pt-3">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 text-xs font-semibold text-gray-600 [&::-webkit-details-marker]:hidden"><History className="h-3.5 w-3.5" /> Ver histórico ({ciclo.historico_marcos.length})</summary>
      <div className="mt-2 space-y-2">{ciclo.historico_marcos.slice(0, 5).map(evento => <div key={evento.id} className="rounded-lg bg-white/80 px-3 py-2 text-xs text-gray-600"><p><span className="font-semibold">{RESULTADOS.find(r => r.id === evento.resultado)?.label}</span> · {new Date(evento.created_at).toLocaleDateString('pt-BR')}</p><p className="mt-0.5">{evento.nota}</p>{evento.prazo_novo && <p className="mt-0.5 text-gray-500">Nova verificação: {dataBr(evento.prazo_novo)}</p>}</div>)}</div>
    </details>}
  </div>;
};

const VerificacaoForm: React.FC<{ ciclo: LiderancaCiclo; onClose: () => void; onSaved: () => void }> = ({ ciclo, onClose, onSaved }) => {
  const [resultado, setResultado] = useState<LiderancaVerificacaoResultado>('realizado');
  const [nota, setNota] = useState('');
  const [novoPrazo, setNovoPrazo] = useState(somarDias(7, ciclo.fim));
  const [saving, setSaving] = useState(false);
  const reagenda = resultado !== 'realizado';
  const salvar = async () => {
    if (!nota.trim()) return toast.error('Registre uma nota curta sobre a conversa.');
    setSaving(true);
    const res = await rhService.verificarLiderancaMarco({ id: ciclo.id, resultado, nota: nota.trim(), novoPrazo: reagenda ? novoPrazo : undefined });
    setSaving(false);
    if (!res.ok) return toast.error(res.error || 'Não foi possível registrar a verificação.');
    toast.success(resultado === 'realizado' ? (ciclo.etapa === 'evolucao_mantida' ? 'Jornada concluída e registrada.' : 'Marco verificado. O próximo passo foi liberado.') : 'Nova verificação agendada.');
    onSaved();
  };
  return <Modal title={`Verificar combinado — ${ciclo.setor}`} onClose={onClose}>
    <div className="space-y-4 p-5">
      <div className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">Marco atual: <strong>{ETAPAS.find(e => e.id === ciclo.etapa)?.label}</strong> · verificar até {dataBr(ciclo.marco_prazo || ciclo.fim)}</div>
      <fieldset><legend className="mb-2 text-sm font-medium">O que aconteceu?</legend><div className="grid gap-2 sm:grid-cols-2">{RESULTADOS.map(item => <label key={item.id} className={`cursor-pointer rounded-lg border p-3 ${resultado === item.id ? 'border-[#7d4a3c] bg-[#7d4a3c]/5' : 'border-gray-200'}`}><span className="flex items-start gap-2"><input type="radio" name="resultado-marco" value={item.id} checked={resultado === item.id} onChange={() => setResultado(item.id)} className="mt-0.5 accent-[#7d4a3c]" /><span><span className="block text-sm font-semibold text-gray-800">{item.label}</span><span className="mt-0.5 block text-xs text-gray-500">{item.ajuda}</span></span></span></label>)}</div></fieldset>
      <label className="block text-sm font-medium">Registro da conversa<textarea className={`${input} mt-1`} rows={3} value={nota} onChange={e => setNota(e.target.value)} placeholder={resultado === 'realizado' ? 'O que mostra que este marco foi alcançado?' : 'O que aconteceu e qual foi o novo combinado?'} /></label>
      {reagenda && <label className="block text-sm font-medium">Nova data de verificação<input type="date" min={hojeIso()} max={ciclo.fim} className={`${input} mt-1`} value={novoPrazo} onChange={e => setNovoPrazo(e.target.value)} /></label>}
      <p className="text-xs text-gray-500">O registro fica no histórico privado do RH. Nenhuma resposta individual aparece aqui.</p>
    </div>
    <div className="flex justify-end gap-2 border-t p-5"><button onClick={onClose} className="px-4 py-2 text-sm">Cancelar</button><button disabled={saving} onClick={salvar} className="rounded-lg bg-[#7d4a3c] px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Salvando...' : resultado === 'realizado' ? 'Confirmar marco' : 'Registrar e reagendar'}</button></div>
  </Modal>;
};

const PrazoMarcoForm: React.FC<{ ciclo: LiderancaCiclo; destino: LiderancaEtapa; onClose: () => void; onSaved: () => void }> = ({ ciclo, destino, onClose, onSaved }) => {
  const etapa = ETAPAS.find(e => e.id === destino)!;
  const dias = destino === 'plano_definido' ? 14 : destino === 'em_acao' ? 14 : 30;
  const [prazo, setPrazo] = useState(somarDias(dias, ciclo.fim));
  const [saving, setSaving] = useState(false);
  const salvar = async () => {
    setSaving(true);
    const res = await rhService.avancarLideranca(ciclo.id, destino, prazo, ciclo.marco_nota ?? undefined);
    setSaving(false);
    if (!res.ok) return toast.error(res.error || 'Não foi possível avançar.');
    toast.success(`Marco iniciado: ${etapa.label}.`);
    onSaved();
  };
  return <Modal title={`Próximo marco — ${ciclo.setor}`} onClose={onClose}>
    <div className="space-y-4 p-5"><div className="rounded-lg border border-blue-100 bg-blue-50 p-3"><p className="text-sm font-semibold text-blue-900">{etapa.label}</p><p className="mt-1 text-xs text-blue-800">Combine com a liderança quando o RH voltará para verificar este novo marco.</p></div><label className="block text-sm font-medium">Verificar este marco em<input type="date" min={hojeIso()} max={ciclo.fim} className={`${input} mt-1`} value={prazo} onChange={e => setPrazo(e.target.value)} /></label><p className="text-xs text-gray-500">O cartão mudará de coluna e voltará à cor de acompanhamento. Perto do prazo, o RH receberá o alerta no painel.</p></div>
    <div className="flex justify-end gap-2 border-t p-5"><button onClick={onClose} className="px-4 py-2 text-sm">Cancelar</button><button disabled={saving} onClick={salvar} className="rounded-lg bg-[#7d4a3c] px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Avançando...' : 'Avançar e agendar'}</button></div>
  </Modal>;
};

const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" onMouseDown={onClose}><div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-xl" onMouseDown={e => e.stopPropagation()}><div className="flex items-center justify-between border-b p-5"><h3 className="font-bold text-gray-900">{title}</h3><button onClick={onClose}><X className="h-5 w-5 text-gray-400" /></button></div>{children}</div></div>;

/**
 * Explica a diferença no momento da decisão, em vez de exigir que o RH já
 * saiba que uma jornada CONTÉM ações. Com dois botões lado a lado, as duas
 * coisas pareciam a mesma — e a escolha errada só aparecia depois.
 */
const EscolhaTipo: React.FC<{ onMedida: () => void; onJornada: () => void; onClose: () => void }> = ({ onMedida, onJornada, onClose }) => {
  const opcao = 'flex w-full items-start gap-3 rounded-xl border border-gray-200 p-4 text-left transition hover:border-[#7d4a3c] hover:bg-[#7d4a3c]/5';
  return <Modal title="O que você quer registrar?" onClose={onClose}>
    <div className="space-y-3 p-5">
      <button type="button" onClick={onMedida} className={opcao}>
        <ClipboardList className="mt-0.5 h-5 w-5 shrink-0 text-[#7d4a3c]" />
        <span>
          <span className="block text-sm font-semibold text-gray-800">Uma medida pontual</span>
          <span className="mt-1 block text-xs leading-relaxed text-gray-500">Um risco, uma medida, um responsável e um prazo. Entra direto no plano como ação avulsa, sem acompanhamento recorrente. Pode valer para um setor ou para a empresa toda.</span>
        </span>
      </button>
      <button type="button" onClick={onJornada} className={opcao}>
        <UsersRound className="mt-0.5 h-5 w-5 shrink-0 text-[#7d4a3c]" />
        <span>
          <span className="block text-sm font-semibold text-gray-800">Um acompanhamento com a liderança</span>
          <span className="mt-1 block text-xs leading-relaxed text-gray-500">A conversa com o gestor de um setor ao longo do ciclo. Começa pelo que está funcionando e pelo que precisa melhorar, e vai gerando medidas a cada marco, com verificação combinada. Um setor por vez.</span>
        </span>
      </button>
    </div>
  </Modal>;
};

const CicloForm: React.FC<{ setores:SetorEmpresa[]; jss:Awaited<ReturnType<typeof rhService.getRelatorioJss>>; setorInicial?:string|null; onClose:()=>void; onSaved:(id:string)=>void }> = ({ setores,jss,setorInicial,onClose,onSaved }) => {
  const fimPadrao=new Date();fimPadrao.setMonth(fimPadrao.getMonth()+3);
  const [setor,setSetor]=useState(setorInicial??'');const [fim,setFim]=useState(fimPadrao.toISOString().slice(0,10));const [marcoPrazo,setMarcoPrazo]=useState(somarDias(7,fimPadrao.toISOString().slice(0,10)));const [rh,setRh]=useState('');const [fortes,setFortes]=useState('');const [atencao,setAtencao]=useState('');const [saving,setSaving]=useState(false);
  const preencher=()=>{const d=gerarDiagnostico(jss?.setores.find(s=>s.setor===setor),jss?.cortes);setFortes(d.fortes.join('\n'));setAtencao(d.atencao.join('\n'));};
  useEffect(()=>{if(!setorInicial)return;const d=gerarDiagnostico(jss?.setores.find(s=>s.setor===setorInicial),jss?.cortes);setFortes(d.fortes.join('\n'));setAtencao(d.atencao.join('\n'));},[jss,setorInicial]);
  const salvar=async()=>{setSaving(true);const res=await rhService.criarLiderancaCiclo({setor,fim,marcoPrazo,responsavelRh:rh,pontosFortes:linhas(fortes),pontosAtencao:linhas(atencao)});setSaving(false);if(!res.ok||!res.id)return toast.error(res.error||'Não foi possível iniciar.');toast.success('Jornada iniciada.');onSaved(res.id);};
  return <Modal title="Iniciar jornada de liderança" onClose={onClose}><div className="space-y-4 p-5"><label className="block text-sm font-medium">Setor<select className={`${input} mt-1`} value={setor} onChange={e=>setSetor(e.target.value)}><option value="">Escolha...</option>{setores.map(s=><option key={s.setor}>{s.setor}</option>)}</select></label>{setor&&<button onClick={preencher} className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#7d4a3c]"><RefreshCw className="h-3.5 w-3.5" /> Usar diagnóstico agregado atual</button>}<label className="block text-sm font-medium">O que está funcionando<textarea className={`${input} mt-1`} rows={3} value={fortes} onChange={e=>setFortes(e.target.value)} placeholder="Um ponto por linha" /></label><label className="block text-sm font-medium">O que precisa melhorar<textarea className={`${input} mt-1`} rows={3} value={atencao} onChange={e=>setAtencao(e.target.value)} placeholder="Um ponto por linha" /></label><div className="grid gap-3 sm:grid-cols-2"><label className="block text-sm font-medium">Responsável do RH<input className={`${input} mt-1`} value={rh} onChange={e=>setRh(e.target.value)} /></label><label className="block text-sm font-medium">Fim do ciclo<input type="date" min={hojeIso()} className={`${input} mt-1`} value={fim} onChange={e=>setFim(e.target.value)} /></label><label className="block text-sm font-medium sm:col-span-2">Verificar o primeiro marco em<input type="date" min={hojeIso()} max={fim} className={`${input} mt-1`} value={marcoPrazo} onChange={e=>setMarcoPrazo(e.target.value)} /><span className="mt-1 block text-xs font-normal text-gray-500">Defina essa data junto com a liderança. O painel lembrará o RH de checar o combinado.</span></label></div><p className="text-xs text-gray-500">Esses textos podem ser ajustados junto com o gestor. Nenhuma nota ou quantidade de respostas será levada ao resumo.</p></div><div className="flex justify-end gap-2 border-t p-5"><button onClick={onClose} className="px-4 py-2 text-sm">Cancelar</button><button disabled={saving} onClick={salvar} className="rounded-lg bg-[#7d4a3c] px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving?'Salvando...':'Iniciar jornada'}</button></div></Modal>;
};

const PontosForm: React.FC<{ ciclo:LiderancaCiclo;onClose:()=>void;onSaved:()=>void }> = ({ciclo,onClose,onSaved}) => {const[fortes,setFortes]=useState(ciclo.pontos_fortes.join('\n'));const[atencao,setAtencao]=useState(ciclo.pontos_atencao.join('\n'));const[rh,setRh]=useState(ciclo.responsavel_rh);const[fim,setFim]=useState(ciclo.fim);const salvar=async()=>{const res=await rhService.atualizarLiderancaPontos({id:ciclo.id,fim,responsavelRh:rh,pontosFortes:linhas(fortes),pontosAtencao:linhas(atencao)});if(!res.ok)return toast.error(res.error||'Não foi possível salvar.');toast.success('Pontos atualizados.');onSaved();};return <Modal title="Pontos da conversa" onClose={onClose}><div className="space-y-4 p-5"><label className="block text-sm font-medium">O que está funcionando<textarea className={`${input} mt-1`} rows={4} value={fortes} onChange={e=>setFortes(e.target.value)} /></label><label className="block text-sm font-medium">O que precisa melhorar<textarea className={`${input} mt-1`} rows={4} value={atencao} onChange={e=>setAtencao(e.target.value)} /></label><div className="grid gap-3 sm:grid-cols-2"><label className="block text-sm font-medium">Responsável do RH<input className={`${input} mt-1`} value={rh} onChange={e=>setRh(e.target.value)} /></label><label className="block text-sm font-medium">Fim do ciclo<input type="date" className={`${input} mt-1`} value={fim} onChange={e=>setFim(e.target.value)} /></label></div></div><div className="flex justify-end gap-2 border-t p-5"><button onClick={onClose} className="px-4 py-2 text-sm">Cancelar</button><button onClick={salvar} className="rounded-lg bg-[#7d4a3c] px-5 py-2 text-sm font-semibold text-white">Salvar</button></div></Modal>;};

const AcaoForm: React.FC<{ciclo:LiderancaCiclo;sugestao:Sugestao;onClose:()=>void;onSaved:()=>void}> = ({ciclo,sugestao,onClose,onSaved}) => {const prazoPadrao=new Date();prazoPadrao.setMonth(prazoPadrao.getMonth()+1);const[objetivo,setObjetivo]=useState(sugestao.objetivo);const[medida,setMedida]=useState(sugestao.medida);const[responsavel,setResponsavel]=useState('Gestor do setor');const[prazo,setPrazo]=useState(prazoPadrao.toISOString().slice(0,10));const[saving,setSaving]=useState(false);const salvar=async()=>{setSaving(true);const res=await rhService.adicionarLiderancaAcao({cicloId:ciclo.id,fator:sugestao.fator,objetivo,medida,nivelControle:sugestao.nivel,responsavel,prazo});setSaving(false);if(!res.ok)return toast.error(res.error||'Não foi possível registrar.');toast.success('Combinado adicionado ao plano de ação.');onSaved();};return <Modal title={`Novo combinado — ${ciclo.setor}`} onClose={onClose}><div className="space-y-4 p-5"><label className="block text-sm font-medium">Objetivo<textarea className={`${input} mt-1`} rows={2} value={objetivo} onChange={e=>setObjetivo(e.target.value)} /></label><label className="block text-sm font-medium">Ação combinada<textarea className={`${input} mt-1`} rows={3} value={medida} onChange={e=>setMedida(e.target.value)} /></label><div className="grid gap-3 sm:grid-cols-2"><label className="block text-sm font-medium">Responsável<input className={`${input} mt-1`} value={responsavel} onChange={e=>setResponsavel(e.target.value)} /></label><label className="block text-sm font-medium">Prazo<input type="date" className={`${input} mt-1`} value={prazo} onChange={e=>setPrazo(e.target.value)} /></label></div><p className="text-xs text-gray-500">O combinado também será registrado no Plano de Ação formal, com prazo e evidência.</p></div><div className="flex justify-end gap-2 border-t p-5"><button onClick={onClose} className="px-4 py-2 text-sm">Cancelar</button><button disabled={saving} onClick={salvar} className="rounded-lg bg-[#7d4a3c] px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving?'Salvando...':'Adicionar combinado'}</button></div></Modal>;};

const NovaAcaoGeralForm: React.FC<{
  setores: SetorEmpresa[];
  jss: Awaited<ReturnType<typeof rhService.getRelatorioJss>>;
  who5: Awaited<ReturnType<typeof rhService.getRelatorioPsicossocial>>;
  setorInicial?: string | null;
  fatorInicial?: PlanoFator | null;
  riscoInicial?: string | null;
  medidaInicial?: string | null;
  nivelInicial?: PlanoNivel | null;
  onClose: () => void;
  onSaved: () => void;
}> = ({ setores, jss, who5, setorInicial, fatorInicial, riscoInicial, medidaInicial, nivelInicial, onClose, onSaved }) => {
  const prazoPadrao = new Date(); prazoPadrao.setMonth(prazoPadrao.getMonth() + 3);
  const [setor, setSetor] = useState(setorInicial ?? '');
  const [fator, setFator] = useState<PlanoFator>(fatorInicial ?? 'demanda');
  const [risco, setRisco] = useState(riscoInicial ?? '');
  const [medida, setMedida] = useState(medidaInicial ?? '');
  const [nivel, setNivel] = useState<PlanoNivel>(nivelInicial ?? 'fonte');
  const [responsavel, setResponsavel] = useState('');
  const [prazo, setPrazo] = useState(prazoPadrao.toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  const diagnosticoSetor = useMemo(() => setor
    ? gerarDiagnostico(jss?.setores.find(s => s.setor === setor), jss?.cortes, who5?.setores.find(s => s.setor === setor))
    : null, [setor, jss, who5]);

  const usarIdeia = (s: Sugestao) => {
    setFator(s.fator); setNivel(s.nivel);
    setMedida(atual => atual.trim() ? atual : s.medida);
    setRisco(atual => atual.trim() ? atual : [s.objetivo, ...(diagnosticoSetor?.atencao ?? [])].filter(Boolean).join(' '));
  };

  const ajudaNivel = NIVEIS.find(n => n.v === nivel)?.ajuda;

  const salvar = async () => {
    if (!risco.trim()) return toast.error('Descreva o risco identificado.');
    if (!medida.trim()) return toast.error('Descreva a medida de controle.');
    if (!responsavel.trim()) return toast.error('Informe o responsável pela medida.');
    setSaving(true);
    const res = await rhService.criarPlanoAcao({
      setor, origem: 'manual', fator, risco_descricao: risco.trim(), medida: medida.trim(),
      nivel_controle: nivel, responsavel: responsavel.trim(), prazo,
    });
    setSaving(false);
    if (!res.ok) return toast.error(res.error || 'Não foi possível criar o item.');
    toast.success('Ação adicionada ao plano.');
    onSaved();
  };

  return <Modal title="Nova ação geral" onClose={onClose}>
    <div className="space-y-4 p-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block text-sm font-medium">Setor
          <select className={`${input} mt-1`} value={setor} onChange={e => setSetor(e.target.value)}>
            <option value="">Toda a empresa</option>
            {setores.map(s => <option key={s.setor} value={s.setor}>{s.setor}</option>)}
          </select>
        </label>
        <label className="block text-sm font-medium">Fator de risco
          <select className={`${input} mt-1`} value={fator} onChange={e => setFator(e.target.value as PlanoFator)}>
            {FATORES.map(f => <option key={f.v} value={f.v}>{f.label}</option>)}
          </select>
        </label>
      </div>

      {diagnosticoSetor && diagnosticoSetor.sugestoes.length > 0 && (
        <div className="rounded-lg border border-[#7d4a3c]/20 bg-[#7d4a3c]/5 p-3">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-[#7d4a3c]"><Lightbulb className="h-3.5 w-3.5" /> Ideias a partir do WHO-5 e da JSS deste setor</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {diagnosticoSetor.sugestoes.map((s, i) => (
              <div key={`${s.titulo}-${i}`} className="rounded-lg border bg-white p-2.5">
                <p className="text-xs font-semibold text-gray-800">{s.titulo}</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-gray-500">{s.medida}</p>
                <button type="button" onClick={() => usarIdeia(s)} className="mt-1.5 text-[11px] font-semibold text-[#7d4a3c]">Usar esta ideia</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <label className="block text-sm font-medium">Risco identificado
        <textarea className={`${input} mt-1`} rows={2} value={risco} onChange={e => setRisco(e.target.value)}
          placeholder="Ex.: Cobrança alta com pouca autonomia no setor, carga de trabalho 78 e bem-estar 39." />
      </label>
      <label className="block text-sm font-medium">Medida de controle
        <textarea className={`${input} mt-1`} rows={2} value={medida} onChange={e => setMedida(e.target.value)}
          placeholder="Ex.: Redimensionar a fila de atendimento e contratar 2 posições no turno da tarde." />
      </label>
      <div>
        <p className="mb-1.5 text-sm font-medium">Nível de controle</p>
        <div className="flex flex-wrap gap-1.5">
          {NIVEIS.map(n => (
            <button key={n.v} type="button" onClick={() => setNivel(n.v)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${nivel === n.v ? 'border-[#7d4a3c] bg-[#7d4a3c] text-white' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}>
              {n.label}
            </button>
          ))}
        </div>
        {ajudaNivel && <p className="mt-1.5 text-xs leading-snug text-gray-500">{ajudaNivel}</p>}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block text-sm font-medium">Responsável
          <input className={`${input} mt-1`} value={responsavel} onChange={e => setResponsavel(e.target.value)} placeholder="Nome ou cargo dentro da empresa" />
        </label>
        <label className="block text-sm font-medium">Prazo
          <input type="date" className={`${input} mt-1`} value={prazo} onChange={e => setPrazo(e.target.value)} />
        </label>
      </div>
    </div>
    <div className="flex justify-end gap-2 border-t p-5">
      <button onClick={onClose} className="px-4 py-2 text-sm">Cancelar</button>
      <button disabled={saving} onClick={salvar} className="rounded-lg bg-[#7d4a3c] px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Salvando...' : 'Adicionar ao plano'}</button>
    </div>
  </Modal>;
};
