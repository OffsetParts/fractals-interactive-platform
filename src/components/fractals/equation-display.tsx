'use client';

import React, { useMemo } from 'react';
import { InlineMath } from 'react-katex';
import 'katex/dist/katex.min.css';
import { ParsedEquation, validateEquationSyntax } from '@/lib/math/equation-parser';

interface EquationDisplayProps {
  equation: string;
  onEquationChange: (equation: string) => void;
  parsed: ParsedEquation | null;
  power?: number;
  onPowerChange?: (n: number) => void;
}

/**
 * Convert simple equation notation to LaTeX math notation
 * z**2 -> z^2, etc.
 */
function equationToLatex(eq: string): string {
  if (!eq) return '';
  
  // First, normalize the input by handling common patterns
  const latex = eq
    // Replace ** with ^ for powers
    .replace(/\*\*/g, '^')
    // Wrap multi-digit or complex powers in braces
    .replace(/\^([a-zA-Z0-9]{2,}|\{[^}]+\})/g, '^{$1}')
    // Replace common functions with proper LaTeX BEFORE general replacements
    .replace(/abs\s*\(\s*([^)]+)\s*\)/g, '\\left|$1\\right|')
    .replace(/conj\s*\(\s*([^)]+)\s*\)/g, '\\overline{$1}')
    .replace(/sqrt\s*\(\s*([^)]+)\s*\)/g, '\\sqrt{$1}')
    .replace(/sin\s*\(\s*([^)]+)\s*\)/g, '\\sin($1)')
    .replace(/cos\s*\(\s*([^)]+)\s*\)/g, '\\cos($1)')
    .replace(/tan\s*\(\s*([^)]+)\s*\)/g, '\\tan($1)')
    .replace(/exp\s*\(\s*([^)]+)\s*\)/g, 'e^{$1}')
    .replace(/log\s*\(\s*([^)]+)\s*\)/g, '\\log($1)')
    .replace(/ln\s*\(\s*([^)]+)\s*\)/g, '\\ln($1)')
    // Clean up spacing around operators
    .replace(/\s*\+\s*/g, ' + ')
    .replace(/\s*-\s*/g, ' - ')
    .replace(/\s*\/\s*/g, ' \\div ');

  return latex;
}

export const EquationDisplay: React.FC<EquationDisplayProps> = ({
  equation,
  onEquationChange,
  parsed,
  power,
  onPowerChange
}) => {
  const latexEquation = useMemo(() => equationToLatex(equation), [equation]);
  const validation = useMemo(() => validateEquationSyntax(equation), [equation]);

  return (
    <div className="bg-linear-to-r from-purple-900/30 to-cyan-900/30 border border-purple-500/30 rounded-lg p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-300">Equation:</label>
        <div className="flex items-center gap-3">
          {parsed && (
            <div className="text-xs text-cyan-400">
              Variables: {parsed.variables.map((v) => v.symbol).join(', ')}
            </div>
          )}
          <div className={`text-xs px-2 py-0.5 rounded border ${validation.ok ? 'border-green-600 text-green-400' : 'border-red-600 text-red-400'}`}>
            {validation.ok ? 'Valid' : validation.message || 'Invalid'}
          </div>
        </div>
      </div>

      {/* Equation + quick n control */}
      <div className="flex items-center gap-3">
        <input
          type="text"
          value={equation}
          onChange={(e) => onEquationChange(e.target.value)}
          placeholder="e.g., z^n + c, sin(z^n)+c"
          className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm font-mono focus:outline-none focus:border-cyan-500 transition"
        />
        {onPowerChange && (
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-300" title="Exponent n used in z^n or (expr)^n">n</label>
            <input
              type="number"
              step="0.01"
              min={0.1}
              max={16}
              value={power ?? 2}
              onChange={(e) => onPowerChange(parseFloat(e.target.value))}
              className="w-20 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white text-xs font-mono focus:outline-none focus:border-cyan-500"
            />
          </div>
        )}
      </div>

      {/* LaTeX rendered equation */}
      {equation && (
        <div className="bg-black/50 rounded border border-purple-500/30 overflow-hidden">
          <div className="flex items-center justify-center min-h-14">
            <div style={{ fontSize: '1.5rem', color: '#fff' }}>
              <InlineMath math={latexEquation} />
            </div>
          </div>
        </div>
      )}

      {/* Help text */}
      <p className="text-xs text-gray-400">
        Supports powers with ^ or **, including z^n, (expr)^n, |z|^n, abs(z)^n, conj(z)^n. Functions accept implicit application: <code>sin z^n</code>, <code>imag z</code> → add parentheses automatically.
      </p>
    </div>
  );
};
