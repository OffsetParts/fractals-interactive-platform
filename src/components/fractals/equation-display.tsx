'use client';

import React from 'react';

interface EquationDisplayProps {
  fractalType: string;
  julia?: { re: number; im: number };
}

const FRACTAL_EQUATIONS: Record<string, string> = {
  mandelbrot: 'z ← z² + c',
  julia: 'z ← z² + c',
  burningship: 'z ← |Re(z)|² + |Im(z)|² + c',
  newton: 'z ← z - f(z)/f\'(z)',
  tricorn: 'z ← conj(z)² + c',
  lyapunov: 'λ(a,b) = lim E[(log|dx/dθ|)]',
  ifs: 'p ← T(p) where T ∈ {T₁,T₂,...,Tₙ}',
  custom: 'Custom equation'
};

export const EquationDisplay: React.FC<EquationDisplayProps> = ({ fractalType, julia }) => {
  let equation = FRACTAL_EQUATIONS[fractalType] || 'Unknown';

  // Show Julia parameters if available
  if (fractalType === 'julia' && julia) {
    const reStr = julia.re >= 0 ? `+${julia.re.toFixed(4)}` : `${julia.re.toFixed(4)}`;
    const imStr = julia.im >= 0 ? `+${julia.im.toFixed(4)}i` : `${julia.im.toFixed(4)}i`;
    equation = `z ← z² + (${reStr.replace('+', '')} ${imStr})`;
  }

  return (
    <div className="bg-gradient-to-r from-purple-900/40 to-blue-900/40 border border-purple-700/50 rounded-lg p-3 backdrop-blur-sm">
      <div className="text-xs text-purple-300 font-semibold mb-1">Equation</div>
      <div className="text-sm font-mono text-purple-100">{equation}</div>
    </div>
  );
};
