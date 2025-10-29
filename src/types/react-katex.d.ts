declare module 'react-katex' {
  import { Component, ReactNode } from 'react';

  interface KatexOptions {
    displayMode?: boolean;
    output?: 'html' | 'mathml' | 'htmlAndMathml';
    leqno?: boolean;
    fleqn?: boolean;
    throwOnError?: boolean;
    errorColor?: string;
    macros?: Record<string, string>;
    minRuleThickness?: number;
    colorIsTextColor?: boolean;
    maxSize?: number;
    maxExpand?: number;
    strict?: boolean | string | ((errorCode: string) => boolean);
    trust?: boolean | ((context: Record<string, unknown>) => boolean);
    globalGroup?: boolean;
  }

  interface MathProps {
    children?: ReactNode;
    math?: string;
    block?: boolean;
    errorColor?: string;
    renderError?: (error: Error) => ReactNode;
    settings?: KatexOptions;
  }

  export class InlineMath extends Component<MathProps> {}
  export class BlockMath extends Component<MathProps> {}
  export const Math: typeof InlineMath;
}