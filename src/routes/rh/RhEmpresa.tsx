// =====================================================
// Malama — Portal do RH · Área da empresa
//
// Dados cadastrais e documentos legais. Fica fora da barra de abas, aberta
// pelo nome da empresa no cabeçalho: é informação de conta, consultada de
// vez em quando, e não merece disputar espaço com as telas de trabalho.
//
// O que o RH edita aqui é só o CONTATO do responsável. Nome, CNPJ,
// assentos, status e data de início são termos comerciais — mostrados como
// leitura, alterados pelo admin da Malama.
//
// Documento com `exige_aceite` só é aceito depois de aberto, e o aceite
// pede nome e cargo de quem está assinando: quem opera o portal nem sempre
// é quem tem poderes para obrigar a empresa.
//
// A senha de acesso também mora aqui. Ela nasce definida pelo admin da
// Malama no cadastro da empresa, então trocá-la é a primeira coisa que o RH
// deveria poder fazer sozinho — sem isso a credencial inicial circularia
// para sempre por e-mail.
// =====================================================

import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useScrollParaHash } from '../../hooks/useScrollParaHash';
import {
  Building2, ArrowLeft, Save, FileText, ExternalLink, CheckCircle2,
  AlertCircle, ChevronDown, ChevronUp, ShieldCheck, KeyRound, Eye, EyeOff,
  RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { PerfilEmpresaForm } from '../../components/rh/PerfilEmpresaForm';
import {
  rhService, type EmpresaPerfil, type DocumentoLegal, type EmpresaDadosCnpj,
} from '../../services/empresaService';
import { cabecalhoVigencia } from '../../lib/documentosLegais';
// Colaboradores já vêm carregados pelo layout (RhJornadaProvider envolve
// todas as rotas do portal) — reusar evita uma segunda chamada para o
// mesmo dado que o dashboard também usa.
import { useRhJornada } from '../../contexts/RhJornadaContext';
import { useRhAccess } from '../../contexts/RhAccessContext';

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

const fmtDateTime = (d: string) =>
  new Date(d).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

const Campo: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</dt>
    <dd className="mt-1 text-sm text-gray-700">{children}</dd>
  </div>
);

