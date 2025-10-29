/**
 * Tricorn Fractal Engine
 * The conjugate Mandelbrot set (z* instead of z)
 */

import { hslToRgb } from '@/lib/utils/color-utils';

interface ComplexNumber {
  re: number;
  im: number;
}

const Complex = {
  mul: (a: ComplexNumber, b: ComplexNumber): ComplexNumber => ({
    re: a.re * b.re - a.im * b.im,
    im: a.re * b.im + a.im * b.re
  }),

  add: (a: ComplexNumber, b: ComplexNumber): ComplexNumber => ({
    re: a.re + b.re,
    im: a.im + b.im
  }),

  conjugate: (z: ComplexNumber): ComplexNumber => ({
    re: z.re,
    im: -z.im
  }),

  magnitude: (z: ComplexNumber): number => Math.sqrt(z.re * z.re + z.im * z.im),

  magnitudeSquared: (z: ComplexNumber): number => z.re * z.re + z.im * z.im
};

/**
 * Tricorn iteration: z -> conj(z)^2 + c
 */
export function tricornIteration(
  c: ComplexNumber,
  maxIterations: number = 256
): number {
  let z: ComplexNumber = { re: 0, im: 0 };

  for (let i = 0; i < maxIterations; i++) {
    // Check escape
    if (Complex.magnitudeSquared(z) > 4) {
      return i;
    }

    // z = conj(z)^2 + c
    const zConj = Complex.conjugate(z);
    const zConjSquared = Complex.mul(zConj, zConj);
    z = Complex.add(zConjSquared, c);
  }

  return maxIterations;
}

/**
 * Render Tricorn to canvas
 */
export function renderTricorn(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  zoom: number,
  maxIterations: number = 256,
  colorScheme: 'smooth' | 'histogram' | 'classic' = 'smooth'
) {
  const width = canvas.width;
  const height = canvas.height;
  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;

  const pixelSize = 3.5 / (zoom * Math.max(width, height));

  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      // Map pixel to complex plane
      const x = centerX + (px - width / 2) * pixelSize;
      const y = centerY + (py - height / 2) * pixelSize;

      const c: ComplexNumber = { re: x, im: y };
      const iterations = tricornIteration(c, maxIterations);

      let color: { r: number; g: number; b: number };

      if (colorScheme === 'smooth') {
        // Smooth coloring
        const t = iterations / maxIterations;
        const hue = t * 360;
        color = hslToRgb(hue, 100, 50);
      } else if (colorScheme === 'histogram') {
        // Histogram-based coloring
        const normalized = Math.sqrt(iterations / maxIterations);
        const hue = normalized * 360;
        color = hslToRgb(hue, 80, 40 + normalized * 20);
      } else {
        // Classic coloring
        const bands = Math.floor((iterations / maxIterations) * 8);
        const hue = (bands * 45) % 360;
        color = hslToRgb(hue, 100, 50);
      }

      const idx = (py * width + px) * 4;
      data[idx] = color.r;
      data[idx + 1] = color.g;
      data[idx + 2] = color.b;
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
}
