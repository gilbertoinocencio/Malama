import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { UnifiedChatService, ChatMessage, ChatSession } from '../services/unifiedChatService';

interface UnifiedChatModalProps {
  onClose: () => void;
  onOnboardingComplete?: () => void;
}

export const UnifiedChatModal: React.FC<UnifiedChatModalProps> = ({ onClose, onOnboardingComplete }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [session, setSession] = useState<ChatSession | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load session and history on mount
  useEffect(() => {
    if (user) {
      loadSessionAndHistory();
    }
  }, [user]);

  // Auto-scroll to bottom
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-focus input
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const loadSessionAndHistory = async () => {
    if (!user) return;
    setLoadingHistory(true);
    try {
      const currentSession = await UnifiedChatService.getOrCreateSession(user.id);
      setSession(currentSession);

      const history = await UnifiedChatService.getChatHistory(user.id);
      setMessages(history);

      console.log('📍 Loaded session:', currentSession.session_type, currentSession.current_stage);
    } catch (error) {
      console.error('Error loading session:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async () => {
    if (!user || !inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setIsLoading(true);

    try {
      // Optimistically add user message
      const tempUserMsg: ChatMessage = {
        id: 'temp-' + Date.now(),
        user_id: user.id,
        role: 'user',
        content: userMessage,
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, tempUserMsg]);

      // Send to AI and get response
      const agentResponse = await UnifiedChatService.sendMessage(user.id, userMessage);

      // Reload session to check for updates
      const updatedSession = await UnifiedChatService.getOrCreateSession(user.id);
      setSession(updatedSession);

      // Replace temp message and add agent response
      setMessages(prev => {
        const withoutTemp = prev.filter(m => m.id !== tempUserMsg.id);
        return [...withoutTemp, tempUserMsg, agentResponse];
      });

      // Check if onboarding just completed
      if (updatedSession.onboarding_completed && session?.session_type === 'onboarding' && !session.onboarding_completed) {
        console.log('🎉 Onboarding completed!');
        setTimeout(() => {
          if (onOnboardingComplete) {
            onOnboardingComplete();
          }
        }, 2000);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => prev.filter(m => !m.id.startsWith('temp-')));
      alert('Erro ao enviar mensagem. Tente novamente.');
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearHistory = async () => {
    if (!user) return;
    if (!confirm('Tem certeza que deseja limpar todo o histórico?')) return;

    try {
      await UnifiedChatService.clearHistory(user.id);
      setMessages([]);
    } catch (error) {
      console.error('Error clearing history:', error);
    }
  };

  // Determine mode
  const isOnboarding = session?.session_type === 'onboarding' && !session.onboarding_completed;
  const modeName = isOnboarding ? 'Onboarding' : 'Coach AI';
  const modeIcon = isOnboarding ? 'app_registration' : 'psychology';
  const modeSubtitle = isOnboarding ? 'Vamos conhecer você!' : 'Nutricionista Virtual';

  // Quick questions (only for chat mode)
  const quickQuestions = [
    '💧 Como aumentar minha hidração?',
    '🍽️ Sugestão de lanche saudável',
    '😴 O que comer antes de dormir?',
    '🏃 Alimentação pré-treino',
    '🥗 Como montar um prato balanceado?',
  ];

  const handleQuickQuestion = (question: string) => {
    setInputValue(question);
    inputRef.current?.focus();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-Malama-bg dark:bg-background-dark flex flex-col max-w-md mx-auto"
    >
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-white dark:bg-surface-dark border-b border-Malama-border dark:border-white/5">
        <div className="flex items-center gap-3">
          <div className={`size-12 rounded-full ${isOnboarding ? 'bg-gradient-to-br from-orange-500 to-orange-600' : 'bg-gradient-to-br from-Malama-petrol to-Malama-petrol-light dark:from-primary dark:to-primary/70'} flex items-center justify-center text-white shadow-lg`}>
            <span className="material-symbols-outlined text-[24px]">{modeIcon}</span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-Malama-main dark:text-white">{modeName}</h2>
            <p className="text-xs text-Malama-muted dark:text-gray-400">{modeSubtitle}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {!isOnboarding && (
            <button
              onClick={handleClearHistory}
              className="size-10 rounded-full hover:bg-Malama-pastel-orange/30 dark:hover:bg-white/5 flex items-center justify-center text-Malama-muted dark:text-gray-400 transition-colors"
              title="Limpar histórico"
            >
              <span className="material-symbols-outlined text-[20px]">delete</span>
            </button>
          )}
          <button
            onClick={onClose}
            className="size-10 rounded-full hover:bg-Malama-pastel-orange/30 dark:hover:bg-white/5 flex items-center justify-center text-Malama-muted dark:text-gray-400 transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
      </header>

      {/* Progress indicator (only for onboarding) */}
      {isOnboarding && session && (
        <div className="px-6 py-3 bg-white dark:bg-surface-dark border-b border-Malama-border dark:border-white/5">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-orange-500 to-orange-600"
                initial={{ width: 0 }}
                animate={{ width: `${(getStageProgress(session.current_stage) / 16) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <span className="text-xs font-semibold text-Malama-muted dark:text-gray-400">
              {getStageProgress(session.current_stage)}/16
            </span>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {loadingHistory ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-10 h-10 border-4 border-Malama-petrol dark:border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <>
            {messages.length === 0 && !isOnboarding && (
              <div className="flex flex-col items-center justify-center h-full text-center px-6">
                <div className="size-20 rounded-full bg-Malama-petrol/10 dark:bg-primary/10 flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-[40px] text-Malama-petrol dark:text-primary">chat_bubble</span>
                </div>
                <h3 className="text-xl font-bold text-Malama-main dark:text-white mb-2">
                  Olá! Sou sua Coach AI 👋
                </h3>
                <p className="text-sm text-Malama-muted dark:text-gray-400 mb-6 max-w-xs">
                  Pergunte qualquer coisa sobre alimentação, nutrição ou seu plano!
                </p>

                {/* Quick Questions */}
                <div className="w-full space-y-2">
                  <p className="text-xs font-semibold text-Malama-muted dark:text-gray-500 uppercase tracking-wider mb-3">
                    Perguntas rápidas:
                  </p>
                  {quickQuestions.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => handleQuickQuestion(q)}
                      className="w-full text-left px-4 py-3 rounded-xl bg-white dark:bg-surface-dark border border-Malama-border dark:border-white/5 hover:border-Malama-petrol dark:hover:border-primary transition-all text-sm text-Malama-main dark:text-white"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <AnimatePresence initial={false}>
              {messages.map((msg, index) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      msg.role === 'user'
                        ? 'bg-Malama-petrol dark:bg-primary text-white rounded-br-sm'
                        : 'bg-white dark:bg-surface-dark border border-Malama-border dark:border-white/5 text-Malama-main dark:text-white rounded-bl-sm'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    <p className="text-[10px] mt-2 opacity-60">
                      {new Date(msg.created_at).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-start"
              >
                <div className="max-w-[80%] rounded-2xl rounded-bl-sm px-4 py-3 bg-white dark:bg-surface-dark border border-Malama-border dark:border-white/5">
                  <div className="flex gap-1">
                    <span className="size-2 bg-Malama-petrol dark:bg-primary rounded-full animate-bounce" style={{ animationDelay: '0s' }}></span>
                    <span className="size-2 bg-Malama-petrol dark:bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                    <span className="size-2 bg-Malama-petrol dark:bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                  </div>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="px-6 py-4 bg-white dark:bg-surface-dark border-t border-Malama-border dark:border-white/5">
        <div className="flex items-end gap-3">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isOnboarding ? "Digite sua resposta..." : "Digite sua mensagem..."}
            rows={1}
            disabled={isLoading}
            className="flex-1 px-4 py-3 rounded-2xl border-2 border-Malama-border dark:border-gray-700 bg-Malama-bg dark:bg-background-dark text-Malama-main dark:text-white placeholder-Malama-muted dark:placeholder-gray-500 focus:outline-none focus:border-Malama-petrol dark:focus:border-primary transition-colors resize-none max-h-32 disabled:opacity-50"
            style={{ minHeight: '48px' }}
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || isLoading}
            className="size-12 rounded-full bg-Malama-petrol dark:bg-primary hover:bg-Malama-petrol/90 dark:hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-white shadow-lg transition-all transform active:scale-95"
          >
            <span className="material-symbols-outlined text-[24px]">send</span>
          </button>
        </div>
        <p className="text-[10px] text-Malama-muted dark:text-gray-500 mt-2 text-center">
          Pressione Enter para enviar • Shift+Enter para nova linha
        </p>
      </div>
    </motion.div>
  );
};

// Helper to get stage progress number
function getStageProgress(stage?: string | null): number {
  const stages = [
    'WELCOME', 'NAME', 'BIRTH_DATE', 'BIOLOGICAL_SEX', 'HEIGHT_WEIGHT',
    'BODY_COMPOSITION_QUESTION', 'BODY_COMPOSITION_DATA', 'ACTIVITY_TYPES',
    'ACTIVITY_FREQUENCY', 'ACTIVITY_DURATION', 'ACTIVITY_INTENSITY',
    'FOOD_ROUTINE', 'FOOD_RESTRICTIONS', 'FOOD_PREFERENCES',
    'PREVIOUS_DIETS', 'MAIN_GOAL'
  ];
  return stage ? stages.indexOf(stage) + 1 : 0;
}
