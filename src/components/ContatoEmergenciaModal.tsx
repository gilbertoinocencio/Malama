// =====================================================
// Malama — Contato de emergência
//
// O cadastro do modo Mental coleta este contato, mas quem já tinha conta
// antes dele nunca passou por lá — e o psicólogo, ao precisar, recebe
// "o paciente não cadastrou". Este modal é o caminho para essas pessoas.
//
// Fica em componente próprio (e não dentro de ProfileConfig) porque a tela
// de perfil é toda metabólica — biotipo, peso, altura, metas — e o usuário
// do modo Mental sequer chega nela: a navegação dele não tem perfil.
// =====================================================

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const PETROL = '#7d4a3c';

const inputCls =
  'w-full px-4 py-3 rounded-2xl border border-Malama-border dark:border-white/10 '
  + 'bg-white dark:bg-surface-dark text-Malama-main dark:text-white text-sm '
  + 'outline-none focus:border-[#7d4a3c] transition-colors';

export const ContatoEmergenciaModal: React.FC<{
  onClose: () => void;
  onSalvo?: () => void;
}> = ({ onClose, onSalvo }) => {
  const { user, profile, refreshProfile } = useAuth();
  const p = profile as any;

  const [nome, setNome] = useState(p?.contato_emergencia_nome ?? '');
  const [telefone, setTelefone] = useState(p?.contato_emergencia_telefone ?? '');
  const [relacao, setRelacao] = useState(p?.contato_emergencia_relacao ?? '');
  const [salvando, setSalvando] = useState(false);

  const salvar = async () => {
    if (!user) return;
    if (!nome.trim() || !telefone.trim()) {
      toast.error('Informe pelo menos nome e telefone.');
      return;
    }
    setSalvando(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          contato_emergencia_nome: nome.trim(),
          contato_emergencia_telefone: telefone.trim(),
          contato_emergencia_relacao: relacao.trim() || null,
        })
        .eq('id', user.id);
      if (error) throw error;
      await refreshProfile();
      toast.success('Contato salvo.');
      onSalvo?.();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Não foi possível salvar.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white dark:bg-surface-dark rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[92vh] overflow-y-auto p-6"
      >
        <div className="flex items-start justify-between gap-3 mb-1">
          <h2 className="text-lg font-bold text-Malama-main dark:text-white">
            Contato de emergência
          </h2>
          <button onClick={onClose} className="text-xs text-Malama-muted flex-shrink-0">
            Fechar
          </button>
        </div>
        <p className="text-sm text-Malama-muted dark:text-slate-400 mb-4 leading-snug">
          Alguém de sua confiança que possa ser acionado se houver risco à sua segurança.
        </p>

        <div
          className="rounded-2xl p-3 mb-5 border"
          style={{ borderColor: `${PETROL}25`, background: `${PETROL}08` }}
        >
          <p className="text-xs text-Malama-muted dark:text-slate-400 leading-snug">
            Fica <strong>oculto</strong> e só aparece para o profissional que te atende, quando ele
            avaliar que é necessário. O aplicativo nunca liga nem envia mensagem para essa pessoa
            por conta própria.
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-Malama-muted dark:text-slate-400 mb-1">Nome</label>
            <input value={nome} onChange={e => setNome(e.target.value)}
                   className={inputCls} placeholder="Nome da pessoa" />
          </div>
          <div>
            <label className="block text-xs text-Malama-muted dark:text-slate-400 mb-1">Telefone</label>
            <input type="tel" value={telefone} onChange={e => setTelefone(e.target.value)}
                   className={inputCls} placeholder="(11) 90000-0000" />
          </div>
          <div>
            <label className="block text-xs text-Malama-muted dark:text-slate-400 mb-1">Relação</label>
            <input value={relacao} onChange={e => setRelacao(e.target.value)}
                   className={inputCls} placeholder="Mãe, cônjuge, amigo..." />
          </div>
        </div>

        <button
          onClick={salvar}
          disabled={salvando}
          className="w-full mt-6 py-3.5 rounded-2xl text-white font-semibold disabled:opacity-50"
          style={{ background: PETROL }}
        >
          {salvando ? 'Salvando...' : 'Salvar'}
        </button>
      </motion.div>
    </div>
  );
};

/** true quando o contato ainda não foi preenchido. */
export function faltaContatoEmergencia(profile: unknown): boolean {
  const p = profile as any;
  if (!p) return false; // perfil ainda carregando — não cobra
  return !p.contato_emergencia_telefone;
}
