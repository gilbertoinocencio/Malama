import React from 'react';
import { ChatMessage as ChatMessageType } from '../services/nutritionistAgentService';

interface ChatMessageProps {
  message: ChatMessageType;
  isLast?: boolean;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, isLast }) => {
  const isAgent = message.role === 'agent';

  return (
    <div
      className={`flex ${isAgent ? 'justify-start' : 'justify-end'} mb-4 animate-fade-in-up`}
    >
      <div className={`flex items-start gap-2 max-w-[85%] ${isAgent ? 'flex-row' : 'flex-row-reverse'}`}>
        {/* Avatar */}
        <div
          className={`flex-shrink-0 size-8 rounded-full flex items-center justify-center ${
            isAgent
              ? 'bg-nura-petrol dark:bg-primary text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">
            {isAgent ? 'psychology' : 'person'}
          </span>
        </div>

        {/* Message Bubble */}
        <div
          className={`flex flex-col ${isAgent ? 'items-start' : 'items-end'}`}
        >
          {/* Role Label */}
          <span className="text-[10px] font-medium text-nura-muted dark:text-gray-500 mb-1 px-1">
            {isAgent ? 'Nutricionista NURA' : 'Você'}
          </span>

          {/* Message Content */}
          <div
            className={`px-4 py-3 rounded-2xl ${
              isAgent
                ? 'bg-white dark:bg-surface-dark border border-nura-border dark:border-gray-700 text-nura-main dark:text-white rounded-tl-sm'
                : 'bg-nura-petrol dark:bg-primary text-white rounded-tr-sm'
            } shadow-sm`}
          >
            {/* Format message with line breaks */}
            <div className="text-sm leading-relaxed whitespace-pre-wrap">
              {message.content}
            </div>
          </div>

          {/* Timestamp */}
          <span className="text-[9px] text-nura-muted dark:text-gray-600 mt-1 px-1">
            {new Date(message.timestamp).toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
      </div>

      {/* Typing Indicator (only for last agent message) */}
      {isAgent && isLast && (
        <div className="hidden" data-typing-indicator>
          <div className="flex items-center gap-1 px-4 py-2 bg-white dark:bg-surface-dark border border-nura-border dark:border-gray-700 rounded-2xl rounded-tl-sm">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-nura-petrol dark:bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-nura-petrol dark:bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-nura-petrol dark:bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatMessage;
