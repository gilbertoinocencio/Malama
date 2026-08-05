import React, { useRef, useState } from 'react';
import { DailyStats } from '../types';
import { useLanguage } from '../i18n';
import { useShareCard } from '../hooks/useShareCard';
import { getLocalDateString } from '../utils/dateUtils';
import { pickImageFromGallery } from '../lib/pickImage';
import { ShareCardShell, ShareBrand, ShareBackground } from './share/ShareCardShell';

interface SocialShareProps {
  stats: DailyStats;
  onClose: () => void;
}

type ShareView = 'LANDING' | 'CUSTOMIZE';
type BackgroundId = 'photo' | 'transparent' | 'cream' | 'forest' | 'sunset' | 'ink';

interface BackgroundOption {
  id: BackgroundId;
  /** Ícone do chip no seletor. */
  icon: string;
  swatch: string;
  background: ShareBackground;
}

/**
 * Fundos disponíveis. 'photo' e 'transparent' vêm primeiro de propósito: são os
 * dois que o usuário mais usa no Strava — a própria foto e o card sem fundo
 * para soltar por cima do story dele.
 */
const BACKGROUNDS: BackgroundOption[] = [
  {
    id: 'photo',
    icon: 'add_photo_alternate',
    swatch: 'linear-gradient(135deg, #6b7280, #1f2937)',
    background: { kind: 'transparent' }, // trocado pela foto assim que escolhida
  },
  {
    id: 'transparent',
    icon: 'check_box_outline_blank',
    swatch:
      'repeating-conic-gradient(#d7d2cd 0% 25%, #f4f1ee 0% 50%) 50% / 14px 14px',
    background: { kind: 'transparent' },
  },
  {
    id: 'cream',
    icon: 'wb_sunny',
    swatch: '#FDFBF9',
    background: { kind: 'fill', css: '#FDFBF9' },
  },
  {
    id: 'forest',
    icon: 'eco',
    swatch: 'radial-gradient(circle at 30% 20%, #d8ecd6, #3f7a53)',
    background: {
      kind: 'fill',
      css: 'radial-gradient(circle at 25% 20%, #d8ecd6 0%, #6ba173 40%, #23492f 100%)',
      dark: true,
    },
  },
  {
    id: 'sunset',
    icon: 'wb_twilight',
    swatch: 'linear-gradient(160deg, #f6a45c, #7d4a3c)',
    background: {
      kind: 'fill',
      css: 'linear-gradient(160deg, #f6a45c 0%, #d47311 45%, #7d4a3c 100%)',
      dark: true,
    },
  },
  {
    id: 'ink',
    icon: 'dark_mode',
    swatch: '#221910',
    background: { kind: 'fill', css: '#221910', dark: true },
  },
];

