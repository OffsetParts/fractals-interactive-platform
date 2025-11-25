import type { BinaryOpNode, ExpressionNode, FunctionCallNode, ModulusNode, NumberNode, UnaryOpNode, VariableNode } from './equation-ast';

function emitExpression(node: ExpressionNode): string {
  switch (node.type) {
    case 'Variable': {
      const v = node as VariableNode;
      if (v.name === 'z') return 'z';
      if (v.name === 'c') return 'c';
      if (v.name === 'n') return 'uPower';
      throw new Error('Unsupported variable: ' + v.name);
    }
    case 'NumberLiteral': {
      const n = (node as NumberNode).value;
      if (Number.isInteger(n)) {
        return n.toFixed(1); // 2 -> "2.0"
      }
      return String(n);
    }
    case 'UnaryOp': {
      const u = node as UnaryOpNode;
      const inner = emitExpression(u.value);
      if (u.operator === '-') {
        return `-(${inner})`;
      }
      return inner;
    }
    case 'BinaryOp': {
      const b = node as BinaryOpNode;
      const left = emitExpression(b.left);
      const right = emitExpression(b.right);
      switch (b.operator) {
        case '+':
          return `(${left}) + (${right})`;
        case '-':
          return `(${left}) - (${right})`;
        case '*':
          return `cmul((${left}), (${right}))`;
        case '/':
          return `cdiv((${left}), (${right}))`;
        case '^':
          return `cpow((${left}), (${right}))`;
        default:
          throw new Error('Unsupported binary operator: ' + b.operator);
      }
    }
    case 'FunctionCall': {
      const f = node as FunctionCallNode;
      const arg = emitExpression(f.argument);
      if (f.name === 'abs') {
        // Burning-ship style abs on components
        return `vec2(abs((${arg}).x), abs((${arg}).y))`;
      }
      if (f.name === 'conj') {
        return `vec2((${arg}).x, -(${arg}).y)`;
      }
      throw new Error('Unsupported function: ' + f.name);
    }
    case 'Modulus': {
      const m = node as ModulusNode;
      const inner = emitExpression(m.value);
      // |z| sugar maps to abs(z) behavior above
      return `vec2(abs((${inner}).x), abs((${inner}).y))`;
    }
    default:
      // Exhaustiveness check
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _never: never = node as never;
      throw new Error('Unknown AST node type');
  }
}

export function emitGlsl(expr: ExpressionNode): string {
  return emitExpression(expr);
}
