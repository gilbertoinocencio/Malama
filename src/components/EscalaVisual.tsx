// =====================================================
// Malama — Ilustração das opções de resposta (baixa literacia)
//
// Boa parte da base de produção das empresas clientes lê pouco. Ler seis
// rótulos parecidos ("mais da metade do tempo" / "menos da metade do tempo")
// e escolher entre eles é justamente o que essa pessoa não consegue fazer
// rápido — e questionário que cansa vira resposta no automático, que é pior
// do que não medir.
//
// A ilustração NÃO substitui o rótulo: o texto do instrumento validado
// continua na tela, palavra por palavra. Ela é uma âncora ao lado dele.
//
// DUAS ÂNCORAS, E A ESCOLHA NÃO É ESTÉTICA:
//
//   'valencia'  → carinhas. Só pode onde o topo da escala significa a mesma
//                 coisa em TODOS os itens do bloco.
//   'magnitude' → bolinhas de quantidade, sem juízo de valor. É o que sobra
//                 quando o bloco mistura itens positivos e negativos, porque
//                 ali a carinha mentiria: na Job Stress Scale, responder
//                 "frequentemente" é ruim em "trabalhar com muita rapidez" e
//                 bom em "tenho tempo suficiente". Carinha feliz fixada no
//                 topo enviesaria metade dos itens.
//
// Quem decide qual usar é o instrumento (campo `escalaVisual` do bloco), não
// esta tela — ver src/services/psychosocialInstruments.ts.
//
// Desenho em SVG inline, de propósito: os ícones do app vêm da fonte Material
// Symbols pelo CDN do Google, e carinha que não carrega no chão de fábrica
// sem sinal deixa o questionário ilegível para exatamente quem ela existe
// para atender. SVG inline não depende de rede nem de fonte do sistema
// (emoji, além disso, muda de desenho conforme o aparelho).
//
// Monocromático de propósito também: um vermelho na ponta triste faz a opção
// parecer "resposta errada" e empurra a pessoa para o meio da escala — num
// rastreio de saúde mental isso apaga justamente o caso que importa achar.
// =====================================================

import React from 'react';
import type { EscalaVisual as TipoEscala } from '../services/psychosocialInstruments';

interface Props {
  tipo: TipoEscala;
  /** Posição da opção na ordem impressa: 0 = topo da escala. */
  indice: number;
  /** Quantas opções o bloco tem. */
  total: number;
  ativo: boolean;
}

/** Carinha de boca variável. `nivel` 1 = alegre, 0,5 = neutra, 0 = triste. */
const Carinha: React.FC<{ nivel: number }> = ({ nivel }) => {
  // Controle da quadrática: abaixo da linha da boca = sorriso (em SVG o y
  // cresce para baixo), acima = boca virada para baixo.
  const cy = 14.5;
  const controle = cy + (nivel - 0.5) * 7.4;

  // Nas duas pontas a sobrancelha faz o rosto ser lido de relance, sem
  // precisar comparar a curvatura da boca com a da opção vizinha.
  const sobrancelha = nivel >= 0.8 || nivel <= 0.2;
  const inclinacao = nivel >= 0.8 ? -0.9 : 0.9;

  return (
    <svg viewBox="0 0 24 24" className="w-8 h-8" aria-hidden="true">
      <circle
        cx="12" cy="12" r="9.2"
        fill="none" stroke="currentColor" strokeWidth="1.5"
      />
      {sobrancelha && (
        <>
          <line
            x1="6.9" y1={7.9 - inclinacao} x2="10.1" y2={7.9 + inclinacao}
            stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"
          />
          <line
            x1="13.9" y1={7.9 + inclinacao} x2="17.1" y2={7.9 - inclinacao}
            stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"
          />
        </>
      )}
      <circle cx="8.9" cy="10.4" r="1.15" fill="currentColor" />
      <circle cx="15.1" cy="10.4" r="1.15" fill="currentColor" />
      <path
        d={`M 7.7 ${cy} Q 12 ${controle} 16.3 ${cy}`}
        fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
      />
    </svg>
  );
};

/** Bolinhas preenchidas = quantidade. Topo da escala = todas cheias. */
const Bolinhas: React.FC<{ cheias: number; total: number }> = ({ cheias, total }) => (
  <div className="flex items-center gap-1" aria-hidden="true">
    {Array.from({ length: total }, (_, i) => (
      <span
        key={i}
        className="rounded-full"
        style={{
          width: 7,
          height: 7,
          background: i < cheias ? 'currentColor' : 'transparent',
          border: i < cheias ? 'none' : '1.5px solid currentColor',
          opacity: i < cheias ? 1 : 0.35,
        }}
      />
    ))}
  </div>
);

export const EscalaVisual: React.FC<Props> = ({ tipo, indice, total, ativo }) => {
  // Índice 0 é o topo da escala (contrato de `options` no instrumento), então
  // o nível anda ao contrário do índice.
  const nivel = total > 1 ? (total - 1 - indice) / (total - 1) : 1;

  return (
    <div
      className="flex-shrink-0 flex items-center justify-center w-11 transition-opacity"
      style={{ opacity: ativo ? 1 : 0.75 }}
    >
      {tipo === 'valencia'
        ? <Carinha nivel={nivel} />
        : <Bolinhas cheias={total - indice} total={total} />}
    </div>
  );
};
