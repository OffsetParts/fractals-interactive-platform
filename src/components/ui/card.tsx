import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  variant?: 'default' | 'elevated' | 'bordered';
  glow?: 'none' | 'cyan' | 'purple' | 'pink';
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className = '', variant = 'default', glow = 'none', ...props }, ref) => {
    const baseClasses = 'rounded-xl overflow-hidden transition-all duration-300';
    
    const variantClasses = {
      default: 'bg-gradient-to-br from-slate-900/90 via-slate-800/80 to-slate-900/95 backdrop-blur-xl border border-slate-700/50',
      elevated: 'bg-gradient-to-br from-slate-900/95 via-indigo-900/20 to-slate-900/98 backdrop-blur-xl border border-slate-600/30 shadow-2xl shadow-black/50',
      bordered: 'bg-slate-900/60 backdrop-blur-md border-2 border-gradient'
    };

    const glowClasses = {
      none: '',
      cyan: 'shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30',
      purple: 'shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30',
      pink: 'shadow-lg shadow-pink-500/20 hover:shadow-pink-500/30'
    };

    return (
      <div
        ref={ref}
        className={`${baseClasses} ${variantClasses[variant]} ${glowClasses[glow]} ${className}`}
        {...props}
      />
    );
  }
);
Card.displayName = 'Card';

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  accent?: 'none' | 'gradient' | 'cyan' | 'purple' | 'pink';
}

export const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className = '', accent = 'gradient', ...props }, ref) => {
    const accentClasses = {
      none: 'border-b border-slate-700/50',
      gradient: 'bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-pink-500/10 border-b border-slate-700/30',
      cyan: 'bg-gradient-to-r from-cyan-500/15 to-transparent border-b border-cyan-500/20',
      purple: 'bg-gradient-to-r from-purple-500/15 to-transparent border-b border-purple-500/20',
      pink: 'bg-gradient-to-r from-pink-500/15 to-transparent border-b border-pink-500/20'
    };

    return (
      <div
        ref={ref}
        className={`flex flex-col gap-1.5 p-4 ${accentClasses[accent]} ${className}`}
        {...props}
      />
    );
  }
);
CardHeader.displayName = 'CardHeader';

export interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children?: React.ReactNode;
  gradient?: boolean;
}

export const CardTitle = React.forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className = '', gradient = false, ...props }, ref) => (
    <h3
      ref={ref}
      className={`text-lg font-semibold leading-none tracking-tight ${gradient ? 'text-gradient' : 'text-white'} ${className}`}
      {...props}
    />
  )
);
CardTitle.displayName = 'CardTitle';

export interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children?: React.ReactNode;
}

export const CardDescription = React.forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ className = '', ...props }, ref) => (
    <p
      ref={ref}
      className={`text-sm text-slate-400 ${className}`}
      {...props}
    />
  )
);
CardDescription.displayName = 'CardDescription';

export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

export const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ className = '', ...props }, ref) => (
    <div ref={ref} className={`p-4 ${className}`} {...props} />
  )
);
CardContent.displayName = 'CardContent';

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

export const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className = '', ...props }, ref) => (
    <div
      ref={ref}
      className={`flex items-center gap-3 p-4 border-t border-slate-700/30 bg-slate-900/30 ${className}`}
      {...props}
    />
  )
);
CardFooter.displayName = 'CardFooter';
