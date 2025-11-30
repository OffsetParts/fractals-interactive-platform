import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode;
  variant?: 'default' | 'primary' | 'secondary' | 'ghost' | 'outline' | 'destructive' | 'success';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  glow?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className = '', 
    variant = 'default',
    size = 'md',
    glow = false,
    disabled = false,
    ...props 
  }, ref) => {
    const baseClasses = 'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-200 cursor-pointer border';
    
    const variantClasses = {
      default: 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white border-white/10 hover:from-cyan-400 hover:to-blue-500 disabled:from-gray-500 disabled:to-gray-600',
      primary: 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white border-white/10 hover:from-cyan-400 hover:to-blue-500 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 disabled:from-gray-500 disabled:to-gray-600',
      secondary: 'bg-slate-800/60 text-slate-300 border-slate-600/50 hover:bg-slate-700/60 hover:text-white hover:border-slate-500/50 disabled:bg-slate-800/30 disabled:text-slate-500',
      ghost: 'bg-transparent text-slate-400 border-transparent hover:bg-slate-800/50 hover:text-white disabled:text-slate-600',
      outline: 'bg-transparent text-cyan-400 border-cyan-500/50 hover:bg-cyan-500/10 hover:border-cyan-400/70 disabled:text-slate-500 disabled:border-slate-600',
      destructive: 'bg-gradient-to-br from-red-500 to-red-600 text-white border-white/10 hover:from-red-400 hover:to-red-500 shadow-lg shadow-red-500/25 disabled:from-gray-500 disabled:to-gray-600',
      success: 'bg-gradient-to-br from-green-500 to-green-600 text-white border-white/10 hover:from-green-400 hover:to-green-500 shadow-lg shadow-green-500/25 disabled:from-gray-500 disabled:to-gray-600'
    };

    const sizeClasses = {
      xs: 'px-2 py-1 text-xs',
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base'
    };

    const glowClass = glow ? 'animate-pulse-glow' : '';

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${glowClass} ${className}`}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
