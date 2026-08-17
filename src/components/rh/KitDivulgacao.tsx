// =====================================================
// Malama — Kit de divulgação da campanha
//
// Substitui o antigo painel de links, que entregava URL e CSV e parava aí.
// O RH não trava em achar o link: trava em "o que eu escrevo para as 200
// pessoas?" e em "e quem não tem e-mail nem app?". Enquanto essas duas
// perguntas ficaram com ele, a adesão dependia da desenvoltura de quem
// estava do outro lado — e adesão baixa é lida pelo cliente como "não
// funcionou".
//
// Três abas, na ordem em que o trabalho acontece: pegar o material, mandar
// a mensagem, aguentar as perguntas que vêm depois.
//
// UM LINK POR SETOR, não por pessoa — a decisão e o porquê estão em
// `rhService.getCampanhaLinks`. Aqui isso aparece como consequência: o
// texto pronto muda conforme o setor escolhido, porque a URL muda.
// =====================================================

import React, { useEffect, useMemo, useState } from 'react';
import { Copy, Check, FileDown, Printer, QrCode, MessageSquare, HelpCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { rhService, type CampanhaLinks } from '../../services/empresaService';
import { useRhJornada } from '../../contexts/RhJornadaContext';
import { caminhoSvg, gerarQr, ladoViewBox } from '../../lib/qrSetor';
import { gerarCartazesPDF } from '../../lib/cartazCampanha';
import {
  DUVIDAS_DA_EQUIPE, duvidasComoTexto, pecasDoKit, type PecaKit,
} from '../../lib/kitComunicacao';

const fmtDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('pt-BR');

// ── QR na tela ─────────────────────────────────────────
// Memorizado pelo texto: sem isso a matriz era recalculada a cada digitação
// no seletor de setor, e são ~900 módulos por código.
const QrVisual: React.FC<{ url: string; tamanho: number }> = ({ url, tamanho }) => {
  const { d, lado } = useMemo(() => {
    const matriz = gerarQr(url);
    return { d: caminhoSvg(matriz), lado: ladoViewBox(matriz) };
  }, [url]);

  return (
    <svg
      viewBox={`0 0 ${lado} ${lado}`}
      width={tamanho}
      height={tamanho}
      role="img"
      aria-label={`Código QR para ${url}`}
      className="shrink-0 rounded bg-white"
    >
      <rect width={lado} height={lado} fill="#fff" />
      <path d={d} fill="#000" shapeRendering="crispEdges" />
    </svg>
  );
};

// ── Botão de copiar com confirmação no próprio botão ───
// O toast some e o RH copia cinco coisas seguidas; sem a marca no botão ele
// perde a conta de qual já pegou.
const BotaoCopiar: React.FC<{
  texto: string;
  rotulo: string;
  aviso?: string;
  className?: string;
}> = ({ texto, rotulo, aviso, className }) => {
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (!copiado) return;
    const t = window.setTimeout(() => setCopiado(false), 2000);
    return () => window.clearTimeout(t);
  }, [copiado]);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      if (aviso) toast.success(aviso);
    } catch {
      toast.error('Não foi possível copiar. Selecione o texto e use Ctrl+C.');
    }
  };

  return (
    <button
      type="button"
      onClick={copiar}
      className={className ?? 'inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 transition hover:bg-gray-50'}
    >
      {copiado ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
      {copiado ? 'Copiado' : rotulo}
    </button>
  );
};

