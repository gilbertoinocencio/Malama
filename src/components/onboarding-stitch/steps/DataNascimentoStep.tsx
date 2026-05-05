import React, { useState, useRef, useLayoutEffect } from 'react';
import { StepContainer } from '../StepContainer';
import { StepProps } from '../types';

const ITEM_H = 56; // height of each item in px

const MONTHS_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const DAYS   = Array.from({ length: 31 }, (_, i) => i + 1);
const CUR_YEAR = new Date().getFullYear();
const YEARS  = Array.from({ length: CUR_YEAR - 1923 }, (_, i) => CUR_YEAR - i);

// ─── Drum-roll column ────────────────────────────────────────────────────────

interface ColumnProps {
  items: (string | number)[];
  selectedIdx: number;
  onSelect: (idx: number) => void;
  formatItem?: (item: string | number) => string;
}

const DrumColumn: React.FC<ColumnProps> = ({ items, selectedIdx, onSelect, formatItem }) => {
  const ref      = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Scroll to initial position without animation
  useLayoutEffect(() => {
    if (ref.current) ref.current.scrollTop = selectedIdx * ITEM_H;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const snap = (el: HTMLDivElement) => {
    const raw     = el.scrollTop / ITEM_H;
    const idx     = Math.max(0, Math.min(items.length - 1, Math.round(raw)));
    el.scrollTo({ top: idx * ITEM_H, behavior: 'smooth' });
    onSelect(idx);
  };

  const handleScroll = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (ref.current) snap(ref.current);
    }, 80);
  };

  return (
    <div className="relative flex-1">
      {/* Top fade */}
      <div className="pointer-events-none absolute top-0 left-0 right-0 z-10"
           style={{ height: ITEM_H * 2,
                    background: 'linear-gradient(to bottom, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 100%)' }} />
      {/* Selection band */}
      <div className="pointer-events-none absolute left-0 right-0 z-10 border-y border-stone-200"
           style={{ top: ITEM_H * 2, height: ITEM_H }} />
      {/* Bottom fade */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-10"
           style={{ height: ITEM_H * 2,
                    background: 'linear-gradient(to top, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 100%)' }} />

      {/* Scrollable list */}
      <div
        ref={ref}
        onScroll={handleScroll}
        style={{
          height: ITEM_H * 5,
          overflowY: 'scroll',
          scrollSnapType: 'y mandatory',
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
        className="[&::-webkit-scrollbar]:hidden"
      >
        {/* Spacers so first/last items can center */}
        <div style={{ height: ITEM_H * 2 }} />
        {items.map((item, i) => {
          const dist = Math.abs(i - selectedIdx);
          return (
            <div
              key={i}
              style={{ height: ITEM_H, scrollSnapAlign: 'center' }}
              className="flex items-center justify-center cursor-pointer"
            >
              <span
                className="transition-all duration-200 select-none"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize:  dist === 0 ? '1.75rem' : dist === 1 ? '1.2rem' : '0.95rem',
                  fontWeight: dist === 0 ? 600 : 400,
                  color: dist === 0 ? '#292524'    // stone-800
                       : dist === 1 ? '#a8a29e'    // stone-400
                       :              '#e7e5e4',    // stone-200
                }}
              >
                {formatItem ? formatItem(item) : item}
              </span>
            </div>
          );
        })}
        <div style={{ height: ITEM_H * 2 }} />
      </div>
    </div>
  );
};

// ─── Main step ───────────────────────────────────────────────────────────────

const DataNascimentoStep: React.FC<StepProps> = ({
  data, updateData, onNext, onBack, currentStep, totalSteps
}) => {
  const parseInitial = () => {
    if (data.dataNascimento) {
      const [y, m, d] = data.dataNascimento.split('-').map(Number);
      return {
        dayIdx:   Math.max(0, d - 1),
        monthIdx: Math.max(0, m - 1),
        yearIdx:  Math.max(0, YEARS.indexOf(y)),
      };
    }
    // Default: 01 / Jan / 30 years ago
    return { dayIdx: 0, monthIdx: 0, yearIdx: 30 };
  };

  const initial = parseInitial();
  const [dayIdx,   setDayIdx]   = useState(initial.dayIdx);
  const [monthIdx, setMonthIdx] = useState(initial.monthIdx);
  const [yearIdx,  setYearIdx]  = useState(initial.yearIdx);
  const [error, setError]       = useState('');

  const day   = DAYS[dayIdx];
  const month = monthIdx + 1;
  const year  = YEARS[yearIdx];

  const isValid = () => {
    const date = new Date(year, month - 1, day);
    const valid = date.getFullYear() === year
               && date.getMonth()    === month - 1
               && date.getDate()     === day
               && year <= CUR_YEAR - 5;
    return valid;
  };

  const handleContinue = () => {
    if (!isValid()) {
      setError('Por favor, insira uma data válida.');
      return;
    }
    const dd = String(day).padStart(2, '0');
    const mm = String(month).padStart(2, '0');
    updateData({ dataNascimento: `${year}-${mm}-${dd}` });
    onNext();
  };

  return (
    <StepContainer
      currentStep={currentStep}
      totalSteps={totalSteps}
      onBack={onBack}
      onNext={handleContinue}
    >
      <div className="text-center mb-8">
        <span className="text-stone-400 text-xs tracking-widest uppercase font-light block mb-2">
          Passo {currentStep} de {totalSteps}
        </span>
        <h1
          className="text-4xl text-stone-800 leading-tight mb-4"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Qual é a sua data de nascimento?
        </h1>
        <p className="text-stone-400 text-base font-light max-w-md mx-auto leading-relaxed">
          A idade influencia diretamente nas suas recomendações metabólicas.
        </p>
      </div>

      {/* Drum-roll picker */}
      <div className={`w-full bg-white rounded-2xl shadow-sm border overflow-hidden ${error ? 'border-red-200' : 'border-stone-100'}`}>
        {/* Column headers */}
        <div className="flex border-b border-stone-100 py-2">
          <div className="flex-1 text-center text-xs tracking-widest uppercase text-stone-400 font-light">Dia</div>
          <div className="flex-1 text-center text-xs tracking-widest uppercase text-stone-400 font-light">Mês</div>
          <div className="flex-1 text-center text-xs tracking-widest uppercase text-stone-400 font-light">Ano</div>
        </div>

        <div className="flex px-2">
          <DrumColumn
            items={DAYS}
            selectedIdx={dayIdx}
            onSelect={(i) => { setDayIdx(i); setError(''); }}
            formatItem={(v) => String(v).padStart(2, '0')}
          />
          <DrumColumn
            items={MONTHS_PT}
            selectedIdx={monthIdx}
            onSelect={(i) => { setMonthIdx(i); setError(''); }}
          />
          <DrumColumn
            items={YEARS}
            selectedIdx={yearIdx}
            onSelect={(i) => { setYearIdx(i); setError(''); }}
          />
        </div>

        {error && (
          <p className="text-center text-xs text-red-400 pb-3">{error}</p>
        )}
      </div>

      {/* Info card */}
      <div className="mt-6 w-full">
        <div className="bg-white border border-stone-100 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
          <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-stone-50">
            <span className="material-symbols-outlined text-stone-400 text-lg">calendar_month</span>
          </div>
          <p className="text-sm font-light text-stone-500 leading-relaxed">
            Sua idade nos ajuda a ajustar os cálculos metabólicos com maior precisão e segurança.
          </p>
        </div>
      </div>
    </StepContainer>
  );
};

export default DataNascimentoStep;
