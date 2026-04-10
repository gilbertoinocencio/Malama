import React, { useState, useRef, useEffect } from 'react';
import { searchUsers, type ProfileSummary } from '../../../services/communityService';

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onSubmit?: () => void;
  disabled?: boolean;
}

export const MentionInput: React.FC<MentionInputProps> = ({
  value,
  onChange,
  placeholder = 'Adicione um comentário…',
  onSubmit,
  disabled,
}) => {
  const [suggestions, setSuggestions] = useState<ProfileSummary[]>([]);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    onChange(v);

    // Detect @mention
    const cursor = e.target.selectionStart ?? 0;
    const textBefore = v.slice(0, cursor);
    const match = textBefore.match(/@([\wÀ-ú]*)$/);
    if (match) {
      const q = match[1];
      setMentionQuery(q);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        if (q.length >= 1) searchUsers(q, 5).then(setSuggestions);
        else setSuggestions([]);
      }, 300);
    } else {
      setMentionQuery(null);
      setSuggestions([]);
    }
  };

  const handleSelect = (user: ProfileSummary) => {
    const cursor = textareaRef.current?.selectionStart ?? value.length;
    const textBefore = value.slice(0, cursor);
    const textAfter = value.slice(cursor);
    const replaced = textBefore.replace(/@[\wÀ-ú]*$/, `@${user.display_name} `);
    onChange(replaced + textAfter);
    setSuggestions([]);
    setMentionQuery(null);
    textareaRef.current?.focus();
  };

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  return (
    <div className="relative">
      {suggestions.length > 0 && mentionQuery !== null && (
        <div className="absolute bottom-full left-0 right-0 mb-1 bg-white dark:bg-gray-800 border
          border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden z-20">
          {suggestions.map(u => (
            <button
              key={u.id}
              onMouseDown={e => { e.preventDefault(); handleSelect(u); }}
              className="flex items-center gap-2 w-full px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              {u.avatar_url ? (
                <img src={u.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-[#2ECC71]/20 flex items-center justify-center text-[#2ECC71] text-xs font-bold">
                  {u.display_name[0]?.toUpperCase()}
                </div>
              )}
              <span className="text-sm text-gray-800 dark:text-gray-200">@{u.display_name}</span>
            </button>
          ))}
        </div>
      )}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        rows={2}
        onKeyDown={e => {
          if (e.key === 'Enter' && !e.shiftKey && onSubmit) { e.preventDefault(); onSubmit(); }
        }}
        className="w-full text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700
          rounded-xl px-3 py-2 resize-none outline-none focus:ring-2 focus:ring-[#2ECC71]/40
          text-gray-800 dark:text-gray-200 placeholder-gray-400 disabled:opacity-50"
      />
    </div>
  );
};
