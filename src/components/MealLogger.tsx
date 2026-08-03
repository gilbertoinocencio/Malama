import React, { useState, useRef, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { GaleriaNativa } from '../lib/galeriaNativa';
import { Meal, AIResponse, MealItem } from '../types';
import { analyzeTextLog, analyzeImageLog, getMealSlotLabel, generateMealFeedback } from '../services/caramelService';
import { StatsService } from '../services/statsService';
import { PlanService } from '../services/planService';
import type { HydrationAnalysis } from '../services/caramelService';
import { UnifiedChatService } from '../services/unifiedChatService';
import { HydrationService } from '../services/hydrationService';
import { enviarFeedback, enviarCorrecao } from '../lib/caramelAI';
import { userReportedWaterIntake, isBareQuantityAnswer } from '../utils/intakeDetection';
import { parseAiJson } from '../utils/parseAiJson';
import { normalizeMealAnalysis } from '../utils/normalizeMealAnalysis';

import { MalamaAiScan } from './MalamaAiScan';
import { MalamaWaterScan } from './MalamaWaterScan';
import { USER_AVATAR } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import { MealService } from '../services/mealService';
import { useLanguage } from '../i18n';


// Web Speech API type declarations
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: Event) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

interface MealLoggerProps {
  onLog: (meal: Meal) => void;
  onClose: () => void;
}

type MessageType = 'user' | 'ai-text' | 'ai-card';

interface Message {
  id: string;
  type: MessageType;
  content: any; // Text string or AIResponse object
  imageUri?: string; // Optional thumbnail for ai-photo scan cards
}

// Simple markdown renderer for chat messages (bold, italic, line breaks, numbered/bullet lists)
const renderMarkdown = (text: string): React.ReactNode[] => {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];

  const formatInline = (line: string, key: string): React.ReactNode => {
    // Split by bold (**text**) and italic (*text*) markers
    const parts: React.ReactNode[] = [];
    const regex = /(\*\*(.+?)\*\*|\*(.+?)\*)/g;
    let lastIndex = 0;
    let match;
    let partIdx = 0;

    while ((match = regex.exec(line)) !== null) {
      if (match.index > lastIndex) {
        parts.push(line.slice(lastIndex, match.index));
      }
      if (match[2]) {
        // Bold
        parts.push(<strong key={`${key}-b${partIdx}`} className="font-semibold">{match[2]}</strong>);
      } else if (match[3]) {
        // Italic
        parts.push(<em key={`${key}-i${partIdx}`}>{match[3]}</em>);
      }
      lastIndex = match.index + match[0].length;
      partIdx++;
    }
    if (lastIndex < line.length) {
      parts.push(line.slice(lastIndex));
    }
    return parts.length > 0 ? <>{parts}</> : line;
  };

  lines.forEach((line, i) => {
    const trimmed = line.trim();

    // Empty line = paragraph break
    if (!trimmed) {
      elements.push(<div key={`br-${i}`} className="h-2" />);
      return;
    }

    // Numbered list: "1. ", "2. " etc.
    const numberedMatch = trimmed.match(/^(\d+)\.\s+(.+)/);
    if (numberedMatch) {
      elements.push(
        <div key={`li-${i}`} className="flex gap-2 mt-1">
          <span className="text-Malama-petrol dark:text-primary font-bold shrink-0">{numberedMatch[1]}.</span>
          <span>{formatInline(numberedMatch[2], `li-${i}`)}</span>
        </div>
      );
      return;
    }

    // Bullet list: "- ", "* " ou "• "
    const bulletMatch = trimmed.match(/^[-*•]\s+(.+)/);
    if (bulletMatch) {
      elements.push(
        <div key={`bl-${i}`} className="flex gap-2 mt-1">
          <span className="text-Malama-petrol dark:text-primary shrink-0">•</span>
          <span>{formatInline(bulletMatch[1], `bl-${i}`)}</span>
        </div>
      );
      return;
    }

    // Regular paragraph
    elements.push(<p key={`p-${i}`} className={i > 0 ? 'mt-1' : ''}>{formatInline(trimmed, `p-${i}`)}</p>);
  });

  return elements;
};

/** Maior redução que cabe em `maxDim`, sem ampliar imagem que já é pequena. */
const fitWithin = (width: number, height: number, maxDim: number) => {
  const factor = Math.min(1, maxDim / Math.max(width, height));
  return { width: Math.round(width * factor), height: Math.round(height * factor) };
};

const drawToJpeg = (source: CanvasImageSource, width: number, height: number): string => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Não consegui preparar a imagem neste dispositivo.');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, width, height);
  // 0.72 quality: ~30% smaller than 0.8 with no visible loss for food recognition
  return canvas.toDataURL('image/jpeg', 0.72);
};

/**
 * Reduz a foto direto do arquivo, sem materializar a imagem cheia em base64.
 *
 * "Take Photo" entrega a captura nativa (12MP); "Photo Library" costuma vir já
 * reduzida pelo sistema — é essa diferença que o usuário sentia como "análise
 * mais lenta". A espera acontece ANTES da tela de scan abrir (a foto só aparece
 * depois desta função), então ela é lida como lentidão do scan.
 * O caminho antigo lia o arquivo inteiro com FileReader (string de vários MB),
 * decodificava a imagem cheia e só então reduzia. Pior: se a decodificação
 * falhasse por memória, ele seguia com a imagem ORIGINAL — justamente o caso
 * que trava, porque payload grande demais é rejeitado antes de chegar na IA.
 */
const fileToResizedDataUrl = async (file: Blob, maxDim = 800): Promise<string> => {
  if (typeof createImageBitmap === 'function') {
    let bitmap: ImageBitmap | null = null;
    try {
      bitmap = await createImageBitmap(file);
      const { width, height } = fitWithin(bitmap.width, bitmap.height, maxDim);
      return drawToJpeg(bitmap, width, height);
    } catch (e) {
      console.error('createImageBitmap falhou, tentando via object URL:', e);
    } finally {
      bitmap?.close();
    }
  }

  // Fallback ainda parte do Blob, não de data URL: o custo que queremos evitar
  // é a string gigante, não o elemento <img>.
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Não consegui abrir essa foto.'));
      el.src = objectUrl;
    });
    const { width, height } = fitWithin(img.naturalWidth, img.naturalHeight, maxDim);
    return drawToJpeg(img, width, height);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

// Helper for image resizing to stay within AI limits (usually 2000px)
const resizeImage = (base64Str: string, maxDim = 1200): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(base64Str);

      let width = img.width;
      let height = img.height;

      // Calculate new dimensions keeping aspect ratio
      if (width > height) {
        if (width > maxDim) {
          height *= maxDim / width;
          width = maxDim;
        }
      } else {
        if (height > maxDim) {
          width *= maxDim / height;
          height = maxDim;
        }
      }

      canvas.width = width;
      canvas.height = height;

      // Use better quality scaling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      ctx.drawImage(img, 0, 0, width, height);

      // 0.72 quality: ~30% smaller than 0.8 with no visible loss for food recognition
      resolve(canvas.toDataURL('image/jpeg', 0.72));
    };
    img.onerror = (e) => {
      console.error("Image load error for resizing:", e);
      resolve(base64Str);
    };
  });
};

// Convert DB chat history to local Message format
const historyToMessages = (history: any[]): Message[] => {
  const result: Message[] = [];
  for (const msg of history) {
    if (msg.role === 'user' || msg.role === 'system') {
      result.push({ id: msg.id, type: 'user', content: msg.content });
    } else {
      // agent — check for embedded meal card
      const mealMatch = msg.content.match(/<meal_json>([\s\S]*?)<\/meal_json>/);
      if (mealMatch) {
        try {
          const imageUriMatch = msg.content.match(/<image_uri>([\s\S]*?)<\/image_uri>/);
          const savedImageUri = imageUriMatch ? imageUriMatch[1] : undefined;
          const cleanText = msg.content
            .replace(/<meal_json>[\s\S]*?<\/meal_json>/g, '')
            .replace(/<water_json>[\s\S]*?<\/water_json>/g, '')
            .replace(/<dose_json>[\s\S]*?<\/dose_json>/g, '')
            .replace(/<image_uri>[\s\S]*?<\/image_uri>/g, '')
            .trim();
          const parsedMeal = normalizeMealAnalysis(parseAiJson<unknown>(mealMatch[1]), { strict: true });
          result.push({ id: msg.id + '-card', type: 'ai-card', content: parsedMeal, imageUri: savedImageUri });
          if (cleanText) result.push({ id: msg.id + '-text', type: 'ai-text', content: cleanText });
        } catch {
          const cleanContent = msg.content
            .replace(/<meal_json>[\s\S]*?<\/meal_json>/g, '')
            .replace(/<water_json>[\s\S]*?<\/water_json>/g, '')
            .replace(/<dose_json>[\s\S]*?<\/dose_json>/g, '')
            .replace(/<image_uri>[\s\S]*?<\/image_uri>/g, '')
            .trim();
          result.push({ id: msg.id, type: 'ai-text', content: cleanContent || msg.content });
        }
      } else {
        const cleanContent = msg.content
          .replace(/<water_json>[\s\S]*?<\/water_json>/g, '')
          .replace(/<dose_json>[\s\S]*?<\/dose_json>/g, '')
          .replace(/<image_uri>[\s\S]*?<\/image_uri>/g, '')
          .trim();
        result.push({ id: msg.id, type: 'ai-text', content: cleanContent || msg.content });
      }
    }
  }
  return result;
};

