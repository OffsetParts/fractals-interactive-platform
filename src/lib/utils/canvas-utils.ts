/**
 * Canvas Utility Functions
 * Common canvas rendering operations
 */

import { RGBColor } from './color-utils';

export interface CanvasRenderOptions {
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  zoom: number;
  pixelSize?: number;
}

/**
 * Calculate pixel size from zoom level
 */
export function calculatePixelSize(zoom: number, maxDimension: number, defaultScale: number = 3.5): number {
  return defaultScale / (zoom * maxDimension);
}

/**
 * Convert screen coordinates to world coordinates
 */
export function screenToWorld(
  screenX: number,
  screenY: number,
  canvasWidth: number,
  canvasHeight: number,
  centerX: number,
  centerY: number,
  zoom: number
): { x: number; y: number } {
  const pixelSize = calculatePixelSize(zoom, Math.max(canvasWidth, canvasHeight));
  const x = centerX + (screenX - canvasWidth / 2) * pixelSize;
  const y = centerY + (screenY - canvasHeight / 2) * pixelSize;

  return { x, y };
}

/**
 * Convert world coordinates to screen coordinates
 */
export function worldToScreen(
  worldX: number,
  worldY: number,
  canvasWidth: number,
  canvasHeight: number,
  centerX: number,
  centerY: number,
  zoom: number
): { x: number; y: number } {
  const pixelSize = calculatePixelSize(zoom, Math.max(canvasWidth, canvasHeight));
  const x = (worldX - centerX) / pixelSize + canvasWidth / 2;
  const y = (worldY - centerY) / pixelSize + canvasHeight / 2;

  return { x, y };
}

/**
 * Create empty image data buffer
 */
export function createImageBuffer(width: number, height: number): Uint8ClampedArray {
  return new Uint8ClampedArray(width * height * 4);
}

/**
 * Create ImageData from buffer
 */
export function createImageFromBuffer(
  ctx: CanvasRenderingContext2D,
  buffer: Uint8ClampedArray,
  width: number,
  height: number
): ImageData {
  return ctx.createImageData(width, height);
}

/**
 * Render buffer to canvas
 */
export function renderBufferToCanvas(
  ctx: CanvasRenderingContext2D,
  buffer: Uint8ClampedArray,
  width: number,
  height: number
): void {
  const imageData = ctx.createImageData(width, height);
  imageData.data.set(buffer);
  ctx.putImageData(imageData, 0, 0);
}

/**
 * Get pixel index from x, y coordinates
 */
export function getPixelIndex(x: number, y: number, width: number): number {
  return (y * width + x) * 4;
}

/**
 * Write color to pixel buffer
 */
export function setPixelColor(
  buffer: Uint8ClampedArray,
  x: number,
  y: number,
  width: number,
  color: RGBColor,
  alpha: number = 255
): void {
  const idx = getPixelIndex(x, y, width);
  buffer[idx] = color.r;
  buffer[idx + 1] = color.g;
  buffer[idx + 2] = color.b;
  buffer[idx + 3] = alpha;
}

/**
 * Clear canvas to color
 */
export function clearCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  color: string = '#000000'
): void {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, width, height);
}

/**
 * Request animation frame wrapper with cleanup
 */
export function requestAnimationLoop(
  callback: (timestamp: number) => void,
  onCleanup?: () => void
): () => void {
  let frameId: number;

  const animate = (timestamp: number) => {
    callback(timestamp);
    frameId = requestAnimationFrame(animate);
  };

  frameId = requestAnimationFrame(animate);

  return () => {
    cancelAnimationFrame(frameId);
    onCleanup?.();
  };
}

/**
 * Measure render performance
 */
export function measureRenderTime(renderFn: () => void): number {
  const start = performance.now();
  renderFn();
  return performance.now() - start;
}

/**
 * Get device pixel ratio for high DPI displays
 */
export function getDevicePixelRatio(): number {
  return typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
}

/**
 * Set canvas resolution accounting for device pixel ratio
 */
export function setCanvasResolution(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  useDevicePixelRatio: boolean = true
): void {
  const ratio = useDevicePixelRatio ? getDevicePixelRatio() : 1;

  canvas.width = width * ratio;
  canvas.height = height * ratio;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  const ctx = canvas.getContext('2d');
  if (ctx && ratio !== 1) {
    ctx.scale(ratio, ratio);
  }
}
