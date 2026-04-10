import React, { useState } from 'react';
import { X } from 'lucide-react';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  maxTags?: number;
}

export const TagInput: React.FC<TagInputProps> = ({ tags, onChange, maxTags = 5 }) => {
  const [input, setInput] = useState('');

  const addTag = (raw: string) => {
    const tag = raw.replace(/^#/, '').trim().toLowerCase();
    if (!tag || tags.includes(tag) || tags.length >= maxTags) return;
    onChange([...tags, tag]);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === ',') {
      e.preventDefault();
      addTag(input);
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  };

  return (
    <div className="flex flex-wrap gap-1.5 items-center p-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl
      border border-gray-200 dark:border-gray-700 focus-within:ring-2 focus-within:ring-[#2ECC71]/40 min-h-[42px]">
      {tags.map(tag => (
        <span key={tag} className="inline-flex items-center gap-1 text-xs font-medium text-[#2ECC71]
          bg-[#2ECC71]/10 rounded-full px-2 py-0.5">
          #{tag}
          <button onClick={() => onChange(tags.filter(t => t !== tag))} className="hover:text-red-400 transition-colors">
            <X size={10} />
          </button>
        </span>
      ))}
      {tags.length < maxTags && (
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => { if (input) addTag(input); }}
          placeholder={tags.length === 0 ? '#receita #semana1 …' : '+ tag'}
          className="flex-1 min-w-[80px] bg-transparent text-sm text-gray-700 dark:text-gray-200
            placeholder-gray-400 outline-none"
        />
      )}
    </div>
  );
};
