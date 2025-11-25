/**
 * Mathematical Equation Parser
 * Detects variables, generates LaTeX, and enables custom fractal equations
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
 * Parse mathematical equation and automatically detect parameters
 */
export function parseEquation(equation: string): ParsedEquation {
  const normalized = normalizeEquation(equation);
  const variables = detectVariables(normalized);
  const classifiedVariables = classifyVariables(variables);
  const latex = equationToLatex(normalized);

  return {
    latex,
    variables: classifiedVariables,
    raw: normalized
  };
}

/**
 * Lightweight syntax validation for equation input
 * - Balanced parentheses and even number of '|'
 * - Allowed characters only
 * - Detect obviously invalid operator runs
 */
export function validateEquationSyntax(equation: string): { ok: boolean; message?: string } {
  const eq = equation.trim();
  if (!eq) return { ok: false, message: 'Empty equation' };

  // Allowed characters (ASCII operators, letters, digits, spaces, pipes, comma, dot)
  if (!/^[0-9a-zA-Z_\s+\-*/^().,|]+$/.test(eq)) {
    return { ok: false, message: 'Contains disallowed characters' };
  }

  // Balanced parentheses
  let depth = 0;
  for (const ch of eq) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (depth < 0) return { ok: false, message: 'Unbalanced parentheses' };
  }
  if (depth !== 0) return { ok: false, message: 'Unbalanced parentheses' };

  // Even number of pipes '|' (for forms like |z|)
  const pipeCount = (eq.match(/\|/g) || []).length;
  if (pipeCount % 2 !== 0) return { ok: false, message: 'Unmatched | delimiter' };

  // Basic invalid operator runs (e.g., +*, ***, ^^ not part of **)
  if (/([+\-*/^]{3,})/.test(eq)) {
    return { ok: false, message: 'Invalid operator sequence' };
  }
  if (/([+\-*/^])\s*\)/.test(eq)) {
    return { ok: false, message: 'Dangling operator before )' };
  }
  if (/\(\s*([+*/^])/.test(eq)) {
    return { ok: false, message: 'Dangling operator after (' };
  }

  // Accept common power notations: ^ and **
  // Quick sanity: if single ^ appears, ensure a base and exponent exist around it
  const carets = eq.match(/\^/g)?.length || 0;
  if (carets > 0 && !/(\S)\s*\^\s*(\w|\()/i.test(eq)) {
    return { ok: false, message: 'Invalid power syntax' };
  }

  return { ok: true };
}

/**
 * Normalize equation input (handle various formats)
 */
function normalizeEquation(eq: string): string {
  return eq
    .replace(/\^/g, '**')
    .replace(/÷/g, '/')
    .replace(/×/g, '*')
    .replace(/π/g, 'pi')
    .trim();
}

/**
 * Detect all variables in equation
 */
function detectVariables(equation: string): string[] {
  const variables = new Set<string>();
  const varRegex = /\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g;
  const knownFunctions = new Set([
    'sin', 'cos', 'tan', 'asin', 'acos', 'atan',
    'sinh', 'cosh', 'tanh', 'exp', 'log', 'ln', 'sqrt',
    'abs', 'floor', 'ceil', 'round', 'pow', 're', 'im',
    'conj', 'arg', 'pi', 'E'
  ]);

  let match;
  while ((match = varRegex.exec(equation)) !== null) {
    const varName = match[1];
    if (!knownFunctions.has(varName)) {
      variables.add(varName);
    }
  }

  return Array.from(variables).sort();
}

/**
 * Classify variables based on usage patterns
 */
function classifyVariables(variables: string[]): EquationVariable[] {
  return variables.map(name => {
    let type: 'complex' | 'real' | 'integer' = 'real';
    let min = -2;
    let max = 2;
    let defaultValue = 0;

    if (name === 'c' || name === 'z' || name === 'w') {
      type = 'complex';
      min = -2;
      max = 2;
      defaultValue = 0;
    } else if (name === 'n' || name === 'iter' || name === 'iterations') {
      type = 'integer';
      min = 1;
      max = 256;
      defaultValue = 50;
    } else if (name === 'x' || name === 'y') {
      type = 'real';
      min = -2;
      max = 2;
      defaultValue = 0;
    } else if (name === 'r' || name === 'radius') {
      type = 'real';
      min = 0;
      max = 4;
      defaultValue = 2;
    } else if (name === 'a' || name === 'b' || name === 'k' || name === 'p') {
      type = 'real';
      min = -2;
      max = 2;
      defaultValue = 0.5;
    } else if (name === 't' || name === 'time') {
      type = 'real';
      min = 0;
      max = 10;
      defaultValue = 0;
    }

    return {
      name,
      symbol: name,
      min,
      max,
      default: defaultValue,
      type
    };
  });
}

/**
 * Convert equation to LaTeX
 */
function equationToLatex(equation: string): string {
  let latex = equation;
  latex = latex.replace(/\*\*/g, '^');
  latex = latex.replace(/\^(\d+)/g, '^{$1}');
  latex = latex.replace(/\*/g, ' ');
  latex = latex.replace(/\b(sin|cos|tan|log|ln|sqrt|abs)\b/g, '\\mathrm{$1}');

  return latex;
}

/**
 * Evaluate complex number equation safely
 */
export function evaluateComplexEquation(
  z: { re: number; im: number },
  c: { re: number; im: number },
  equation: string
): { re: number; im: number } | null {
  try {
    type Complex = { re: number; im: number };
    type Num = number | Complex;

    // Build a safe evaluation context with complex operations
    const context = {
      z,
      c,
      // Complex arithmetic helpers
      add: (a: Num, b: Num): Complex => {
        if (typeof a === 'number') a = { re: a, im: 0 };
        if (typeof b === 'number') b = { re: b, im: 0 };
        return { re: a.re + b.re, im: a.im + b.im };
      },
      sub: (a: Num, b: Num): Complex => {
        if (typeof a === 'number') a = { re: a, im: 0 };
        if (typeof b === 'number') b = { re: b, im: 0 };
        return { re: a.re - b.re, im: a.im - b.im };
      },
      mul: (a: Num, b: Num): Complex => {
        if (typeof a === 'number') a = { re: a, im: 0 };
        if (typeof b === 'number') b = { re: b, im: 0 };
        return {
          re: a.re * b.re - a.im * b.im,
          im: a.re * b.im + a.im * b.re
        };
      },
      div: (a: Num, b: Num): Complex => {
        if (typeof a === 'number') a = { re: a, im: 0 };
        if (typeof b === 'number') b = { re: b, im: 0 };
        const denom = b.re * b.re + b.im * b.im;
        return {
          re: (a.re * b.re + a.im * b.im) / denom,
          im: (a.im * b.re - a.re * b.im) / denom
        };
      },
      pow: (base: Num, exp: number): Complex => {
        if (typeof base === 'number') base = { re: base, im: 0 };
        let result = { re: 1, im: 0 };
        for (let i = 0; i < exp; i++) {
          result = context.mul(result, base);
        }
        return result;
      },
      abs: (val: Num): number => {
        if (typeof val === 'number') return Math.abs(val);
        return Math.sqrt(val.re * val.re + val.im * val.im);
      },
      conj: (val: Num): Complex => {
        if (typeof val === 'number') return { re: val, im: 0 };
        return { re: val.re, im: -val.im };
      },
      sin: (val: Num): Complex => {
        if (typeof val === 'number') return { re: Math.sin(val), im: 0 };
        const exp_im = Math.exp(-val.im);
        const exp_neg_im = Math.exp(val.im);
        return {
          re: (exp_im - exp_neg_im) * Math.sin(val.re) / 2,
          im: (exp_im + exp_neg_im) * Math.cos(val.re) / 2
        };
      },
      cos: (val: Num): Complex => {
        if (typeof val === 'number') return { re: Math.cos(val), im: 0 };
        const exp_im = Math.exp(-val.im);
        const exp_neg_im = Math.exp(val.im);
        return {
          re: (exp_im + exp_neg_im) * Math.cos(val.re) / 2,
          im: (exp_neg_im - exp_im) * Math.sin(val.re) / 2
        };
      },
      exp: (val: Num): Complex => {
        if (typeof val === 'number') return { re: Math.exp(val), im: 0 };
        const exp_re = Math.exp(val.re);
        return {
          re: exp_re * Math.cos(val.im),
          im: exp_re * Math.sin(val.im)
        };
      }
    };

    // Handle common preset equations directly for efficiency
    if (equation === 'z**2 + c') {
      return context.add(context.pow(z, 2), c);
    }
    if (equation === 'z**3 + c') {
      return context.add(context.pow(z, 3), c);
    }
    if (equation === 'z**4 + c') {
      return context.add(context.pow(z, 4), c);
    }
    // Note: Burning Ship 'abs(z)**2 + c' is now handled in the render loop
    // by applying abs() to components before iteration, so we use standard evaluation
    if (equation === 'conj(z)**2 + c') {
      const conj_z = { re: z.re, im: -z.im };
      return context.add(context.pow(conj_z, 2), c);
    }

    // For other equations, try evaluation
    const fn = new Function(...Object.keys(context), 'return ' + equation);
    const result = fn(...Object.values(context));

    if (typeof result === 'object' && result.re !== undefined && result.im !== undefined) {
      return result;
    }

    return null;
  } catch (e) {
    console.error('Evaluation error:', e, 'Equation:', equation);
    return null;
  }
}

/**
 * Alias for evaluateComplexEquation for backward compatibility
 */
export function evaluateEquation(
  parsed: ParsedEquation,
  vars: { z: { re: number; im: number }; c: { re: number; im: number } }
): { re: number; im: number } | null {
  return evaluateComplexEquation(vars.z, vars.c, parsed.raw);
}

/**
 * Complex number helper functions
 */
export const Complex = {
  add: (a: { re: number; im: number }, b: { re: number; im: number }) => ({
    re: a.re + b.re,
    im: a.im + b.im
  }),

  sub: (a: { re: number; im: number }, b: { re: number; im: number }) => ({
    re: a.re - b.re,
    im: a.im - b.im
  }),

  mul: (a: { re: number; im: number }, b: { re: number; im: number }) => ({
    re: a.re * b.re - a.im * b.im,
    im: a.re * b.im + a.im * b.re
  }),

  div: (a: { re: number; im: number }, b: { re: number; im: number }) => {
    const denom = b.re * b.re + b.im * b.im;
    return {
      re: (a.re * b.re + a.im * b.im) / denom,
      im: (a.im * b.re - a.re * b.im) / denom
    };
  },

  magnitude: (z: { re: number; im: number }) => Math.sqrt(z.re ** 2 + z.im ** 2),

  square: (z: { re: number; im: number }) => ({
    re: z.re * z.re - z.im * z.im,
    im: 2 * z.re * z.im
  }),

  pow: (z: { re: number; im: number }, n: number) => {
    let result = { re: 1, im: 0 };
    for (let i = 0; i < n; i++) {
      result = Complex.mul(result, z);
    }
    return result;
  }
};
