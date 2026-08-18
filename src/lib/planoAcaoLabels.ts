import type { PlanoFator, PlanoNivel, PlanoStatus } from '../services/empresaService';

export const FATORES: { v: PlanoFator; label: string }[] = [
  { v: 'demanda',        label: 'Cobrança / ritmo de trabalho' },
  { v: 'controle',       label: 'Autonomia para decidir o trabalho' },
  { v: 'apoio',          label: 'Apoio social e liderança' },
  { v: 'assedio',        label: 'Assédio e violência' },
  { v: 'jornada',        label: 'Jornada e escalas' },
  { v: 'reconhecimento', label: 'Reconhecimento e recompensa' },
  { v: 'outro',          label: 'Outro' },
];
export const FATOR_LABEL = Object.fromEntries(FATORES.map(f => [f.v, f.label])) as Record<PlanoFator, string>;

export const NIVEIS: { v: PlanoNivel; label: string; ajuda: string }[] = [
  { v: 'fonte',          label: 'Na fonte',
    ajuda: 'Elimina ou reduz o fator de risco na origem (redimensionar carga, rever metas, alterar escala).' },
  { v: 'organizacional', label: 'Organizacional',
    ajuda: 'Muda como o trabalho é gerido (treinar liderança, criar pausas, revisar fluxo de comunicação).' },
  { v: 'individual',     label: 'Individual',
    ajuda: 'Cuida de quem já foi afetado (acolhimento, encaminhamento). Sozinha não encerra risco de fonte.' },
];
export const NIVEL_LABEL = Object.fromEntries(NIVEIS.map(n => [n.v, n.label])) as Record<PlanoNivel, string>;

export const STATUS_INFO: Record<PlanoStatus, { label: string; cls: string }> = {
  planejada:    { label: 'Planejada',    cls: 'bg-gray-100 text-gray-600' },
  em_andamento: { label: 'Em andamento', cls: 'bg-blue-50 text-blue-700' },
  concluida:    { label: 'Concluída',    cls: 'bg-green-100 text-green-700' },
  cancelada:    { label: 'Cancelada',    cls: 'bg-gray-100 text-gray-400' },
};
