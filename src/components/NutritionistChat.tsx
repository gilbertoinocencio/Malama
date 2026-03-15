import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  NutritionistAgentService,
  OnboardingSession,
  ChatMessage as ChatMessageType,
} from '../services/nutritionistAgentService';
import ChatMessage from './ChatMessage';

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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
    setSending(true);

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
      // TODO: Show error toast
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
      <div className="flex items-center justify-center h-screen bg-nura-bg dark:bg-background-dark">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nura-petrol dark:border-primary"></div>
      </div>
    );
  }

  return (
    <div className="relative flex h-full min-h-screen w-full flex-col overflow-hidden max-w-md mx-auto bg-nura-bg dark:bg-background-dark text-nura-main dark:text-white font-display">
      {/* Header */}
      <header className="flex items-center justify-between p-4 pt-6 border-b border-nura-border dark:border-gray-800 bg-white dark:bg-surface-dark z-10">
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center justify-center size-10 rounded-full hover:bg-nura-pastel-orange dark:hover:bg-white/5 transition-colors"
          >
            <span className="material-symbols-outlined text-[24px]">arrow_back</span>
          </button>
        )}

        <div className="flex-1 flex flex-col items-center">
          <div className="flex items-center gap-2 mb-1">
            <div className="size-8 bg-nura-petrol dark:bg-primary rounded-full flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-[18px]">psychology</span>
            </div>
            <div>
              <h1 className="text-sm font-bold">Nutricionista NURA</h1>
              <p className="text-[10px] text-nura-muted dark:text-gray-500">Plano de 3 Meses</p>
            </div>
          </div>

          {/* Progress Bar */}
          {!session?.completed && (
            <div className="w-full max-w-xs">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[9px] font-medium text-nura-muted dark:text-gray-500">
                  Progresso do Onboarding
                </span>
                <span className="text-[9px] font-bold text-nura-petrol dark:text-primary">
                  {progress}%
                </span>
              </div>
              <div className="h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-nura-petrol dark:bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>

        {!onBack && <div className="size-10" />}
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
            <div className="flex items-center gap-2 px-4 py-3 bg-white dark:bg-surface-dark border border-nura-border dark:border-gray-700 rounded-2xl rounded-tl-sm shadow-sm">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-nura-petrol dark:bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-nura-petrol dark:bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-nura-petrol dark:bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
              <span className="text-xs text-nura-muted dark:text-gray-500">Nutricionista está digitando...</span>
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
            <p className="text-sm text-nura-muted dark:text-gray-400 mb-6">
              Coletei todas as informações necessárias. Agora vou criar seu plano alimentar personalizado de 3 meses!
            </p>
            <button
              onClick={() => onComplete(session.id || '')}
              className="bg-nura-petrol dark:bg-primary text-white font-bold py-3 px-6 rounded-2xl shadow-lg hover:brightness-110 transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined">auto_awesome</span>
              <span>Gerar Plano de 3 Meses</span>
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      {!session?.completed && (
        <div className="border-t border-nura-border dark:border-gray-800 bg-white dark:bg-surface-dark p-4">
          <div className="flex gap-2 items-end max-w-2xl mx-auto">
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Digite sua resposta..."
                disabled={sending}
                className="w-full px-4 py-3 pr-12 rounded-2xl border border-nura-border dark:border-gray-700 bg-nura-bg dark:bg-background-dark text-nura-main dark:text-white placeholder-nura-muted focus:outline-none focus:ring-2 focus:ring-nura-petrol/20 dark:focus:ring-primary/20 transition-all disabled:opacity-50"
              />
              {input && (
                <button
                  onClick={() => setInput('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-nura-muted hover:text-nura-main dark:hover:text-white transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              )}
            </div>

            <button
              onClick={handleSend}
              disabled={!input.trim() || sending}
              className="flex items-center justify-center size-12 rounded-2xl bg-nura-petrol dark:bg-primary text-white shadow-lg hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? (
                <span className="material-symbols-outlined animate-spin">sync</span>
              ) : (
                <span className="material-symbols-outlined">send</span>
              )}
            </button>
          </div>

          {/* Helper Text */}
          <p className="text-[10px] text-center text-nura-muted dark:text-gray-600 mt-2">
            Pressione Enter para enviar • Shift+Enter para quebra de linha
          </p>
        </div>
      )}
    </div>
  );
};

export default NutritionistChat;
