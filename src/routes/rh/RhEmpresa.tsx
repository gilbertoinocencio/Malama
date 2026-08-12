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
// =====================================================

import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2, ArrowLeft, Save, FileText, ExternalLink, CheckCircle2,
  AlertCircle, ChevronDown, ChevronUp, ShieldCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  rhService, type EmpresaPerfil, type DocumentoLegal,
} from '../../services/empresaService';

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

  const pendente = doc.exige_aceite && !doc.aceito_em;

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
            <span className="text-xs text-gray-400">versão {doc.versao}</span>
            {doc.especifico && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-[#7d4a3c]/10 text-[#7d4a3c]">
                Contrato da sua empresa
              </span>
            )}
          </div>

          {doc.aceito_em ? (
            <p className="mt-1 text-xs text-green-700 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Aceito em {fmtDateTime(doc.aceito_em)} por {doc.aceito_por_nome}
              {doc.aceito_por_cargo ? ` · ${doc.aceito_por_cargo}` : ''}
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
          {/* Texto puro vindo do banco: whitespace-pre-wrap, nunca HTML. */}
          <div className="px-4 py-4 max-h-96 overflow-y-auto text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
            {doc.conteudo}
          </div>
        </div>
      )}

      {/* O aceite aparece depois de abrir o texto — ou de saída, quando o
          documento mora numa página externa e não há o que expandir aqui.
          Sem essa segunda condição, documento com URL e aceite obrigatório
          ficaria impossível de aceitar. */}
      {pendente && (aberto || !!doc.url) && (
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

export const RhEmpresa: React.FC = () => {
  const [perfil, setPerfil] = useState<EmpresaPerfil | null>(null);
  const [docs, setDocs] = useState<DocumentoLegal[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, d] = await Promise.all([
        rhService.getEmpresaPerfil(),
        rhService.getDocumentos(),
      ]);
      setPerfil(p);
      setDocs(d);
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

      {/* ── Documentos ── */}
      <div className="bg-white rounded-xl shadow p-5">
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
