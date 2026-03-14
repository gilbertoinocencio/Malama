import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'icon';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  fullWidth = false, 
  className = '', 
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center rounded-2xl font-medium transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-nura-brown text-nura-offwhite hover:bg-opacity-90 dark:bg-nura-neon dark:text-black",
    secondary: "bg-nura-petroleum text-white hover:bg-opacity-90 dark:bg-nura-cyan dark:text-black",
    ghost: "bg-transparent text-nura-brown hover:bg-black/5 dark:text-nura-offwhite dark:hover:bg-white/10",
    icon: "p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10"
  };

  const width = fullWidth ? "w-full py-4" : "px-6 py-3";

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${width} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};