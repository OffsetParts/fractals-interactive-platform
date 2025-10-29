/**
 * Performance Optimization & Monitoring
 * Helps identify bottlenecks and optimize rendering
 */

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  renderTime: number;
  memoryUsed: number;
  isLowPerformance: boolean;
}

export class PerformanceMonitor {
  private frameCount = 0;
  private lastSecond = Date.now();
  private frameStartTime = 0;
  private frameTime = 0;
  private renderTime = 0;
  private maxIterationsDefault = 256;
  private currentIterations = this.maxIterationsDefault;

  startFrame(): void {
    this.frameStartTime = performance.now();
  }

  endFrame(): void {
    this.frameTime = performance.now() - this.frameStartTime;
    this.frameCount++;

    const now = Date.now();
    if (now - this.lastSecond >= 1000) {
      this.lastSecond = now;
      this.frameCount = 0;
    }
  }

  recordRenderTime(time: number): void {
    this.renderTime = time;
  }

  getMetrics(): PerformanceMetrics {
    const fps = Math.round(1000 / (this.frameTime || 16));
    const isLowPerformance = fps < 30;

    // Auto-adjust iterations based on performance
    if (isLowPerformance && this.currentIterations > 50) {
      this.currentIterations = Math.max(50, this.currentIterations - 10);
    } else if (fps > 55 && this.currentIterations < this.maxIterationsDefault) {
      this.currentIterations = Math.min(this.maxIterationsDefault, this.currentIterations + 5);
    }

    // Get memory usage if available (Chrome DevTools only)
    let memoryUsed = 0;
    const perfWithMemory = performance as unknown as { memory?: { usedJSHeapSize: number } };
    if (perfWithMemory.memory) {
      memoryUsed = Math.round(perfWithMemory.memory.usedJSHeapSize / 1048576);
    }

    return {
      fps,
      frameTime: this.frameTime,
      renderTime: this.renderTime,
      memoryUsed,
      isLowPerformance
    };
  }

  getSuggestedIterations(): number {
    return this.currentIterations;
  }

  resetIterations(): void {
    this.currentIterations = this.maxIterationsDefault;
  }
}

/**
 * Render quality settings for performance vs quality tradeoff
 */
export enum RenderQuality {
  LOW = 50,      // 2fps on slow machines
  MEDIUM = 100,  // Balanced
  HIGH = 200,    // Quality focused
  ULTRA = 256    // Maximum quality
}

/**
 * Adaptive rendering - adjust quality based on performance
 */
export function selectQualityForPerformance(fps: number): RenderQuality {
  if (fps < 20) return RenderQuality.LOW;
  if (fps < 40) return RenderQuality.MEDIUM;
  if (fps < 50) return RenderQuality.HIGH;
  return RenderQuality.ULTRA;
}

/**
 * Request animation frame with performance metrics
 */
export function requestAnimationFrameWithMetrics(
  callback: (metrics: PerformanceMetrics) => void
): () => void {
  const monitor = new PerformanceMonitor();
  let frameId: number;

  const animate = () => {
    monitor.startFrame();
    callback(monitor.getMetrics());
    monitor.endFrame();
    frameId = requestAnimationFrame(animate);
  };

  frameId = requestAnimationFrame(animate);

  return () => {
    cancelAnimationFrame(frameId);
  };
}

/**
 * Debounce expensive operations
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Throttle operations to max N per second
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, 1000 / limit);
    }
  };
}

/**
 * Web Worker renderer wrapper for offloading computation
 */
export class WorkerRenderer {
  private worker: Worker | null = null;
  private isSupported: boolean;

  constructor() {
    this.isSupported = typeof Worker !== 'undefined';
  }

  async initialize(): Promise<void> {
    if (!this.isSupported) {
      console.warn('Web Workers not supported on this platform');
      return;
    }

    // Would load worker script here
    // this.worker = new Worker('/workers/fractal-renderer.js');
  }

  async render(
    canvas: HTMLCanvasElement,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _config: Record<string, unknown>
  ): Promise<ImageData> {
    if (!this.isSupported) {
      throw new Error('Web Workers not supported');
    }

    return new Promise((resolve) => {
      // This would communicate with the worker
      // For now, just resolve after a delay with canvas dimensions
      setTimeout(() => {
        resolve(new ImageData(canvas.width, canvas.height));
      }, 100);
    });
  }

  terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}

/**
 * Memory efficient image buffer pooling
 */
export class BufferPool {
  private buffers: Map<number, Uint8ClampedArray[]> = new Map();
  private maxPoolSize = 5;

  acquire(size: number): Uint8ClampedArray {
    if (!this.buffers.has(size)) {
      this.buffers.set(size, []);
    }

    const pool = this.buffers.get(size)!;
    if (pool.length > 0) {
      return pool.pop()!;
    }

    return new Uint8ClampedArray(size);
  }

  release(buffer: Uint8ClampedArray): void {
    const size = buffer.length;
    if (!this.buffers.has(size)) {
      this.buffers.set(size, []);
    }

    const pool = this.buffers.get(size)!;
    if (pool.length < this.maxPoolSize) {
      pool.push(buffer);
    }
  }

  clear(): void {
    this.buffers.clear();
  }
}