// ── Um documento da lista ────────────────────────────
const DocumentoItem: React.FC<{
  doc: DocumentoLegal;
  onAceito: () => void;
}> = ({ doc, onAceito }) => {
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState('');
  const [cargo, setCargo] = useState('');
  const [enviando, setEnviando] = useState(false);
  // Formalizar = subir uma ciência automática para aceite assinado. Não é o
  // caminho normal; existe para quando o jurídico do cliente pede assinatura.
  const [formalizando, setFormalizando] = useState(false);

  const pendente = doc.exige_aceite && !doc.aceito_em;
  const podeFormalizar = doc.exige_aceite && doc.modo === 'automatico';

  const handleAceitar = async () => {
    if (!nome.trim()) { toast.error('Informe o nome de quem está aceitando.'); return; }
    setEnviando(true);
    try {
      const res = await rhService.aceitarDocumento(doc.id, nome.trim(), cargo.trim());
      if (!res.ok) { toast.error(res.error || 'Não foi possível registrar o aceite.'); return; }
      toast.success(res.ja_aceito ? 'Este documento já constava como aceito.' : 'Aceite registrado.');
      onAceito();
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className={`border rounded-xl overflow-hidden ${pendente ? 'border-amber-200 bg-amber-50/40' : 'border-gray-200'}`}>
      <div className="flex items-start gap-3 p-4">
        <FileText className={`w-5 h-5 flex-shrink-0 mt-0.5 ${pendente ? 'text-amber-600' : 'text-gray-400'}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-gray-800">{doc.titulo}</span>
            {/* Versão e vigência vêm das colunas do documento, nunca do corpo
                do texto: publicar uma versão nova atualiza esta linha sozinha. */}
            <span className="text-xs text-gray-400">{cabecalhoVigencia(doc)}</span>
            {doc.especifico && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-[#7d4a3c]/10 text-[#7d4a3c]">
                Contrato da sua empresa
              </span>
            )}
          </div>

          {doc.aceito_em ? (
            // O texto muda com o modo de propósito: chamar de "aceito por
            // Fulano" um registro gravado sem clique seria mentira na trilha.
            <p className={`mt-1 text-xs flex items-center gap-1 ${doc.modo === 'automatico' ? 'text-gray-500' : 'text-green-700'}`}>
              <CheckCircle2 className="w-3.5 h-3.5" />
              {doc.modo === 'automatico' ? (
                <>
                  Ciência registrada em {fmtDateTime(doc.aceito_em)} no acesso ao painel ({doc.aceito_por_nome})
                  {podeFormalizar && !formalizando && (
                    <button
                      onClick={() => { setFormalizando(true); setAberto(true); }}
                      className="ml-1 underline hover:text-[#7d4a3c]"
                    >
                      registrar aceite formal
                    </button>
                  )}
                </>
              ) : (
                <>
                  Aceito em {fmtDateTime(doc.aceito_em)} por {doc.aceito_por_nome}
                  {doc.aceito_por_cargo ? ` · ${doc.aceito_por_cargo}` : ''}
                </>
              )}
            </p>
          ) : doc.exige_aceite ? (
            <p className="mt-1 text-xs text-amber-700 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> Aguardando aceite
            </p>
          ) : (
            <p className="mt-1 text-xs text-gray-400">Documento informativo — não exige aceite</p>
          )}
        </div>

        {doc.url ? (
          <a
            href={doc.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 transition whitespace-nowrap"
          >
            Abrir <ExternalLink className="w-3.5 h-3.5" />
          </a>
        ) : (
          <button
            onClick={() => setAberto(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 transition whitespace-nowrap"
          >
            {aberto ? 'Fechar' : 'Ler'}
            {aberto ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>

      {aberto && doc.conteudo && (
        <div className="border-t border-gray-100 bg-white">
          {/* Texto puro vindo do banco: whitespace-pre-wrap, nunca HTML. O
              cabeçalho de vigência é impresso aqui, fora do texto, para que
              quem lê ou imprime o documento veja qual versão está lendo. */}
          <div className="px-4 pt-4 text-xs font-medium uppercase tracking-wide text-gray-400">
            {cabecalhoVigencia(doc)}
          </div>
          <div className="px-4 pb-4 pt-2 max-h-96 overflow-y-auto text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
            {doc.conteudo}
          </div>
        </div>
      )}

      {/* O aceite aparece depois de abrir o texto — ou de saída, quando o
          documento mora numa página externa e não há o que expandir aqui.
          Sem essa segunda condição, documento com URL e aceite obrigatório
          ficaria impossível de aceitar. */}
      {(pendente || formalizando) && (aberto || !!doc.url) && (
        <div className="border-t border-gray-100 px-4 py-4 bg-gray-50">
          <p className="text-xs text-gray-500 mb-3">
            O aceite fica registrado com data, versão do documento e o nome informado abaixo.
            Preencha com os dados de quem tem poderes para assinar pela empresa.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
            <input
              type="text" value={nome} onChange={e => setNome(e.target.value)}
              placeholder="Nome de quem aceita"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#7d4a3c] focus:border-transparent"
            />
            <input
              type="text" value={cargo} onChange={e => setCargo(e.target.value)}
              placeholder="Cargo (ex.: Diretora de RH)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#7d4a3c] focus:border-transparent"
            />
          </div>
          <button
            onClick={handleAceitar}
            disabled={enviando}
            className="flex items-center gap-2 px-4 py-2 bg-[#7d4a3c] hover:bg-[#623a2f] text-white text-sm font-semibold rounded-lg transition disabled:opacity-50"
          >
            <ShieldCheck className="w-4 h-4" />
            {enviando ? 'Registrando...' : 'Li e aceito em nome da empresa'}
          </button>
        </div>
      )}
    </div>
  );
};

// ── Acesso ao painel: e-mail de login e troca de senha ──
const AcessoCard: React.FC<{ emailLogin: string | null }> = ({ emailLogin }) => {
  const [aberto, setAberto] = useState(false);
  const [atual, setAtual] = useState('');
  const [nova, setNova] = useState('');
  const [confirma, setConfirma] = useState('');
  const [visivel, setVisivel] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const limpar = () => { setAtual(''); setNova(''); setConfirma(''); setVisivel(false); };

  const handleTrocar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!atual) { toast.error('Informe a senha atual.'); return; }
    if (nova.length < 8) { toast.error('A nova senha precisa ter ao menos 8 caracteres.'); return; }
    if (nova !== confirma) { toast.error('A confirmação não confere com a nova senha.'); return; }
    if (nova === atual) { toast.error('A nova senha precisa ser diferente da atual.'); return; }

    setSalvando(true);
    try {
      const res = await rhService.alterarSenha(atual, nova);
      if (!res.ok) { toast.error(res.error || 'Não foi possível alterar a senha.'); return; }
      toast.success('Senha alterada. Use a nova no próximo acesso.');
      limpar();
      setAberto(false);
    } finally {
      setSalvando(false);
    }
  };

  const campo = 'w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#7d4a3c] focus:border-transparent';

  return (
    <div className="bg-white rounded-xl shadow p-5">
      <div className="flex items-center gap-2 mb-4">
        <KeyRound className="w-5 h-5 text-[#7d4a3c]" />
        <h2 className="font-semibold text-gray-800">Acesso ao painel</h2>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <dl><Campo label="E-mail de acesso">{emailLogin || '—'}</Campo></dl>
        {!aberto && (
          <button
            onClick={() => setAberto(true)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
          >
            Alterar senha
          </button>
        )}
      </div>

      <p className="text-xs text-gray-400 mt-3">
        Este é o e-mail com que você entra em /rh — ele pode ser diferente do contato do
        responsável acima. Para trocá-lo, fale com a Malama.
      </p>

      {aberto && (
        <form onSubmit={handleTrocar} className="border-t border-gray-100 mt-4 pt-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
            Alterar senha
          </p>
          {/* Campo escondido com o e-mail: dá contexto ao gerenciador de
              senhas do navegador, que sem isso salva a credencial sem usuário. */}
          <input type="text" name="username" autoComplete="username" value={emailLogin ?? ''} readOnly hidden />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type={visivel ? 'text' : 'password'} value={atual} onChange={e => setAtual(e.target.value)}
              placeholder="Senha atual" autoComplete="current-password" className={campo}
            />
            <input
              type={visivel ? 'text' : 'password'} value={nova} onChange={e => setNova(e.target.value)}
              placeholder="Nova senha (mín. 8 caracteres)" autoComplete="new-password" className={campo}
            />
            <input
              type={visivel ? 'text' : 'password'} value={confirma} onChange={e => setConfirma(e.target.value)}
              placeholder="Repita a nova senha" autoComplete="new-password" className={campo}
            />
          </div>

          <button
            type="button"
            onClick={() => setVisivel(v => !v)}
            className="mt-2 inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#7d4a3c] transition"
          >
            {visivel ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {visivel ? 'Ocultar senhas' : 'Mostrar senhas'}
          </button>

          <p className="text-xs text-gray-400 mt-3">
            Pedimos a senha atual para confirmar que é você — e a troca vale só para esta conta
            de RH, não para o acesso dos colaboradores ao aplicativo.
          </p>

          <div className="flex items-center gap-2 mt-4">
            <button
              type="submit"
              disabled={salvando}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#7d4a3c] hover:bg-[#623a2f] text-white text-sm font-semibold rounded-lg transition disabled:opacity-50"
            >
              <KeyRound className="w-4 h-4" />
              {salvando ? 'Alterando...' : 'Alterar senha'}
            </button>
            <button
              type="button"
              onClick={() => { limpar(); setAberto(false); }}
              className="px-4 py-2.5 text-sm text-gray-500 hover:text-gray-700 transition"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export const RhEmpresa: React.FC = () => {
  const { colaboradores } = useRhJornada();
  const { acesso, can } = useRhAccess();
  const podeEditarEmpresa = acesso.principal || can('empresa');
  const [perfil, setPerfil] = useState<EmpresaPerfil | null>(null);
  const [docs, setDocs] = useState<DocumentoLegal[]>([]);
  const [dadosCnpj, setDadosCnpj] = useState<EmpresaDadosCnpj | null>(null);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [resincronizando, setResincronizando] = useState(false);

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [emailLogin, setEmailLogin] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, d, emailDeAcesso, cnpj] = await Promise.all([
        rhService.getEmpresaPerfil(),
        rhService.getDocumentos(),
        rhService.getEmailDeAcesso(),
        rhService.getDadosCnpj().catch(() => null),
      ]);
      setPerfil(p);
      setDocs(d);
      setEmailLogin(emailDeAcesso);
      setDadosCnpj(cnpj);
      setNome(p?.responsavel_nome ?? '');
      setEmail(p?.responsavel_email ?? '');
      setTelefone(p?.responsavel_telefone ?? '');
    } catch (err) {
      console.error('Erro ao carregar área da empresa:', err);
      toast.error('Erro ao carregar os dados da empresa.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleResincronizar = async () => {
    setResincronizando(true);
    try {
      await rhService.resincronizarCnpj();
      toast.success('Dados do CNPJ atualizados.');
      const atualizado = await rhService.getDadosCnpj().catch(() => null);
      setDadosCnpj(atualizado);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível sincronizar agora.');
    } finally {
      setResincronizando(false);
    }
  };

  // Destino de "#documentos", vindo do passo da jornada.
  useScrollParaHash(!loading);

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    try {
      const res = await rhService.atualizarContato(nome, email, telefone);
      if (!res.ok) { toast.error(res.error || 'Não foi possível salvar.'); return; }
      toast.success('Contato do responsável atualizado.');
      await load();
    } finally {
      setSalvando(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7d4a3c]"></div>
      </div>
    );
  }

  if (!perfil) {
    return (
      <div className="bg-white rounded-xl shadow p-10 text-center">
        <AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-600 font-medium">Nenhuma empresa vinculada a esta conta.</p>
      </div>
    );
  }

  const pendentes = docs.filter(d => d.exige_aceite && !d.aceito_em).length;

  return (
    <div className="space-y-6">
      <div>
        <Link to="/rh/dashboard" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#7d4a3c] transition mb-2">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Link>
        <h1 className="text-2xl font-semibold text-gray-800">{perfil.nome}</h1>
        <p className="text-sm text-gray-500">Dados cadastrais e documentos da sua empresa.</p>
      </div>

      {/* ── Cadastro ── */}
      <div className="bg-white rounded-xl shadow p-5">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="w-5 h-5 text-[#7d4a3c]" />
          <h2 className="font-semibold text-gray-800">Dados cadastrais</h2>
        </div>

        <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
          <Campo label="Razão social">{perfil.nome}</Campo>
          <Campo label="CNPJ">{perfil.cnpj || '—'}</Campo>
          <Campo label="Início do contrato">{fmtDate(perfil.data_inicio)}</Campo>
          <Campo label="Situação">
            <span className={perfil.status === 'ativa' ? 'text-green-700' : 'text-amber-700'}>
              {perfil.status}
            </span>
          </Campo>
          <Campo label="Assentos contratados">{perfil.max_assentos ?? '—'}</Campo>
          <Campo label="Escopo contratado">
            {[perfil.modo_mental && 'Saúde mental', perfil.modo_metabolico && 'Saúde metabólica']
              .filter(Boolean).join(' · ') || '—'}
          </Campo>
        </dl>

        {/* Ocupação: veio do dashboard, onde disputava tela com o trabalho
            do dia a dia sem servir a nenhuma ação ali. Aqui é vizinha do
            número que a explica ("Assentos contratados"), que é o lugar
            certo para uma leitura de conta. */}
        {perfil.max_assentos != null && (() => {
          const usados = colaboradores.length;
          const pct = Math.min(100, (usados / perfil.max_assentos) * 100);
          const ativos = colaboradores.filter(c => c.status === 'ativo').length;
          const convidados = colaboradores.filter(c => c.status === 'convidado').length;
          const cheio = usados >= perfil.max_assentos;
          return (
            <div className="mb-5 rounded-lg bg-gray-50 px-4 py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm text-gray-700">
                <span>
                  <strong className="text-gray-900">{usados}</strong> de {perfil.max_assentos} assento(s) em uso
                  <span className="text-gray-500"> · {ativos} ativo(s) · {convidados} convidado(s)</span>
                </span>
                <span className="text-xs text-gray-500">{Math.round(pct)}% ocupado</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, background: cheio ? '#DC2626' : '#7d4a3c' }}
                />
              </div>
              {cheio && (
                <p className="mt-2 text-xs text-red-500">
                  Limite atingido. Remova um colaborador ou fale com a Malama para ampliar.
                </p>
              )}
            </div>
          );
        })()}

        <p className="text-xs text-gray-400 mb-4">
          Razão social, CNPJ, assentos e vigência fazem parte do contrato — para alterá-los,
          fale com a Malama. O contato abaixo você mesmo mantém atualizado.
        </p>

        <form onSubmit={handleSalvar} className="border-t border-gray-100 pt-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
            Responsável pela conta
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            <input
              type="text" value={nome} onChange={e => setNome(e.target.value)}
              placeholder="Nome do responsável"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#7d4a3c] focus:border-transparent"
            />
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="E-mail"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#7d4a3c] focus:border-transparent"
            />
            <input
              type="tel" value={telefone} onChange={e => setTelefone(e.target.value)}
              placeholder="Telefone"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#7d4a3c] focus:border-transparent"
            />
          </div>
          <button
            type="submit"
            disabled={salvando}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#7d4a3c] hover:bg-[#623a2f] text-white text-sm font-semibold rounded-lg transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {salvando ? 'Salvando...' : 'Salvar contato'}
          </button>
        </form>
      </div>

      {/* ── Dados oficiais do CNPJ (BrasilAPI) ──
          Complementa o "Dados cadastrais" acima (que é o registro do
          contrato Malama) com o que a Receita Federal tem sobre a empresa.
          Puxado sozinho no cadastro; o botão aqui é só para quando algo
          mudou fora do ciclo (ex.: CNAE, situação cadastral). */}
      <div className="bg-white rounded-xl shadow p-5">
        <div className="flex items-center justify-between gap-3 mb-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#7d4a3c]" />
            <h2 className="font-semibold text-gray-800">Dados oficiais do CNPJ</h2>
          </div>
          {podeEditarEmpresa && (
            <button
              type="button"
              onClick={handleResincronizar}
              disabled={resincronizando}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${resincronizando ? 'animate-spin' : ''}`} />
              {resincronizando ? 'Sincronizando...' : 'Ressincronizar'}
            </button>
          )}
        </div>
        <p className="mb-4 text-xs leading-relaxed text-gray-500">
          Vem direto da Receita Federal a partir do CNPJ cadastrado. O grau de risco é uma
          leitura preliminar do Anexo I da NR-4 — não substitui GRO, PGR nem decisão técnica.
        </p>

        {(!dadosCnpj || dadosCnpj.sync_status !== 'ok') && (
          <p className="mb-4 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            Dados cadastrais pendentes de sincronização.
            {dadosCnpj?.sync_erro ? ` (${dadosCnpj.sync_erro})` : ''}
          </p>
        )}

        {dadosCnpj?.sync_status === 'ok' && (
          <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Campo label="Razão social (Receita)">{dadosCnpj.razao_social || '—'}</Campo>
            <Campo label="Situação cadastral">{dadosCnpj.situacao_cadastral || '—'}</Campo>
            <Campo label="Porte">{dadosCnpj.porte || '—'}</Campo>
            <Campo label="CNAE principal">
              {dadosCnpj.cnae_principal_codigo
                ? `${dadosCnpj.cnae_principal_codigo} — ${dadosCnpj.cnae_principal_descricao || ''}`
                : '—'}
            </Campo>
            <Campo label="Natureza jurídica">{dadosCnpj.natureza_juridica || '—'}</Campo>
            <Campo label="Data de abertura">{fmtDate(dadosCnpj.data_abertura)}</Campo>
            <Campo label="Grau de risco estimado (NR-4)">
              {dadosCnpj.grau_risco_estimado ? `Grau ${dadosCnpj.grau_risco_estimado}` : '—'}
            </Campo>
            <Campo label="Última sincronização">
              {dadosCnpj.synced_at ? fmtDateTime(dadosCnpj.synced_at) : '—'}
            </Campo>
          </dl>
        )}
      </div>

      {/* Contexto declaratório usado pelo copiloto. O primeiro preenchimento
          acontece nas boas-vindas; depois, a edição mora com os demais dados
          da empresa — nunca dentro da conversa. */}
      <div className="bg-white rounded-xl shadow p-5">
        <div className="flex items-center gap-2 mb-1">
          <Building2 className="w-5 h-5 text-[#7d4a3c]" />
          <h2 className="font-semibold text-gray-800">Perfil da empresa</h2>
        </div>
        <p className="mb-4 text-xs leading-relaxed text-gray-500">
          Essas informações ajudam o copiloto a contextualizar as orientações. São declarações
          da empresa, não avaliação de risco nem documento técnico.
        </p>
        <PerfilEmpresaForm />
      </div>

      {/* ── Acesso ── */}
      <AcessoCard emailLogin={emailLogin} />

      {/* ── Documentos ──
          A âncora é o destino do passo "Documentos — a base legal da coleta",
          na jornada. Sem ela o passo largava a pessoa no topo desta página,
          em "Dados cadastrais": ela pedia para tratar do aceite e entregava
          o perfil da empresa, com os documentos fora da tela lá embaixo. */}
      <div id="documentos" className="scroll-mt-6 bg-white rounded-xl shadow p-5">
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck className="w-5 h-5 text-[#7d4a3c]" />
          <h2 className="font-semibold text-gray-800">Termos e documentos</h2>
          {pendentes > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
              {pendentes} aguardando aceite
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 mb-4">
          Cada aceite fica registrado com a versão do documento, a data e o nome de quem assinou.
          Publicar uma versão nova não apaga o registro da anterior.
        </p>

        {docs.length === 0 ? (
          <p className="text-sm text-gray-500">
            Nenhum documento publicado ainda.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {docs.map(doc => (
              <DocumentoItem key={doc.id} doc={doc} onAceito={load} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
