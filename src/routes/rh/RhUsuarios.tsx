import React, { useEffect, useState } from 'react';
import { Check, MailPlus, Pencil, Shield, UserRoundCheck, X } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  rhService, type RhPapel, type RhPermissao, type RhUsuarioEquipe,
} from '../../services/empresaService';

const permissoes: { id: RhPermissao; label: string; detalhe: string }[] = [
  { id: 'colaboradores', label: 'Colaboradores', detalhe: 'Lista, convites e cadastro' },
  { id: 'saude_mental', label: 'Saúde mental', detalhe: 'Campanhas e dados agregados' },
  { id: 'absenteismo', label: 'Absenteísmo', detalhe: 'Indicadores e afastamentos' },
  { id: 'plano_acao', label: 'Plano de ação', detalhe: 'Medidas, prazos e evidências' },
  { id: 'importar', label: 'Importar', detalhe: 'Planilhas e dados administrativos' },
  { id: 'financeiro', label: 'Financeiro', detalhe: 'Contrato e valores' },
  { id: 'compliance', label: 'Compliance', detalhe: 'Documentos e certificados' },
  { id: 'empresa', label: 'Dados da empresa', detalhe: 'Cadastro e termos' },
  { id: 'apuracao', label: 'Apuração confidencial', detalhe: 'Abre narrativas e envolvidos dos relatos' },
];

const templates: Record<Exclude<RhPapel, 'proprietario'>, RhPermissao[]> = {
  gestor_rh: ['colaboradores', 'saude_mental', 'absenteismo', 'plano_acao', 'importar', 'compliance', 'empresa'],
  saude_mental: ['saude_mental', 'plano_acao'],
  compliance: ['compliance', 'plano_acao', 'apuracao'],
  financeiro: ['financeiro'],
  personalizado: [],
};

const papelLabel: Record<RhPapel, string> = {
  proprietario: 'Usuário principal', gestor_rh: 'Gestor de RH', saude_mental: 'Saúde mental',
  compliance: 'Compliance / apuração', financeiro: 'Financeiro', personalizado: 'Personalizado',
};

type FormState = {
  id?: string; nome: string; email: string; papel: Exclude<RhPapel, 'proprietario'>;
  permissoes: RhPermissao[]; ativo: boolean;
};
const vazio: FormState = { nome: '', email: '', papel: 'gestor_rh', permissoes: templates.gestor_rh, ativo: true };