// Group messages by calendar date for date separators
const getDateLabel = (isoDate: string): string => {
  const d = new Date(isoDate);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Hoje';
  if (d.toDateString() === yesterday.toDateString()) return 'Ontem';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
};

// ── Routing indicator lists (module-scope so both isQuestion and isPureMealReport reuse them) ──

/** Past-tense ingestion verbs that signal a real food/drink log. */
const MEAL_REPORT_VERBS = [
  'comi', 'almocei', 'jantei', 'lanchei', 'lancei', 'tomei', 'bebi', 'ingeri',
  'café da manhã', 'cafe da manha', 'tomei café', 'tomei cafe', 'fiz uma refeição',
  'fiz uma refeicao', 'belisquei', 'petisquei', 'me alimentei', 'acabei de comer',
];

/** Corrections/clarifications — need conversational context, stay with the agent. */
const CORRECTION_INDICATORS = [
  'eu disse', 'não disse', 'disse que', 'falei que', 'não falei',
  'na verdade', 'na realidade', 'quero corrigir', 'está errado', 'esta errado',
  'não é isso', 'nao e isso', 'você errou', 'voce errou', 'errou',
  'tá errado', 'ta errado', 'não é esse', 'nao e esse',
  'foi diferente', 'foi outro', 'foi outra',
  'corrija', 'corrige',
];

/** Emotion/craving/satiety — not a real log; stay with the agent for support. */
const EMOTION_CRAVING_INDICATORS = [
  'sem fome', 'não estou com fome', 'nao estou com fome', 'não tô com fome', 'nao to com fome',
  'tô cheio', 'to cheio', 'estou cheio', 'estou satisfeito', 'tô satisfeito',
  'vontade de comer', 'vontade de tomar', 'vontade de beber',
  'com vontade', 'tô com vontade', 'to com vontade', 'estou com vontade',
  'pensei em comer', 'pensando em comer', 'quero comer', 'queria comer',
  'quero tomar', 'queria tomar', 'quero beber', 'bateu uma vontade',
  'tô cansado', 'to cansado', 'estou cansado', 'sem energia', 'sem animo', 'sem ânimo',
  'tô bem', 'to bem', 'estou bem', 'tô mal', 'to mal', 'estou mal',
  'tô ansioso', 'to ansioso', 'estou ansioso', 'tô estressado', 'estou estressado',
  'tô feliz', 'to feliz', 'tô triste', 'to triste', 'estou triste',
  'mal dormi', 'dormi mal', 'não dormi', 'acordei cedo',
  'comi demais', 'exagerei', 'vacilei', 'escoreguei', 'saí do plano', 'sai do plano',
  'minha dieta', 'foi pro espaço', 'foi pro espaco', 'largar tudo',
  'haha', 'kkkk', 'rsrs', 'kkk', 'lol', 'brincando', 'só brincando', 'so brincando',
];

/** GLP-1 dose mentions — must reach the agent (dose interceptor), never food analysis. */
const DOSE_INDICATORS = [
  'dose', 'apliquei', 'aplicação', 'aplicacao', 'injeção', 'injecao', 'caneta',
  'ozempic', 'wegovy', 'saxenda', 'mounjaro', 'semaglutida', 'tirzepatida', 'liraglutida',
];

/**
 * A PURE meal/drink log ("comi pão com ovo") that should go to the isolated analysis
 * path (no chat history) — NOT to the conversational agent. Excludes water, doses,
 * corrections, emotions/cravings and questions, which still need the agent.
 */
const isPureMealReport = (text: string): boolean => {
  const lower = text.toLowerCase().trim();
  if (lower.includes('?')) return false;
  if (userReportedWaterIntake(lower)) return false;          // água → agente (multi-turn)
  if (DOSE_INDICATORS.some(i => lower.includes(i))) return false;
  if (CORRECTION_INDICATORS.some(i => lower.includes(i))) return false;
  if (EMOTION_CRAVING_INDICATORS.some(i => lower.includes(i))) return false;
  return MEAL_REPORT_VERBS.some(v => lower.includes(v));
};

