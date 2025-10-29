/**
 * Newton Fractal Engine
 * Newton's method applied to complex polynomials
 */

import { hslToRgb, RGBColor } from '@/lib/utils/color-utils';

interface ComplexNumber {
  re: number;
  im: number;
}

const Complex = {
  mul: (a: ComplexNumber, b: ComplexNumber): ComplexNumber => ({
    re: a.re * b.re - a.im * b.im,
    im: a.re * b.im + a.im * b.re
  }),

  div: (a: ComplexNumber, b: ComplexNumber): ComplexNumber => {
    const denom = b.re * b.re + b.im * b.im;
    return {
      re: (a.re * b.re + a.im * b.im) / denom,
      im: (a.im * b.re - a.re * b.im) / denom
    };
  },

  sub: (a: ComplexNumber, b: ComplexNumber): ComplexNumber => ({
    re: a.re - b.re,
    im: a.im - b.im
  }),

  add: (a: ComplexNumber, b: ComplexNumber): ComplexNumber => ({
    re: a.re + b.re,
    im: a.im + b.im
  }),

  pow: (z: ComplexNumber, n: number): ComplexNumber => {
    let result: ComplexNumber = { re: 1, im: 0 };
    for (let i = 0; i < n; i++) {
      result = Complex.mul(result, z);
    }
    return result;
  },

  magnitude: (z: ComplexNumber): number => Math.sqrt(z.re * z.re + z.im * z.im)
};

/**
 * Compute z^3 - 1
 */
function polyZ3Minus1(z: ComplexNumber): ComplexNumber {
  // z^3 - 1
  const z3 = Complex.pow(z, 3);
  return Complex.sub(z3, { re: 1, im: 0 });
}

/**
 * Derivative: 3z^2
 */
function polyZ3Minus1Derivative(z: ComplexNumber): ComplexNumber {
  // 3z^2
  const z2 = Complex.mul(z, z);
  return Complex.mul(z2, { re: 3, im: 0 });
}

/**
 * Newton iteration for z^3 - 1
 */
export function newtonIteration(
  z: ComplexNumber,
  maxIterations: number = 100,
  tolerance: number = 0.0001
): number {
  let current = z;

  for (let i = 0; i < maxIterations; i++) {
    const f = polyZ3Minus1(current);
    const fPrime = polyZ3Minus1Derivative(current);

    // z_new = z - f(z) / f'(z)
    const step = Complex.div(f, fPrime);
    current = Complex.sub(current, step);

    // Check convergence
    if (Complex.magnitude(step) < tolerance) {
      return i;
    }
  }

  return maxIterations;
}

/**
 * Render Newton fractal to canvas
 */
export function renderNewton(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  zoom: number,
  maxIterations: number = 100
) {
  const width = canvas.width;
  const height = canvas.height;
  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;

  const pixelSize = 1 / zoom;

  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      // Map pixel to complex plane
      const x = centerX + (px - width / 2) * pixelSize;
      const y = centerY + (py - height / 2) * pixelSize;

      const z: ComplexNumber = { re: x, im: y };
      const iterations = newtonIteration(z, maxIterations);

      // Color based on iterations
      const hue = (iterations / maxIterations) * 360;
      const saturation = 100;
      const lightness = 50;

      const color = hslToRgb(hue, saturation, lightness);

      const idx = (py * width + px) * 4;
      data[idx] = color.r;
      data[idx + 1] = color.g;
      data[idx + 2] = color.b;
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
}
