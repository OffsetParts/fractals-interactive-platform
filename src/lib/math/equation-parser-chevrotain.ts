import { CstParser, IToken } from 'chevrotain';
import { EquationLexer, allTokens, Plus, Minus, Star, Slash, Caret, LParen, RParen, Pipe, NumberLiteral, Identifier } from './equation-tokens';
import type { ExpressionNode, BinaryOperator, FunctionName, VariableName } from './equation-ast';

class EquationCstParser extends CstParser {
  constructor() {
    super(allTokens, { recoveryEnabled: false });
    this.performSelfAnalysis();
  }

  public expression = this.RULE('expression', () => {
    this.SUBRULE(this.additionExpression);
  });

  private additionExpression = this.RULE('additionExpression', () => {
    this.SUBRULE(this.multiplicationExpression, { LABEL: 'lhs' });
    this.MANY(() => {
      this.OR([
        { ALT: () => this.CONSUME(Plus, { LABEL: 'opPlus' }) },
        { ALT: () => this.CONSUME(Minus, { LABEL: 'opMinus' }) }
      ]);
      this.SUBRULE2(this.multiplicationExpression, { LABEL: 'rhs' });
    });
  });

  private multiplicationExpression = this.RULE('multiplicationExpression', () => {
    this.SUBRULE(this.powerExpression, { LABEL: 'lhs' });
    this.MANY(() => {
      this.OR([
        { ALT: () => this.CONSUME(Star, { LABEL: 'opStar' }) },
        { ALT: () => this.CONSUME(Slash, { LABEL: 'opSlash' }) }
      ]);
      this.SUBRULE2(this.powerExpression, { LABEL: 'rhs' });
    });
  });

  private powerExpression = this.RULE('powerExpression', () => {
    this.SUBRULE(this.unaryExpression, { LABEL: 'base' });
    this.MANY(() => {
      this.CONSUME1(Caret, { LABEL: 'opCaret' });
      this.SUBRULE2(this.unaryExpression, { LABEL: 'exponent' });
    });
  });

  private unaryExpression = this.RULE('unaryExpression', () => {
    this.MANY(() => {
      this.OR([
        { ALT: () => this.CONSUME(Plus, { LABEL: 'opPlus' }) },
        { ALT: () => this.CONSUME(Minus, { LABEL: 'opMinus' }) }
      ]);
    });
    this.SUBRULE(this.primary, { LABEL: 'value' });
  });

  private primary = this.RULE('primary', () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.parenthesizedExpression) },
      { ALT: () => this.SUBRULE(this.functionCall) },
      { ALT: () => this.SUBRULE(this.modulus) },
      { ALT: () => this.CONSUME(NumberLiteral) },
      { ALT: () => this.CONSUME(Identifier) }
    ]);
  });

  private parenthesizedExpression = this.RULE('parenthesizedExpression', () => {
    this.CONSUME(LParen);
    this.SUBRULE(this.expression);
    this.CONSUME(RParen);
  });

  private functionCall = this.RULE('functionCall', () => {
    this.CONSUME(Identifier, { LABEL: 'fn' });
    this.CONSUME(LParen);
    this.SUBRULE(this.expression, { LABEL: 'arg' });
    this.CONSUME(RParen);
  });

  private modulus = this.RULE('modulus', () => {
    this.CONSUME(Pipe);
    this.SUBRULE(this.expression, { LABEL: 'inner' });
    this.CONSUME2(Pipe);
  });
}

const parserInstance = new EquationCstParser();

