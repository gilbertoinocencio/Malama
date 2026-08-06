import React, { forwardRef, useEffect, useLayoutEffect, useRef, useState } from 'react';

/**
 * Fundo do card. O modelo é o do Strava: o dado é sempre o mesmo, o que muda é
 * o que está atrás dele — e o mais usado é a foto do próprio usuário.
 */
export type ShareBackground =
  /** Foto escolhida pelo usuário (data URL). */
  | { kind: 'photo'; uri: string }
  /** PNG com alpha, para o usuário soltar por cima do story dele. */
  | { kind: 'transparent' }
  /** Fundo sólido ou gradiente do app. */
  | { kind: 'fill'; css: string; dark?: boolean };

const LOGO_SRC = '/malama-logo-transparent.png';

let logoCache: string | null = null;

/**
 * Converte o logotipo para data URI uma vez por sessão.
 *
 * O html2canvas captura de um canvas e imagens que ainda não carregaram somem
 * do resultado. Com data URI o desenho é síncrono e a marca nunca falta no card
 * exportado — que é justamente o que precisa aparecer.
 */
export function useBrandLogo(): string | null {
  const [logo, setLogo] = useState<string | null>(logoCache);

  useEffect(() => {
    if (logoCache) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(LOGO_SRC);
        const blob = await res.blob();
        const uri = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        logoCache = uri;
        if (!cancelled) setLogo(uri);
      } catch {
        /* sem logo o card ainda sai; melhor que não sair */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return logo;
}

/**
 * Caixa real do lockup dentro do PNG, medida pelo canal alpha.
 *
 * O arquivo é 500×500 mas a marca ocupa só a faixa 446×119 do meio — exibir a
 * imagem inteira colocaria um logotipo minúsculo perdido no meio de um quadrado
 * vazio. Estes números recortam exatamente a marca.
 */
const LOGO_BOX = { w: 500, h: 500, x: 45, y: 181, cw: 446, ch: 119 };

/**
 * Marca em pastilha clara.
 *
 * O logotipo é terracota e cinza sobre transparente, desenhado para fundo
 * claro: numa foto qualquer ou num card escuro ele sumiria. A pastilha garante
 * o mesmo lockup legível em cima de qualquer coisa — e dá uma assinatura só,
 * igual em todos os cards.
 */
/**
 * `height` é em `em`, não px: assim a marca acompanha a escala do card, que se
 * ajusta à largura em que está sendo exibido.
 */
export const ShareBrand: React.FC<{ className?: string; height?: number }> = ({
  className = '',
  height = 1.25,
}) => {
  const logo = useBrandLogo();
  const k = height / LOGO_BOX.ch;

  return (
    <div
      // O anel existe para a pastilha não sumir nos fundos claros, onde ela
      // fica creme sobre creme.
      className={`inline-flex shrink-0 items-center rounded-full bg-[#FDFBF9] px-[0.9em] py-[0.55em] shadow-md ring-1 ring-black/[0.06] ${className}`}
    >
      {logo ? (
        <div
          className="relative overflow-hidden"
          style={{ width: `${LOGO_BOX.cw * k}em`, height: `${height}em` }}
          role="img"
          aria-label="Malama"
        >
          <img
            src={logo}
            alt=""
            className="absolute max-w-none"
            style={{
              width: `${LOGO_BOX.w * k}em`,
              left: `${-LOGO_BOX.x * k}em`,
              top: `${-LOGO_BOX.y * k}em`,
            }}
          />
        </div>
      ) : (
        <span className="font-libre text-[0.85em] font-bold tracking-wide text-[#8c473e]">
          Malama
        </span>
      )}
    </div>
  );
};

/** Largura de referência do desenho. A 360px o card usa fonte base de 16px. */
const DESIGN_WIDTH = 360;
const BASE_FONT = 16;

interface ShareCardShellProps {
  background: ShareBackground;
  /** 9:16 para stories, 1:1 para feed. */
  aspect?: 'story' | 'square';
  children: React.ReactNode;
}

/**
 * Moldura comum a todos os cards: fundo, véu de legibilidade e assinatura.
 * O conteúdo de dados entra como children e não precisa saber onde está.
 */
export const ShareCardShell = forwardRef<HTMLDivElement, ShareCardShellProps>(
  ({ background, aspect = 'story', children }, ref) => {
    // O conteúdo é dimensionado em `em`, e a fonte base acompanha a largura do
    // card. Sem isso o mesmo card quebrava na pré-visualização pequena (número
    // estourando a borda, macro cortado) e só ficava certo no tamanho de
    // exportação.
    const innerRef = useRef<HTMLDivElement | null>(null);
    const [fontSize, setFontSize] = useState(BASE_FONT);

    useLayoutEffect(() => {
      const el = innerRef.current;
      if (!el) return;
      const apply = () => {
        const w = el.getBoundingClientRect().width;
        if (w > 0) setFontSize((w / DESIGN_WIDTH) * BASE_FONT);
      };
      apply();
      const ro = new ResizeObserver(apply);
      ro.observe(el);
      return () => ro.disconnect();
    }, []);

    const isPhoto = background.kind === 'photo';
    const isTransparent = background.kind === 'transparent';
    // Sobre foto ou sobre o story do usuário, o texto tem que sobreviver a
    // qualquer imagem: claro, com sombra e sobre um véu escuro.
    const onDark = isPhoto || isTransparent || (background.kind === 'fill' && background.dark);

    // O nó é ao mesmo tempo o alvo da captura (ref de fora) e o que medimos.
    const setRefs = (node: HTMLDivElement | null) => {
      innerRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
    };

    return (
      <div
        ref={setRefs}
        className={`relative w-full overflow-hidden ${aspect === 'story' ? 'aspect-[9/16]' : 'aspect-square'}`}
        style={background.kind === 'fill' ? { background: background.css } : undefined}
      >
        {isPhoto && (
          <img src={background.uri} alt="" className="absolute inset-0 h-full w-full object-cover" />
        )}

        {/* Véu só sobre foto. No modo transparente ele seria assado no PNG:
            o usuário soltaria no story dele e apareceria um retângulo escuro
            justamente onde não devia ter nada. Lá a legibilidade fica por conta
            da sombra do texto. */}
        {isPhoto && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-black/30" />
        )}

        <div
          // A folga extra embaixo não é estética: o html2canvas desenha texto
          // um pouco mais baixo que o navegador, e o desvio se acumula na
          // pilha. Sem ela, a última linha do card sai cortada no PNG.
          className={`absolute inset-0 flex flex-col justify-between px-[2em] pt-[2em] pb-[2.7em] ${onDark ? 'text-white' : 'text-[#221910]'}`}
          style={
            onDark
              ? {
                fontSize,
                // Sem véu, é a sombra que segura o texto por cima de qualquer
                // foto — daí ser mais densa no modo transparente.
                textShadow: isTransparent
                  ? '0 1px 3px rgba(0,0,0,0.55), 0 2px 16px rgba(0,0,0,0.45)'
                  : '0 2px 12px rgba(0,0,0,0.35)',
              }
              : { fontSize }
          }
        >
          {children}
        </div>
      </div>
    );
  }
);

ShareCardShell.displayName = 'ShareCardShell';
