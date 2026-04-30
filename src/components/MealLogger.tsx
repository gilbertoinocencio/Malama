import React, { useState, useRef, useEffect } from 'react';
import { Meal, AIResponse, MealItem } from '../types';
import { analyzeTextLog, analyzeImageLog } from '../services/geminiService';
import { UnifiedChatService } from '../services/unifiedChatService';

import { MalamaAiScan } from './MalamaAiScan';
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

    // Bullet list: "- " or "â€¢ "
    const bulletMatch = trimmed.match(/^[-â€¢]\s+(.+)/);
    if (bulletMatch) {
      elements.push(
        <div key={`bl-${i}`} className="flex gap-2 mt-1">
          <span className="text-Malama-petrol dark:text-primary shrink-0">â€¢</span>
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

      // Export as JPEG with 0.8 quality to balance file size and detail
      resolve(canvas.toDataURL('image/jpeg', 0.8));
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
      // agent â€” check for embedded meal card
      const mealMatch = msg.content.match(/<meal_json>([\s\S]*?)<\/meal_json>/);
      if (mealMatch) {
        try {
          const cleanText = msg.content
            .replace(/<meal_json>[\s\S]*?<\/meal_json>/g, '')
            .replace(/<water_json>[\s\S]*?<\/water_json>/g, '')
            .replace(/<dose_json>[\s\S]*?<\/dose_json>/g, '')
            .trim();
          const parsedMeal: AIResponse = JSON.parse(mealMatch[1]);
          if (cleanText) result.push({ id: msg.id + '-text', type: 'ai-text', content: cleanText });
          result.push({ id: msg.id + '-card', type: 'ai-card', content: parsedMeal });
        } catch {
          const cleanContent = msg.content
            .replace(/<meal_json>[\s\S]*?<\/meal_json>/g, '')
            .replace(/<water_json>[\s\S]*?<\/water_json>/g, '')
            .replace(/<dose_json>[\s\S]*?<\/dose_json>/g, '')
            .trim();
          result.push({ id: msg.id, type: 'ai-text', content: cleanContent || msg.content });
        }
      } else {
        // Check for water/dose JSON and remove from display
        const cleanContent = msg.content
          .replace(/<water_json>[\s\S]*?<\/water_json>/g, '')
          .replace(/<dose_json>[\s\S]*?<\/dose_json>/g, '')
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
          return meal;
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

  // Confirm-before-close dialog
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Photo Mode State â€” initialized from localStorage so they survive app switches
  const [scanResult, setScanResult] = useState<AIResponse | null>(() => {
    if (!user) return null;
    try {
      const saved = localStorage.getItem(`Malama_draft_meal_${user.id}`);
      if (saved) {
        const { scanResult: sr, ts } = JSON.parse(saved);
        if (sr && Date.now() - (ts || 0) < 24 * 60 * 60 * 1000) return sr;
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

  // Restore persistent chat history on mount (without re-setting draftMeal)
  useEffect(() => {
    if (!user) { setLoadingHistory(false); return; }
    UnifiedChatService.getChatHistory(user.id, 200).then((history) => {
      // Filter only 'chat' session messages (exclude onboarding)
      const chatOnly = history.filter((m: any) => !m.stage || m.stage === null);
      const converted = historyToMessages(chatOnly);
      // Build date map: messageId â†’ ISO date string
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
    if (draftMeal || scanResult) {
      const draft: Record<string, any> = {
        meal: draftMeal ?? scanResult,
        source: draftSource,
        ts: Date.now(),
      };
      if (scanResult) draft.scanResult = scanResult;
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
  }, [draftMeal, scanResult, scannedImageUri, draftSource, user]);

  // Restore draftMeal/scanResult/imageUri from localStorage when tab becomes visible again
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user) {
        try {
          const draftKey = `Malama_draft_meal_${user.id}`;
          const savedDraft = localStorage.getItem(draftKey);
          if (savedDraft) {
            const { meal, source, ts, scanResult: sr, imageUri } = JSON.parse(savedDraft);
            if (Date.now() - (ts || 0) < 24 * 60 * 60 * 1000) {
              if (!draftMeal && meal) { setDraftMeal(meal); setDraftSource(source || 'chat'); }
              if (!scanResult && sr) setScanResult(sr);
              if (!scannedImageUri && imageUri) setScannedImageUri(imageUri);
            }
          }
        } catch {
          if (user) localStorage.removeItem(`Malama_draft_meal_${user.id}`);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user, draftMeal, scanResult, scannedImageUri]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

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

    // Corrections and clarifications â€” always route to chat agent, never to food analysis
    const correctionIndicators = [
      'eu disse', 'nÃ£o disse', 'disse que', 'falei que', 'nÃ£o falei',
      'na verdade', 'na realidade', 'quero corrigir', 'estÃ¡ errado', 'esta errado',
      'nÃ£o Ã© isso', 'nao e isso', 'vocÃª errou', 'voce errou', 'errou',
      'tÃ¡ errado', 'ta errado', 'nÃ£o Ã© esse', 'nao e esse',
      'foi diferente', 'foi outro', 'foi outra',
      'corrija', 'corrige',
    ];
    if (correctionIndicators.some(i => lower.includes(i))) return true;

    // Emotional state, cravings, satiety, humor â€” always route to chat agent
    const emotionAndCravingIndicators = [
      'sem fome', 'nÃ£o estou com fome', 'nao estou com fome', 'nÃ£o tÃ´ com fome', 'nao to com fome',
      'tÃ´ cheio', 'to cheio', 'estou cheio', 'estou satisfeito', 'tÃ´ satisfeito',
      'vontade de comer', 'vontade de tomar', 'vontade de beber',
      'com vontade', 'tÃ´ com vontade', 'to com vontade', 'estou com vontade',
      'pensei em comer', 'pensando em comer', 'quero comer', 'queria comer',
      'quero tomar', 'queria tomar', 'quero beber', 'bateu uma vontade',
      'tÃ´ cansado', 'to cansado', 'estou cansado', 'sem energia', 'sem animo', 'sem Ã¢nimo',
      'tÃ´ bem', 'to bem', 'estou bem', 'tÃ´ mal', 'to mal', 'estou mal',
      'tÃ´ ansioso', 'to ansioso', 'estou ansioso', 'tÃ´ estressado', 'estou estressado',
      'tÃ´ feliz', 'to feliz', 'tÃ´ triste', 'to triste', 'estou triste',
      'mal dormi', 'dormi mal', 'nÃ£o dormi', 'acordei cedo',
      'comi demais', 'exagerei', 'vacilei', 'escoreguei', 'saÃ­ do plano', 'sai do plano',
      'minha dieta', 'foi pro espaÃ§o', 'foi pro espaco', 'largar tudo',
      'haha', 'kkkk', 'rsrs', 'kkk', 'lol', 'brincando', 'sÃ³ brincando', 'so brincando',
    ];
    if (emotionAndCravingIndicators.some(i => lower.includes(i))) return true;

    const questionIndicators = [
      '?', 'como ', 'por que', 'porque', 'qual ', 'quais ', 'quando ', 'quanto ',
      'o que ', 'o quÃª', 'dica', 'sugestÃ£o', 'sugestao', 'explica', 'explique',
      'me fala', 'me diga', 'Ã© importante', 'e importante', 'preciso de',
      'posso comer', 'devo comer', 'melhor para', 'Ã© bom', 'e bom', 'faz bem',
      'faz mal', 'benefÃ­cio', 'beneficio', 'vitamina', 'proteÃ­na', 'proteina',
      'emagrecer', 'engordar', 'ajuda', 'ajude', 'recomenda', 'pode me',
      'substituir', 'substitua', 'trocar', 'troque', 'trocar por', 'diferenÃ§a', 'diferenca',
      'saudÃ¡vel', 'saudavel', 'caloria', 'dieta', 'jejum', 'metabolismo',
      'treino', 'prÃ©-treino', 'pÃ³s-treino', 'pre treino', 'pos treino',
      'hidrataÃ§Ã£o', 'hidratacao', 'Ã¡gua', 'agua', 'dormir', 'sono',
      'oi', 'olÃ¡', 'ola', 'bom dia', 'boa tarde', 'boa noite', 'obrigado', 'obrigada', 'valeu',
      'sugira', 'sugerir', 'me sugira', 'sugere', 'me sugere', 'me sugira',
      'outra opÃ§Ã£o', 'outra opcao', 'outra alternativa', 'outro ingrediente',
      'recomend', 'poderia sugerir', 'lanche saudavel', 'lanche rapido', 'lanche rÃ¡pido',
      'me indica', 'opÃ§Ã£o diferente', 'opcao diferente', 'quero a opÃ§Ã£o', 'quero a opcao',
      'quero opÃ§Ã£o', 'prefiro', 'escolho', 'vou de', 'pode ser'
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
      if (isQuestion(userText) && user) {
        // Route to Smart Agent (UnifiedChatService)
        // Inject current meal context so the agent knows which meal is being discussed
        // Water intake messages (e.g. "bebi 1500ml de Ã¡gua") must NOT carry the previous
        // meal context â€” otherwise the AI responds about the meal instead of the hydration.
        const isWaterIntakeMessage = /\b(bebi|tomei|ingeri|bebei)\b.{0,40}\b(Ã¡gua|agua|water|\d+\s*ml|\d+\s*litro)/i.test(userText)
          || /\b\d+\s*(ml|litros?|copos?)\b.{0,30}\b(Ã¡gua|agua|water)\b/i.test(userText);

        const mealContext = (!isWaterIntakeMessage && draftMeal)
          ? `[Contexto da refeiÃ§Ã£o atual: ${draftMeal.foodName} â€” ${(draftMeal.items || []).map(i => `${i.name} ${i.weightGrams}g (${i.calories}kcal)`).join(', ')}]\n\n`
          : '';
        const agentResponse = await UnifiedChatService.sendMessage(user.id, mealContext + userText, { interceptMeals: false });

        // Always extract meal_json if it exists (AI decided it's a meal)
        const mealJsonMatch = agentResponse.content.match(/<meal_json>([\s\S]*?)<\/meal_json>/);

        // Also check for water JSON (hydration logging)
        const waterJsonMatch = agentResponse.content.match(/<water_json>([\s\S]*?)<\/water_json>/);

        if (mealJsonMatch) {
          try {
            const cleanText = agentResponse.content
              .replace(/<meal_json>[\s\S]*?<\/meal_json>/g, '')
              .replace(/<water_json>[\s\S]*?<\/water_json>/g, '')
              .replace(/<dose_json>[\s\S]*?<\/dose_json>/g, '')
              .trim();
            const parsedMeal: AIResponse = JSON.parse(mealJsonMatch[1]);
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
            const waterData = JSON.parse(waterJsonMatch[1]);
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
      const errorMessage = e instanceof Error ? e.message : t.general.error;
      const errorMsg: Message = { id: Date.now().toString(), type: 'ai-text', content: `${t.general.error}: ${errorMessage}` };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
      isSendingRef.current = false;
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      let base64 = reader.result as string;

      // Optimize image before sending to AI
      try {
        // Enforce max dimension of 1200px (well below the 2000px limit)
        base64 = await resizeImage(base64, 1200);
        setScannedImageUri(base64);

        const result = await analyzeImageLog(base64, language);
        setScanResult(result);
      } catch (err) {
        console.error("Scan failed", err);
        alert(t.mealLogger.errorLogging);
      } finally {
        setLoading(false);
        // Clear input value to allow re-selection
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsDataURL(file);
  };


  const handleConfirmLog = async (data: AIResponse, type: 'ai-chat' | 'ai-photo' | 'ai-voice') => {
    console.log('MealLogger: Confirming log...', type);
    if (!user) {
      console.error('MealLogger: No user!');
      return;
    }

    setLoading(true);
    try {
      const newMeal: Meal = {
        id: Date.now().toString(),
        name: data.foodName,
        timestamp: new Date(),
        calories: data.calories,
        macros: {
          protein: data.macros.p,
          carbs: data.macros.c,
          fats: data.macros.f
        },
        type: type,
        items: data.items,
        imageUri: type === 'ai-photo' && scannedImageUri ? scannedImageUri : undefined
      };

      console.log('MealLogger: Calling MealService.logMeal...');
      await MealService.logMeal(newMeal, user.id);
      console.log('MealLogger: Logged! Calling onLog...');
      onLog(newMeal); // Optimistic update / update parent state

      setSuccess(true);
      if (user) localStorage.removeItem(`Malama_draft_meal_${user.id}`);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Failed to log meal:', error);
      alert(t.mealLogger.errorLogging);
      setLoading(false);
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
    if (draftMeal || scanResult) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  };

  // Discard everything and close
  const handleDiscardAndClose = () => {
    if (user) localStorage.removeItem(`Malama_draft_meal_${user.id}`);
    setScanResult(null);
    setScannedImageUri(null);
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
    setEditItems(draftMeal.items ? draftMeal.items.map((i: MealItem) => ({ ...i })) : []);
    setEditMode(true);
  };

  const handleRecalculate = async () => {
    if (!editItems.length) return;
    setLoading(true);
    try {
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

  // If we have a scan result, show the new PhotoScanResult component
  if (scanResult && scannedImageUri) {
    return (
      <MalamaAiScan
        data={scanResult}
        imageUri={scannedImageUri}
        onConfirm={(finalData) => handleConfirmLog(finalData, 'ai-photo')}
        onBack={() => {
          setScanResult(null);
          setScannedImageUri(null);
        }}
      />
    );
  }

  const renderMessage = (msg: Message) => {
    if (msg.type === 'user') {
      return (
        <div key={msg.id} className="flex items-end gap-3 justify-end w-full animate-fade-in-up">
          <div className="flex flex-col gap-1 items-end max-w-[85%]">
            <div className="bg-Malama-petrol dark:bg-primary text-white text-base font-normal leading-relaxed rounded-2xl rounded-tr-sm px-5 py-3 shadow-sm">
              {msg.content}
            </div>
            <span className="text-Malama-muted dark:text-slate-400 text-[11px] font-medium pr-1">VocÃª</span>
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
      const data = msg.content as AIResponse;
      const totalMacros = data.macros.p + data.macros.c + data.macros.f;
      // Guard against division by zero (products with all-zero macros from OpenFoodFacts).
      // NaN in conic-gradient crashes the render on iOS Safari â†’ ErrorBoundary "Something went wrong".
      const safeDivisor = totalMacros > 0 ? totalMacros : 1;
      const pPct = (data.macros.p / safeDivisor) * 100;
      const cPct = (data.macros.c / safeDivisor) * 100;
      const gradientStyle = {
        background: `conic-gradient(var(--tw-colors-accent-protein) 0% ${pPct}%, var(--tw-colors-accent-carbs) ${pPct}% ${pPct + cPct}%, var(--tw-colors-accent-fat) ${pPct + cPct}% 100%)`
      };

      return (
        <div key={msg.id} className="flex gap-3 w-full max-w-full animate-fade-in-up pl-11">
          <div className="bg-white dark:bg-surface-dark rounded-2xl p-5 shadow-lg border border-Malama-border dark:border-white/5 w-full overflow-hidden relative group">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-Malama-petrol/10 dark:bg-primary/10 rounded-full blur-3xl pointer-events-none" />
            <div className="flex justify-between items-start mb-6 relative z-10">
              <div>
                <h3 className="text-Malama-main dark:text-white text-xl font-bold">{t.mealLogger.summary}</h3>
                <p className="text-Malama-muted dark:text-slate-500 text-base capitalize">{data.foodName}</p>
              </div>
              <div className="text-right">
                <span className="block text-3xl font-bold text-Malama-petrol dark:text-primary tracking-tight">{data.calories}</span>
                <span className="text-sm text-Malama-muted dark:text-slate-400 uppercase tracking-wider font-semibold">{t.mealLogger.kcalTotal}</span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-6 mb-6">
              <div className="relative shrink-0 size-24 rounded-full flex items-center justify-center" style={gradientStyle}>
                <div className="absolute inset-0 rounded-full bg-white dark:bg-surface-dark m-[10px] flex items-center justify-center">
                  <span className="material-symbols-outlined text-Malama-muted dark:text-slate-400">restaurant</span>
                </div>
              </div>
              <div className="flex-1 grid grid-cols-3 sm:grid-cols-1 gap-2 w-full">
                {[
                  { label: t.macros.prot, value: data.macros.p, color: 'bg-accent-protein' },
                  { label: t.macros.carb, value: data.macros.c, color: 'bg-accent-carbs' },
                  { label: t.macros.fat, value: data.macros.f, color: 'bg-accent-fat' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-Malama-bg dark:bg-white/5 p-2 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${color}`} />
                      <span className="text-sm text-Malama-muted dark:text-slate-400 font-medium">{label}</span>
                    </div>
                    <span className="text-base font-bold text-Malama-main dark:text-white">{value}g</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2 mt-2">
              {data.items?.map((item, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-Malama-bg dark:bg-surface-dark border border-transparent hover:border-Malama-petrol/20 dark:hover:border-primary/20 transition-all">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="bg-Malama-border dark:bg-white/10 rounded-lg size-9 shrink-0 flex items-center justify-center">
                        <span className="material-symbols-outlined text-Malama-muted dark:text-slate-500 text-sm">lunch_dining</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-Malama-main dark:text-white text-base font-semibold truncate">{item.name}</p>
                        <p className="text-Malama-muted dark:text-slate-500 text-sm">
                          {item.quantity ?? ''}{item.weightGrams ? ` Â· ${item.weightGrams}g` : ''}
                        </p>
                      </div>
                    </div>
                    <span className="text-Malama-petrol dark:text-primary text-base font-bold shrink-0">{item.calories} kcal</span>
                  </div>
                  {(item.protein != null || item.carbs != null || item.fats != null) && (
                    <div className="flex gap-2 pl-12">
                      {item.protein != null && (
                        <span className="flex items-center gap-1 bg-white dark:bg-white/5 px-2 py-0.5 rounded-full text-xs font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-accent-protein inline-block" />
                          <span className="text-Malama-muted dark:text-slate-400">P</span>
                          <span className="text-Malama-main dark:text-white">{item.protein}g</span>
                        </span>
                      )}
                      {item.carbs != null && (
                        <span className="flex items-center gap-1 bg-white dark:bg-white/5 px-2 py-0.5 rounded-full text-xs font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-accent-carbs inline-block" />
                          <span className="text-Malama-muted dark:text-slate-400">C</span>
                          <span className="text-Malama-main dark:text-white">{item.carbs}g</span>
                        </span>
                      )}
                      {item.fats != null && (
                        <span className="flex items-center gap-1 bg-white dark:bg-white/5 px-2 py-0.5 rounded-full text-xs font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-accent-fat inline-block" />
                          <span className="text-Malama-muted dark:text-slate-400">G</span>
                          <span className="text-Malama-main dark:text-white">{item.fats}g</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {data.message && (
              <div className="mt-4 pt-4 border-t border-Malama-border dark:border-white/10">
                <div className="flex items-start gap-2 text-Malama-petrol dark:text-Malama-offwhite">
                  <span className="material-symbols-outlined text-xl mt-0.5">auto_awesome</span>
                  <p className="text-base font-medium italic">{data.message}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="fixed inset-0 z-50 bg-Malama-bg dark:bg-background-dark text-Malama-main dark:text-white flex flex-col font-display animate-fade-in">

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
                    fileInputRef.current?.click();
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
      {/* Edit Panel â€” full-screen slide-in sheet */}
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
              <h2 className="font-bold text-Malama-main dark:text-white text-base">Editar refeiÃ§Ã£o</h2>
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
          <h2 className="text-2xl font-bold tracking-tight mb-2">RefeiÃ§Ã£o Salva!</h2>
          <p className="text-Malama-muted dark:text-slate-400 font-medium">Sincronizado com sucesso</p>
        </div>
      )}

      {/* Confirm-before-close dialog */}
      {showDiscardConfirm && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowDiscardConfirm(false)} />
          <div className="relative w-full max-w-md bg-Malama-bg dark:bg-background-dark rounded-t-3xl">
            <div className="w-10 h-1 rounded-full mx-auto mt-3 mb-4 bg-Malama-border dark:bg-white/20" />
            <div className="px-6 pb-10">
              <h3 className="text-Malama-main dark:text-white text-lg font-bold text-center mb-1">
                AnÃ¡lise em andamento
              </h3>
              <p className="text-Malama-muted dark:text-slate-400 text-sm text-center mb-6">
                VocÃª tem uma refeiÃ§Ã£o nÃ£o registrada. O que deseja fazer?
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