// ── Aba 1: links e cartazes ────────────────────────────
const AbaMaterial: React.FC<{
  dados: CampanhaLinks;
  urlDe: (token: string) => string;
  onImprimir: (setores: { setor: string; url: string }[]) => void;
}> = ({ dados, urlDe, onImprimir }) => {
  const baixarCsv = () => {
    // Ponto e vírgula e BOM: é o que faz o Excel em pt-BR abrir em colunas
    // e com acento certo, sem a pessoa ter que importar na mão.
    const linhas = [
      ['Setor', 'Colaboradores', 'Link'],
      ...dados.links.map(l => [l.setor, String(l.colaboradores), urlDe(l.token)]),
    ];
    const csv = '﻿' + linhas
      .map(cols => cols.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';'))
      .join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'links-questionario.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const todos = dados.links.map(l => ({ setor: l.setor, url: urlDe(l.token) }));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-gray-500">
          Um link por setor · {dados.links.length} no total
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onImprimir(todos)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#7d4a3c] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#623a2f]"
          >
            <Printer className="h-3.5 w-3.5" />
            Imprimir todos os cartazes
          </button>
          <BotaoCopiar
            texto={dados.links.map(l => `${l.setor}: ${urlDe(l.token)}`).join('\n')}
            rotulo="Copiar links"
            aviso={`${dados.links.length} link(s) copiado(s)`}
          />
          <button
            type="button"
            onClick={baixarCsv}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 transition hover:bg-gray-50"
          >
            <FileDown className="h-3.5 w-3.5" /> CSV
          </button>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {dados.links.map(l => {
          const url = urlDe(l.token);
          return (
            <div key={l.token} className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-2.5">
              <QrVisual url={url} tamanho={64} />
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-800">{l.setor}</p>
                  <p className="text-[11px] text-gray-400">{l.colaboradores} pessoa(s)</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <BotaoCopiar texto={url} rotulo="Link" />
                  <button
                    type="button"
                    onClick={() => onImprimir([{ setor: l.setor, url }])}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 transition hover:bg-gray-50"
                  >
                    <Printer className="h-3.5 w-3.5" /> Cartaz
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[11px] leading-snug text-gray-400">
        O cartaz sai em A4, com o QR grande, o prazo e a frase de sigilo — feito para o mural,
        onde alcança quem não tem e-mail corporativo nem o app. Cada link vale para o setor
        inteiro até {fmtDate(dados.janela_fim)}. Ninguém se identifica ao responder: nem a Malama
        nem você conseguem saber quem respondeu, só quantos por setor.
      </p>
    </div>
  );
};

// ── Aba 2: mensagens prontas ───────────────────────────
const CartaoPeca: React.FC<{ peca: PecaKit }> = ({ peca }) => (
  <div className="rounded-lg border border-gray-200 bg-white p-3">
    <div className="mb-1 flex flex-wrap items-start justify-between gap-2">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-800">{peca.titulo}</p>
        <p className="text-[11px] leading-snug text-gray-500">{peca.quando}</p>
      </div>
      <BotaoCopiar
        texto={peca.assunto ? `${peca.assunto}\n\n${peca.texto}` : peca.texto}
        rotulo="Copiar"
        aviso="Mensagem copiada"
      />
    </div>
    {peca.assunto && (
      <p className="mb-1.5 mt-2 text-xs text-gray-600">
        <span className="font-medium text-gray-500">Assunto:</span> {peca.assunto}
      </p>
    )}
    <pre className="mt-1.5 max-h-64 overflow-y-auto whitespace-pre-wrap rounded-md bg-gray-50 p-2.5 font-sans text-xs leading-relaxed text-gray-700">
      {peca.texto}
    </pre>
  </div>
);

// ── Página ─────────────────────────────────────────────
export const KitDivulgacao: React.FC<{
  campaignId: string;
  /** Código do instrumento (`who5`, `jss`) — muda o texto das mensagens. */
  instrumento: string;
}> = ({ campaignId, instrumento }) => {
  const { empresa } = useRhJornada();
  const [dados, setDados] = useState<CampanhaLinks | null>(null);
  const [loading, setLoading] = useState(true);
  const [aba, setAba] = useState<'material' | 'mensagens' | 'duvidas'>('material');
  const [setorEscolhido, setSetorEscolhido] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    setLoading(true);
    rhService.getCampanhaLinks(campaignId)
      .then(d => { if (!cancelado) setDados(d); })
      .finally(() => { if (!cancelado) setLoading(false); });
    return () => { cancelado = true; };
  }, [campaignId]);

  const urlDe = (token: string) => `${window.location.origin}/q/${token}`;

  const nomeEmpresa = empresa?.nome ?? 'nossa empresa';

  // O setor escolhido decide a URL que entra no texto. Cai no primeiro da
  // lista para a aba nunca abrir sem nada montado.
  const linkAtivo = useMemo(() => {
    if (!dados?.links.length) return null;
    return dados.links.find(l => l.setor === setorEscolhido) ?? dados.links[0];
  }, [dados, setorEscolhido]);

  const pecas = useMemo(() => {
    if (!dados || !linkAtivo) return [];
    return pecasDoKit({
      empresa: nomeEmpresa,
      instrumento,
      setor: linkAtivo.setor,
      url: urlDe(linkAtivo.token),
      prazo: fmtDate(dados.janela_fim),
    });
  }, [dados, linkAtivo, instrumento, nomeEmpresa]);

  const imprimir = (setores: { setor: string; url: string }[]) => {
    if (!dados) return;
    try {
      gerarCartazesPDF(
        { empresa: nomeEmpresa, instrumento, prazo: fmtDate(dados.janela_fim) },
        setores,
      );
      toast.success(setores.length === 1 ? 'Cartaz gerado.' : `${setores.length} cartazes gerados.`);
    } catch (err) {
      console.error('[kit] cartaz:', err);
      toast.error('Não foi possível gerar o cartaz.');
    }
  };

  if (loading) {
    return <div className="py-4 text-center text-xs text-gray-400">Preparando o material de divulgação...</div>;
  }
  if (!dados?.ok) {
    return (
      <div className="py-4 text-center text-xs text-gray-400">
        {dados?.error ?? 'Não foi possível gerar os links.'}
      </div>
    );
  }
  if (dados.links.length === 0) {
    return (
      <div className="mt-2 rounded-lg bg-gray-50 p-4 text-center text-xs text-gray-500">
        Nenhum colaborador no público-alvo desta campanha, então não há link a distribuir.
      </div>
    );
  }

  const abas = [
    { id: 'material' as const, rotulo: 'Links e cartazes', Icone: QrCode },
    { id: 'mensagens' as const, rotulo: 'Mensagens prontas', Icone: MessageSquare },
    { id: 'duvidas' as const, rotulo: 'Dúvidas da equipe', Icone: HelpCircle },
  ];

  return (
    <div className="mt-2 rounded-lg bg-gray-50 p-3">
      <nav className="mb-3 flex flex-wrap gap-1 border-b border-gray-200">
        {abas.map(({ id, rotulo, Icone }) => (
          <button
            key={id}
            type="button"
            onClick={() => setAba(id)}
            className={`-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium transition ${
              aba === id
                ? 'border-[#7d4a3c] text-[#7d4a3c]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icone className="h-3.5 w-3.5" /> {rotulo}
          </button>
        ))}
      </nav>

      {aba === 'material' && (
        <AbaMaterial dados={dados} urlDe={urlDe} onImprimir={imprimir} />
      )}

      {aba === 'mensagens' && linkAtivo && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="kit-setor" className="text-xs font-medium text-gray-600">
              Texto para o setor
            </label>
            <select
              id="kit-setor"
              value={linkAtivo.setor}
              onChange={e => setSetorEscolhido(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-700 focus:border-transparent focus:ring-2 focus:ring-[#7d4a3c]"
            >
              {dados.links.map(l => <option key={l.token} value={l.setor}>{l.setor}</option>)}
            </select>
            <span className="text-[11px] text-gray-400">
              O link muda conforme o setor — copie um texto para cada.
            </span>
          </div>

          {pecas.map(peca => <CartaoPeca key={peca.id} peca={peca} />)}

          <p className="text-[11px] leading-snug text-gray-400">
            Os textos evitam qualquer forma de cobrança de propósito. Resposta dada sob pressão
            distorce o resultado, e é a validade do instrumento que sustenta o seu relatório se
            ele for questionado — perseguir adesão alta é o caminho mais rápido para um
            diagnóstico que não se defende.
          </p>
        </div>
      )}

      {aba === 'duvidas' && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="max-w-xl text-xs leading-snug text-gray-500">
              O que costuma ser perguntado no corredor depois que a mensagem sai — com resposta
              pronta, na voz de quem vai responder. A primeira pergunta difícil sem resposta é o
              que costuma travar a divulgação.
            </p>
            <BotaoCopiar texto={duvidasComoTexto()} rotulo="Copiar tudo" aviso="Perguntas copiadas" />
          </div>
          <dl className="flex flex-col gap-2">
            {DUVIDAS_DA_EQUIPE.map(d => (
              <div key={d.pergunta} className="rounded-lg border border-gray-200 bg-white p-3">
                <dt className="text-xs font-semibold text-gray-800">{d.pergunta}</dt>
                <dd className="mt-1 text-xs leading-relaxed text-gray-600">{d.resposta}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
};
