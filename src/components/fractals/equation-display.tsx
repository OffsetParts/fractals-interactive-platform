'use client';

import React, { useMemo } from 'react';
import { InlineMath } from 'react-katex';
import 'katex/dist/katex.min.css';
import { ParsedEquation } from '@/lib/math/equation-parser';

interface EquationDisplayProps {
  equation: string;
  onEquationChange: (equation: string) => void;
  parsed: ParsedEquation | null;
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
  parsed
}) => {
  const latexEquation = useMemo(() => equationToLatex(equation), [equation]);

  return (
    <div className="bg-gradient-to-r from-purple-900/30 to-cyan-900/30 border border-purple-500/30 rounded-lg p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-300">Equation:</label>
        {parsed && (
          <div className="text-xs text-cyan-400">
            Variables: {parsed.variables.map((v) => v.symbol).join(', ')}
          </div>
        )}
      </div>

      {/* Input box */}
      <input
        type="text"
        value={equation}
        onChange={(e) => onEquationChange(e.target.value)}
        placeholder="e.g., z**2 + c"
        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm font-mono focus:outline-none focus:border-cyan-500 transition"
      />

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
        Examples: z**2+c, z**3+c, abs(z)**2+c, conj(z)**2+c
      </p>
    </div>
  );
};
