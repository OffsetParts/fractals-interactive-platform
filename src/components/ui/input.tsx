import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: 'default' | 'ghost';
  error?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', variant = 'default', error = false, ...props }, ref) => {
    const baseClasses = 'w-full rounded-lg font-medium transition-all duration-200 focus:outline-none';
    
    const variantClasses = {
      default: 'px-4 py-2 bg-slate-900/60 border border-slate-600/50 text-white placeholder-slate-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20',
      ghost: 'px-3 py-1.5 bg-transparent border border-transparent text-white placeholder-slate-500 hover:bg-slate-800/50 focus:bg-slate-800/50 focus:border-slate-600'
    };

    const errorClasses = error 
      ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20' 
      : '';

    return (
      <input
        ref={ref}
        className={`${baseClasses} ${variantClasses[variant]} ${errorClasses} ${className}`}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

// Number input with stepper styling
export interface NumberInputProps extends Omit<InputProps, 'type'> {
  min?: number;
  max?: number;
  step?: number;
}

export const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  ({ className = '', ...props }, ref) => (
    <Input
      ref={ref}
      type="number"
      className={`font-mono text-cyan-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${className}`}
      {...props}
    />
  )
);
NumberInput.displayName = 'NumberInput';
