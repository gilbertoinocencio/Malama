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
      className={`flex ${isAgent ? 'justify-start' : 'justify-end'} mb-3 animate-fade-in-up`}
    >
      <div className={`flex items-end gap-2 max-w-[85%] ${isAgent ? 'flex-row' : 'flex-row-reverse'}`}>
        {/* Avatar */}
        <div
          className={`flex-shrink-0 size-6 rounded-full flex items-center justify-center ${
            isAgent
              ? 'bg-Malama-petrol dark:bg-primary text-white shadow-md'
              : 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
          }`}
        >
          <span className="material-symbols-outlined text-[14px]">
            {isAgent ? 'psychology' : 'person'}
          </span>
        </div>

        {/* Message Bubble */}
        <div
          className={`flex flex-col ${isAgent ? 'items-start' : 'items-end'} max-w-full`}
        >
          {/* Message Content */}
          <div
            className={`px-4 py-2.5 rounded-2xl ${
              isAgent
                ? 'bg-white dark:bg-surface-dark border border-Malama-border/50 dark:border-white/10/50 text-Malama-main dark:text-white rounded-bl-md shadow-sm'
                : 'bg-Malama-petrol dark:bg-primary text-white rounded-br-md shadow-md'
            }`}
          >
            {/* Format message with line breaks */}
            <div className="text-[15px] leading-relaxed whitespace-pre-wrap">
              {message.content}
            </div>
          </div>

          {/* Timestamp */}
          <span className="text-[10px] text-Malama-muted/80 dark:text-gray-500 mt-1 px-1">
            {new Date(message.timestamp).toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
