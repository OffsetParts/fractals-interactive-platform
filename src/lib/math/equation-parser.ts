/**
 * Minimal equation parser for fractal equations
 */

export interface EquationVariable {
  name: string;
  symbol: string;
  min: number;
  max: number;
  default: number;
  type: 'complex' | 'real' | 'integer';
}

export interface ParsedEquation {
  latex: string;
  variables: EquationVariable[];
  raw: string;
}

/**
 * Simple equation syntax validation
 */
export function validateEquationSyntax(equation: string): { ok: boolean; message?: string } {
  const eq = equation.trim();
  if (!eq) return { ok: false, message: 'Empty equation' };
  
  // Check for balanced parentheses
  let depth = 0;
  for (const char of eq) {
    if (char === '(') depth++;
    if (char === ')') depth--;
    if (depth < 0) return { ok: false, message: 'Unbalanced parentheses' };
  }
  if (depth !== 0) return { ok: false, message: 'Unbalanced parentheses' };
  
  return { ok: true };
}

/**
 * Parse a simple equation string
 */
export function parseEquation(equation: string): ParsedEquation {
  const raw = equation.trim();
  
  // Convert to simple LaTeX
  const latex = raw
    .replace(/\*\*/g, '^')
    .replace(/\*/g, ' \\cdot ')
    .replace(/z_n/g, 'z_n')
    .replace(/z_0/g, 'z_0');
  
  // Detect basic variables
  const variables: EquationVariable[] = [];
  
  if (raw.includes('c') || raw.includes('C')) {
    variables.push({
      name: 'c',
      symbol: 'c',
      min: -2,
      max: 2,
      default: 0,
      type: 'complex'
    });
  }
  
  if (raw.includes('x') || raw.includes('X')) {
    variables.push({
      name: 'x',
      symbol: 'x',
      min: 1,
      max: 5,
      default: 2,
      type: 'real'
    });
  }
  
  return { latex, variables, raw };
}
