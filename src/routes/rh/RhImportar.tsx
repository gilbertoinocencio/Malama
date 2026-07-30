// =====================================================
// Malama — Portal do RH · Aba Importar
//
// Duas coisas, na ordem em que dependem uma da outra:
//   1. Vincular CPF ao colaborador — sem essa chave a ingestão não resolve
//      setor, porque os eventos do eSocial chaveiam por CPF.
//   2. Importar o XML de eventos SST.
//
// FLUXO DELIBERADAMENTE EM DUAS ETAPAS: ler → conferir → confirmar.
// Nada é gravado no envio do arquivo. O RH vê o que foi extraído, o que foi
// descartado e por quê, e só então confirma. Importação que grava direto
// esconde erro de leitura dentro de um número que ninguém mais audita.
//
// PRIVACIDADE: o CID completo e o código de motivo aparecem nesta tela para
// conferência humana e NÃO são enviados ao servidor (ver paraIngestao). O CPF
// é enviado, resolve o setor no banco e é descartado lá — nunca é gravado
// junto do evento de saúde.
// =====================================================

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Upload, FileCode2, IdCard, CheckCircle2, AlertTriangle, Info,
  History, Loader2, X, ShieldCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  parseEsocialSst, resumoPorCapitulo, hashArquivo,
  type ResultadoParse,
} from '../../lib/esocialSst';
import { CID_LABEL } from '../../lib/cid';
import {
  getCoberturaCpf, getLotes, ingerirAfastamentos, vincularCpfs, parsearParesCpf,
  type CoberturaCpf, type LoteIngestao,
} from '../../services/ingestaoService';

const fmtDataHora = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });

const Cartao: React.FC<{
  titulo: string;
  descricao?: string;
  icone: React.ReactNode;
  children: React.ReactNode;
}> = ({ titulo, descricao, icone, children }) => (
  <section className="bg-white rounded-xl shadow p-6">
    <div className="flex items-start gap-3 mb-4">
      <span className="mt-0.5 text-[#7d4a3c]">{icone}</span>
      <div>
        <h3 className="text-base font-semibold text-gray-800">{titulo}</h3>
        {descricao && <p className="text-xs text-gray-500 mt-1 max-w-2xl">{descricao}</p>}
      </div>
    </div>
    {children}
  </section>
);

