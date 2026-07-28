// =====================================================
// Malama — Modos contratados para o usuário logado
//
// Um colaborador enxerga o app conforme o que a empresa dele contratou:
//   modo_metabolico → nutrição, refeições, peso, body scan, GLP-1
//   modo_mental     → questionários, acompanhamento psicológico
//
// A resolução é do banco (RPC meus_modos), não do cliente: um usuário pode
// estar em mais de uma empresa e os modos se acumulam.
//
// Usuário B2C, sem vínculo com empresa, não tem modo nenhum — e nesse caso
// o app se comporta como sempre se comportou (metabólico). Tratar "sem
// vínculo" como metabólico é o que impede a conta pessoal de virar uma tela
// vazia depois desta mudança.
// =====================================================

import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

export type Modos = {
  mental: boolean;
  metabolico: boolean;
  /** true enquanto a consulta não voltou — não decida navegação antes disso. */
  loading: boolean;
};

const PADRAO_SEM_VINCULO: Omit<Modos, 'loading'> = { mental: false, metabolico: true };

export function useModos(userId: string | null | undefined): Modos {
  const [modos, setModos] = useState<Modos>({ ...PADRAO_SEM_VINCULO, loading: true });

  useEffect(() => {
    if (!userId) {
      setModos({ ...PADRAO_SEM_VINCULO, loading: false });
      return;
    }

    let cancelado = false;
    supabase.rpc('meus_modos')
      .then(({ data, error }) => {
        if (cancelado) return;
        if (error) {
          // Falha de rede não pode esconder o app: cai no comportamento antigo.
          console.error('[useModos]', error.message);
          setModos({ ...PADRAO_SEM_VINCULO, loading: false });
          return;
        }
        const row = Array.isArray(data) ? data[0] : data;
        const mental = row?.modo_mental === true;
        const metabolico = row?.modo_metabolico === true;

        // Sem vínculo ativo com empresa → B2C, comportamento de sempre.
        if (!mental && !metabolico) {
          setModos({ ...PADRAO_SEM_VINCULO, loading: false });
          return;
        }
        setModos({ mental, metabolico, loading: false });
      });

    return () => { cancelado = true; };
  }, [userId]);

  return modos;
}
