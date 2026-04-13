import React, { useState, useRef, useEffect } from 'react';
import { Meal, AIResponse, MealItem } from '../types';
import { analyzeTextLog, analyzeImageLog } from '../services/geminiService';
import { UnifiedChatService } from '../services/unifiedChatService';
import { lookupBarcode, barcodeResultToAIResponse, enrichBarcodeWithAI } from '../services/openFoodFactsService';
import { NuraAiScan } from './NuraAiScan';
import { USER_AVATAR } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import { MealService } from '../services/mealService';
import { useLanguage } from '../i18n';
// html5-qrcode is loaded dynamically to keep MealLogger chunk lean and isolate iOS failures

// Internal Error Boundary for Barcode Scanner to prevent crashes from propagating
class BarcodeScannerErrorBoundary extends React.Component<
  { children: React.ReactNode; onError: (error: Error) => void },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[BarcodeScannerErrorBoundary] Caught error:', error, errorInfo);
    this.props.onError(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center h-full" style={{ minHeight: '60vh' }}>
          <span className="material-symbols-outlined text-red-400 mb-4" style={{ fontSize: 64 }}>error</span>
          <p className="text-white/80 text-base font-medium mb-2">
            Scanner error occurred
          </p>
          <p className="text-white/50 text-sm mb-4">
            {this.state.error?.message || 'Unknown error'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-6 py-3 bg-emerald-500 text-white font-semibold rounded-xl hover:bg-emerald-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

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
          <span className="text-nura-petrol dark:text-primary font-bold shrink-0">{numberedMatch[1]}.</span>
          <span>{formatInline(numberedMatch[2], `li-${i}`)}</span>
        </div>
      );
      return;
    }

    // Bullet list: "- " or "• "
    const bulletMatch = trimmed.match(/^[-•]\s+(.+)/);
    if (bulletMatch) {
      elements.push(
        <div key={`bl-${i}`} className="flex gap-2 mt-1">
          <span className="text-nura-petrol dark:text-primary shrink-0">•</span>
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
      // agent — check for embedded meal card
      const mealMatch = msg.content.match(/<meal_json>([\s\S]*?)<\/meal_json>/);
      if (mealMatch) {
        try {
          const cleanText = msg.content
            .replace(/<meal_json>[\s\S]*?<\/meal_json>/, '')
            .replace(/<water_json>[\s\S]*?<\/water_json>/, '')
            .replace(/<dose_json>[\s\S]*?<\/dose_json>/, '')
            .trim();
          const parsedMeal: AIResponse = JSON.parse(mealMatch[1]);
          if (cleanText) result.push({ id: msg.id + '-text', type: 'ai-text', content: cleanText });
          result.push({ id: msg.id + '-card', type: 'ai-card', content: parsedMeal });
        } catch {
          const cleanContent = msg.content
            .replace(/<meal_json>[\s\S]*?<\/meal_json>/, '')
            .replace(/<water_json>[\s\S]*?<\/water_json>/, '')
            .replace(/<dose_json>[\s\S]*?<\/dose_json>/, '')
            .trim();
          result.push({ id: msg.id, type: 'ai-text', content: cleanContent || msg.content });
        }
      } else {
        // Check for water/dose JSON and remove from display
        const cleanContent = msg.content
          .replace(/<water_json>[\s\S]*?<\/water_json>/, '')
          .replace(/<dose_json>[\s\S]*?<\/dose_json>/, '')
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

  const { t, speechLang, language } = useLanguage();
  const { user, profile } = useAuth();

  // Restore draftMeal synchronously from localStorage on mount (prevents buttons disappearing on tab switch)
  const [draftMeal, setDraftMeal] = useState<AIResponse | null>(() => {
    if (!user) return null;
    try {
      const draftKey = `nura_draft_meal_${user.id}`;
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
      localStorage.removeItem(`nura_draft_meal_${user?.id}`);
    }
    return null;
  });

  const [editMode, setEditMode] = useState(false);
  const [editItems, setEditItems] = useState<MealItem[]>([]);

  // Photo Mode State
  const [scanResult, setScanResult] = useState<AIResponse | null>(null);
  const [scannedImageUri, setScannedImageUri] = useState<string | null>(null);

  // Voice Recognition State
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Barcode Scanner State
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [draftSource, setDraftSource] = useState<'chat' | 'photo' | 'barcode'>(() => {
    if (!user) return 'chat';
    try {
      const draftKey = `nura_draft_meal_${user.id}`;
      const savedDraft = localStorage.getItem(draftKey);
      if (savedDraft) {
        const { source, ts } = JSON.parse(savedDraft);
        if (Date.now() - (ts || 0) < 24 * 60 * 60 * 1000) {
          return source || 'chat';
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
      // Build date map: messageId → ISO date string
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

  // Persist draftMeal to localStorage whenever it changes (after initial load)
  useEffect(() => {
    if (!user || !draftPersistedRef.current) return;
    const key = `nura_draft_meal_${user.id}`;
    if (draftMeal) {
      localStorage.setItem(key, JSON.stringify({ meal: draftMeal, source: draftSource, ts: Date.now() }));
    }
    // Clearing is done explicitly in confirm/cancel to avoid race with unmount
  }, [draftMeal, draftSource, user]);

  // Restore draftMeal from localStorage when tab becomes visible again (handles tab switch recovery)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user && !draftMeal) {
        try {
          const draftKey = `nura_draft_meal_${user.id}`;
          const savedDraft = localStorage.getItem(draftKey);
          if (savedDraft) {
            const { meal, source, ts } = JSON.parse(savedDraft);
            if (Date.now() - (ts || 0) < 24 * 60 * 60 * 1000) {
              setDraftMeal(meal);
              setDraftSource(source || 'chat');
            }
          }
        } catch {
          if (user) localStorage.removeItem(`nura_draft_meal_${user.id}`);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user, draftMeal]);

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

    // Corrections and clarifications — always route to chat agent, never to food analysis
    const correctionIndicators = [
      'eu disse', 'não disse', 'disse que', 'falei que', 'não falei',
      'na verdade', 'na realidade', 'quero corrigir', 'está errado', 'esta errado',
      'não é isso', 'nao e isso', 'você errou', 'voce errou', 'errou',
      'tá errado', 'ta errado', 'não é esse', 'nao e esse',
      'foi diferente', 'foi outro', 'foi outra',
      'corrija', 'corrige',
    ];
    if (correctionIndicators.some(i => lower.includes(i))) return true;

    // Emotional state, cravings, satiety, humor — always route to chat agent
    const emotionAndCravingIndicators = [
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
    if (emotionAndCravingIndicators.some(i => lower.includes(i))) return true;

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
    if (!input.trim()) return;

    const userMsg: Message = { id: Date.now().toString(), type: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    const userText = input;
    setInput('');
    setLoading(true);

    try {
      if (isQuestion(userText) && user) {
        // Route to Smart Agent (UnifiedChatService)
        // Inject current meal context so the agent knows which meal is being discussed
        // Water intake messages (e.g. "bebi 1500ml de água") must NOT carry the previous
        // meal context — otherwise the AI responds about the meal instead of the hydration.
        const isWaterIntakeMessage = /\b(bebi|tomei|ingeri|bebei)\b.{0,40}\b(água|agua|water|\d+\s*ml|\d+\s*litro)/i.test(userText)
          || /\b\d+\s*(ml|litros?|copos?)\b.{0,30}\b(água|agua|water)\b/i.test(userText);

        const mealContext = (!isWaterIntakeMessage && draftMeal)
          ? `[Contexto da refeição atual: ${draftMeal.foodName} — ${(draftMeal.items || []).map(i => `${i.name} ${i.weightGrams}g (${i.calories}kcal)`).join(', ')}]\n\n`
          : '';
        const agentResponse = await UnifiedChatService.sendMessage(user.id, mealContext + userText);

        // Guard: only show meal card if user message contains a past-tense intake verb
        const hasPastIntakeVerb = /\b(comi|tomei|bebi|almocei|almoçei|jantei|lancei|lanchei|ingeri|engoli|consumi)\b/i.test(userText);

        // Check if response contains a structured meal JSON block
        const mealJsonMatch = hasPastIntakeVerb
          ? agentResponse.content.match(/<meal_json>([\s\S]*?)<\/meal_json>/)
          : null;

        // Also check for water JSON (hydration logging)
        const waterJsonMatch = agentResponse.content.match(/<water_json>([\s\S]*?)<\/water_json>/);

        if (mealJsonMatch) {
          try {
            const cleanText = agentResponse.content
              .replace(/<meal_json>[\s\S]*?<\/meal_json>/, '')
              .replace(/<water_json>[\s\S]*?<\/water_json>/, '')
              .replace(/<dose_json>[\s\S]*?<\/dose_json>/, '')
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
              .replace(/<meal_json>[\s\S]*?<\/meal_json>/, '')
              .replace(/<water_json>[\s\S]*?<\/water_json>/, '')
              .replace(/<dose_json>[\s\S]*?<\/dose_json>/, '')
              .trim();
            setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), type: 'ai-text', content: cleanContent || agentResponse.content }]);
          }
        } else if (waterJsonMatch) {
          // Water logging - just show the text without the JSON block
          try {
            const cleanText = agentResponse.content
              .replace(/<water_json>[\s\S]*?<\/water_json>/, '')
              .replace(/<dose_json>[\s\S]*?<\/dose_json>/, '')
              .trim();
            setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), type: 'ai-text', content: cleanText }]);

            // Optionally log the water intake
            const waterData = JSON.parse(waterJsonMatch[1]);
            console.log('[MealLogger] Water logged:', waterData.ml, 'ml');
          } catch {
            const cleanContent = agentResponse.content
              .replace(/<water_json>[\s\S]*?<\/water_json>/, '')
              .replace(/<dose_json>[\s\S]*?<\/dose_json>/, '')
              .trim();
            setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), type: 'ai-text', content: cleanContent || agentResponse.content }]);
          }
        } else {
          // Strip any JSON blocks from the text
          const cleanContent = agentResponse.content
            .replace(/<meal_json>[\s\S]*?<\/meal_json>/, '')
            .replace(/<water_json>[\s\S]*?<\/water_json>/, '')
            .replace(/<dose_json>[\s\S]*?<\/dose_json>/, '')
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

  // ─── Barcode Scanner ──────────────────────────────────────────────

  const barcodeScannerRef = useRef<any>(null);
  const [scannerReady, setScannerReady] = useState(false);
  const [scannerMode, setScannerMode] = useState<'live' | 'file' | null>(null);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const barcodeFileInputRef = useRef<HTMLInputElement>(null);
  const scannerStoppingRef = useRef(false); // Prevent multiple stop calls

  // Toggle flashlight
  const toggleTorch = async () => {
    try {
      const scanner = barcodeScannerRef.current;
      if (scanner && scanner.applyVideoConstraints) {
        const newTorchState = !torchOn;
        await scanner.applyVideoConstraints({
          facingMode: 'environment',
          torch: newTorchState,
        } as MediaTrackConstraints);
        setTorchOn(newTorchState);
        setTorchAvailable(true);
      }
    } catch (e: any) {
      console.warn('Torch not available:', e.message);
      setTorchAvailable(false);
    }
  };

  // Helper function to check camera permission
  const checkCameraPermission = async (): Promise<boolean> => {
    try {
      // Check if browser supports permissions API
      if (navigator.permissions) {
        const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
        if (permission.state === 'denied') {
          return false;
        }
      }
      return true;
    } catch {
      // If permissions API is not available, assume it's ok
      return true;
    }
  };

  useEffect(() => {
    if (!showBarcodeScanner) {
      setScannerReady(false);
      setScannerMode(null);
      setScannerError(null);
      return;
    }

    let scanner: any = null;
    let stopped = false;

    // Give the DOM time to measure the div's pixel dimensions before scanner.start()
    // 1000ms handles slow Android WebViews and iOS Safari layout delays (increased from 700ms)
    const timer = setTimeout(async () => {
      try {
        // Check camera permission first
        const hasPermission = await checkCameraPermission();
        if (!hasPermission) {
          console.error('Camera permission denied');
          setScannerError(language === 'en'
            ? 'Camera permission denied. Please enable camera access in your browser settings.'
            : 'Permissão de câmera negada. Por favor, habilite o acesso à câmera nas configurações do navegador.');
          setScannerMode('file');
          setScannerReady(true);
          return;
        }

        // Verify container element exists before proceeding
        const container = document.getElementById('barcode-reader');
        if (!container) {
          console.error('Barcode scanner container not found in DOM');
          setScannerMode('file');
          setScannerReady(true);
          return;
        }

        // Dynamic import — keeps html5-qrcode out of the MealLogger chunk,
        // and isolates any iOS module-evaluation failures to this scope only
        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode');

        // formatsToSupport must go in the constructor (html5-qrcode v2.3.x API)
        scanner = new Html5Qrcode('barcode-reader', {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.ITF,
            Html5QrcodeSupportedFormats.CODABAR,
          ],
          verbose: false,
        });
        barcodeScannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10, // Lower FPS for more stable scanning
            qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
              // Make the scan box wider and shorter - better for horizontal barcodes
              const width = Math.min(viewfinderWidth * 0.95, 500);
              const height = Math.max(Math.floor(viewfinderHeight * 0.20), 100);
              return { width, height };
            },
            aspectRatio: 1.7777778, // 16:9 for better camera fit
          },
          async (decodedText: string) => {
            console.log('[BarcodeScanner] Barcode detected:', decodedText);
            if (stopped || scannerStoppingRef.current) return;
            stopped = true;
            scannerStoppingRef.current = true;
            try {
              // Only stop if scanner exists
              if (scanner) {
                await scanner.stop();
              }
            } catch (e: any) {
              // Ignore 'not running' errors - expected during rapid unmount
              if (!e.message?.includes('not running') &&
                !e.message?.includes('paused')) {
                console.warn('Scanner stop error (non-critical):', e.message);
              }
            } finally {
              scannerStoppingRef.current = false;
            }
            barcodeScannerRef.current = null;
            setShowBarcodeScanner(false);
            handleBarcodeResult(decodedText);
          },
          undefined,
        );
        setScannerMode('live');
        setScannerReady(true);
      } catch (err: any) {
        const errorMessage = err?.message || err?.name || 'Unknown error';
        console.error('Barcode live camera failed:', errorMessage, err);

        // Check for specific error types
        const isPermissionError = errorMessage.includes('Permission') ||
          errorMessage.includes('NotAllowed') ||
          errorMessage.includes('notAllowed');
        const isHttpsError = errorMessage.includes('https') ||
          errorMessage.includes('secure context');
        const isNotFoundError = errorMessage.includes('NotFoundError') ||
          errorMessage.includes('device') ||
          errorMessage.includes('camera');

        // Log specific error for debugging and set user-friendly message
        if (isPermissionError) {
          console.error('Camera permission denied by user');
          setScannerError(language === 'en'
            ? 'Camera permission denied. Please enable camera access in your browser settings.'
            : 'Permissão de câmera negada. Por favor, habilite o acesso à câmera nas configurações do navegador.');
        } else if (isHttpsError) {
          console.error('Camera requires HTTPS or localhost');
          setScannerError(language === 'en'
            ? 'Camera requires a secure connection (HTTPS). Please access the app via HTTPS or localhost.'
            : 'A câmera requer uma conexão segura (HTTPS). Por favor, acesse o app via HTTPS ou localhost.');
        } else if (isNotFoundError) {
          console.error('Camera device not found');
          setScannerError(language === 'en'
            ? 'No camera found on this device.'
            : 'Nenhuma câmera encontrada neste dispositivo.');
        } else {
          setScannerError(language === 'en'
            ? 'Failed to initialize camera. Try using photo mode instead.'
            : 'Falha ao inicializar câmera. Tente usar o modo de foto.');
        }

        // Fallback to file mode for all errors
        setScannerMode('file');
        setScannerReady(true);
      }
    }, 1000);

    return () => {
      clearTimeout(timer);
      stopped = true;
      if (scanner && !scannerStoppingRef.current) {
        scannerStoppingRef.current = true;
        try {
          // Check if scanner is actually running before stopping
          if (scanner.isRunning !== false) {
            scanner.stop().catch((e: any) => {
              // Ignore expected errors during cleanup
              if (!e.message?.includes('not running') &&
                !e.message?.includes('paused')) {
                console.debug('Scanner cleanup error:', e.message);
              }
            });
          }
        } catch (e: any) {
          // Ignore cleanup errors
          console.debug('Scanner cleanup error (ignored):', e.message);
        } finally {
          scannerStoppingRef.current = false;
        }
      }
      barcodeScannerRef.current = null;
    };
  }, [showBarcodeScanner, language]);

  const handleBarcodeResult = async (barcode: string) => {
    setLoading(true);
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      type: 'user',
      content: `🔎 Barcode: ${barcode}`,
    }]);

    try {
      const result = await lookupBarcode(barcode);

      if (result) {
        // Enrich with AI-estimated micronutrients if OFF data is incomplete
        const enrichedResult = await enrichBarcodeWithAI(result, language);
        const aiResponse = barcodeResultToAIResponse(enrichedResult);
        const foundText = language === 'en'
          ? 'Product found! Here are the nutritional details:'
          : 'Produto encontrado! Aqui estão os dados nutricionais:';

        setMessages(prev => [...prev,
        { id: (Date.now() + 1).toString(), type: 'ai-text', content: foundText },
        { id: (Date.now() + 2).toString(), type: 'ai-card', content: aiResponse },
        ]);
        setDraftMeal(aiResponse);
        setDraftSource('barcode');
      } else {
        const notFoundText = language === 'en'
          ? 'Product not found in our database. Try logging it manually by typing the food name.'
          : 'Produto não encontrado na nossa base. Tente registrar manualmente digitando o nome do alimento.';
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          type: 'ai-text',
          content: notFoundText,
        }]);
      }
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        type: 'ai-text',
        content: language === 'en' ? 'Error looking up product. Please try again.' : 'Erro ao buscar produto. Tente novamente.',
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileBarcodeScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      console.log('[BarcodeScanner] Starting file scan...');
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode');
      console.log('[BarcodeScanner] html5-qrcode imported');

      const scanner = new Html5Qrcode('barcode-file-reader', {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
        ],
        verbose: false,
      });
      console.log('[BarcodeScanner] Scanner instance created');

      const result = await scanner.scanFileV2(file, false);
      console.log('[BarcodeScanner] Scan result:', result);

      setShowBarcodeScanner(false);
      await handleBarcodeResult(result.decodedText);
    } catch (err: any) {
      console.error('[BarcodeScanner] File scan error:', err);
      setShowBarcodeScanner(false);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        type: 'ai-text',
        content: language === 'en'
          ? `Could not read the barcode: ${err.message || 'Unknown error'}. Try again with a clearer image.`
          : `Não foi possível ler o código de barras: ${err.message || 'Erro desconhecido'}. Tente com uma imagem mais nítida.`,
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmLog = async (data: AIResponse, type: 'ai-chat' | 'ai-photo' | 'ai-voice' | 'ai-barcode') => {
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
      if (user) localStorage.removeItem(`nura_draft_meal_${user.id}`);
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
    if (user) localStorage.removeItem(`nura_draft_meal_${user.id}`);

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
      <NuraAiScan
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
            <div className="bg-nura-petrol dark:bg-primary text-white text-base font-normal leading-relaxed rounded-2xl rounded-tr-sm px-5 py-3 shadow-sm">
              {msg.content}
            </div>
            <span className="text-nura-muted dark:text-slate-400 text-[11px] font-medium pr-1">Você</span>
          </div>
          <div
            className="bg-center bg-no-repeat bg-cover rounded-full w-8 h-8 shrink-0 border border-nura-border dark:border-white/10"
            style={{ backgroundImage: `url("${profile?.avatar_url || USER_AVATAR}")` }}
          />
        </div>
      );
    }

    if (msg.type === 'ai-text') {
      return (
        <div key={msg.id} className="flex gap-3 w-full max-w-full animate-fade-in-up">
          <div className="shrink-0 flex flex-col justify-end pb-6">
            <div className="bg-gradient-to-br from-nura-petrol to-[#0a90bd] dark:from-primary dark:to-[#0a90bd] flex items-center justify-center rounded-full w-8 h-8 shrink-0 shadow-lg shadow-nura-petrol/20 dark:shadow-primary/20">
              <span className="material-symbols-outlined text-white text-sm">smart_toy</span>
            </div>
          </div>
          <div className="flex flex-col gap-3 flex-1 min-w-0">
            <div className="flex flex-col gap-1 items-start max-w-[95%]">
              <span className="text-nura-muted dark:text-slate-400 text-[11px] font-medium pl-1">NURA AI</span>
              <div className="bg-white dark:bg-surface-dark text-nura-main dark:text-slate-200 text-base font-normal leading-relaxed rounded-2xl rounded-tl-sm px-5 py-4 shadow-sm border border-nura-border dark:border-white/5">
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
      // NaN in conic-gradient crashes the render on iOS Safari → ErrorBoundary "Something went wrong".
      const safeDivisor = totalMacros > 0 ? totalMacros : 1;
      const pPct = (data.macros.p / safeDivisor) * 100;
      const cPct = (data.macros.c / safeDivisor) * 100;
      const gradientStyle = {
        background: `conic-gradient(var(--tw-colors-accent-protein) 0% ${pPct}%, var(--tw-colors-accent-carbs) ${pPct}% ${pPct + cPct}%, var(--tw-colors-accent-fat) ${pPct + cPct}% 100%)`
      };

      return (
        <div key={msg.id} className="flex gap-3 w-full max-w-full animate-fade-in-up pl-11">
          <div className="bg-white dark:bg-surface-dark rounded-2xl p-5 shadow-lg border border-nura-border dark:border-white/5 w-full overflow-hidden relative group">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-nura-petrol/10 dark:bg-primary/10 rounded-full blur-3xl pointer-events-none" />
            <div className="flex justify-between items-start mb-6 relative z-10">
              <div>
                <h3 className="text-nura-main dark:text-white text-lg font-bold">{t.mealLogger.summary}</h3>
                <p className="text-nura-muted dark:text-slate-500 text-sm capitalize">{data.foodName}</p>
              </div>
              <div className="text-right">
                <span className="block text-2xl font-bold text-nura-petrol dark:text-primary tracking-tight">{data.calories}</span>
                <span className="text-xs text-nura-muted dark:text-slate-400 uppercase tracking-wider font-semibold">{t.mealLogger.kcalTotal}</span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-6 mb-6">
              <div className="relative shrink-0 size-24 rounded-full flex items-center justify-center" style={gradientStyle}>
                <div className="absolute inset-0 rounded-full bg-white dark:bg-surface-dark m-[10px] flex items-center justify-center">
                  <span className="material-symbols-outlined text-nura-muted dark:text-slate-400">restaurant</span>
                </div>
              </div>
              <div className="flex-1 grid grid-cols-3 sm:grid-cols-1 gap-2 w-full">
                {[
                  { label: t.macros.prot, value: data.macros.p, color: 'bg-accent-protein' },
                  { label: t.macros.carb, value: data.macros.c, color: 'bg-accent-carbs' },
                  { label: t.macros.fat, value: data.macros.f, color: 'bg-accent-fat' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-nura-bg dark:bg-white/5 p-2 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${color}`} />
                      <span className="text-xs text-nura-muted dark:text-slate-400 font-medium">{label}</span>
                    </div>
                    <span className="text-sm font-bold text-nura-main dark:text-white">{value}g</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2 mt-2">
              {data.items?.map((item, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-nura-bg dark:bg-[#152226] border border-transparent hover:border-nura-petrol/20 dark:hover:border-primary/20 transition-all">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="bg-nura-border dark:bg-white/10 rounded-lg size-9 shrink-0 flex items-center justify-center">
                        <span className="material-symbols-outlined text-nura-muted dark:text-slate-500 text-sm">lunch_dining</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-nura-main dark:text-white text-sm font-semibold truncate">{item.name}</p>
                        <p className="text-nura-muted dark:text-slate-500 text-xs">
                          {item.quantity ?? ''}{item.weightGrams ? ` · ${item.weightGrams}g` : ''}
                        </p>
                      </div>
                    </div>
                    <span className="text-nura-petrol dark:text-primary text-sm font-bold shrink-0">{item.calories} kcal</span>
                  </div>
                  {(item.protein != null || item.carbs != null || item.fats != null) && (
                    <div className="flex gap-2 pl-12">
                      {item.protein != null && (
                        <span className="flex items-center gap-1 bg-white dark:bg-white/5 px-2 py-0.5 rounded-full text-[11px] font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-accent-protein inline-block" />
                          <span className="text-nura-muted dark:text-slate-400">P</span>
                          <span className="text-nura-main dark:text-white">{item.protein}g</span>
                        </span>
                      )}
                      {item.carbs != null && (
                        <span className="flex items-center gap-1 bg-white dark:bg-white/5 px-2 py-0.5 rounded-full text-[11px] font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-accent-carbs inline-block" />
                          <span className="text-nura-muted dark:text-slate-400">C</span>
                          <span className="text-nura-main dark:text-white">{item.carbs}g</span>
                        </span>
                      )}
                      {item.fats != null && (
                        <span className="flex items-center gap-1 bg-white dark:bg-white/5 px-2 py-0.5 rounded-full text-[11px] font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-accent-fat inline-block" />
                          <span className="text-nura-muted dark:text-slate-400">G</span>
                          <span className="text-nura-main dark:text-white">{item.fats}g</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {data.message && (
              <div className="mt-4 pt-4 border-t border-nura-border dark:border-white/10">
                <div className="flex items-center gap-2 text-nura-petrol dark:text-primary">
                  <span className="material-symbols-outlined text-lg">auto_awesome</span>
                  <p className="text-sm font-medium italic">{data.message}</p>
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
    <div className="fixed inset-0 z-50 bg-nura-bg dark:bg-background-dark text-nura-main dark:text-white flex flex-col font-display animate-fade-in">

      {/* Top Navigation */}
      <header className="flex items-center px-4 py-3 justify-between shrink-0 z-10 bg-nura-bg/95 dark:bg-background-dark/95 backdrop-blur-sm sticky top-0 border-b border-nura-border dark:border-white/5">
        <div onClick={onClose} className="text-nura-main dark:text-white flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer">
          <span className="material-symbols-outlined text-2xl">arrow_back</span>
        </div>
        <div className="flex flex-col items-center">
          <h2 className="text-nura-main dark:text-white text-lg font-bold leading-tight tracking-[-0.015em]">{t.mealLogger.title}</h2>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-nura-petrol dark:bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-nura-petrol dark:bg-primary"></span>
            </span>
            <span className="text-xs font-medium text-nura-petrol dark:text-primary tracking-wide uppercase">{t.mealLogger.online}</span>
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
          <div className="flex flex-col items-center justify-center h-full opacity-50 mt-10 text-nura-muted dark:text-slate-500">
            <span className="material-symbols-outlined text-4xl mb-2">nutrition</span>
            <p>{t.mealLogger.describeMeal}</p>
          </div>
        )}

        {/* Loading State Overlay for Scan */}
        {loading && !messages.length && (
          <div className="absolute inset-0 bg-nura-bg/50 dark:bg-background-dark/50 backdrop-blur-sm z-20 flex flex-col items-center justify-center">
            <div className="w-16 h-16 border-4 border-nura-petrol dark:border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="font-medium animate-pulse text-nura-petrol dark:text-primary">{t.mealLogger.analyzing}</p>
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
                    <span className="text-xs font-medium text-nura-muted dark:text-slate-500 bg-gray-100 dark:bg-white/5 px-3 py-1 rounded-full">
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
            <div className="bg-white dark:bg-surface-dark px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm border border-nura-border dark:border-white/5">
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
      <div className="fixed bottom-0 left-0 w-full bg-nura-bg/95 dark:bg-background-dark/95 backdrop-blur-md pt-2 pb-6 px-4 z-20 border-t border-nura-border dark:border-white/5">
        <div className="flex flex-col gap-4 max-w-lg mx-auto">

          {/* Action Dock Buttons - Only Show if Draft Exists in Chat Mode */}
          {draftMeal && (
            <div className="flex items-center gap-3 w-full animate-fade-in-up">
              <button
                onClick={handleCancel}
                className="flex-1 h-12 rounded-xl flex items-center justify-center gap-2 text-nura-muted hover:text-nura-main dark:text-slate-400 dark:hover:text-white font-semibold text-sm transition-colors active:scale-95"
              >
                {t.mealLogger.cancel}
              </button>
              <button
                onClick={handleOpenEdit}
                className="flex-1 h-12 rounded-xl border border-nura-border dark:border-white/10 bg-transparent flex items-center justify-center gap-2 text-nura-main dark:text-white font-semibold text-sm hover:bg-gray-100 dark:hover:bg-white/5 transition-colors active:scale-95"
              >
                <span className="material-symbols-outlined text-base">edit</span>
                {t.mealLogger.edit}
              </button>
              <button
                onClick={() => handleConfirmLog(draftMeal, draftSource === 'barcode' ? 'ai-barcode' : draftSource === 'photo' ? 'ai-photo' : 'ai-chat')}
                className="flex-[2] h-12 rounded-xl bg-nura-petrol dark:bg-primary shadow-lg shadow-nura-petrol/25 dark:shadow-primary/25 flex items-center justify-center gap-2 text-white font-bold text-sm hover:brightness-110 transition-all active:scale-95"
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
                  : 'bg-white dark:bg-surface-dark ring-1 ring-nura-border dark:ring-white/10 text-nura-petrol dark:text-primary hover:bg-nura-petrol/10 dark:hover:bg-primary/10'
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
                className="flex-1 h-12 px-4 rounded-xl bg-white dark:bg-surface-dark border-none ring-1 ring-nura-border dark:ring-white/10 focus:ring-2 focus:ring-nura-petrol dark:focus:ring-primary text-nura-main dark:text-white placeholder-nura-muted dark:placeholder-slate-500 transition-all text-sm shadow-sm"
                placeholder={isListening ? t.mealLogger.speakMeal : messages.length > 0 ? t.mealLogger.addDetails : t.mealLogger.describeMeal}
                type="text"
                disabled={loading || isListening}
              />

              {/* Barcode Scanner Button */}
              <button
                onClick={() => setShowBarcodeScanner(true)}
                disabled={loading || isListening}
                className="size-12 flex-shrink-0 flex items-center justify-center rounded-xl bg-white dark:bg-surface-dark ring-1 ring-nura-border dark:ring-white/10 text-nura-petrol dark:text-primary hover:bg-nura-petrol/10 dark:hover:bg-primary/10 transition-all disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-xl">barcode_scanner</span>
              </button>

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
                className="size-12 flex-shrink-0 flex items-center justify-center rounded-xl bg-nura-petrol dark:bg-primary text-white shadow-lg shadow-nura-petrol/25 dark:shadow-primary/25 hover:brightness-110 transition-all disabled:opacity-50"
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
        <div className="absolute inset-0 z-30 bg-nura-bg dark:bg-background-dark flex flex-col animate-fade-in">
          {/* Header */}
          <header className="flex items-center gap-3 p-4 border-b border-nura-border dark:border-white/5">
            <button
              onClick={() => setEditMode(false)}
              className="size-10 flex items-center justify-center rounded-full hover:bg-nura-pastel-orange dark:hover:bg-white/5 transition-colors text-nura-petrol dark:text-slate-300"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <div>
              <h2 className="font-bold text-nura-main dark:text-white text-base">Editar refeição</h2>
              <p className="text-xs text-nura-muted dark:text-slate-500">Ajuste ingredientes e quantidades</p>
            </div>
          </header>

          {/* Items list */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 pb-36">
            {editItems.map((item: MealItem, idx: number) => (
              <div key={idx} className="bg-white dark:bg-surface-dark rounded-2xl p-4 border border-nura-border dark:border-white/5 shadow-sm flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 flex flex-col gap-2">
                    <input
                      value={item.name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const updated = [...editItems];
                        updated[idx] = { ...updated[idx], name: e.target.value };
                        setEditItems(updated);
                      }}
                      className="w-full text-sm font-semibold text-nura-main dark:text-white bg-nura-bg dark:bg-white/5 rounded-xl px-3 py-2 border border-nura-border dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-nura-petrol dark:focus:ring-primary"
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
                        className="flex-1 text-sm text-nura-main dark:text-white bg-nura-bg dark:bg-white/5 rounded-xl px-3 py-2 border border-nura-border dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-nura-petrol dark:focus:ring-primary"
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
                        className="w-24 text-sm text-nura-main dark:text-white bg-nura-bg dark:bg-white/5 rounded-xl px-3 py-2 border border-nura-border dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-nura-petrol dark:focus:ring-primary"
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
              className="flex items-center justify-center gap-2 w-full h-12 rounded-2xl border-2 border-dashed border-nura-petrol/30 dark:border-primary/30 text-nura-petrol dark:text-primary font-semibold text-sm hover:bg-nura-petrol/5 dark:hover:bg-primary/5 transition-colors"
            >
              <span className="material-symbols-outlined text-base">add</span>
              Adicionar ingrediente
            </button>
          </div>

          {/* Footer action */}
          <div className="fixed bottom-0 left-0 w-full bg-white/80 dark:bg-background-dark/90 backdrop-blur-xl border-t border-nura-border dark:border-white/5 p-4 z-40">
            <div className="max-w-lg mx-auto">
              <button
                onClick={handleRecalculate}
                disabled={editItems.length === 0 || loading}
                className="w-full h-14 rounded-2xl bg-nura-petrol dark:bg-primary text-white font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-nura-petrol/25 dark:shadow-primary/25 hover:brightness-110 transition-all active:scale-[0.98] disabled:opacity-50"
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
        <div className="fixed inset-0 z-[60] bg-nura-bg/90 dark:bg-background-dark/90 backdrop-blur-md flex flex-col items-center justify-center animate-fade-in text-nura-main dark:text-white">
          <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(16,185,129,0.4)] animate-bounce mb-6">
            <span className="material-symbols-outlined text-white text-4xl">check</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight mb-2">Refeição Salva!</h2>
          <p className="text-nura-muted dark:text-slate-400 font-medium">Sincronizado com sucesso</p>
        </div>
      )}

      {/* Barcode Scanner Modal — full-screen overlay */}
      {showBarcodeScanner && (
        <BarcodeScannerErrorBoundary onError={(error) => {
          console.error('[BarcodeScannerModal] Error caught by boundary:', error);
          setScannerError(language === 'en'
            ? 'Scanner crashed. Please try again.'
            : 'Scanner falhou. Por favor, tente novamente.');
          setScannerMode('file');
          setScannerReady(true);
        }}>
          <div className="fixed inset-0 z-50 bg-black flex flex-col">
            {/* Top bar */}
            <div className="flex items-center justify-between p-4 bg-black/80">
              <button
                onClick={() => setShowBarcodeScanner(false)}
                className="flex items-center gap-2 text-white font-medium"
              >
                <span className="material-symbols-outlined">close</span>
                {language === 'en' ? 'Cancel' : 'Cancelar'}
              </button>
              <div className="flex items-center gap-3">
                {/* Torch button */}
                {scannerMode === 'live' && (
                  <button
                    onClick={toggleTorch}
                    className={`p-2 rounded-full transition-colors ${torchOn
                      ? 'bg-yellow-500 text-white'
                      : 'bg-white/10 text-white/70 hover:bg-white/20'
                      }`}
                    title={language === 'en' ? 'Toggle flashlight' : 'Lanterna'}
                  >
                    <span className="material-symbols-outlined">
                      {torchOn ? 'flashlight_on' : 'flashlight_off'}
                    </span>
                  </button>
                )}
                <span className="text-white/60 text-sm font-medium">
                  {language === 'en' ? 'Barcode Scanner' : 'Scanner de Código de Barras'}
                </span>
              </div>
            </div>

            {/* Camera area */}
            <div className="flex-1 relative" style={{ minHeight: 0 }}>

              {/* Loading state */}
              {!scannerReady && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-white/60 text-sm">
                    {language === 'en' ? 'Opening camera…' : 'Abrindo câmera…'}
                  </div>
                </div>
              )}

              {/* Live camera mode (Android/desktop) */}
              {scannerMode !== 'file' && (
                <div
                  id="barcode-reader"
                  style={{ width: '100%', height: '100%', minHeight: '60vh' }}
                />
              )}
              {scannerMode === 'live' && (
                <>
                  {/* Scan line animation */}
                  <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 pointer-events-none">
                    <div className="h-0.5 bg-emerald-400/80 shadow-[0_0_8px_rgba(52,211,153,0.6)] animate-[barcode-scan_2s_ease-in-out_infinite]" />
                  </div>

                  {/* Corner guides for better alignment */}
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/2 left-8 w-16 h-16 border-l-4 border-t-4 border-b-4 border-emerald-400/50 rounded-l-lg -translate-y-1/2" />
                    <div className="absolute top-1/2 right-8 w-16 h-16 border-r-4 border-t-4 border-b-4 border-emerald-400/50 rounded-r-lg -translate-y-1/2" />
                  </div>

                  {/* Instructions overlay */}
                  <div className="absolute bottom-32 left-0 right-0 text-center pointer-events-none px-4">
                    <p className="text-white/90 text-sm font-medium mb-1">
                      {language === 'en'
                        ? 'Align the barcode within the frame'
                        : 'Alinhe o código de barras no quadro'}
                    </p>
                    <p className="text-white/60 text-xs">
                      {language === 'en'
                        ? 'Hold steady and ensure good lighting'
                        : 'Mantenha firme e certifique-se de boa iluminação'}
                    </p>
                  </div>
                </>
              )}

              {/* File/photo fallback (iOS Safari) */}
              {scannerMode === 'file' && (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center h-full" style={{ minHeight: '60vh' }}>
                  {/* Hidden div required by html5-qrcode scanFileV2 */}
                  <div id="barcode-file-reader" style={{ display: 'none' }} />
                  <span className="material-symbols-outlined text-white/40 mb-4" style={{ fontSize: 64 }}>photo_camera</span>

                  {/* Show specific error message if available */}
                  {scannerError ? (
                    <>
                      <p className="text-red-300 text-base font-semibold mb-2">
                        {language === 'en' ? 'Camera Error' : 'Erro de Câmera'}
                      </p>
                      <p className="text-white/70 text-sm mb-4 max-w-xs">
                        {scannerError}
                      </p>
                      <p className="text-white/50 text-sm mb-6">
                        {language === 'en'
                          ? 'You can still scan a barcode by taking a photo'
                          : 'Você ainda pode escaniar um código tirando uma foto'}
                      </p>
                      {/* Retry button */}
                      <button
                        onClick={() => {
                          setScannerError(null);
                          setScannerReady(false);
                          setScannerMode(null);
                          // Force re-run of useEffect by toggling showBarcodeScanner
                          setShowBarcodeScanner(false);
                          setTimeout(() => setShowBarcodeScanner(true), 100);
                        }}
                        className="mb-4 px-6 py-3 bg-white/10 text-white font-semibold rounded-xl hover:bg-white/20 transition-colors flex items-center gap-2"
                      >
                        <span className="material-symbols-outlined">refresh</span>
                        {language === 'en' ? 'Try Again' : 'Tentar Novamente'}
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="text-white/80 text-base font-medium mb-2">
                        {language === 'en' ? 'Live scanner unavailable on this device' : 'Scanner ao vivo indisponível neste dispositivo'}
                      </p>
                      <p className="text-white/50 text-sm mb-8">
                        {language === 'en' ? 'Take a photo of the barcode instead' : 'Tire uma foto do código de barras'}
                      </p>
                    </>
                  )}

                  <label className="px-6 py-3 bg-emerald-500 text-white font-semibold rounded-xl cursor-pointer active:scale-95 transition-transform flex items-center gap-2">
                    <span className="material-symbols-outlined">camera_alt</span>
                    {language === 'en' ? 'Open Camera' : 'Abrir Câmera'}
                    <input
                      ref={barcodeFileInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={handleFileBarcodeScan}
                    />
                  </label>
                </div>
              )}
            </div>

            {/* Bottom hint — only shown during live mode */}
            {scannerMode === 'live' && (
              <div className="p-6 bg-black/80 text-center">
                <div className="flex items-center justify-center gap-2 text-white/80 text-sm mb-2">
                  <span className="material-symbols-outlined text-base">help_outline</span>
                  <p>
                    {language === 'en'
                      ? 'Point the camera at the barcode on the product packaging'
                      : 'Aponte a câmera para o código de barras na embalagem do produto'}
                  </p>
                </div>
                <div className="flex items-center justify-center gap-4 text-white/50 text-xs mt-3">
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">straighten</span>
                    <span>{language === 'en' ? 'Keep flat' : 'Mantenha reto'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">light_mode</span>
                    <span>{language === 'en' ? 'Good light' : 'Boa luz'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">panorama_fish_eye</span>
                    <span>{language === 'en' ? 'Focus' : 'Foco'}</span>
                  </div>
                </div>
                {torchAvailable && (
                  <p className="text-white/40 text-xs mt-2">
                    {language === 'en'
                      ? 'Use the flashlight button for dark environments'
                      : 'Use o botão da lanterna para ambientes escuros'}
                  </p>
                )}
              </div>
            )}

            {/* Scan line animation keyframes */}
            <style>{`
            @keyframes barcode-scan {
              0%, 100% { transform: translateY(-40px); opacity: 0.5; }
              50% { transform: translateY(40px); opacity: 1; }
            }
          `}</style>
          </div>
        </BarcodeScannerErrorBoundary>
      )}
    </div>
  );
};

export default MealLogger;