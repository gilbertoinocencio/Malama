import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input: React.FC<InputProps> = ({ label, className = '', ...props }) => {
  return (
    <div className="flex flex-col gap-2 w-full">
      {label && <label className="text-sm font-medium text-nura-brown dark:text-nura-stone ml-1">{label}</label>}
      <input
        className={`w-full bg-white dark:bg-nura-black/50 border border-nura-stone/30 dark:border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-1 focus:ring-nura-petroleum dark:focus:ring-nura-neon text-nura-brown dark:text-white placeholder-nura-brown/40 dark:placeholder-white/30 transition-all ${className}`}
        {...props}
      />
    </div>
  );
};