export const MealLogger: React.FC<MealLoggerProps> = ({ onLog, onClose }) => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageDates, setMessageDates] = useState<Record<string, string>>({});

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const draftPersistedRef = useRef(false); // true once initial history load is done
  const isSendingRef = useRef(false); // Prevents double-submit race condition
  // Refs used inside the visibilitychange handler so the effect doesn't need reactive
  // state deps (which caused the listener to re-register on every state change, triggering
  // re-renders and keyboard dismissal on iOS/Capacitor when the keyboard opened).
  const draftMealRef = useRef<AIResponse | null>(null);
  const scanResultRef = useRef<AIResponse | null>(null);
  const scannedImageUriRef = useRef<string | null>(null);
  const waterScanRef = useRef<HydrationAnalysis | null>(null);
  // Análise de refeição que veio junto do scan de água — permite trocar de tela
  // ("não é água") sem uma segunda chamada à IA.
  const waterMealFallbackRef = useRef<AIResponse | null>(null);

  const { t, speechLang, language } = useLanguage();
  const { user, profile } = useAuth();

  // Restore draftMeal synchronously from localStorage on mount (prevents buttons disappearing on tab switch)
  const [draftMeal, setDraftMeal] = useState<AIResponse | null>(() => {
    if (!user) return null;
    try {
      const draftKey = `Malama_draft_meal_${user.id}`;
      const savedDraft = localStorage.getItem(draftKey);
      if (savedDraft) {
        const { meal, source, ts } = JSON.parse(savedDraft);
        // Only restore if draft is less than 24 hours old
        if (Date.now() - (ts || 0) < 24 * 60 * 60 * 1000) {
          return meal ? normalizeMealAnalysis(meal) : null;
        } else {
          localStorage.removeItem(draftKey);
        }
      }
    } catch {
      localStorage.removeItem(`Malama_draft_meal_${user?.id}`);
    }
    return null;
  });

  const [editMode, setEditMode] = useState(false);
  const [editItems, setEditItems] = useState<MealItem[]>([]);
  // Sinal implícito de qualidade para o Telê: se o usuário precisou EDITAR a
  // análise da IA antes de salvar, a estimativa estava errada (👎); se
  // confirmou direto, acertou (👍). Ref (não state) porque não afeta render.
  const analiseFoiEditadaRef = useRef(false);

  // Confirm-before-close dialog
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  // Seletor de origem da foto (câmera x galeria) — só no app nativo.
  const [photoSheet, setPhotoSheet] = useState(false);
  // Erro da análise/registro da foto, mostrado DENTRO da tela de scan.
  const [scanError, setScanError] = useState<string | null>(null);

  // Photo Mode State — initialized from localStorage so they survive app switches
  const [scanResult, setScanResult] = useState<AIResponse | null>(() => {
    if (!user) return null;
    try {
      const saved = localStorage.getItem(`Malama_draft_meal_${user.id}`);
      if (saved) {
        const { scanResult: sr, ts } = JSON.parse(saved);
        if (sr && Date.now() - (ts || 0) < 24 * 60 * 60 * 1000) return normalizeMealAnalysis(sr);
      }
    } catch { }
    return null;
  });
  const [scannedImageUri, setScannedImageUri] = useState<string | null>(() => {
    if (!user) return null;
    try {
      const saved = localStorage.getItem(`Malama_draft_meal_${user.id}`);
      if (saved) {
        const { imageUri, ts } = JSON.parse(saved);
        if (imageUri && Date.now() - (ts || 0) < 24 * 60 * 60 * 1000) return imageUri;
      }
    } catch { }
    return null;
  });
  // Foto de água pura: não é refeição, vai para a hidratação depois que o usuário
  // confirma a quantidade. Persiste no mesmo rascunho para sobreviver ao app ir
  // para segundo plano no meio da confirmação (iOS/Capacitor).
  const [waterScan, setWaterScan] = useState<HydrationAnalysis | null>(() => {
    if (!user) return null;
    try {
      const saved = localStorage.getItem(`Malama_draft_meal_${user.id}`);
      if (saved) {
        const { water, imageUri, ts } = JSON.parse(saved);
        // Só restaura junto com a foto: sem ela a tela de confirmação não faz
        // sentido (fotos grandes são descartadas na persistência).
        if (water && imageUri && Date.now() - (ts || 0) < 24 * 60 * 60 * 1000) return water as HydrationAnalysis;
      }
    } catch { }
    return null;
  });

  // Voice Recognition State
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const [draftSource, setDraftSource] = useState<'chat' | 'photo'>(() => {
    if (!user) return 'chat';
    try {
      const draftKey = `Malama_draft_meal_${user.id}`;
      const savedDraft = localStorage.getItem(draftKey);
      if (savedDraft) {
        const { source, ts } = JSON.parse(savedDraft);
        if (Date.now() - (ts || 0) < 24 * 60 * 60 * 1000) {
          return source === 'photo' ? 'photo' : 'chat';
        }
      }
    } catch { /* ignore */ }
    return 'chat';
  });

  // Sync mutable state into refs so the visibilitychange handler can always read the
  // latest values without being listed as effect dependencies (which caused the listener
  // to re-register on every render, triggering iOS keyboard dismissal).
  useEffect(() => { draftMealRef.current = draftMeal; }, [draftMeal]);
  useEffect(() => { scanResultRef.current = scanResult; }, [scanResult]);
  useEffect(() => { scannedImageUriRef.current = scannedImageUri; }, [scannedImageUri]);
  useEffect(() => { waterScanRef.current = waterScan; }, [waterScan]);

  // Restore persistent chat history on mount (without re-setting draftMeal)
  useEffect(() => {
    if (!user) { setLoadingHistory(false); return; }
    UnifiedChatService.getChatHistory(user.id, 200).then((history) => {
      // Filter only 'chat' session messages (exclude onboarding)
      const chatOnly = history.filter((m: any) => !m.stage || m.stage === null);
      const converted = historyToMessages(chatOnly);
      // Build date map: messageId â†' ISO date string
      const dates: Record<string, string> = {};
      history.forEach((m: any) => {
        dates[m.id] = m.created_at;
      });
      setMessageDates(dates);
      setMessages(converted);
      draftPersistedRef.current = true;
    }).catch(() => {
      // On error, start with empty chat
      draftPersistedRef.current = true;
    }).finally(() => {
      setLoadingHistory(false);
    });
  }, [user]);

  // Persist draftMeal/scanResult/imageUri to localStorage whenever they change (after initial load)
  useEffect(() => {
    if (!user || !draftPersistedRef.current) return;
    const key = `Malama_draft_meal_${user.id}`;
    if (draftMeal || scanResult || waterScan) {
      const draft: Record<string, any> = {
        meal: draftMeal ?? scanResult,
        source: draftSource,
        ts: Date.now(),
      };
      if (scanResult) draft.scanResult = scanResult;
      if (waterScan) draft.water = waterScan;
      if (scannedImageUri && scannedImageUri.length < 1.5 * 1024 * 1024) draft.imageUri = scannedImageUri;
      try {
        localStorage.setItem(key, JSON.stringify(draft));
      } catch {
        // If too large (e.g. big image), retry without image
        try {
          localStorage.setItem(key, JSON.stringify({ ...draft, imageUri: undefined }));
        } catch { /* silent */ }
      }
    }
    // Clearing is done explicitly in confirm/cancel/discard to avoid race with unmount
  }, [draftMeal, scanResult, waterScan, scannedImageUri, draftSource, user]);

  // Restore draftMeal/scanResult/imageUri from localStorage when tab becomes visible again.
  // Uses refs (not state) as dependencies so the listener is only registered once per user
  // session — prevents iOS/Capacitor from re-registering the listener on every state change,
  // which was causing re-renders and keyboard dismissal when the user tapped the chat input.
  useEffect(() => {
    if (!user) return;
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const draftKey = `Malama_draft_meal_${user.id}`;
        const savedDraft = localStorage.getItem(draftKey);
        if (!savedDraft) return;
        const { meal, source, ts, scanResult: sr, water, imageUri } = JSON.parse(savedDraft);
        if (Date.now() - (ts || 0) >= 24 * 60 * 60 * 1000) return;
        // Read current values from refs, not from stale closure state
        if (!draftMealRef.current && !scannedImageUriRef.current && meal) {
          setDraftMeal(normalizeMealAnalysis(meal));
          setDraftSource(source || 'chat');
        }
        if (!scanResultRef.current && sr) setScanResult(normalizeMealAnalysis(sr));
        if (!waterScanRef.current && water && imageUri) setWaterScan(water as HydrationAnalysis);
        if (!scannedImageUriRef.current && imageUri) setScannedImageUri(imageUri);
      } catch {
        localStorage.removeItem(`Malama_draft_meal_${user.id}`);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user]); // ← only [user], not state — refs give us fresh values without re-registering

  useEffect(() => {
    const timer = setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [messages, loading, scannedImageUri]);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognitionAPI) {
      recognitionRef.current = new SpeechRecognitionAPI();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = speechLang;

      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [speechLang]);

  const handleVoiceInput = () => {
    if (!recognitionRef.current) {
      alert(t.mealLogger.voiceNotSupported);
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  // Detect if text is a question/conversation vs a food log
  const isQuestion = (text: string): boolean => {
    const lower = text.toLowerCase().trim();

    // Meal/drink reports in past tense - route to chat agent for personalized feedback
    if (MEAL_REPORT_VERBS.some(v => lower.includes(v))) return true;

    // Pure quantity ("300ml", "2 copos") — likely answering the agent's "quanto você bebeu?".
    // Route to the chat agent so the water multi-turn (pergunta → resposta) funciona aqui também.
    if (isBareQuantityAnswer(lower)) return true;

    // Corrections and clarifications - always route to chat agent, never to food analysis
    if (CORRECTION_INDICATORS.some(i => lower.includes(i))) return true;

    // Emotional state, cravings, satiety, humor - always route to chat agent
    if (EMOTION_CRAVING_INDICATORS.some(i => lower.includes(i))) return true;

    // Conversational affirmations and short responses - always route to chat agent, never to food analysis
    const conversationalAffirmations = [
      'de acordo', 'entendido', 'entendi', 'combinado', 'beleza', 'ótimo', 'otimo',
      'ótima', 'otima', 'perfeito', 'perfeita', 'show', 'tá bom', 'ta bom',
      'tudo bem', 'tudo certo', 'concordo', 'exato', 'exatamente', 'claro',
      'com certeza', 'pode ser', 'certo', 'sim', 'não', 'nao', 'ok', 'okay',
      'legal', 'boa', 'bom', 'fechado', 'combinei', 'pode', 'vai',
    ];
    // Only match affirmations if the entire message is short (≤ 5 words) to avoid
    // accidentally routing food messages that happen to contain these words
    const wordCount = lower.split(/\s+/).filter(Boolean).length;
    if (wordCount <= 5 && conversationalAffirmations.some(a => lower === a || lower.startsWith(a + ' ') || lower.endsWith(' ' + a))) return true;

    const questionIndicators = [
      '?', 'como ', 'por que', 'porque', 'qual ', 'quais ', 'quando ', 'quanto ',
      'o que ', 'o quê', 'dica', 'sugestão', 'sugestao', 'explica', 'explique',
      'me fala', 'me diga', 'é importante', 'e importante', 'preciso de',
      'posso comer', 'devo comer', 'melhor para', 'é bom', 'e bom', 'faz bem',
      'faz mal', 'benefício', 'beneficio', 'vitamina', 'proteína', 'proteina',
      'emagrecer', 'engordar', 'ajuda', 'ajude', 'recomenda', 'pode me',
      'substituir', 'substitua', 'trocar', 'troque', 'trocar por', 'diferença', 'diferenca',
      'saudável', 'saudavel', 'caloria', 'dieta', 'jejum', 'metabolismo',
      'treino', 'pré-treino', 'pós-treino', 'pre treino', 'pos treino',
      'hidratação', 'hidratacao', 'água', 'agua', 'dormir', 'sono',
      'oi', 'olá', 'ola', 'bom dia', 'boa tarde', 'boa noite', 'obrigado', 'obrigada', 'valeu',
      'sugira', 'sugerir', 'me sugira', 'sugere', 'me sugere', 'me sugira',
      'outra opção', 'outra opcao', 'outra alternativa', 'outro ingrediente',
      'recomend', 'poderia sugerir', 'lanche saudavel', 'lanche rapido', 'lanche rápido',
      'me indica', 'opção diferente', 'opcao diferente', 'quero a opção', 'quero a opcao',
      'quero opção', 'prefiro', 'escolho', 'vou de', 'pode ser'
    ];
    return questionIndicators.some(indicator => lower.includes(indicator));
  };

  const handleSend = async () => {
    console.log('MealLogger: handleSend called', { input });
    if (!input.trim() || isSendingRef.current) return;

    isSendingRef.current = true;
    const userMsg: Message = { id: Date.now().toString(), type: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    const userText = input;
    setInput('');
    setLoading(true);

    try {
      // A PURE meal/drink log goes to the ISOLATED analysis path (no chat history),
      // so the feedback never blends with past meals from history (the "phantom meal"
      // bug) and there's no double feedback. Questions, water, doses, corrections and
      // emotional messages still go to the conversational agent.
      const routeToAgent = isQuestion(userText) && !isPureMealReport(userText) && !!user;

      if (routeToAgent) {
        // Route to Smart Agent (UnifiedChatService)
        // Inject current meal context so the agent knows which meal is being discussed
        // Water intake messages (e.g. "bebi 1500ml de água") must NOT carry the previous
        // meal context - otherwise the AI responds about the meal instead of the hydration.
        // Detecção Unicode-safe centralizada (ver src/utils/intakeDetection.ts) — o `\b`
        // colado em "água" falhava e o contexto de refeição rascunho vazava em logs de água.
        const isWaterIntakeMessage = userReportedWaterIntake(userText);

        const mealContext = (!isWaterIntakeMessage && draftMeal)
          ? `[Contexto da refeição atual: ${draftMeal.foodName} - ${(draftMeal.items || []).map(i => `${i.name} ${i.weightGrams}g (${i.calories}kcal)`).join(', ')}]\n\n`
          : '';
        const agentResponse = await UnifiedChatService.sendMessage(
          user.id,
          mealContext + userText,
          { interceptMeals: false, userDisplayContent: userText, language }
        );

        // Always extract meal_json if it exists (AI decided it's a meal)
        const mealJsonMatch = agentResponse.content.match(/<meal_json>([\s\S]*?)<\/meal_json>/);

        // Also check for water JSON (hydration logging)
        const waterJsonMatch = agentResponse.content.match(/<water_json>([\s\S]*?)<\/water_json>/);

        if (mealJsonMatch && !isWaterIntakeMessage) {
          try {
            const cleanText = agentResponse.content
              .replace(/<meal_json>[\s\S]*?<\/meal_json>/g, '')
              .replace(/<water_json>[\s\S]*?<\/water_json>/g, '')
              .replace(/<dose_json>[\s\S]*?<\/dose_json>/g, '')
              .trim();
            const parsedMeal = normalizeMealAnalysis(parseAiJson<unknown>(mealJsonMatch[1]), { strict: true });
            setMessages(prev => [...prev,
            { id: (Date.now() + 1).toString(), type: 'ai-text', content: cleanText },
            { id: (Date.now() + 2).toString(), type: 'ai-card', content: parsedMeal }
            ]);
            setDraftMeal(parsedMeal);
            setDraftSource('chat');
          } catch {
            // If JSON parse fails, fall back to plain text
            const cleanContent = agentResponse.content
              .replace(/<meal_json>[\s\S]*?<\/meal_json>/g, '')
              .replace(/<water_json>[\s\S]*?<\/water_json>/g, '')
              .replace(/<dose_json>[\s\S]*?<\/dose_json>/g, '')
              .trim();
            setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), type: 'ai-text', content: cleanContent || agentResponse.content }]);
          }
        } else if (waterJsonMatch) {
          // Water logging - just show the text without the JSON block
          try {
            const cleanText = agentResponse.content
              .replace(/<water_json>[\s\S]*?<\/water_json>/g, '')
              .replace(/<dose_json>[\s\S]*?<\/dose_json>/g, '')
              .trim();
            setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), type: 'ai-text', content: cleanText }]);

            // Optionally log the water intake
            const waterData = parseAiJson<{ ml: number }>(waterJsonMatch[1]);
            console.log('[MealLogger] Water logged:', waterData.ml, 'ml');
          } catch {
            const cleanContent = agentResponse.content
              .replace(/<water_json>[\s\S]*?<\/water_json>/g, '')
              .replace(/<dose_json>[\s\S]*?<\/dose_json>/g, '')
              .trim();
            setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), type: 'ai-text', content: cleanContent || agentResponse.content }]);
          }
        } else {
          // Strip any JSON blocks from the text
          const cleanContent = agentResponse.content
            .replace(/<meal_json>[\s\S]*?<\/meal_json>/g, '')
            .replace(/<water_json>[\s\S]*?<\/water_json>/g, '')
            .replace(/<dose_json>[\s\S]*?<\/dose_json>/g, '')
            .trim();
          setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), type: 'ai-text', content: cleanContent || agentResponse.content }]);
        }
        // draft meal only set if meal_json was found above
      } else {
        // Route to Food Analysis (original behavior)
        const result = await analyzeTextLog(userText, language, profile);

        // Name the meal by the device-clock slot ("Jantar", "Ceia"…) instead of trusting
        // a model-derived time — fixes the "Almoço às 21h" bug. Skip when the user already
        // named the meal explicitly (almocei/jantei/café…).
        const userNamedMeal = /\b(almoc|jant|café da manh|cafe da manh|lanch|ceia|ceei)/i.test(userText);
        if (isPureMealReport(userText) && !userNamedMeal) {
          result.foodName = getMealSlotLabel();
        }

        const aiTextMsg: Message = {
          id: (Date.now() + 1).toString(),
          type: 'ai-text',
          content: t.mealLogger.analysisIntro
        };

        const aiCardMsg: Message = {
          id: (Date.now() + 2).toString(),
          type: 'ai-card',
          content: result
        };

        setMessages(prev => [...prev, aiTextMsg, aiCardMsg]);
        setDraftMeal(result);
        setDraftSource('chat');

        // Persist food analysis messages to DB so they survive remounts
        if (user) {
          const agentContent = `${t.mealLogger.analysisIntro}\n<meal_json>${JSON.stringify(result)}</meal_json>`;
          UnifiedChatService.saveDirectMessages(user.id, userText, agentContent).catch(() => { });
        }
      }
    } catch (e) {
      console.error('[MealLogger] Falha ao responder:', e);
      const errorMsg: Message = {
        id: Date.now().toString(),
        type: 'ai-text',
        content: 'Não consegui analisar essa mensagem agora. Tente enviar novamente em instantes.',
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
      isSendingRef.current = false;
    }
  };

  /**
   * Analisa a foto já otimizada. Erro NÃO fecha a tela nem dispara alerta cego:
   * vira estado de erro com a mensagem real e botão de tentar de novo (antes, a
   * tela ficava presa em "Identificando..." para sempre).
   */
  const runImageAnalysis = async (base64: string) => {
    setScanError(null);
    setLoading(true);
    try {
      // Foto de água pura tem caminho próprio: cair no analisador de refeição
      // registrava um "prato de 0 kcal" e a ingestão nunca entrava na hidratação.
      const result = await analyzeImageLog(base64, language, profile);
      if (result.kind === 'water') {
        setWaterScan(result.hydration);
        waterMealFallbackRef.current = result.mealFallback;
      } else {
        setScanResult(result.meal);
        waterMealFallbackRef.current = null;
      }
    } catch (err) {
      console.error('Scan failed', err);
      setScanError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const base64 = await fileToResizedDataUrl(file, 800);
      setScannedImageUri(base64);
      await runImageAnalysis(base64);
    } catch (err) {
      console.error('Scan failed', err);
      setLoading(false);
      // Não usar `scanError` aqui: a tela de scan só é renderizada quando existe
      // `scannedImageUri`, e nesta altura ainda não existe. Gravar o erro ali
      // deixava o usuário de volta no chat sem sinal nenhum de que algo falhou.
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        type: 'ai-text',
        content: `Não consegui abrir essa foto. Tente novamente. (${err instanceof Error ? err.message : String(err)})`,
      }]);
    } finally {
      // Clear input value to allow re-selection
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handlePickPhoto = () => setPhotoSheet(true);

  /**
   * Tudo passa pelo mesmo <input type="file">, alternando só o atributo
   * `capture` — nenhum plugin envolvido.
   *
   * Com `capture`, o WebView abre a câmera DIRETO, sem a folha de opções do
   * sistema; sem ele, abre o seletor de fotos. Assim os rótulos que o usuário lê
   * são os nossos (idioma do app, não do aparelho) e o caminho de arquivo é o
   * mesmo que sempre funcionou aqui.
   *
   * A tentativa anterior via @capacitor/camera falhou nos dois lados: a galeria
   * abria vazia quando a permissão de fotos estava em "Limited" (o plugin amarra
   * o picker à autorização do app) e a câmera não retornava imagem. O input do
   * WebView não depende de permissão de galeria nenhuma.
   */
  /**
   * Galeria no iOS vai pelo plugin nativo, que abre a biblioteca DIRETO.
   * O `<input type="file">` sempre passa pela folha "Fototeca / Tirar Foto /
   * Escolher Arquivo" e não há atributo HTML que a pule — `capture` só resolve
   * o lado da câmera. Nas outras plataformas o input já abre a galeria direto,
   * então não há motivo para código nativo.
   *
   * Se o plugin não estiver registrado no projeto Xcode, cai no input: melhor
   * um passo a mais do que o botão não fazer nada.
   */
  const abrirGaleria = async () => {
    if (Capacitor.getPlatform() !== 'ios') {
      abrirSeletor(false);
      return;
    }
    setPhotoSheet(false);
    try {
      const { dataUrl, cancelado } = await GaleriaNativa.escolherImagem({ ladoMaximo: 1600 });
      if (cancelado || !dataUrl) return;

      setLoading(true);
      const blob = await (await fetch(dataUrl)).blob();
      const base64 = await fileToResizedDataUrl(blob, 800);
      setScannedImageUri(base64);
      await runImageAnalysis(base64);
    } catch (err) {
      console.error('Galeria nativa indisponível, usando o seletor do WebView:', err);
      setLoading(false);
      abrirSeletor(false);
    }
  };

  const abrirSeletor = (usarCamera: boolean) => {
    setPhotoSheet(false);
    const input = fileInputRef.current;
    if (!input) return;
    // Imperativo e síncrono de propósito: o clique precisa acontecer ainda
    // dentro do gesto do usuário, senão o WebView ignora.
    if (usarCamera) input.setAttribute('capture', 'environment');
    else input.removeAttribute('capture');
    input.click();
  };


  const isLoggingRef = useRef(false);

  /**
   * Feedback da refeição já registrada, cruzando prato + plano ativo + metas do dia
   * + aderência da semana. Roda DEPOIS do logMeal para o balanço do dia já incluir
   * esta refeição. Se qualquer coisa falhar, cai na mensagem da própria análise.
   */
  const buildMealFeedback = async (data: AIResponse): Promise<string> => {
    const fallback = data.message || `${data.foodName} registrado com sucesso!`;
    if (!user) return fallback;
    try {
      const [stats, weekly, plan] = await Promise.all([
        StatsService.getDailyStats(user.id),
        StatsService.getWeeklySummary(user.id).catch(() => null),
        PlanService.getActivePlan(user.id).catch(() => null),
      ]);
      const feedback = await generateMealFeedback(data.items, data.foodName, language, {
        profile,
        consumedToday: {
          calories: stats.consumedCalories,
          protein: stats.macros.protein,
          carbs: stats.macros.carbs,
          fats: stats.macros.fats,
        },
        targetToday: {
          calories: stats.targetCalories,
          protein: stats.targetMacros.protein,
          carbs: stats.targetMacros.carbs,
          fats: stats.targetMacros.fats,
        },
        hydration: { ml: stats.waterIntake ?? 0, goalMl: stats.waterGoal ?? 0 },
        activitiesToday: stats.activityCalories
          ? [{ name: 'Atividades de hoje', calories_burned: stats.activityCalories }]
          : undefined,
        weekly,
        plan,
        mealTime: new Date(),
      });
      return feedback || fallback;
    } catch (e) {
      console.error('[MealLogger] feedback contextualizado falhou, usando o da análise:', e);
      return fallback;
    }
  };

  /**
   * Registra a água da foto na hidratação (nunca em refeição/calorias).
   * A quantidade é a que o usuário confirmou na tela — a estimativa da IA sozinha
   * nunca grava nada, mesma regra do interceptor de texto.
   */
  const handleConfirmWater = async (ml: number, edited: boolean) => {
    if (!user || isLoggingRef.current) return;
    isLoggingRef.current = true;

    const analysis = waterScan;
    // Ajustar a estimativa do recipiente é correção da leitura da IA (👎).
    enviarFeedback(
      analysis?.idRequisicao,
      edited ? 'negativo' : 'positivo',
      edited ? 'usuário corrigiu a quantidade de água estimada na foto' : undefined,
    );

    setLoading(true);
    try {
      const { logged, totalMl } = await HydrationService.logWater(user.id, ml, 'photo');
      // Duplicata (toque repetido): o registro do toque anterior já valeu — não
      // repete a confirmação no chat nem soma de novo.
      if (!logged) { setLoading(false); return; }

      const goalMl = await HydrationService.getTodayGoalMl(user.id).catch(() => null);
      const amountLine = `Registrei ${ml} ml de água na sua hidratação 💧`;
      const totalLine = totalMl
        ? goalMl
          ? ` Total de hoje: ${totalMl} ml de ${goalMl} ml da sua meta (${Math.round((totalMl / goalMl) * 100)}%).`
          : ` Total de hoje: ${totalMl} ml.`
        : '';
      // O texto da IA é só a frase de incentivo (o prompt proíbe números nela) —
      // a quantidade exibida vem sempre do que o usuário confirmou.
      const encouragement = analysis?.message ? `\n\n${analysis.message}` : '';
      const feedback = `${amountLine}${totalLine}${encouragement}`;

      setMessages(prev => [
        ...prev,
        { id: Date.now().toString(), type: 'ai-text', content: feedback },
      ]);
      setLoading(false);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setWaterScan(null);
        setScannedImageUri(null);
        if (user) localStorage.removeItem(`Malama_draft_meal_${user.id}`);
      }, 900);

      // Sem <image_uri> aqui: a bolha de água é texto puro (só o card de refeição
      // renderiza miniatura), então guardar o base64 seria peso morto no histórico.
      UnifiedChatService.saveDirectMessages(
        user.id,
        `[Foto: ${analysis?.label || 'Água'}]`,
        feedback,
      ).catch(() => {});
    } catch (error) {
      console.error('Failed to log water:', error);
      alert('Não consegui registrar sua hidratação agora. Tente novamente.');
      setLoading(false);
    } finally {
      isLoggingRef.current = false;
    }
  };

  /** "Não é água": usa a análise que já veio junto; só reanalisa se ela não servir. */
  const handleWaterFalsePositive = async () => {
    if (!scannedImageUri) return;
    enviarFeedback(
      waterScan?.idRequisicao,
      'negativo',
      'scan classificou como água mas não era',
    );
    const fallback = waterMealFallbackRef.current;
    setWaterScan(null);
    if (fallback) {
      setScanResult(fallback);
      return;
    }
    setScanError(null);
    setLoading(true);
    try {
      const result = await analyzeImageLog(scannedImageUri, language, profile, { forceMeal: true });
      if (result.kind === 'meal') setScanResult(result.meal);
    } catch (err) {
      console.error('Scan failed', err);
      setScanError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmLog = async (data: AIResponse, type: 'ai-chat' | 'ai-photo' | 'ai-voice') => {
    if (!user || isLoggingRef.current) return;
    isLoggingRef.current = true;
    const normalizedData = normalizeMealAnalysis(data);

    // Sinal implícito de qualidade para o Telê (fire-and-forget): confirmar
    // sem editar = a análise acertou; ter precisado editar = errou.
    enviarFeedback(
      normalizedData.idRequisicao,
      analiseFoiEditadaRef.current ? 'negativo' : 'positivo',
      analiseFoiEditadaRef.current ? 'usuário editou a análise antes de salvar' : undefined,
    );
    analiseFoiEditadaRef.current = false;

    // Always clear any pending draft before logging to prevent double-registration
    setDraftMeal(null);
    setScanError(null); // nova tentativa limpa o erro anterior
    setLoading(true);
    try {
      const newMeal: Meal = {
        id: Date.now().toString(),
        name: normalizedData.foodName,
        timestamp: new Date(),
        calories: normalizedData.calories,
        macros: {
          protein: normalizedData.macros.p,
          carbs: normalizedData.macros.c,
          fats: normalizedData.macros.f
        },
        type: type,
        items: normalizedData.items,
        imageUri: type === 'ai-photo' && scannedImageUri ? scannedImageUri : undefined
      };

      console.log('MealLogger: Calling MealService.logMeal...');
      await MealService.logMeal(newMeal, user.id);
      console.log('MealLogger: Logged! Calling onLog...');
      onLog(newMeal);

      if (user) localStorage.removeItem(`Malama_draft_meal_${user.id}`);

      if (type === 'ai-photo') {
        // Card entra na hora; o texto espera o feedback que cruza plano + metas do
        // dia + semana (a mensagem crua da análise é só o fallback).
        const cardId = Date.now().toString();
        const capturedImageUri = scannedImageUri ?? undefined;
        setMessages(prev => [
          ...prev,
          { id: cardId, type: 'ai-card', content: normalizedData, imageUri: capturedImageUri },
        ]);
        const feedback = await buildMealFeedback(normalizedData);
        const textId = (Date.now() + 1).toString();
        setMessages(prev => [...prev, { id: textId, type: 'ai-text', content: feedback }]);
        setLoading(false);
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          setScanResult(null);
          setScannedImageUri(null);
          setScanError(null);
          setDraftMeal(null);
          waterMealFallbackRef.current = null;
          if (user) localStorage.removeItem(`Malama_draft_meal_${user.id}`);
        }, 900);

        if (user) void (async () => {
          // Persist a small thumbnail (200px) so the photo survives chat reloads
          let imageTag = '';
          if (capturedImageUri) {
            try {
              const thumb = await resizeImage(capturedImageUri, 200);
              imageTag = `\n<image_uri>${thumb}</image_uri>`;
            } catch { /* non-blocking */ }
          }
          const agentContent = `${feedback}\n<meal_json>${JSON.stringify(normalizedData)}</meal_json>${imageTag}`;
          await UnifiedChatService.saveDirectMessages(user.id, `[Foto: ${normalizedData.foodName}]`, agentContent);
        })();
      } else {
        // ai-chat / ai-voice: mesmo feedback contextualizado, sem sair do chat.
        const feedback = await buildMealFeedback(normalizedData);
        setMessages(prev => [
          ...prev,
          { id: Date.now().toString(), type: 'ai-text', content: feedback },
        ]);
        if (user) {
          UnifiedChatService.saveAgentMessage(user.id, feedback).catch(() => {});
        }
        setLoading(false);
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          setDraftMeal(null);
          if (user) localStorage.removeItem(`Malama_draft_meal_${user.id}`);
        }, 900);
      }
    } catch (error) {
      console.error('Failed to log meal:', error);
      const detail = error instanceof Error ? error.message : String(error);
      if (type === 'ai-photo') {
        // Na tela de scan o erro aparece no lugar do alerta, com a causa real e
        // botão de tentar de novo — o registro não pode virar beco sem saída.
        setScanError(detail);
      } else {
        alert(`${t.mealLogger.errorLogging}\n\n${detail}`);
      }
      setLoading(false);
    } finally {
      isLoggingRef.current = false;
    }
  };

  const handleCancel = () => {
    // Remove pending draft from localStorage
    if (user) localStorage.removeItem(`Malama_draft_meal_${user.id}`);

    // Remove the last ai-card message from chat (the pending nutritional analysis)
    setMessages((prev: Message[]) => {
      const lastCardIdx = [...prev].reverse().findIndex((m: Message) => m.type === 'ai-card');
      if (lastCardIdx === -1) return prev; // No ai-card found
      const idx = prev.length - 1 - lastCardIdx;
      return prev.filter((_, i) => i !== idx);
    });

    // Clear draft state
    setDraftMeal(null);

    // Close the MealLogger
    onClose();
  };

  // Show confirm dialog if there is unsaved data, otherwise close immediately
  const handleClose = () => {
    if (draftMeal || scanResult || waterScan) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  };

  // Discard everything and close
  const handleDiscardAndClose = () => {
    // Descartar a análise é o sinal negativo mais forte que existe: a IA
    // errou a ponto de o registro não valer a pena.
    enviarFeedback(
      (draftMeal ?? scanResult)?.idRequisicao,
      'negativo',
      'usuário descartou a análise',
    );
    analiseFoiEditadaRef.current = false;
    if (user) localStorage.removeItem(`Malama_draft_meal_${user.id}`);
    setScanResult(null);
    setScannedImageUri(null);
    setWaterScan(null);
    setDraftMeal(null);
    setShowDiscardConfirm(false);
    onClose();
  };

  // Save the pending meal/scan and close
  const handleConfirmAndClose = async () => {
    setShowDiscardConfirm(false);
    if (draftMeal) {
      await handleConfirmLog(
        draftMeal,
        draftSource === 'photo' ? 'ai-photo' : 'ai-chat'
      );
    } else if (scanResult) {
      await handleConfirmLog(scanResult, 'ai-photo');
    }
  };

  const handleOpenEdit = () => {
    if (!draftMeal) return;
    // O usuário abriu a edição = a análise da IA não estava boa o suficiente.
    analiseFoiEditadaRef.current = true;
    setEditItems(draftMeal.items ? draftMeal.items.map((i: MealItem) => ({ ...i })) : []);
    setEditMode(true);
  };

  /**
   * Compara a análise da IA com o que o usuário editou e envia a diferença
   * ao Caramel. Só envia se algo mudou de fato — abrir a edição e sair sem
   * alterar nada não é correção, e poluiria o dataset com ruído.
   */
  const registrarCorrecaoDaAnalise = (
    analiseIA: AIResponse | null,
    itensCorrigidos: MealItem[]
  ) => {
    if (!analiseIA?.idRequisicao) return;

    const resumir = (itens: MealItem[]) => ({
      itens: itens.map((i: MealItem) => ({
        name: i.name,
        weightGrams: i.weightGrams ?? null,
        calories: i.calories ?? null,
        protein: i.protein ?? null,
        carbs: i.carbs ?? null,
        fats: i.fats ?? null,
      })),
      calories: itens.reduce((s, i) => s + (i.calories || 0), 0),
      protein: itens.reduce((s, i) => s + (i.protein || 0), 0),
      carbs: itens.reduce((s, i) => s + (i.carbs || 0), 0),
      fats: itens.reduce((s, i) => s + (i.fats || 0), 0),
    });

    const original = resumir(analiseIA.items || []);
    const corrigido = resumir(itensCorrigidos);

    const campos: string[] = [];
    if (original.itens.length !== corrigido.itens.length) campos.push('items');
    for (const campo of ['calories', 'protein', 'carbs', 'fats'] as const) {
      if (Math.round(original[campo]) !== Math.round(corrigido[campo])) campos.push(campo);
    }
    // nomes/pesos alterados sem mudar o total também são correção válida
    const nomesMudaram = original.itens.some(
      (it, idx) => corrigido.itens[idx] && it.name !== corrigido.itens[idx].name
    );
    if (nomesMudaram && !campos.includes('items')) campos.push('items');

    if (campos.length === 0) return; // nada mudou de verdade

    enviarCorrecao(
      analiseIA.idRequisicao,
      'analise_refeicao_foto',
      original,
      corrigido,
      campos
    );
  };

  const handleRecalculate = async () => {
    if (!editItems.length) return;
    setLoading(true);
    try {
      // Antes de recalcular: registra O QUE a IA errou e QUAL era o certo.
      // É o dado que faz o scan melhorar — muito mais rico que um 👎.
      registrarCorrecaoDaAnalise(draftMeal, editItems);

      const description = editItems
        .map((i: MealItem) => `${i.quantity ? i.quantity + ' de ' : ''}${i.name}${i.weightGrams ? ' ' + i.weightGrams + 'g' : ''}`)
        .join(', ');
      const result = await analyzeTextLog(description, language);
      setDraftMeal(result);
      setMessages((prev: Message[]) => {
        // Replace the last ai-card message with the updated one
        const lastCardIdx = [...prev].reverse().findIndex((m: Message) => m.type === 'ai-card');
        if (lastCardIdx === -1) return [...prev, { id: Date.now().toString(), type: 'ai-card', content: result }];
        const idx = prev.length - 1 - lastCardIdx;
        const updated = [...prev];
        updated[idx] = { ...updated[idx], content: result };
        return updated;
      });
      setEditMode(false);
    } catch (e) {
      console.error('Recalculate failed:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    console.log('MealLogger: handleKeyDown', e.key);
    if (e.key === 'Enter' && !loading) {
      handleSend();
    }
  };

  // Show scan screen as soon as image is selected — analysis runs in background
  if (scannedImageUri) {
    // Água pura: confirmação de quantidade → hidratação (não vira refeição)
    if (waterScan) {
      return (
        <MalamaWaterScan
          hydration={waterScan}
          imageUri={scannedImageUri}
          onConfirm={handleConfirmWater}
          onNotWater={handleWaterFalsePositive}
          onBack={() => {
            setWaterScan(null);
            setScannedImageUri(null);
            waterMealFallbackRef.current = null;
            if (user) localStorage.removeItem(`Malama_draft_meal_${user.id}`);
          }}
        />
      );
    }
    return (
      <MalamaAiScan
        data={scanResult}
        imageUri={scannedImageUri}
        isLoading={!scanResult && !scanError}
        error={scanError}
        onRetry={() => { void runImageAnalysis(scannedImageUri); }}
        onConfirm={(finalData) => handleConfirmLog(finalData, 'ai-photo')}
        onBack={() => {
          setScanResult(null);
          setScannedImageUri(null);
          setScanError(null);
          waterMealFallbackRef.current = null;
          if (user) localStorage.removeItem(`Malama_draft_meal_${user.id}`);
        }}
      />
    );
  }

  const renderMessage = (msg: Message) => {
    if (msg.type === 'user') {
      const photoMatch = typeof msg.content === 'string' && msg.content.match(/^\[Foto: (.+)\]$/);
      return (
        <div key={msg.id} className="flex items-end gap-3 justify-end w-full animate-fade-in-up">
          <div className="flex flex-col gap-1 items-end max-w-[85%]">
            {photoMatch ? (
              <div className="bg-Malama-petrol dark:bg-primary text-white text-sm font-medium rounded-2xl rounded-tr-sm px-4 py-2.5 shadow-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] shrink-0">photo_camera</span>
                <span>{photoMatch[1]}</span>
              </div>
            ) : (
              <div className="bg-Malama-petrol dark:bg-primary text-white text-base font-normal leading-relaxed rounded-2xl rounded-tr-sm px-5 py-3 shadow-sm">
                {msg.content}
              </div>
            )}
            <span className="text-Malama-muted dark:text-slate-400 text-[11px] font-medium pr-1">Você</span>
          </div>
          <div
            className="bg-center bg-no-repeat bg-cover rounded-full w-8 h-8 shrink-0 border border-Malama-border dark:border-white/10"
            style={{ backgroundImage: `url("${profile?.avatar_url || USER_AVATAR}")` }}
          />
        </div>
      );
    }

    if (msg.type === 'ai-text') {
      return (
        <div key={msg.id} className="flex gap-3 w-full max-w-full animate-fade-in-up">
          <div className="shrink-0 flex flex-col justify-end pb-6">
            <div className="bg-gradient-to-br from-Malama-petrol to-[#7d4a3c] dark:from-primary dark:to-[#7d4a3c] flex items-center justify-center rounded-full w-8 h-8 shrink-0">
              <span className="material-symbols-outlined text-white text-sm">smart_toy</span>
            </div>
          </div>
          <div className="flex flex-col gap-3 flex-1 min-w-0">
            <div className="flex flex-col gap-1 items-start max-w-[95%]">
              <span className="text-Malama-muted dark:text-slate-400 text-[11px] font-medium pl-1">Malama AI</span>
              <div className="bg-white dark:bg-surface-dark text-Malama-main dark:text-slate-200 text-base font-normal leading-relaxed rounded-2xl rounded-tl-sm px-5 py-4 shadow-sm border border-Malama-border dark:border-white/5">
                {renderMarkdown(msg.content)}
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (msg.type === 'ai-card') {
      const data = normalizeMealAnalysis(msg.content);
      const totalMacros = data.macros.p + data.macros.c + data.macros.f;
      const safeDivisor = totalMacros > 0 ? totalMacros : 1;
      const pPct = (data.macros.p / safeDivisor) * 100;
      const cPct = (data.macros.c / safeDivisor) * 100;
      const fPct = (data.macros.f / safeDivisor) * 100;

      return (
        <div key={msg.id} className="flex gap-3 w-full max-w-full animate-fade-in-up pl-11">
          <div className="bg-white dark:bg-surface-dark rounded-2xl overflow-hidden shadow-sm border border-Malama-border dark:border-white/5 w-full">

            {/* Header: photo strip or gradient banner */}
            {msg.imageUri ? (
              <div className="relative w-full h-24">
                <img src={msg.imageUri} alt={data.foodName} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-black/10" />
                <div className="absolute bottom-2 left-3 right-3 flex items-end justify-between gap-2">
                  <h3 className="text-white text-sm font-bold leading-tight line-clamp-1 flex-1">{data.foodName}</h3>
                  <span className="text-white text-sm font-bold shrink-0 tabular-nums">{data.calories} kcal</span>
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-r from-Malama-petrol to-[#b85c47] px-4 py-3 flex items-center justify-between gap-3">
                <h3 className="text-white text-sm font-bold leading-snug flex-1 min-w-0 line-clamp-2">{data.foodName}</h3>
                <div className="text-right shrink-0">
                  <p className="text-white text-xl font-black leading-none tabular-nums">{data.calories}</p>
                  <p className="text-white/70 text-[10px] uppercase tracking-wider font-semibold">kcal</p>
                </div>
              </div>
            )}

            <div className="px-3 pt-2.5 pb-3">
              {/* Macro progress bar */}
              <div className="mb-3">
                <div className="flex rounded-full overflow-hidden h-1.5 gap-px mb-2">
                  <div className="bg-[#60b4f5] transition-all" style={{ width: `${pPct}%` }} />
                  <div className="bg-[#f9c74f] transition-all" style={{ width: `${cPct}%` }} />
                  <div className="bg-[#f4845f] transition-all" style={{ width: `${fPct}%` }} />
                </div>
                <div className="flex justify-around">
                  {[
                    { label: t.macros.prot, value: data.macros.p, color: 'text-[#4fa8e8]' },
                    { label: t.macros.carb, value: data.macros.c, color: 'text-[#d4a017]' },
                    { label: t.macros.fat,  value: data.macros.f, color: 'text-[#e06b48]' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="flex flex-col items-center gap-0.5">
                      <span className={`text-sm font-black tabular-nums ${color}`}>{value}g</span>
                      <span className="text-[10px] text-Malama-muted dark:text-slate-500 font-medium">{label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Items list */}
              {data.items && data.items.length > 0 && (
                <div className="flex flex-col gap-1.5 border-t border-Malama-border dark:border-white/5 pt-2.5">
                  {data.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="bg-Malama-bg dark:bg-white/5 rounded-lg size-7 shrink-0 flex items-center justify-center">
                          <span className="material-symbols-outlined text-Malama-muted dark:text-slate-500 text-xs">lunch_dining</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-Malama-main dark:text-white text-xs font-semibold truncate">{item.name}</p>
                          {(item.quantity || item.weightGrams) && (
                            <p className="text-Malama-muted dark:text-slate-500 text-[10px]">
                              {item.quantity ?? ''}{item.weightGrams ? ' · ' + item.weightGrams + 'g' : ''}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="text-Malama-petrol dark:text-primary text-xs font-bold shrink-0 tabular-nums">{item.calories} kcal</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="fixed inset-0 z-50 bg-Malama-bg dark:bg-background-dark text-Malama-main dark:text-white flex flex-col font-display animate-fade-in pt-safe">

      {/* Top Navigation */}
      <header className="flex items-center px-4 py-3 justify-between shrink-0 z-10 bg-Malama-bg/95 dark:bg-background-dark/95 backdrop-blur-sm sticky top-0 border-b border-Malama-border dark:border-white/5">
        <div onClick={handleClose} className="text-Malama-main dark:text-white flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer">
          <span className="material-symbols-outlined text-2xl">arrow_back</span>
        </div>
        <div className="flex flex-col items-center">
          <h2 className="text-Malama-main dark:text-white text-lg font-bold leading-tight tracking-[-0.015em]">{t.mealLogger.title}</h2>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-Malama-petrol dark:bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-Malama-petrol dark:bg-primary"></span>
            </span>
            <span className="text-xs font-medium text-Malama-petrol dark:text-primary tracking-wide uppercase">{t.mealLogger.online}</span>
          </div>
        </div>
        <div className="flex size-10 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer">
          <span className="material-symbols-outlined text-2xl">more_horiz</span>
        </div>
      </header>

      {/* Chat Area */}
      <main ref={scrollRef} className="flex-1 overflow-y-auto hide-scrollbar p-4 flex flex-col gap-6 pb-40">

        {/* Loading history skeleton */}
        {loadingHistory && (
          <div className="flex flex-col gap-4 mt-4 animate-pulse">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-white/10 shrink-0" />
              <div className="flex flex-col gap-1 flex-1">
                <div className="h-4 bg-gray-200 dark:bg-white/10 rounded-full w-2/3" />
                <div className="h-4 bg-gray-200 dark:bg-white/10 rounded-full w-1/2" />
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <div className="h-10 bg-gray-200 dark:bg-white/10 rounded-2xl w-1/2" />
              <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-white/10 shrink-0" />
            </div>
          </div>
        )}

        {/* Empty state after history loaded */}
        {!loadingHistory && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full opacity-50 mt-10 text-Malama-muted dark:text-slate-500">
            <span className="material-symbols-outlined text-4xl mb-2">nutrition</span>
            <p>{t.mealLogger.describeMeal}</p>
          </div>
        )}

        {/* Loading State Overlay for Scan */}
        {loading && !messages.length && (
          <div className="absolute inset-0 bg-Malama-bg/50 dark:bg-background-dark/50 backdrop-blur-sm z-20 flex flex-col items-center justify-center">
            <div className="w-16 h-16 border-4 border-Malama-petrol dark:border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="font-medium animate-pulse text-Malama-petrol dark:text-primary">{t.mealLogger.analyzing}</p>
          </div>
        )}

        {/* Messages with date separators */}
        {(() => {
          let lastDateLabel = '';
          return messages.map((msg) => {
            // Determine date label for this message
            const rawId = msg.id.replace(/-text$|-card$/, '');
            const isoDate = messageDates[rawId];
            const dateLabel = isoDate ? getDateLabel(isoDate) : '';
            const showSeparator = dateLabel && dateLabel !== lastDateLabel;
            if (showSeparator) lastDateLabel = dateLabel;

            return (
              <React.Fragment key={msg.id}>
                {showSeparator && (
                  <div className="flex justify-center">
                    <span className="text-xs font-medium text-Malama-muted dark:text-slate-500 bg-gray-100 dark:bg-white/5 px-3 py-1 rounded-full">
                      {dateLabel}
                    </span>
                  </div>
                )}
                {renderMessage(msg)}
              </React.Fragment>
            );
          });
        })()}


        {loading && messages.length > 0 && (
          <div className="flex gap-3 animate-pulse pl-11">
            <div className="bg-white dark:bg-surface-dark px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm border border-Malama-border dark:border-white/5">
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce"></div>
                <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce delay-75"></div>
                <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce delay-150"></div>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Bottom Fixed Action Area */}
      <div className="fixed bottom-0 left-0 w-full bg-Malama-bg/95 dark:bg-background-dark/95 backdrop-blur-md pt-2 pb-6 px-4 z-20 border-t border-Malama-border dark:border-white/5">
        <div className="flex flex-col gap-4 max-w-lg mx-auto">

          {/* Action Dock Buttons - Only Show if Draft Exists in Chat Mode */}
          {draftMeal && (
            <div className="flex items-center gap-3 w-full animate-fade-in-up">
              <button
                onClick={handleCancel}
                className="flex-1 h-12 rounded-xl flex items-center justify-center gap-2 text-Malama-muted hover:text-Malama-main dark:text-slate-400 dark:hover:text-white font-semibold text-sm transition-colors active:scale-95"
              >
                {t.mealLogger.cancel}
              </button>
              <button
                onClick={handleOpenEdit}
                className="flex-1 h-12 rounded-xl border border-Malama-border dark:border-white/10 bg-transparent flex items-center justify-center gap-2 text-Malama-main dark:text-white font-semibold text-sm hover:bg-gray-100 dark:hover:bg-white/5 transition-colors active:scale-95"
              >
                <span className="material-symbols-outlined text-base">edit</span>
                {t.mealLogger.edit}
              </button>
              <button
                onClick={() => handleConfirmLog(draftMeal, draftSource === 'photo' ? 'ai-photo' : 'ai-chat')}
                className="flex-[2] h-12 rounded-xl bg-Malama-petrol dark:bg-primary flex items-center justify-center gap-2 text-white font-bold text-sm hover:brightness-110 transition-all active:scale-95"
              >
                <span className="material-symbols-outlined text-base">check</span>
                {t.mealLogger.confirm}
              </button>
            </div>
          )}

          {/* Sleek Input Bar */}
          <div className="relative w-full">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={handleImageUpload}
            />

            {/* Voice Recording Indicator */}
            {isListening && (
              <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-full text-sm font-medium animate-pulse flex items-center gap-2 shadow-lg">
                <span className="w-2 h-2 bg-white rounded-full animate-ping"></span>
                {t.mealLogger.listening}
              </div>
            )}

            <div className="flex items-center gap-2">
              {/* Microphone Button */}
              <button
                onClick={handleVoiceInput}
                disabled={loading}
                className={`size-12 flex-shrink-0 flex items-center justify-center rounded-xl transition-all disabled:opacity-50 ${isListening
                  ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 animate-pulse'
                  : 'bg-white dark:bg-surface-dark ring-1 ring-Malama-border dark:ring-white/10 text-Malama-petrol dark:text-primary hover:bg-Malama-petrol/10 dark:hover:bg-primary/10'
                  }`}
              >
                <span className="material-symbols-outlined text-xl">
                  {isListening ? 'mic' : 'mic'}
                </span>
              </button>

              {/* Text Input */}
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 h-12 px-4 rounded-xl bg-white dark:bg-surface-dark border-none ring-1 ring-Malama-border dark:ring-white/10 focus:ring-2 focus:ring-Malama-petrol dark:focus:ring-primary text-Malama-main dark:text-white placeholder-Malama-muted dark:placeholder-slate-500 transition-all text-sm shadow-sm"
                placeholder={isListening ? t.mealLogger.speakMeal : messages.length > 0 ? t.mealLogger.addDetails : t.mealLogger.describeMeal}
                type="text"
                disabled={loading || isListening}
              />


              {/* Send/Camera Button */}
              <button
                onClick={() => {
                  console.log('MealLogger: Send Button Clicked', { input });
                  if (input) {
                    handleSend();
                  } else {
                    handlePickPhoto();
                  }
                }}
                disabled={loading || isListening}
                className="size-12 flex-shrink-0 flex items-center justify-center rounded-xl bg-Malama-petrol dark:bg-primary text-white hover:brightness-110 transition-all disabled:opacity-50"
              >
                {input ? (
                  <span className="material-symbols-outlined text-xl">send</span>
                ) : (
                  <span className="material-symbols-outlined text-xl">photo_camera</span>
                )}
              </button>
            </div>
          </div>

          {/* Home Indicator Safe Area Space */}
          <div className="h-1"></div>
        </div>
      </div>
      {/* Edit Panel — full-screen slide-in sheet */}
      {editMode && (
        <div className="absolute inset-0 z-30 bg-Malama-bg dark:bg-background-dark flex flex-col animate-fade-in">
          {/* Header */}
          <header className="flex items-center gap-3 p-4 border-b border-Malama-border dark:border-white/5">
            <button
              onClick={() => setEditMode(false)}
              className="size-10 flex items-center justify-center rounded-full hover:bg-Malama-pastel-orange dark:hover:bg-white/5 transition-colors text-Malama-petrol dark:text-slate-300"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <div>
              <h2 className="font-bold text-Malama-main dark:text-white text-base">Editar refeição</h2>
              <p className="text-xs text-Malama-muted dark:text-slate-500">Ajuste ingredientes e quantidades</p>
            </div>
          </header>

          {/* Items list */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 pb-36">
            {editItems.map((item: MealItem, idx: number) => (
              <div key={idx} className="bg-white dark:bg-surface-dark rounded-2xl p-4 border border-Malama-border dark:border-white/5 shadow-sm flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 flex flex-col gap-2">
                    <input
                      value={item.name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const updated = [...editItems];
                        updated[idx] = { ...updated[idx], name: e.target.value };
                        setEditItems(updated);
                      }}
                      className="w-full text-sm font-semibold text-Malama-main dark:text-white bg-Malama-bg dark:bg-white/5 rounded-xl px-3 py-2 border border-Malama-border dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-Malama-petrol dark:focus:ring-primary"
                      placeholder="Nome do ingrediente"
                    />
                    <div className="flex gap-2">
                      <input
                        value={item.quantity ?? ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          const updated = [...editItems];
                          updated[idx] = { ...updated[idx], quantity: e.target.value };
                          setEditItems(updated);
                        }}
                        className="flex-1 text-sm text-Malama-main dark:text-white bg-Malama-bg dark:bg-white/5 rounded-xl px-3 py-2 border border-Malama-border dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-Malama-petrol dark:focus:ring-primary"
                        placeholder="Quantidade (ex: 3 unidades)"
                      />
                      <input
                        type="number"
                        value={item.weightGrams ?? ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          const updated = [...editItems];
                          updated[idx] = { ...updated[idx], weightGrams: Number(e.target.value) || undefined };
                          setEditItems(updated);
                        }}
                        className="w-24 text-sm text-Malama-main dark:text-white bg-Malama-bg dark:bg-white/5 rounded-xl px-3 py-2 border border-Malama-border dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-Malama-petrol dark:focus:ring-primary"
                        placeholder="Peso (g)"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => setEditItems((prev: MealItem[]) => prev.filter((_: MealItem, i: number) => i !== idx))}
                    className="size-9 flex items-center justify-center rounded-xl text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0 mt-1"
                  >
                    <span className="material-symbols-outlined text-lg">delete</span>
                  </button>
                </div>
              </div>
            ))}

            {/* Add ingredient button */}
            <button
              onClick={() => setEditItems((prev: MealItem[]) => [...prev, { name: '', calories: 0 }])}
              className="flex items-center justify-center gap-2 w-full h-12 rounded-2xl border-2 border-dashed border-Malama-petrol/30 dark:border-primary/30 text-Malama-petrol dark:text-primary font-semibold text-sm hover:bg-Malama-petrol/5 dark:hover:bg-primary/5 transition-colors"
            >
              <span className="material-symbols-outlined text-base">add</span>
              Adicionar ingrediente
            </button>
          </div>

          {/* Footer action */}
          <div className="fixed bottom-0 left-0 w-full bg-white/80 dark:bg-background-dark/90 backdrop-blur-xl border-t border-Malama-border dark:border-white/5 p-4 z-40">
            <div className="max-w-lg mx-auto">
              <button
                onClick={handleRecalculate}
                disabled={editItems.length === 0 || loading}
                className="w-full h-14 rounded-2xl bg-Malama-petrol dark:bg-primary text-white font-bold text-base flex items-center justify-center gap-2 hover:brightness-110 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <span className="material-symbols-outlined">calculate</span>
                )}
                {loading ? 'Recalculando...' : 'Recalcular macros'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Overlay */}
      {success && (
        <div className="fixed inset-0 z-[60] bg-Malama-bg/90 dark:bg-background-dark/90 backdrop-blur-md flex flex-col items-center justify-center animate-fade-in text-Malama-main dark:text-white">
          <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(16,185,129,0.4)] animate-bounce mb-6">
            <span className="material-symbols-outlined text-white text-4xl">check</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight mb-2">Refeição Salva!</h2>
          <p className="text-Malama-muted dark:text-slate-400 font-medium">Sincronizado com sucesso</p>
        </div>
      )}

      {/* Confirm-before-close dialog */}
      {photoSheet && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setPhotoSheet(false)} />
          <div className="relative w-full max-w-md bg-Malama-bg dark:bg-background-dark rounded-t-3xl">
            <div className="w-10 h-1 rounded-full mx-auto mt-3 mb-4 bg-Malama-border dark:bg-white/20" />
            <div className="px-6 pb-10">
              <h3 className="text-Malama-main dark:text-white text-lg font-bold text-center mb-6">
                {t.mealLogger.photoSourceTitle}
              </h3>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => abrirSeletor(true)}
                  className="w-full h-14 rounded-2xl bg-Malama-petrol dark:bg-primary text-white font-bold flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-base">photo_camera</span>
                  {t.mealLogger.photoTakePicture}
                </button>
                <button
                  onClick={abrirGaleria}
                  className="w-full h-14 rounded-2xl border border-Malama-border dark:border-white/10 text-Malama-main dark:text-white font-semibold flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-base">photo_library</span>
                  {t.mealLogger.photoFromGallery}
                </button>
                <button
                  onClick={() => setPhotoSheet(false)}
                  className="w-full h-12 rounded-xl text-Malama-muted dark:text-slate-400 font-semibold text-sm flex items-center justify-center"
                >
                  {t.mealLogger.photoCancel}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDiscardConfirm && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowDiscardConfirm(false)} />
          <div className="relative w-full max-w-md bg-Malama-bg dark:bg-background-dark rounded-t-3xl">
            <div className="w-10 h-1 rounded-full mx-auto mt-3 mb-4 bg-Malama-border dark:bg-white/20" />
            <div className="px-6 pb-10">
              <h3 className="text-Malama-main dark:text-white text-lg font-bold text-center mb-1">
                Análise em andamento
              </h3>
              <p className="text-Malama-muted dark:text-slate-400 text-sm text-center mb-6">
                Você tem uma refeição não registrada. O que deseja fazer?
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleConfirmAndClose}
                  className="w-full h-14 rounded-2xl bg-Malama-petrol dark:bg-primary text-white font-bold flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-base">check</span>
                  Confirmar e salvar
                </button>
                <button
                  onClick={() => setShowDiscardConfirm(false)}
                  className="w-full h-12 rounded-2xl border border-Malama-border dark:border-white/10 text-Malama-main dark:text-white font-semibold flex items-center justify-center"
                >
                  Continuar aqui
                </button>
                <button
                  onClick={handleDiscardAndClose}
                  className="w-full h-12 rounded-xl text-red-400 font-semibold text-sm flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-base">delete</span>
                  Descartar e sair
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MealLogger;

