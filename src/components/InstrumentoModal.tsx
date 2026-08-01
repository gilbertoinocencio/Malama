// =====================================================
// Malama — Responder um instrumento de campanha (dentro do app, logado)
//
// Casca de modal em volta de InstrumentoQuestionario, que é quem aplica o
// instrumento. Aqui fica só o que é específico deste caminho: adiar, gravar
// pelo usuário logado e a tela de fim.
//
// Genérico de propósito: aplica QUALQUER instrumento do registro
// (psychosocialInstruments), não só o WHO-5.
//
// O escore é calculado pelo próprio instrumento (determinístico, nunca IA) e
// gravado com o campaign_id — o que mantém a resposta dentro da campanha que
// o RH abriu e fora de qualquer coisa nominal.
// =====================================================

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { PsychosocialService, type CampanhaPendente } from '../services/psychosocialService';
import { getInstrumento } from '../services/psychosocialInstruments';
import { InstrumentoQuestionario } from './InstrumentoQuestionario';
import toast from 'react-hot-toast';

const PETROL = '#7d4a3c';

interface Props {
  campanha: CampanhaPendente;
  onClose: () => void;
  onRespondida: () => void;
}

export const InstrumentoModal: React.FC<Props> = ({ campanha, onClose, onRespondida }) => {
  const { user } = useAuth();

  const def = useMemo(() => {
    try { return getInstrumento(campanha.instrument); } catch { return null; }
  }, [campanha.instrument]);

  const [enviando, setEnviando] = useState(false);
  const [concluido, setConcluido] = useState(false);

  if (!def) {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
        <div className="bg-white dark:bg-surface-dark rounded-3xl p-6 w-full max-w-md text-center">
          <p className="text-sm text-Malama-main dark:text-white mb-4">
            Este questionário ainda não está disponível no aplicativo.
          </p>
          <button onClick={onClose} className="text-sm font-semibold" style={{ color: PETROL }}>
            Fechar
          </button>
        </div>
      </div>
    );
  }

  const concluir = async (answers: Record<string, number>) => {
    if (!user) return;
    setEnviando(true);
    try {
      await PsychosocialService.submitCampanha(
        user.id, campanha.campaign_id, def.code, answers,
      );
      setConcluido(true);
      onRespondida();
    } catch (err: any) {
      console.error('[InstrumentoModal]', err);
      toast.error('Não foi possível enviar agora. Tente novamente mais tarde.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white dark:bg-surface-dark rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[92vh] overflow-y-auto"
      >
        {concluido ? (
          <div className="p-8 text-center">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: `${PETROL}15` }}
            >
              <span className="material-symbols-outlined text-3xl" style={{ color: PETROL }}>check</span>
            </div>
            <h2 className="text-xl font-bold text-Malama-main dark:text-white mb-2">Respostas enviadas</h2>
            {/* Frase curta e sem termo técnico ("agregado", "no mínimo"):
                a promessa de sigilo só serve se a pessoa entender. */}
            <p className="text-sm text-Malama-muted dark:text-slate-400 leading-snug mb-6">
              Obrigado. Ninguém da sua empresa vê a sua resposta. Ela recebe só um resumo por
              grupo, e apenas quando o grupo tem cinco pessoas ou mais.
            </p>
            <button
              onClick={onClose}
              className="w-full py-3.5 rounded-2xl text-white font-semibold"
              style={{ background: PETROL }}
            >
              Fechar
            </button>
          </div>
        ) : (
          <InstrumentoQuestionario
            def={def}
            enviando={enviando}
            onConcluir={concluir}
            onAdiar={() => {
              // Adiar silencia o modal por alguns dias — o questionário
              // continua listado na home e a janela do RH segue valendo.
              PsychosocialService.adiarCampanha(campanha.campaign_id);
              onClose();
            }}
          />
        )}
      </motion.div>
    </div>
  );
};