export const RhImportar: React.FC = () => {
  const [cobertura, setCobertura] = useState<CoberturaCpf | null>(null);
  const [lotes, setLotes] = useState<LoteIngestao[]>([]);
  const [carregando, setCarregando] = useState(true);

  // Etapa de vínculo de CPF
  const [colado, setColado] = useState('');
  const [vinculando, setVinculando] = useState(false);

  // Etapa de leitura do XML
  const [arquivo, setArquivo] = useState<{ nome: string; hash: string | null } | null>(null);
  const [previa, setPrevia] = useState<ResultadoParse | null>(null);
  const [lendo, setLendo] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const recarregar = useCallback(async () => {
    try {
      const [c, l] = await Promise.all([getCoberturaCpf(), getLotes(10)]);
      setCobertura(c);
      setLotes(l);
    } catch (e) {
      console.error('Erro ao carregar dados de importação:', e);
      toast.error('Não foi possível carregar o histórico de importações.');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { void recarregar(); }, [recarregar]);

  // ── Vínculo de CPF ────────────────────────────────────────────
  const handleVincular = async () => {
    const { pares, invalidas } = parsearParesCpf(colado);
    if (pares.length === 0) {
      toast.error('Nenhuma linha válida. Use "email;CPF", uma por linha.');
      return;
    }

    setVinculando(true);
    try {
      const r = await vincularCpfs(pares);
      if (!r.ok) { toast.error(r.error ?? 'Não foi possível vincular.'); return; }

      toast.success(`${r.vinculados ?? 0} ${r.vinculados === 1 ? 'CPF vinculado' : 'CPFs vinculados'}.`);

      // Cada rejeição tem causa diferente e ação diferente — avisar em
      // separado, não somar num "alguns falharam".
      const avisos: string[] = [];
      if (r.email_nao_encontrado) avisos.push(`${r.email_nao_encontrado} e-mail(s) não estão no cadastro`);
      if (r.cpf_duplicado)        avisos.push(`${r.cpf_duplicado} CPF(s) já vinculados a outro colaborador`);
      if (r.cpf_invalido || invalidas) avisos.push(`${(r.cpf_invalido ?? 0) + invalidas} linha(s) com CPF inválido`);
      if (avisos.length) toast(avisos.join(' · '), { icon: '⚠️', duration: 6000 });

      setColado('');
      await recarregar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao vincular CPFs.');
    } finally {
      setVinculando(false);
    }
  };

  // ── Leitura do XML ────────────────────────────────────────────
  const handleArquivo = async (file: File) => {
    setLendo(true);
    setPrevia(null);
    setArquivo(null);
    try {
      const conteudo = await file.text();
      const resultado = parseEsocialSst(conteudo);
      const hash = await hashArquivo(conteudo);
      setArquivo({ nome: file.name, hash });
      setPrevia(resultado);
      if (resultado.erro) toast.error(resultado.erro);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível ler o arquivo.');
    } finally {
      setLendo(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const limparPrevia = () => { setPrevia(null); setArquivo(null); };

  const handleConfirmar = async () => {
    if (!previa || !arquivo || previa.afastamentos.length === 0) return;
    setConfirmando(true);
    try {
      const semDestino = previa.semDestino.reduce((s, x) => s + x.quantidade, 0);
      const r = await ingerirAfastamentos({
        afastamentos: previa.afastamentos,
        arquivo: arquivo.nome,
        arquivoHash: arquivo.hash,
        eventosLidos: previa.eventosLidos,
        semDestino,
      });

      if (!r.ok) { toast.error(r.error ?? 'Não foi possível importar.'); return; }

      toast.success(`${r.gravados ?? 0} afastamento(s) importado(s).`);
      if (r.repetidos)     toast(`${r.repetidos} já constavam e foram ignorados.`, { icon: 'ℹ️' });
      if (r.fora_da_base)  toast(`${r.fora_da_base} fora da base Malama.`, { icon: 'ℹ️', duration: 6000 });

      limparPrevia();
      await recarregar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao importar.');
    } finally {
      setConfirmando(false);
    }
  };

  if (carregando) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7d4a3c]" />
      </div>
    );
  }

  const semCpf = cobertura?.sem_cpf ?? 0;
  const porCapitulo = previa ? resumoPorCapitulo(previa.afastamentos) : [];
  const totalDias = porCapitulo.reduce((s, c) => s + c.dias, 0);

  return (
    <div className="space-y-6">

      {/* ── Explicação do que esta tela faz ─────────────────────── */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-[#f7f1ec] border border-[#e7d9d1]">
        <ShieldCheck className="w-5 h-5 text-[#7d4a3c] mt-0.5 shrink-0" />
        <div className="text-sm text-[#5c4038]">
          <p className="font-semibold mb-1">O que entra e o que fica guardado</p>
          <p>
            Os eventos que sua empresa já envia ao eSocial trazem afastamento com
            CID e duração. A Malama lê o arquivo, usa o CPF apenas para descobrir
            o <strong>setor</strong>, e guarda somente <strong>setor, capítulo do
            CID e dias</strong> — sem nome, sem CPF, sem o código de diagnóstico
            completo. Vale para qualquer sistema que emita esses eventos,
            incluindo o módulo SST do TOTVS Protheus.
          </p>
        </div>
      </div>

      {/* ── 1. CPF ──────────────────────────────────────────────── */}
      <Cartao
        icone={<IdCard className="w-5 h-5" />}
        titulo="Vincular CPF aos colaboradores"
        descricao="Os eventos do eSocial identificam a pessoa por CPF, e o cadastro Malama por e-mail. Sem esse vínculo o afastamento é lido mas não consegue ser atribuído a um setor."
      >
        {cobertura && (
          <div className="flex flex-wrap gap-6 mb-4 text-sm">
            <span className="text-gray-500">
              Colaboradores: <strong className="text-gray-800">{cobertura.total}</strong>
            </span>
            <span className="text-gray-500">
              Com CPF: <strong className="text-emerald-700">{cobertura.com_cpf}</strong>
            </span>
            <span className="text-gray-500">
              Sem CPF: <strong className={semCpf > 0 ? 'text-amber-700' : 'text-gray-800'}>{semCpf}</strong>
            </span>
          </div>
        )}

        {semCpf > 0 && (
          <div className="flex items-start gap-2 mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-900">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <p>
              {semCpf} {semCpf === 1 ? 'colaborador ainda está' : 'colaboradores ainda estão'} sem
              CPF. Os afastamentos deles serão lidos do arquivo mas contados como
              "fora da base", sem entrar no indicador por setor.
            </p>
          </div>
        )}

        <label className="block text-sm font-medium text-gray-700 mb-1">
          Cole a lista, uma linha por colaborador
        </label>
        <p className="text-xs text-gray-400 mb-2">
          Formato <code>email;CPF</code> — aceita vírgula, ponto e vírgula ou tabulação,
          então colar direto de planilha funciona. A ordem das colunas não importa.
        </p>
        <textarea
          value={colado}
          onChange={e => setColado(e.target.value)}
          rows={5}
          spellCheck={false}
          placeholder={'maria.silva@empresa.com.br;12345678901\njoao.souza@empresa.com.br;98765432100'}
          className="w-full px-3 py-2 rounded-lg border border-gray-300 font-mono text-sm focus:ring-2 focus:ring-[#7d4a3c] focus:outline-none"
        />
        <button
          onClick={() => void handleVincular()}
          disabled={vinculando || !colado.trim()}
          className="mt-3 px-5 py-2.5 bg-[#7d4a3c] hover:bg-[#623a2f] text-white rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50"
        >
          {vinculando ? <Loader2 className="w-4 h-4 animate-spin" /> : <IdCard className="w-4 h-4" />}
          {vinculando ? 'Vinculando…' : 'Vincular CPFs'}
        </button>
      </Cartao>

      {/* ── 2. XML ──────────────────────────────────────────────── */}
      <Cartao
        icone={<FileCode2 className="w-5 h-5" />}
        titulo="Importar eventos SST do eSocial"
        descricao="Envie o XML exportado do seu sistema de folha ou da clínica de medicina do trabalho. Nada é gravado antes de você conferir e confirmar."
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xml,text/xml,application/xml"
          onChange={e => { const f = e.target.files?.[0]; if (f) void handleArquivo(f); }}
          className="hidden"
          id="arquivo-esocial"
        />
        <label
          htmlFor="arquivo-esocial"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
        >
          {lendo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {lendo ? 'Lendo…' : 'Escolher arquivo XML'}
        </label>

        {/* Prévia */}
        {previa && !previa.erro && (
          <div className="mt-5 pt-5 border-t border-gray-100">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <p className="text-sm font-semibold text-gray-800">
                  {arquivo?.nome}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {previa.eventosLidos} evento(s) SST no arquivo ·{' '}
                  <strong className="text-gray-800">{previa.afastamentos.length}</strong> afastamento(s)
                  {totalDias > 0 && <> · {totalDias} dia(s)</>}
                </p>
              </div>
              <button
                onClick={limparPrevia}
                className="shrink-0 text-gray-400 hover:text-gray-600"
                aria-label="Descartar leitura"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {porCapitulo.length > 0 && (
              <div className="overflow-x-auto border border-gray-200 rounded-lg mb-4">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr className="text-left text-xs text-gray-500">
                      <th className="px-3 py-2 font-medium">Capítulo</th>
                      <th className="px-3 py-2 font-medium">Eventos</th>
                      <th className="px-3 py-2 font-medium">Dias</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {porCapitulo.map(c => (
                      <tr key={c.capitulo} className={c.capitulo === 'F' ? 'bg-[#faf5f2]' : ''}>
                        <td className="px-3 py-2">
                          <span className="font-mono font-semibold text-gray-800 mr-2">{c.capitulo}</span>
                          <span className="text-gray-600">{CID_LABEL[c.capitulo] ?? '—'}</span>
                        </td>
                        <td className="px-3 py-2 text-gray-700 tabular-nums">{c.eventos}</td>
                        <td className="px-3 py-2 text-gray-700 tabular-nums">{c.dias}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Reconhecido, sem destino */}
            {previa.semDestino.length > 0 && (
              <div className="flex items-start gap-2 mb-3 p-3 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-600">
                <Info className="w-4 h-4 mt-0.5 shrink-0 text-gray-400" />
                <div>
                  <p className="font-medium text-gray-700 mb-1">
                    Reconhecidos, porém não importados nesta versão
                  </p>
                  <ul className="space-y-0.5">
                    {previa.semDestino.map(s => (
                      <li key={s.tipo}>
                        <span className="font-mono text-xs">{s.tipo}</span> — {s.rotulo}: {s.quantidade}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Descartes com motivo */}
            {previa.descartes.length > 0 && (
              <div className="flex items-start gap-2 mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-900">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium mb-1">Não aproveitados</p>
                  <ul className="space-y-0.5">
                    {previa.descartes.map(d => (
                      <li key={d.motivo}>{d.motivo}: {d.quantidade}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            <button
              onClick={() => void handleConfirmar()}
              disabled={confirmando || previa.afastamentos.length === 0}
              className="px-5 py-2.5 bg-[#7d4a3c] hover:bg-[#623a2f] text-white rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50"
            >
              {confirmando
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <CheckCircle2 className="w-4 h-4" />}
              {confirmando
                ? 'Importando…'
                : `Confirmar importação de ${previa.afastamentos.length}`}
            </button>
          </div>
        )}
      </Cartao>

      {/* ── 3. Histórico ────────────────────────────────────────── */}
      <Cartao
        icone={<History className="w-5 h-5" />}
        titulo="Importações anteriores"
        descricao="Evidência de PGR precisa dizer de onde o número veio. Cada importação fica registrada com contagem e responsável."
      >
        {lotes.length === 0 ? (
          <p className="text-sm text-gray-400">Nenhuma importação registrada ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                  <th className="pb-2 pr-4 font-medium">Quando</th>
                  <th className="pb-2 pr-4 font-medium">Arquivo</th>
                  <th className="pb-2 pr-4 font-medium">Importados</th>
                  <th className="pb-2 pr-4 font-medium">Repetidos</th>
                  <th className="pb-2 font-medium">Fora da base</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {lotes.map(l => (
                  <tr key={l.id}>
                    <td className="py-2 pr-4 text-gray-500 whitespace-nowrap">{fmtDataHora(l.created_at)}</td>
                    <td className="py-2 pr-4 text-gray-700 max-w-[16rem] truncate">{l.arquivo ?? '—'}</td>
                    <td className="py-2 pr-4 text-gray-800 font-medium tabular-nums">{l.eventos_gravados}</td>
                    <td className="py-2 pr-4 text-gray-500 tabular-nums">{l.eventos_repetidos}</td>
                    <td className="py-2 text-gray-500 tabular-nums">{l.fora_da_base}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Cartao>
    </div>
  );
};
