// =====================================================
// Malama — Confirmação de união de setores
//
// Era um `confirm()` do navegador. É a operação mais destrutiva do painel:
// reescreve o setor gravado em sete tabelas, muda relatório já emitido e
// pode invalidar um link de campanha que já está impresso num cartaz na
// parede — e não se desfaz sozinha.
//
// O diálogo nativo entrega tudo isso como um parágrafo cinza com dois
// botões iguais, sem hierarquia e sem como destacar o que é irreversível.
// Também falava em "coortes", termo que nunca foi explicado a ninguém.
//
// Exige digitar o nome do setor que vai desaparecer. Não é cerimônia: em
// lista de setores parecidos ("TI" e "T.I.") o clique errado é fácil, e a
// digitação é o que força a pessoa a ler qual dos dois ela está apagando.
// =====================================================

import React, { useEffect, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

export type UniaoPendente = {
  origem: string;
  destino: string;
  /** Quantas pessoas mudam de setor. */
  pessoas: number;
};

export const ConfirmarUniaoSetor: React.FC<{
  uniao: UniaoPendente;
  salvando: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
}> = ({ uniao, salvando, onConfirmar, onCancelar }) => {
  const [digitado, setDigitado] = useState('');
  const confere = digitado.trim().toLowerCase() === uniao.origem.trim().toLowerCase();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !salvando) onCancelar(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancelar, salvando]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="uniao-titulo"
        className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 pb-4 pt-5">
          <div className="flex min-w-0 gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 id="uniao-titulo" className="text-lg font-semibold leading-snug text-gray-900">
                Unir “{uniao.origem}” em “{uniao.destino}”?
              </h2>
              <p className="mt-0.5 text-sm text-gray-500">Isto não pode ser desfeito automaticamente.</p>
            </div>
          </div>
          {/* "Fechar", e não "Cancelar": o rodapé já tem um botão Cancelar, e
              dois controles com o mesmo nome acessível no mesmo diálogo
              deixam quem navega por leitor de tela sem saber qual é qual. */}
          <button
            type="button" onClick={onCancelar} disabled={salvando}
            aria-label="Fechar" className="shrink-0 rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 disabled:opacity-40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-3 px-6 py-5">
          <ul className="flex flex-col gap-2 text-sm text-gray-600">
            <li className="flex gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gray-300" />
              <span>
                <strong className="text-gray-800">{uniao.pessoas} pessoa(s)</strong>, além dos
                afastamentos, atendimentos e itens do plano de ação, passam para “{uniao.destino}”.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gray-300" />
              <span>
                Os relatórios de períodos anteriores passam a contar os dois setores como um só.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gray-300" />
              <span>
                Se os dois já receberam link da mesma campanha, o link de “{uniao.origem}” deixa de
                funcionar — inclusive um QR já impresso.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gray-300" />
              <span>“{uniao.origem}” deixa de existir.</span>
            </li>
          </ul>

          <label className="mt-1 block text-sm font-medium text-gray-700">
            Para confirmar, digite <span className="font-semibold text-gray-900">{uniao.origem}</span>
            <input
              type="text"
              value={digitado}
              onChange={e => setDigitado(e.target.value)}
              disabled={salvando}
              autoFocus
              className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-normal focus:border-transparent focus:ring-2 focus:ring-[#7d4a3c] disabled:bg-gray-50"
            />
          </label>
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-gray-100 bg-gray-50 px-6 py-4">
          <button
            type="button" onClick={onCancelar} disabled={salvando}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100 disabled:opacity-40"
          >
            Cancelar
          </button>
          <button
            type="button" onClick={onConfirmar} disabled={!confere || salvando}
            className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-800 disabled:opacity-40"
          >
            {salvando ? 'Unindo...' : 'Unir os setores'}
          </button>
        </div>
      </div>
    </div>
  );
};
