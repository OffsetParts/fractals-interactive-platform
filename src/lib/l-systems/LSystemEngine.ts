export interface LSystemRule {
  from: string;
  to: string;
}

export interface LSystemConfig {
  axiom: string;
  rules: LSystemRule[];
  iterations: number;
  angle: number; // degrees
  length: number;
  lengthFactor?: number; // length multiplier per iteration
  angleFactor?: number; // angle multiplier per iteration
}

export class LSystemGenerator {
  private config: LSystemConfig;

  constructor(config: LSystemConfig) {
    this.config = config;
  }

  generate(): string {
    let current = this.config.axiom;
    
    for (let i = 0; i < this.config.iterations; i++) {
      current = this.applyRules(current);
    }
    
    return current;
  }

  private applyRules(input: string): string {
    let result = '';
    
    for (let i = 0; i < input.length; i++) {
      const char = input[i];
      const rule = this.config.rules.find(r => r.from === char);
      result += rule ? rule.to : char;
    }
    
    return result;
  }

  setConfig(config: Partial<LSystemConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): LSystemConfig {
    return { ...this.config };
  }
}

export interface TurtleState {
  x: number;
  y: number;
  angle: number; // radians
  length: number;
}

export interface TurtleCommand {
  type: 'forward' | 'turnLeft' | 'turnRight' | 'push' | 'pop' | 'noop';
  value?: number;
}

export class TurtleInterpreter {
  private stack: TurtleState[] = [];
  private paths: { x1: number; y1: number; x2: number; y2: number }[] = [];
  private state: TurtleState;

  constructor(initialState: TurtleState) {
    this.state = { ...initialState };
  }

  interpret(lSystemString: string, config: LSystemConfig): { x1: number; y1: number; x2: number; y2: number }[] {
    this.paths = [];
    this.stack = [];
    
    const currentLength = config.length;
    const currentAngle = config.angle * Math.PI / 180; // Convert to radians
    
    for (const char of lSystemString) {
      const command = this.charToCommand(char);
      
      switch (command.type) {
        case 'forward':
          this.forward(currentLength);
          break;
        case 'turnLeft':
          this.turnLeft(currentAngle);
          break;
        case 'turnRight':
          this.turnRight(currentAngle);
          break;
        case 'push':
          this.push();
          break;
        case 'pop':
          this.pop();
          break;
      }
    }
    
    return this.paths;
  }

  private charToCommand(char: string): TurtleCommand {
    switch (char) {
      case 'F':
      case 'G':
        return { type: 'forward' };
      case '+':
        return { type: 'turnLeft' };
      case '-':
        return { type: 'turnRight' };
      case '[':
        return { type: 'push' };
      case ']':
        return { type: 'pop' };
      default:
        return { type: 'noop' };
    }
  }

  private forward(length: number): void {
    const newX = this.state.x + Math.cos(this.state.angle) * length;
    const newY = this.state.y + Math.sin(this.state.angle) * length;
    
    this.paths.push({
      x1: this.state.x,
      y1: this.state.y,
      x2: newX,
      y2: newY
    });
    
    this.state.x = newX;
    this.state.y = newY;
  }

  private turnLeft(angle: number): void {
    this.state.angle -= angle;
  }

  private turnRight(angle: number): void {
    this.state.angle += angle;
  }

  private push(): void {
    this.stack.push({ ...this.state });
  }

  private pop(): void {
    if (this.stack.length > 0) {
      this.state = this.stack.pop()!;
    }
  }

  reset(initialState: TurtleState): void {
    this.state = { ...initialState };
    this.stack = [];
    this.paths = [];
  }
}

// Predefined L-system configurations
export const LSYSTEM_PRESETS: Record<string, LSystemConfig> = {
  kochCurve: {
    axiom: 'F',
    rules: [{ from: 'F', to: 'F+F-F-F+F' }],
    iterations: 4,
    angle: 90,
    length: 5
  },
  
  dragonCurve: {
    axiom: 'FX',
    rules: [
      { from: 'X', to: 'X+YF+' },
      { from: 'Y', to: '-FX-Y' }
    ],
    iterations: 10,
    angle: 90,
    length: 3
  },
  
  sierpinskiTriangle: {
    axiom: 'F-G-G',
    rules: [
      { from: 'F', to: 'F-G+F+G-F' },
      { from: 'G', to: 'GG' }
    ],
    iterations: 6,
    angle: 120,
    length: 2
  },
  
  plant: {
    axiom: 'X',
    rules: [
      { from: 'X', to: 'F+[[X]-X]-F[-FX]+X' },
      { from: 'F', to: 'FF' }
    ],
    iterations: 5,
    angle: 25,
    length: 3
  },
  
  hilbertCurve: {
    axiom: 'A',
    rules: [
      { from: 'A', to: '-BF+AFA+FB-' },
      { from: 'B', to: '+AF-BFB-FA+' }
    ],
    iterations: 5,
    angle: 90,
    length: 4
  }
};