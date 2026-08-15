import React, { useEffect, useMemo, useState } from 'react';
import {
  Legend, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart,
  ResponsiveContainer, Tooltip,
} from 'recharts';
import { Hexagon, Info, RefreshCw } from 'lucide-react';
import {
  rhService, type JssTeiaSetor, type JssTemasValores, type RhJssTeiaTemas,
} from '../../services/empresaService';

const TEMAS: { key: keyof JssTemasValores; label: string; descricao: string }[] = [
  { key: 'ritmo_volume', label: 'Ritmo e volume', descricao: 'Pressa, intensidade e quantidade de trabalho.' },
  { key: 'organizacao', label: 'Tempo e prioridades', descricao: 'Tempo suficiente e orientações sem contradição.' },
  { key: 'competencias', label: 'Competências', descricao: 'Aprendizado, uso das habilidades e variedade das tarefas.' },
  { key: 'autonomia', label: 'Autonomia', descricao: 'Iniciativa e participação nas decisões sobre o trabalho.' },
  { key: 'clima', label: 'Clima da equipe', descricao: 'Ambiente, convivência e vínculo entre colegas.' },
  { key: 'apoio_lideranca', label: 'Apoio e liderança', descricao: 'Apoio prático, compreensão e relação com a chefia.' },
];

const TooltipTemas = ({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string }>;
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  const tema = TEMAS.find(t => t.label === label);
  return <div className="max-w-64 rounded-lg border border-gray-200 bg-white p-3 text-xs shadow-lg">
    <p className="font-semibold text-gray-800">{label}</p>
    {tema && <p className="mt-1 leading-relaxed text-gray-500">{tema.descricao}</p>}
    <div className="mt-2 space-y-1">{payload.map(item => <div key={item.name} className="flex items-center justify-between gap-4"><span className="inline-flex items-center gap-1.5 text-gray-600"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />{item.name}</span><strong className="text-gray-800">{Math.round(item.value ?? 0)}</strong></div>)}</div>
  </div>;
};

export const JssTeiaTemas: React.FC<{ inicio: string; fim: string }> = ({ inicio, fim }) => {
  const [teia, setTeia] = useState<RhJssTeiaTemas | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);
  const [tentativa, setTentativa] = useState(0);
  const [visao, setVisao] = useState<'macro' | 'setor'>('macro');
  const [setor, setSetor] = useState('');

  useEffect(() => {
    let ativo = true;
    setLoading(true); setErro(false);
    rhService.getJssTeiaTemas(inicio, fim)
      .then(resultado => {
        if (!ativo) return;
        setTeia(resultado);
        setSetor(atual => atual && resultado?.setores.some(s => s.setor === atual)
          ? atual
          : resultado?.setores[0]?.setor ?? '');
      })
      .catch(() => { if (ativo) { setTeia(null); setErro(true); } })
      .finally(() => { if (ativo) setLoading(false); });
    return () => { ativo = false; };
  }, [inicio, fim, tentativa]);

  const geral = teia && !('suprimido' in teia.geral) ? teia.geral : null;
  const setorAtual: JssTeiaSetor | null = teia?.setores.find(s => s.setor === setor) ?? null;
  const dados = useMemo(() => TEMAS.map(tema => ({
    tema: tema.label,
    empresa: geral?.[tema.key] ?? 0,
    setor: setorAtual?.[tema.key] ?? 0,
  })), [geral, setorAtual]);
  const valoresAtuais: JssTemasValores | null = visao === 'setor' ? setorAtual : geral;

  if (loading) return <div className="mt-5 flex h-48 items-center justify-center rounded-xl border border-gray-100 bg-gray-50"><div className="h-7 w-7 animate-spin rounded-full border-2 border-[#7d4a3c] border-t-transparent" /></div>;
  if (erro) return <div className="mt-5 rounded-xl border border-red-100 bg-red-50 p-5 text-center"><p className="text-sm text-red-700">Não foi possível carregar a teia temática.</p><button onClick={() => setTentativa(x => x + 1)} className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-red-700"><RefreshCw className="h-3.5 w-3.5" /> Tentar novamente</button></div>;
  if (!teia || !geral) return null;

  return <section className="mt-5 rounded-xl border border-gray-200 bg-gray-50/70 p-4 sm:p-5">
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
      <div className="flex items-start gap-2.5"><Hexagon className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#7d4a3c]" /><div><h3 className="font-semibold text-gray-800">Teia temática do JSS</h3><p className="mt-1 max-w-3xl text-xs leading-relaxed text-gray-500">As 17 perguntas foram organizadas em seis temas práticos. Em todos os eixos, quanto mais aberto o desenho, maior a necessidade de atenção.</p></div></div>
      <div className="inline-flex self-start rounded-lg border border-gray-200 bg-white p-1">
        <button onClick={() => setVisao('macro')} className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${visao === 'macro' ? 'bg-[#7d4a3c] text-white' : 'text-gray-500 hover:bg-gray-50'}`}>Visão geral</button>
        <button onClick={() => setVisao('setor')} className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${visao === 'setor' ? 'bg-[#7d4a3c] text-white' : 'text-gray-500 hover:bg-gray-50'}`}>Por setor</button>
      </div>
    </div>

    {visao === 'setor' && <div className="mt-4 flex items-center gap-2"><label htmlFor="jss-teia-setor" className="text-xs font-medium text-gray-600">Setor</label><select id="jss-teia-setor" value={setor} onChange={e => setSetor(e.target.value)} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-[#7d4a3c]">{teia.setores.map(item => <option key={item.setor} value={item.setor}>{item.setor}</option>)}</select></div>}

    <div className="mt-2 h-[390px] w-full sm:h-[440px]">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={dados} outerRadius="70%" margin={{ top: 20, right: 70, bottom: 20, left: 70 }}>
          <PolarGrid stroke="#d1d5db" />
          <PolarAngleAxis dataKey="tema" tick={{ fill: '#4b5563', fontSize: 12 }} />
          <PolarRadiusAxis domain={[0, 100]} tickCount={6} tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} />
          <Tooltip content={<TooltipTemas />} />
          <Radar name="Empresa" dataKey="empresa" stroke="#7d4a3c" fill="#7d4a3c" fillOpacity={visao === 'macro' ? 0.28 : 0.10} strokeWidth={2} />
          {visao === 'setor' && setorAtual && <Radar name={setorAtual.setor} dataKey="setor" stroke="#d59a16" fill="#d59a16" fillOpacity={0.25} strokeWidth={2} />}
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </RadarChart>
      </ResponsiveContainer>
    </div>

    {valoresAtuais && <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">{TEMAS.map(tema => <div key={tema.key} className="rounded-lg border border-gray-200 bg-white px-3 py-2"><p className="text-[11px] leading-tight text-gray-500">{tema.label}</p><p className="mt-1 text-lg font-bold text-gray-800">{valoresAtuais[tema.key]}</p></div>)}</div>}

    <div className="mt-4 flex items-start gap-2 text-[11px] leading-relaxed text-gray-500"><Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" /><p>Esta é uma leitura temática para gestão, não uma nova escala clínica ou dimensão validada do JSS. A visão geral considera os respondentes, não uma média simples dos setores. Na visão setorial, apenas grupos com pelo menos {teia.k_min} respostas aparecem.</p></div>
  </section>;
};
