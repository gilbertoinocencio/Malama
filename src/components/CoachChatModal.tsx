import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { CoachChatService, CoachChatMessage } from '../services/coachChatService';

interface CoachChatModalProps {
  onClose: () => void;
}

export const CoachChatModal: React.FC<CoachChatModalProps> = ({ onClose }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<CoachChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load chat history on mount
  useEffect(() => {
    if (user) {
      loadHistory();
    }
  }, [user]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const loadHistory = async () => {
    if (!user) return;
    setLoadingHistory(true);
    try {
      const history = await CoachChatService.getChatHistory(user.id);
      setMessages(history);
    } catch (error) {
      console.error('Error loading chat history:', error);
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
      const tempUserMsg: CoachChatMessage = {
        id: 'temp-' + Date.now(),
        user_id: user.id,
        role: 'user',
        content: userMessage,
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, tempUserMsg]);

      // Send to AI and get response
      const coachResponse = await CoachChatService.sendMessage(user.id, userMessage);

      // Replace temp message with real one and add coach response
      setMessages(prev => {
        const withoutTemp = prev.filter(m => m.id !== tempUserMsg.id);
        return [...withoutTemp, tempUserMsg, coachResponse];
      });
    } catch (error) {
      console.error('Error sending message:', error);
      // Remove temp message on error
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
    if (!confirm('Tem certeza que deseja limpar todo o histórico do chat?')) return;

    try {
      await CoachChatService.clearHistory(user.id);
      setMessages([]);
    } catch (error) {
      console.error('Error clearing history:', error);
      alert('Erro ao limpar histórico.');
    }
  };

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
          <div className="size-12 rounded-full bg-gradient-to-br from-Malama-petrol to-Malama-petrol-light dark:from-primary dark:to-primary/70 flex items-center justify-center text-white shadow-lg">
            <span className="material-symbols-outlined text-[24px]">psychology</span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-Malama-main dark:text-white">Coach AI</h2>
            <p className="text-xs text-Malama-muted dark:text-gray-400">Nutricionista Virtual</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleClearHistory}
            className="size-10 rounded-full hover:bg-Malama-pastel-orange/30 dark:hover:bg-white/5 flex items-center justify-center text-Malama-muted dark:text-gray-400 transition-colors"
            title="Limpar histórico"
          >
            <span className="material-symbols-outlined text-[20px]">delete</span>
          </button>
          <button
            onClick={onClose}
            className="size-10 rounded-full hover:bg-Malama-pastel-orange/30 dark:hover:bg-white/5 flex items-center justify-center text-Malama-muted dark:text-gray-400 transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {loadingHistory ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-10 h-10 border-4 border-Malama-petrol dark:border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <>
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center px-6">
                <div className="size-20 rounded-full bg-Malama-petrol/10 dark:bg-primary/10 flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-[40px] text-Malama-petrol dark:text-primary">chat_bubble</span>
                </div>
                <h3 className="text-xl font-bold text-Malama-main dark:text-white mb-2">
                  Olá! Sou sua Coach AI 👋
                </h3>
                <p className="text-sm text-Malama-muted dark:text-gray-400 mb-6 max-w-xs">
                  Pergunte qualquer coisa sobre alimentação, nutrição, receitas ou seu plano personalizado!
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
            placeholder="Digite sua mensagem..."
            rows={1}
            disabled={isLoading}
            className="flex-1 px-4 py-3 rounded-2xl border-2 border-Malama-border dark:border-white/10 bg-Malama-bg dark:bg-background-dark text-Malama-main dark:text-white placeholder-Malama-muted dark:placeholder-gray-500 focus:outline-none focus:border-Malama-petrol dark:focus:border-primary transition-colors resize-none max-h-32 disabled:opacity-50"
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
