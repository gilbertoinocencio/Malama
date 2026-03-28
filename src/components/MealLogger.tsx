import React, { useState, useRef, useEffect } from 'react';
import { Meal, AIResponse, MealItem } from '../types';
import { analyzeTextLog, analyzeImageLog } from '../services/geminiService';
import { UnifiedChatService } from '../services/unifiedChatService';
import { NuraAiScan } from './NuraAiScan';
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

export const MealLogger: React.FC<MealLoggerProps> = ({ onLog, onClose }) => {
  console.log('MealLogger: COMPONENT RENDERED');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draftMeal, setDraftMeal] = useState<AIResponse | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editItems, setEditItems] = useState<MealItem[]>([]);

  // Photo Mode State
  const [scanResult, setScanResult] = useState<AIResponse | null>(null);
  const [scannedImageUri, setScannedImageUri] = useState<string | null>(null);

  // Voice Recognition State
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { t, speechLang, language } = useLanguage();
  const { user } = useAuth();

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
        const mealContext = draftMeal
          ? `[Contexto da refeição atual: ${draftMeal.foodName} — ${(draftMeal.items || []).map(i => `${i.name} ${i.weightGrams}g (${i.calories}kcal)`).join(', ')}]\n\n`
          : '';
        const agentResponse = await UnifiedChatService.sendMessage(user.id, mealContext + userText);

        // Check if response contains a structured meal JSON block
        const mealJsonMatch = agentResponse.content.match(/<meal_json>([\s\S]*?)<\/meal_json>/);
        if (mealJsonMatch) {
          try {
            const cleanText = agentResponse.content.replace(/<meal_json>[\s\S]*?<\/meal_json>/, '').trim();
            const parsedMeal: AIResponse = JSON.parse(mealJsonMatch[1]);
            setMessages(prev => [...prev,
              { id: (Date.now() + 1).toString(), type: 'ai-text', content: cleanText },
              { id: (Date.now() + 2).toString(), type: 'ai-card', content: parsedMeal }
            ]);
            setDraftMeal(parsedMeal);
          } catch {
            // If JSON parse fails, fall back to plain text
            setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), type: 'ai-text', content: agentResponse.content }]);
          }
        } else {
          setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), type: 'ai-text', content: agentResponse.content }]);
        }
        // draft meal only set if meal_json was found above
      } else {
        // Route to Food Analysis (original behavior)
        const result = await analyzeTextLog(userText, language);

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
      console.log('MealLogger: Called onLog. Calling onClose...');
      onClose();
      console.log('MealLogger: Called onClose.');
    } catch (error) {
      console.error('Failed to log meal:', error);
      alert(t.mealLogger.errorLogging);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEdit = () => {
    if (!draftMeal) return;
    setEditItems(draftMeal.items ? draftMeal.items.map((i: MealItem) => ({ ...i })) : []);
    setEditMode(true);
  };

  const handleRecalculate = async () => {
    if (!editItems.length) return;
    setEditMode(false);
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

        {/* Timestamp */}
        <div className="flex justify-center">
          <span className="text-xs font-medium text-nura-muted dark:text-slate-500 bg-gray-100 dark:bg-white/5 px-3 py-1 rounded-full">
            {t.mealLogger.today} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {/* Initial Prompt if Empty */}
        {messages.length === 0 && (
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

        {/* Messages */}
        {messages.map((msg) => {
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
                  style={{ backgroundImage: `url("${USER_AVATAR}")` }}
                ></div>
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
            const pPct = (data.macros.p / totalMacros) * 100;
            const cPct = (data.macros.c / totalMacros) * 100;

            const gradientStyle = {
              background: `conic-gradient(var(--tw-colors-accent-protein) 0% ${pPct}%, var(--tw-colors-accent-carbs) ${pPct}% ${pPct + cPct}%, var(--tw-colors-accent-fat) ${pPct + cPct}% 100%)`
            };

            return (
              <div key={msg.id} className="flex gap-3 w-full max-w-full animate-fade-in-up pl-11">
                <div className="bg-white dark:bg-surface-dark rounded-2xl p-5 shadow-lg border border-nura-border dark:border-white/5 w-full overflow-hidden relative group">
                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-nura-petrol/10 dark:bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>

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
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-nura-bg dark:bg-white/5 p-2 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-accent-protein"></div>
                          <span className="text-xs text-nura-muted dark:text-slate-400 font-medium">{t.macros.prot}</span>
                        </div>
                        <span className="text-sm font-bold text-nura-main dark:text-white">{data.macros.p}g</span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-nura-bg dark:bg-white/5 p-2 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-accent-carbs"></div>
                          <span className="text-xs text-nura-muted dark:text-slate-400 font-medium">{t.macros.carb}</span>
                        </div>
                        <span className="text-sm font-bold text-nura-main dark:text-white">{data.macros.c}g</span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-nura-bg dark:bg-white/5 p-2 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-accent-fat"></div>
                          <span className="text-xs text-nura-muted dark:text-slate-400 font-medium">{t.macros.fat}</span>
                        </div>
                        <span className="text-sm font-bold text-nura-main dark:text-white">{data.macros.f}g</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 mt-2">
                    {data.items?.map((item, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-nura-bg dark:bg-[#152226] border border-transparent hover:border-nura-petrol/20 dark:hover:border-primary/20 transition-all">
                        {/* Top row: icon + name + calories */}
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="bg-nura-border dark:bg-white/10 rounded-lg size-9 shrink-0 flex items-center justify-center">
                              <span className="material-symbols-outlined text-nura-muted dark:text-slate-500 text-sm">lunch_dining</span>
                            </div>
                            <div className="min-w-0">
                              <p className="text-nura-main dark:text-white text-sm font-semibold truncate">{item.name}</p>
                              <p className="text-nura-muted dark:text-slate-500 text-xs">
                                {item.quantity ? `${item.quantity}` : ''}{item.weightGrams ? ` · ${item.weightGrams}g` : ''}
                              </p>
                            </div>
                          </div>
                          <span className="text-nura-petrol dark:text-primary text-sm font-bold shrink-0">{item.calories} kcal</span>
                        </div>
                        {/* Bottom row: macros */}
                        {(item.protein != null || item.carbs != null || item.fats != null) && (
                          <div className="flex gap-2 pl-12">
                            {item.protein != null && (
                              <span className="flex items-center gap-1 bg-white dark:bg-white/5 px-2 py-0.5 rounded-full text-[11px] font-semibold">
                                <span className="w-1.5 h-1.5 rounded-full bg-accent-protein inline-block"></span>
                                <span className="text-nura-muted dark:text-slate-400">P</span>
                                <span className="text-nura-main dark:text-white">{item.protein}g</span>
                              </span>
                            )}
                            {item.carbs != null && (
                              <span className="flex items-center gap-1 bg-white dark:bg-white/5 px-2 py-0.5 rounded-full text-[11px] font-semibold">
                                <span className="w-1.5 h-1.5 rounded-full bg-accent-carbs inline-block"></span>
                                <span className="text-nura-muted dark:text-slate-400">C</span>
                                <span className="text-nura-main dark:text-white">{item.carbs}g</span>
                              </span>
                            )}
                            {item.fats != null && (
                              <span className="flex items-center gap-1 bg-white dark:bg-white/5 px-2 py-0.5 rounded-full text-[11px] font-semibold">
                                <span className="w-1.5 h-1.5 rounded-full bg-accent-fat inline-block"></span>
                                <span className="text-nura-muted dark:text-slate-400">G</span>
                                <span className="text-nura-main dark:text-white">{item.fats}g</span>
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Coach Message */}
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
        })}

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
                onClick={onClose}
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
                onClick={() => handleConfirmLog(draftMeal, 'ai-chat')}
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
                disabled={editItems.length === 0}
                className="w-full h-14 rounded-2xl bg-nura-petrol dark:bg-primary text-white font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-nura-petrol/25 dark:shadow-primary/25 hover:brightness-110 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                <span className="material-symbols-outlined">calculate</span>
                Recalcular macros
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MealLogger;