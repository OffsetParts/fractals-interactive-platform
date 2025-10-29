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
 * Evaluate complex number equation
 */
export function evaluateComplexEquation(
  z: { re: number; im: number },
  c: { re: number; im: number },
  equation: string
): { re: number; im: number } | null {
  try {
    // Replace variables with actual values
    let expr = equation
      .replace(/z/g, `({re: ${z.re}, im: ${z.im}})`)
      .replace(/c/g, `({re: ${c.re}, im: ${c.im}})`);

    // Handle complex operations
    expr = expr.replace(/\*\*/g, '**');

    // Create function and evaluate
    const fn = new Function('z', 'c', 'return ' + expr);
    const result = fn(z, c);

    if (typeof result === 'object' && result.re !== undefined && result.im !== undefined) {
      return result;
    }

    return null;
  } catch {
    return null;
  }
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