export function parseEquationToAst(input: string): ExpressionNode {
  const lexResult = EquationLexer.tokenize(input);

  if (lexResult.errors.length) {
    throw new Error('Lexing errors detected: ' + lexResult.errors.map(e => e.message).join('; '));
  }

  parserInstance.input = lexResult.tokens as IToken[];
  parserInstance.expression();

  if (parserInstance.errors.length) {
    throw new Error('Parsing errors detected: ' + parserInstance.errors.map(e => e.message).join('; '));
  }

  // Simple CST-to-AST conversion for the current grammar.
  // For now we re-tokenize using a manual recursive descent over the token stream
  // to keep the implementation compact and aligned with our ExpressionNode types.

  let index = 0;
  const tokens = lexResult.tokens as IToken[];

  function peek(offset = 0): IToken | undefined {
    return tokens[index + offset];
  }

  function consume(): IToken {
    const t = tokens[index];
    index += 1;
    return t;
  }

  function parsePrimary(): ExpressionNode {
    const t = peek();
    if (!t) throw new Error('Unexpected end of input');

    if (t.tokenType === NumberLiteral) {
      consume();
      return { type: 'NumberLiteral', value: parseFloat(t.image) };
    }

    if (t.tokenType === Identifier) {
      consume();
      const name = t.image.toLowerCase();
      if (name === 'z' || name === 'c' || name === 'n') {
        return { type: 'Variable', name: name as VariableName };
      }
      if (name === 'abs' || name === 'conj') {
        // function call style: abs(expr) / conj(expr)
        const fnName = name as FunctionName;
        const next = peek();
        if (!next || next.tokenType !== LParen) {
          throw new Error('Expected ( after function name ' + name);
        }
        consume(); // LParen
        const arg = parseExpression();
        const rparen = peek();
        if (!rparen || rparen.tokenType !== RParen) {
          throw new Error('Expected ) after function argument');
        }
        consume();
        return { type: 'FunctionCall', name: fnName, argument: arg };
      }
      throw new Error('Unknown identifier: ' + t.image);
    }

    if (t.tokenType === LParen) {
      consume();
      const expr = parseExpression();
      const rparen = peek();
      if (!rparen || rparen.tokenType !== RParen) {
        throw new Error('Expected )');
      }
      consume();
      return expr;
    }

    if (t.tokenType === Pipe) {
      consume();
      const inner = parseExpression();
      const closing = peek();
      if (!closing || closing.tokenType !== Pipe) {
        throw new Error('Expected closing | for modulus');
      }
      consume();
      return { type: 'Modulus', value: inner };
    }

    throw new Error('Unexpected token: ' + t.image);
  }

  function parseUnary(): ExpressionNode {
    let sign: '-' | '+' | null = null;
    while (true) {
      const t = peek();
      if (!t) break;
      if (t.tokenType === Plus) {
        consume();
        if (sign === null) sign = '+';
      } else if (t.tokenType === Minus) {
        consume();
        sign = sign === '-' ? '+' : '-';
      } else {
        break;
      }
    }
    const value = parsePrimary();
    if (sign && sign === '-') {
      return { type: 'UnaryOp', operator: '-', value };
    }
    return value;
  }

  function parsePower(): ExpressionNode {
    let base = parseUnary();
    while (true) {
      const t = peek();
      if (t && t.tokenType === Caret) {
        consume();
        const exponent = parseUnary();
        base = { type: 'BinaryOp', operator: '^', left: base, right: exponent };
      } else {
        break;
      }
    }
    return base;
  }

  function parseMultiplication(): ExpressionNode {
    let left = parsePower();
    while (true) {
      const t = peek();
      if (t && (t.tokenType === Star || t.tokenType === Slash)) {
        consume();
        const op: BinaryOperator = t.tokenType === Star ? '*' : '/';
        const right = parsePower();
        left = { type: 'BinaryOp', operator: op, left, right };
      } else {
        break;
      }
    }
    return left;
  }

  function parseExpression(): ExpressionNode {
    let left = parseMultiplication();
    while (true) {
      const t = peek();
      if (t && (t.tokenType === Plus || t.tokenType === Minus)) {
        consume();
        const op: BinaryOperator = t.tokenType === Plus ? '+' : '-';
        const right = parseMultiplication();
        left = { type: 'BinaryOp', operator: op, left, right };
      } else {
        break;
      }
    }
    return left;
  }

  const ast = parseExpression();
  if (index < tokens.length) {
    throw new Error('Unexpected token at end: ' + tokens[index].image);
  }

  return ast;
}
