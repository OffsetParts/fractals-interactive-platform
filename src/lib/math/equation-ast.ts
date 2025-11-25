export type VariableName = 'z' | 'c' | 'n';

export interface AstNodeBase {
  type: string;
}

export interface VariableNode extends AstNodeBase {
  type: 'Variable';
  name: VariableName;
}

export interface NumberNode extends AstNodeBase {
  type: 'NumberLiteral';
  value: number;
}

export type BinaryOperator = '+' | '-' | '*' | '/' | '^';

export interface BinaryOpNode extends AstNodeBase {
  type: 'BinaryOp';
  operator: BinaryOperator;
  left: ExpressionNode;
  right: ExpressionNode;
}

export type UnaryOperator = '+' | '-';

export interface UnaryOpNode extends AstNodeBase {
  type: 'UnaryOp';
  operator: UnaryOperator;
  value: ExpressionNode;
}

export type FunctionName = 'abs' | 'conj';

export interface FunctionCallNode extends AstNodeBase {
  type: 'FunctionCall';
  name: FunctionName;
  argument: ExpressionNode;
}

export interface ModulusNode extends AstNodeBase {
  type: 'Modulus';
  value: ExpressionNode;
}

export type ExpressionNode =
  | VariableNode
  | NumberNode
  | BinaryOpNode
  | UnaryOpNode
  | FunctionCallNode
  | ModulusNode;
