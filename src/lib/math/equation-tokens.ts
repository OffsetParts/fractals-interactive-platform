import { createToken, Lexer } from 'chevrotain';

export const WhiteSpace = createToken({ name: 'WhiteSpace', pattern: /[ \t\n\r]+/, group: Lexer.SKIPPED });

export const Plus = createToken({ name: 'Plus', pattern: /\+/ });
export const Minus = createToken({ name: 'Minus', pattern: /-/ });
export const Star = createToken({ name: 'Star', pattern: /\*/ });
export const Slash = createToken({ name: 'Slash', pattern: /\// });
export const Caret = createToken({ name: 'Caret', pattern: /\^/ });

export const LParen = createToken({ name: 'LParen', pattern: /\(/ });
export const RParen = createToken({ name: 'RParen', pattern: /\)/ });
export const Pipe = createToken({ name: 'Pipe', pattern: /\|/ });

export const Comma = createToken({ name: 'Comma', pattern: /,/ });

export const NumberLiteral = createToken({
  name: 'NumberLiteral',
  // Simple number pattern: 1, 1.5, .5, 1., with optional leading sign handled in parser
  pattern: /(?:\d+\.\d*|\d*\.\d+|\d+)/
});

export const Identifier = createToken({
  name: 'Identifier',
  pattern: /[a-zA-Z_][a-zA-Z0-9_]*/
});

export const allTokens = [
  WhiteSpace,
  Plus,
  Minus,
  Star,
  Slash,
  Caret,
  LParen,
  RParen,
  Pipe,
  Comma,
  NumberLiteral,
  Identifier
];

export const EquationLexer = new Lexer(allTokens);
