import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'cyan' | 'purple' | 'pink' | 'green' | 'amber' | 'destructive';
  size?: 'sm' | 'md';
  glow?: boolean;
  children?: React.ReactNode;
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className = '', variant = 'default', size = 'md', glow = false, ...props }, ref) => {
    const baseClasses = 'inline-flex items-center font-medium rounded-full border transition-all duration-200';
    
    const variantClasses = {
      default: 'bg-slate-800/60 text-slate-300 border-slate-600/50',
      cyan: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
      purple: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
      pink: 'bg-pink-500/15 text-pink-400 border-pink-500/30',
      green: 'bg-green-500/15 text-green-400 border-green-500/30',
      amber: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      destructive: 'bg-red-500/15 text-red-400 border-red-500/30'
    };

    const sizeClasses = {
      sm: 'px-2 py-0.5 text-[10px]',
      md: 'px-3 py-1 text-xs'
    };

    const glowClasses = {
      default: '',
      cyan: glow ? 'shadow-sm shadow-cyan-500/30' : '',
      purple: glow ? 'shadow-sm shadow-purple-500/30' : '',
      pink: glow ? 'shadow-sm shadow-pink-500/30' : '',
      green: glow ? 'shadow-sm shadow-green-500/30' : '',
      amber: glow ? 'shadow-sm shadow-amber-500/30' : '',
      destructive: glow ? 'shadow-sm shadow-red-500/30' : ''
    };

    return (
      <span
        ref={ref}
        className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${glowClasses[variant]} ${className}`}
        {...props}
      />
    );
  }
);
Badge.displayName = 'Badge';
