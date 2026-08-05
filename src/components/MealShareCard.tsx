import React, { forwardRef, useEffect, useState } from 'react';
import { Meal } from '../types';
import { useLanguage } from '../i18n';
import { ShareBrand } from './share/ShareCardShell';

interface MealShareCardProps {
  meal: Meal;
  /** Esconde os números do card, deixando só a foto e o nome. */
  showMacros?: boolean;
}

/**
 * `image_url` deveria sempre ser URL pública do bucket `meal-photos`, mas
 * registros antigos chegaram a guardar base64 direto na coluna. Os dois casos
 * renderizam; qualquer outra coisa cai no fundo em gradiente.
 */
const isUsablePhoto = (uri?: string) =>
  !!uri && (uri.startsWith('http://') || uri.startsWith('https://') || uri.startsWith('data:image'));

/**
 * Converte a foto para data URI antes de renderizar. O html2canvas captura de um
 * canvas: uma imagem remota que falhe no CORS não só some do card como pode
 * contaminar o canvas e derrubar a exportação inteira. Com data URI isso não
 * acontece.
 */
async function toDataUri(url: string): Promise<string | null> {
  if (url.startsWith('data:')) return url;
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string | null>(resolve => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export const MealShareCard = forwardRef<HTMLDivElement, MealShareCardProps>(
  ({ meal, showMacros = true }, ref) => {
    const { t, language } = useLanguage();
    const ts = t.social;
    const [photo, setPhoto] = useState<string | null>(null);

    const localeMap: Record<string, string> = { en: 'en-US', pt: 'pt-BR', es: 'es-ES' };
    const locale = localeMap[language] || 'pt-BR';

    useEffect(() => {
      let cancelled = false;
      if (!isUsablePhoto(meal.imageUri)) {
        setPhoto(null);
        return;
      }
      toDataUri(meal.imageUri!).then(uri => {
        if (!cancelled) setPhoto(uri);
      });
      return () => {
        cancelled = true;
      };
    }, [meal.imageUri]);

    const time = new Date(meal.timestamp).toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <div
        ref={ref}
        className="relative w-full aspect-[9/16] overflow-hidden bg-[#221910] font-display"
      >
        {/* A foto é a heroína. Sem foto, gradiente da paleta Malama. */}
        {photo ? (
          <img src={photo} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(160deg, #b8724f 0%, #7d4a3c 55%, #2b1a14 100%)' }}
          />
        )}

        {/* Legibilidade do texto sobre a foto */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-black/35" />

        <div
          className="absolute inset-0 flex flex-col justify-between p-8 text-white"
          style={{ textShadow: '0 2px 12px rgba(0,0,0,0.35)' }}
        >
          <div className="flex items-center justify-end">
            <span className="text-[10px] font-semibold tracking-[0.15em] uppercase opacity-75">{time}</span>
          </div>

          <div className="flex flex-col gap-4">
            <h2 className="text-3xl font-bold leading-tight tracking-tight capitalize drop-shadow-sm">
              {meal.name || 'Refeição'}
            </h2>

            {showMacros && (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="text-6xl font-extrabold tracking-tighter leading-none drop-shadow-sm">
                    {Math.round(meal.calories)}
                  </span>
                  <span className="text-sm font-bold tracking-[0.2em] uppercase opacity-80">kcal</span>
                </div>

                <div className="flex items-stretch pt-1">
                  {[
                    { l: ts.protein, v: meal.macros.protein },
                    { l: ts.carbs, v: meal.macros.carbs },
                    { l: ts.fat, v: meal.macros.fats },
                  ].map((m, i) => (
                    <React.Fragment key={m.l}>
                      {i > 0 && <div className="mx-5 h-7 w-px self-center bg-white opacity-25" />}
                      <div className="flex flex-col">
                        <span className="text-lg font-bold leading-none">{Math.round(m.v)}g</span>
                        <span className="mt-2 text-[9px] uppercase tracking-[0.2em] opacity-70">{m.l}</span>
                      </div>
                    </React.Fragment>
                  ))}
                </div>
              </>
            )}

            <div className="mt-3 flex">
              <ShareBrand />
            </div>
          </div>
        </div>
      </div>
    );
  }
);

MealShareCard.displayName = 'MealShareCard';
