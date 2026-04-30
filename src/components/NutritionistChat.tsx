import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  NutritionistAgentService,
  OnboardingSession,
  ChatMessage as ChatMessageType,
} from '../services/nutritionistAgentService';
import ChatMessage from './ChatMessage';
import QuickReply from './QuickReply';

interface NutritionistChatProps {
  onComplete: (sessionId: string) => void;
  onBack?: () => void;
}

export const NutritionistChat: React.FC<NutritionistChatProps> = ({ onComplete, onBack }) => {
  const { user } = useAuth();
  const [session, setSession] = useState<OnboardingSession | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load or create session on mount
  useEffect(() => {
    if (user) {
      loadSession();
    }
  }, [user]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [session?.messages]);

  // Handle scroll to show/hide scroll indicator
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollTop(!isNearBottom);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const loadSession = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const loadedSession = await NutritionistAgentService.getOrCreateSession(user.id);
      setSession(loadedSession);
    } catch (error) {
      console.error('Error loading session:', error);
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async () => {
    if (!input.trim() || !user || sending) return;

    const userMessage = input.trim();
    setInput('');

    // Optimistic UI: Add user message immediately
    if (session) {
      const optimisticUserMessage: ChatMessageType = {
        id: `temp-${Date.now()}`,
        role: 'user',
        content: userMessage,
        timestamp: new Date(),
      };

      setSession({
        ...session,
        messages: [...session.messages, optimisticUserMessage],
      });
    }

    setSending(true);

    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }

    try {
      const { session: updatedSession, agentMessage } = await NutritionistAgentService.processMessage(
        user.id,
        userMessage
      );

      setSession(updatedSession);

      // If completed, trigger callback
      if (updatedSession.completed) {
        setTimeout(() => {
          onComplete(updatedSession.id || '');
        }, 1000);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // TODO: Show error toast and remove optimistic message
      if (session) {
        setSession({
          ...session,
          messages: session.messages.filter(m => !m.id.startsWith('temp-')),
        });
      }
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const progress = session ? NutritionistAgentService.getProgress(session.currentStage) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-Malama-bg dark:bg-background-dark">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-Malama-petrol dark:border-primary"></div>
      </div>
    );
  }

  return (
    <div className="relative flex h-full min-h-screen w-full flex-col overflow-hidden max-w-md mx-auto bg-Malama-bg dark:bg-background-dark text-Malama-main dark:text-white font-display">
      {/* Header - Redesigned Compact */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-Malama-border dark:border-white/10 bg-white/80 dark:bg-surface-dark/80 backdrop-blur-lg z-10">
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center justify-center size-9 rounded-full hover:bg-Malama-pastel-orange dark:hover:bg-white/5 transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
        )}

        <div className="flex-1 flex items-center justify-center gap-3">
          {/* Circular Progress Avatar */}
          <div className="relative">
            <svg className="w-10 h-10 -rotate-90">
              <circle
                cx="20"
                cy="20"
                r="18"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                className="text-gray-200 dark:text-gray-700"
              />
              <circle
                cx="20"
                cy="20"
                r="18"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 18}`}
                strokeDashoffset={`${2 * Math.PI * 18 * (1 - progress / 100)}`}
                className="text-Malama-petrol dark:text-primary transition-all duration-500"
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="size-7 bg-Malama-petrol dark:bg-primary rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-[16px]">psychology</span>
              </div>
            </div>
          </div>

          {/* Title */}
          <div className="flex flex-col">
            <h1 className="text-sm font-bold leading-tight">Nutricionista Malama</h1>
            <p className="text-[10px] text-Malama-muted dark:text-gray-500 leading-tight">
              {session?.completed ? 'Completo!' : `${progress}% • Plano de 3 Meses`}
            </p>
          </div>
        </div>

        {!onBack && <div className="size-9" />}
      </header>

      {/* Messages Area */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 relative"
      >
        {/* Shadow Gradient at Top when scrolled */}
        {showScrollTop && (
          <div className="sticky top-0 left-0 right-0 h-8 bg-gradient-to-b from-Malama-bg dark:from-background-dark to-transparent pointer-events-none z-10" />
        )}
        {session?.messages.map((message, index) => (
          <ChatMessage
            key={message.id}
            message={message}
            isLast={index === session.messages.length - 1}
          />
        ))}

        {/* Typing Indicator */}
        {sending && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 px-4 py-3 bg-white dark:bg-surface-dark border border-Malama-border dark:border-white/10 rounded-2xl rounded-tl-sm shadow-sm">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-Malama-petrol dark:bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-Malama-petrol dark:bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-Malama-petrol dark:bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
              <span className="text-xs text-Malama-muted dark:text-gray-500">Nutricionista está digitando...</span>
            </div>
          </div>
        )}

        {/* Completion Message */}
        {session?.completed && (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            <div className="bg-green-100 dark:bg-green-900/30 p-4 rounded-full mb-4">
              <span className="material-symbols-outlined text-4xl text-green-600 dark:text-green-400">
                check_circle
              </span>
            </div>
            <h3 className="text-lg font-bold mb-2">Onboarding Completo! 🎉</h3>
            <p className="text-sm text-Malama-muted dark:text-gray-400 mb-6">
              Coletei todas as informações necessárias. Agora vou criar seu plano alimentar personalizado de 3 meses!
            </p>
            <button
              onClick={() => onComplete(session.id || '')}
              className="bg-Malama-petrol dark:bg-primary text-white font-bold py-3 px-6 rounded-2xl hover:brightness-110 transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined">auto_awesome</span>
              <span>Gerar Plano de 3 Meses</span>
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />

        {/* Scroll to Bottom Button */}
        {showScrollTop && (
          <button
            onClick={scrollToBottom}
            className="sticky bottom-4 left-1/2 -translate-x-1/2 size-10 rounded-full bg-Malama-petrol dark:bg-primary text-white hover:brightness-110 transition-all flex items-center justify-center z-20 animate-fade-in"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_downward</span>
          </button>
        )}
      </div>

      {/* Quick Replies */}
      {!session?.completed && !sending && session && (
        (() => {
          const quickReplies = NutritionistAgentService.getQuickReplies(session.currentStage);
          return quickReplies ? (
            <div className="px-4 pb-2">
              <QuickReply
                options={quickReplies}
                onSelect={(value) => {
                  setInput(value);
                  // Auto-send after selection
                  setTimeout(() => {
                    if (inputRef.current) {
                      handleSend();
                    }
                  }, 100);
                }}
                disabled={sending}
              />
            </div>
          ) : null;
        })()
      )}

      {/* Input Area - Improved with Textarea */}
      {!session?.completed && (
        <div className="border-t border-Malama-border dark:border-white/10 bg-white/80 dark:bg-surface-dark/80 backdrop-blur-lg p-4">
          <div className="flex gap-2 items-end max-w-2xl mx-auto">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  // Auto-resize
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Digite sua resposta..."
                disabled={sending}
                rows={1}
                className="w-full px-4 py-3 pr-12 rounded-2xl border border-Malama-border dark:border-white/10 bg-Malama-bg dark:bg-background-dark text-Malama-main dark:text-white placeholder-Malama-muted focus:outline-none focus:ring-2 focus:ring-Malama-petrol/20 dark:focus:ring-primary/20 transition-all disabled:opacity-50 resize-none max-h-[120px] text-[15px] leading-relaxed"
              />
              {input && (
                <button
                  onClick={() => {
                    setInput('');
                    if (inputRef.current) {
                      inputRef.current.style.height = 'auto';
                    }
                  }}
                  className="absolute right-3 top-3 text-Malama-muted hover:text-Malama-main dark:hover:text-white transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              )}
            </div>

            <button
              onClick={handleSend}
              disabled={!input.trim() || sending}
              className="flex items-center justify-center size-11 rounded-2xl bg-Malama-petrol dark:bg-primary text-white hover:brightness-110 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {sending ? (
                <span className="material-symbols-outlined animate-spin text-[20px]">sync</span>
              ) : (
                <span className="material-symbols-outlined text-[20px]">send</span>
              )}
            </button>
          </div>

          {/* Helper Text */}
          <p className="text-[9px] text-center text-Malama-muted/70 dark:text-gray-600 mt-2">
            Enter para enviar • Shift+Enter para quebra de linha
          </p>
        </div>
      )}
    </div>
  );
};

export default NutritionistChat;