export const SocialShare: React.FC<SocialShareProps> = ({ stats, onClose }) => {
  const { t, language } = useLanguage();
  const ts = t.social;
  const { share, sharing } = useShareCard();
  const [view, setView] = useState<ShareView>('LANDING');
  const [backgroundId, setBackgroundId] = useState<BackgroundId>('cream');
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const localeMap: Record<string, string> = { en: 'en-US', pt: 'pt-BR', es: 'es-ES' };
  const locale = localeMap[language] || 'pt-BR';

  const cardRef = useRef<HTMLDivElement>(null);

  const option = BACKGROUNDS.find(b => b.id === backgroundId) ?? BACKGROUNDS[2];
  const background: ShareBackground =
    backgroundId === 'photo' && photoUri ? { kind: 'photo', uri: photoUri } : option.background;

  const isTransparent = background.kind === 'transparent';

  const handlePickPhoto = async () => {
    const uri = await pickImageFromGallery();
    if (uri) {
      setPhotoUri(uri);
      setBackgroundId('photo');
    }
  };

  const handleSelectBackground = (id: BackgroundId) => {
    if (id === 'photo' && !photoUri) {
      void handlePickPhoto();
      return;
    }
    setBackgroundId(id);
  };

  const handleShare = () =>
    share(
      cardRef.current,
      {
        filename: `Malama-share-${getLocalDateString()}`,
        title: ts.shareTitle,
        text: `${stats.consumedCalories ?? 0} ${ts.calories}`,
        // Fundo transparente só sobrevive no PNG se a captura não pintar nada
        // atrás — é o modo inteiro do card sem fundo.
        backgroundColor: null,
      },
      { type: 'day', headline: ts.dailyFlow, subline: `${stats.consumedCalories ?? 0} ${ts.calories}` }
    );

  const consumed = stats.consumedCalories ?? 0;
  const target = stats.targetCalories ?? 0;
  const pctOfTarget = target > 0 ? Math.min(Math.round((consumed / target) * 100), 100) : 0;

  // Sem fundo não há véu por baixo, e o card pode cair sobre uma foto clara.
  // Texto secundário rebaixado sumiria — aqui ele vai quase cheio.
  const dim = isTransparent ? 'opacity-90' : 'opacity-65';
  const dimStrong = isTransparent ? 'opacity-95' : 'opacity-70';
  const hairline = isTransparent ? 'opacity-40' : 'opacity-25';

  /**
   * O bloco de dados é o mesmo em todos os fundos — é ele a identidade.
   *
   * Ancorado embaixo, e não centralizado: sobre a foto do usuário, um bloco no
   * meio cobre justamente o assunto da imagem. Embaixo, os dois terços de cima
   * ficam livres para a foto aparecer.
   */
  const renderCard = () => (
    <ShareCardShell ref={cardRef} background={background}>
      {/* Tudo em `em`: a ShareCardShell ajusta a fonte base à largura do card,
          então o mesmo desenho serve à pré-visualização pequena e ao PNG de
          1080px sem estourar nem cortar. */}
      <div className="flex items-start justify-between gap-[0.75em]">
        <p className={`pt-[0.35em] text-[0.6em] font-semibold uppercase leading-[1.5] tracking-[0.22em] ${dim}`}>
          {new Date().toLocaleDateString(locale, { day: 'numeric', month: 'short' })}
          <br />
          {new Date().toLocaleDateString(locale, { weekday: 'long' })}
        </p>
        <ShareBrand height={1.1} />
      </div>

      <div className="flex flex-col gap-[1.4em]">
        <div>
          <p className={`text-[0.62em] font-bold uppercase tracking-[0.35em] ${dimStrong}`}>
            {ts.calories}
          </p>
          <h1 className="mt-[0.06em] font-display text-[5.1em] font-extrabold leading-[0.82] tracking-[-0.045em]">
            {consumed.toLocaleString(locale)}
          </h1>
        </div>

        {/* Barra de meta: o número sozinho não diz se o dia foi bom. */}
        {target > 0 && (
          <div className="flex flex-col gap-[0.5em]">
            {/* Trilho e preenchimento em camadas: o modificador de opacidade do
                Tailwind não funciona sobre `currentColor`. */}
            <div className="relative h-[0.19em] w-full overflow-hidden rounded-full">
              <div className={`absolute inset-0 bg-current ${hairline}`} />
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-current"
                style={{ width: `${pctOfTarget}%` }}
              />
            </div>
            <span className={`text-[0.56em] font-semibold uppercase tracking-[0.2em] ${dim}`}>
              {pctOfTarget}% {ts.ofTarget}
            </span>
          </div>
        )}

        <div className="flex items-stretch">
          {[
            { l: ts.protein, v: stats.macros.protein },
            { l: ts.carbs, v: stats.macros.carbs },
            { l: ts.fat, v: stats.macros.fats },
          ].map((m, i) => (
            <React.Fragment key={m.l}>
              {i > 0 && (
                <div className={`mx-[0.85em] h-[2em] w-px self-center bg-current ${hairline}`} />
              )}
              <div className="flex flex-col">
                <span className="text-[1.2em] font-bold leading-none">{Math.round(m.v)}g</span>
                <span className={`mt-[0.5em] text-[0.55em] uppercase tracking-[0.16em] ${dim}`}>
                  {m.l}
                </span>
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>
    </ShareCardShell>
  );

  const shareButtonLabel = sharing ? ts.sharing : ts.shareStory;

  if (view === 'LANDING') {
    return (
      <div className="fixed inset-0 z-50 flex h-full flex-col overflow-y-auto bg-background-light font-display text-slate-900 hide-scrollbar animate-fade-in dark:bg-background-dark dark:text-white">
        <header className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-gray-100 bg-background-light/95 px-4 pb-2 pt-safe-header backdrop-blur-sm dark:border-white/10 dark:bg-background-dark/95">
          <button
            onClick={onClose}
            className="flex size-10 shrink-0 items-center justify-start transition-opacity hover:opacity-70"
          >
            <span className="material-symbols-outlined text-2xl">arrow_back</span>
          </button>
          {/* min-w-0 + truncate: sem isso o título empurrava o "Concluído" para
              fora e os dois se sobrepunham. */}
          <h2 className="min-w-0 flex-1 truncate text-center text-lg font-bold tracking-[-0.015em]">
            {ts.shareTitle}
          </h2>
          <button
            onClick={onClose}
            className="shrink-0 text-base font-bold text-primary transition-colors hover:text-primary/80"
          >
            {ts.done}
          </button>
        </header>

        <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center px-4 pb-8">
          <div className="w-full pb-4 pt-6">
            <h3 className="text-center text-2xl font-bold leading-tight tracking-tight">
              {ts.preview}
            </h3>
          </div>

          <div
            className={`mx-auto w-full max-w-[286px] overflow-hidden rounded-2xl shadow-2xl ${isTransparent ? 'checker-bg' : ''}`}
          >
            {renderCard()}
          </div>

          <div className="mt-8 w-full px-2">
            <button
              onClick={handleShare}
              disabled={sharing}
              className="flex h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-6 font-bold text-white transition-all duration-200 active:scale-[0.98] disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-[20px]">ios_share</span>
              <span className="truncate text-base">{shareButtonLabel}</span>
            </button>
          </div>

          <div className="mt-3 w-full px-2">
            <button
              onClick={() => setView('CUSTOMIZE')}
              className="flex h-12 w-full cursor-pointer items-center justify-center rounded-xl bg-primary/10 px-6 text-primary transition-all duration-200 hover:bg-primary/20 dark:bg-primary/20 dark:hover:bg-primary/30"
            >
              <span className="material-symbols-outlined mr-2 text-[20px]">tune</span>
              <span className="truncate text-sm font-bold tracking-[0.015em]">{ts.customize}</span>
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex h-full flex-col overflow-y-auto bg-[#f8f7f6] font-display text-[#181411] hide-scrollbar animate-fade-in dark:bg-[#221910] dark:text-[#f8f7f6]">
      <header className="sticky top-0 z-20 flex items-center gap-2 bg-[#f8f7f6]/95 px-4 pb-4 pt-safe-header backdrop-blur-sm dark:bg-[#221910]/95">
        <button
          onClick={() => setView('LANDING')}
          className="flex size-10 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-black/5 dark:hover:bg-white/10"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="min-w-0 flex-1 truncate pr-10 text-center text-lg font-bold tracking-[-0.015em]">
          {ts.chooseStyle}
        </h1>
      </header>

      {/* O card fica menor aqui de propósito: em tamanho cheio ele empurrava os
          chips para trás do botão fixo e escondia o próprio topo atrás do
          cabeçalho. Escolher fundo exige ver o card E as opções ao mesmo tempo. */}
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pb-44 hide-scrollbar">
        <div
          className={`mx-auto w-full max-w-[224px] overflow-hidden rounded-2xl shadow-2xl ${isTransparent ? 'checker-bg' : ''}`}
        >
          {renderCard()}
        </div>

        <div className="mt-6 flex flex-col gap-3">
          <span className="px-1 text-sm font-semibold">{ts.background}</span>

          <div className="no-scrollbar flex snap-x gap-4 overflow-x-auto px-1 pb-4 pt-1">
            {BACKGROUNDS.map(opt => {
              const active = backgroundId === opt.id;
              const isPhotoChip = opt.id === 'photo';
              return (
                <button
                  key={opt.id}
                  onClick={() => handleSelectBackground(opt.id)}
                  className="flex shrink-0 snap-center flex-col items-center gap-2"
                >
                  <div
                    className={`relative flex h-32 w-20 items-center justify-center overflow-hidden rounded-xl border transition-all active:scale-95 ${active ? 'border-2 border-primary' : 'border-gray-200 opacity-80 hover:opacity-100 dark:border-white/10'}`}
                    style={{
                      background: isPhotoChip && photoUri ? undefined : opt.swatch,
                    }}
                  >
                    {isPhotoChip && photoUri && (
                      <img src={photoUri} alt="" className="absolute inset-0 h-full w-full object-cover" />
                    )}
                    <span
                      className={`material-symbols-outlined relative text-2xl ${opt.id === 'cream' || opt.id === 'transparent' ? 'text-black/45' : 'text-white/90'}`}
                    >
                      {opt.icon}
                    </span>
                  </div>
                  <span
                    className={`text-xs font-bold ${active ? 'text-primary' : 'text-gray-500'}`}
                  >
                    {ts.backgrounds[opt.id]}
                  </span>
                </button>
              );
            })}
          </div>

          {backgroundId === 'photo' && photoUri && (
            <button
              onClick={handlePickPhoto}
              className="mx-1 flex h-11 items-center justify-center gap-2 rounded-xl bg-black/5 text-sm font-semibold transition-colors hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20"
            >
              <span className="material-symbols-outlined text-[18px]">swap_horiz</span>
              {ts.changePhoto}
            </button>
          )}

          {isTransparent && (
            <p className="mx-1 text-xs leading-relaxed text-Malama-muted dark:text-slate-400">
              {ts.transparentHint}
            </p>
          )}
        </div>
      </main>

      <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-[#f8f7f6] via-[#f8f7f6]/95 to-transparent p-4 pt-8 dark:from-[#221910] dark:via-[#221910]/95">
        <button
          onClick={handleShare}
          disabled={sharing}
          className="pointer-events-auto flex w-full items-center justify-center gap-3 rounded-xl bg-primary py-4 text-lg font-bold text-white transition-all active:scale-[0.98] disabled:opacity-60"
        >
          <span>{shareButtonLabel}</span>
          <span className="material-symbols-outlined">ios_share</span>
        </button>
      </div>
    </div>
  );
};