export const RhUsuarios: React.FC = () => {
  const [usuarios, setUsuarios] = useState<RhUsuarioEquipe[]>([]);
  const [form, setForm] = useState<FormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const carregar = () => rhService.getUsuariosEquipe()
    .then(setUsuarios)
    .catch(e => { toast.error(e.message); })
    .finally(() => setLoading(false));
  useEffect(() => { void carregar(); }, []);

  const selecionarPapel = (papel: FormState['papel']) => {
    setForm(f => f ? { ...f, papel, permissoes: templates[papel] } : f);
  };

  const toggle = (p: RhPermissao) => setForm(f => !f ? f : ({
    ...f,
    papel: 'personalizado',
    permissoes: f.permissoes.includes(p) ? f.permissoes.filter(x => x !== p) : [...f.permissoes, p],
  }));

  const salvar = async () => {
    if (!form) return;
    if (!form.nome.trim() || (!form.id && !form.email.trim())) return toast.error('Preencha nome e e-mail.');
    setSalvando(true);
    try {
      if (form.id) {
        await rhService.atualizarUsuarioEquipe({
          id: form.id, nome: form.nome, papel: form.papel,
          permissoes: form.permissoes, ativo: form.ativo,
        });
        toast.success('Acesso atualizado.');
      } else {
        await rhService.convidarUsuarioEquipe({
          nome: form.nome, email: form.email, papel: form.papel, permissoes: form.permissoes,
        });
        toast.success('Convite enviado.');
      }
      setForm(null);
      setLoading(true);
      await carregar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível salvar.');
    } finally { setSalvando(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuários e permissões</h1>
          <p className="text-sm text-gray-500 mt-1">Crie acessos individuais e mostre a cada pessoa somente as funções necessárias.</p>
        </div>
        <button onClick={() => setForm({ ...vazio, permissoes: [...vazio.permissoes] })} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#7d4a3c] text-white text-sm font-semibold">
          <MailPlus className="w-4 h-4" /> Novo usuário
        </button>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex gap-3 text-sm text-amber-900">
        <Shield className="w-5 h-5 flex-shrink-0" />
        <p><strong>Apuração confidencial</strong> permite ler relatos de assédio ou violência, nomes citados e detalhes. Conceda somente à equipe formalmente responsável e, de preferência, a mais de uma pessoa independente.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {loading ? <div className="p-10 text-center text-gray-400">Carregando...</div> : usuarios.map(u => (
          <div key={u.id} className="p-4 border-b border-gray-100 last:border-0 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center"><UserRoundCheck className="w-5 h-5 text-[#7d4a3c]" /></div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-gray-900">{u.nome || u.email}</p>
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{papelLabel[u.papel]}</span>
                {!u.ativo && <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600">Desativado</span>}
              </div>
              <p className="text-sm text-gray-500 truncate">{u.email}</p>
              {!u.principal && <p className="text-xs text-gray-400 mt-1">{u.permissoes.map(p => permissoes.find(x => x.id === p)?.label).filter(Boolean).join(' · ') || 'Sem módulos liberados'}</p>}
            </div>
            {!u.principal && <button onClick={() => setForm({ id: u.id, nome: u.nome ?? '', email: u.email, papel: u.papel === 'proprietario' ? 'personalizado' : u.papel, permissoes: [...u.permissoes], ativo: u.ativo })} className="p-2 text-gray-500 hover:text-[#7d4a3c]" title="Editar"><Pencil className="w-4 h-4" /></button>}
          </div>
        ))}
      </div>

      {form && (
        <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4" onMouseDown={() => setForm(null)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl" onMouseDown={e => e.stopPropagation()}>
            <div className="p-5 border-b flex items-center justify-between">
              <h2 className="font-bold text-lg">{form.id ? 'Editar acesso' : 'Convidar usuário'}</h2>
              <button onClick={() => setForm(null)}><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-5 space-y-5">
              <div className="grid sm:grid-cols-2 gap-4">
                <label className="text-sm font-medium text-gray-700">Nome<input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} className="mt-1 w-full border rounded-lg px-3 py-2 font-normal" /></label>
                <label className="text-sm font-medium text-gray-700">E-mail<input type="email" disabled={Boolean(form.id)} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="mt-1 w-full border rounded-lg px-3 py-2 font-normal disabled:bg-gray-50" /></label>
              </div>
              <label className="block text-sm font-medium text-gray-700">Função
                <select value={form.papel} onChange={e => selecionarPapel(e.target.value as FormState['papel'])} className="mt-1 w-full border rounded-lg px-3 py-2 bg-white font-normal">
                  <option value="gestor_rh">Gestor de RH</option><option value="saude_mental">Saúde mental</option><option value="compliance">Compliance / apuração</option><option value="financeiro">Financeiro</option><option value="personalizado">Personalizado</option>
                </select>
              </label>
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Módulos liberados</p>
                <div className="grid sm:grid-cols-2 gap-2">{permissoes.map(p => {
                  const marcado = form.permissoes.includes(p.id);
                  return <button type="button" key={p.id} onClick={() => toggle(p.id)} className={`text-left p-3 rounded-xl border flex gap-3 ${marcado ? 'border-[#7d4a3c] bg-[#7d4a3c]/5' : 'border-gray-200'}`}>
                    <span className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center ${marcado ? 'bg-[#7d4a3c] text-white' : 'border'}`}>{marcado && <Check className="w-3.5 h-3.5" />}</span>
                    <span><span className="block text-sm font-medium">{p.label}</span><span className="block text-xs text-gray-500">{p.detalhe}</span></span>
                  </button>;
                })}</div>
              </div>
              {form.id && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.ativo} onChange={e => setForm({ ...form, ativo: e.target.checked })} /> Usuário ativo</label>}
            </div>
            <div className="p-5 border-t flex justify-end gap-3"><button onClick={() => setForm(null)} className="px-4 py-2 text-sm">Cancelar</button><button disabled={salvando} onClick={salvar} className="px-5 py-2 rounded-lg bg-[#7d4a3c] text-white text-sm font-semibold disabled:opacity-50">{salvando ? 'Salvando...' : form.id ? 'Salvar acesso' : 'Enviar convite'}</button></div>
          </div>
        </div>
      )}
    </div>
  );
};
