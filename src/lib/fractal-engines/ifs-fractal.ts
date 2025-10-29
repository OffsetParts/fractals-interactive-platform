/**
 * Iterated Function System (IFS) Fractal Engine
 * Generates fractals like Sierpinski triangle, fern, etc.
 */

export interface IFSTransform {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
  probability: number;
}

export interface IFSFractal {
  name: string;
  transforms: IFSTransform[];
}

/**
 * Apply affine transformation to point
 */
function applyTransform(
  x: number,
  y: number,
  transform: IFSTransform
): { x: number; y: number } {
  return {
    x: transform.a * x + transform.b * y + transform.e,
    y: transform.c * x + transform.d * y + transform.f
  };
}

/**
 * Classic Sierpinski Triangle
 */
export const sierpinski: IFSFractal = {
  name: 'Sierpinski Triangle',
  transforms: [
    { a: 0.5, b: 0, c: 0, d: 0.5, e: 0, f: 0, probability: 1 / 3 },
    { a: 0.5, b: 0, c: 0, d: 0.5, e: 0.5, f: 0, probability: 1 / 3 },
    { a: 0.5, b: 0, c: 0, d: 0.5, e: 0.25, f: 0.433, probability: 1 / 3 }
  ]
};

/**
 * Barnsley Fern
 */
export const fern: IFSFractal = {
  name: 'Barnsley Fern',
  transforms: [
    { a: 0, b: 0, c: 0, d: 0.16, e: 0, f: 0, probability: 0.01 },
    { a: 0.85, b: 0.04, c: -0.04, d: 0.85, e: 0, f: 1.6, probability: 0.84 },
    { a: 0.2, b: -0.26, c: 0.23, d: 0.22, e: 0, f: 1.6, probability: 0.08 },
    { a: -0.15, b: 0.28, c: 0.26, d: 0.24, e: 0, f: 0.44, probability: 0.07 }
  ]
};

/**
 * Dragon Curve
 */
export const dragon: IFSFractal = {
  name: 'Dragon Curve',
  transforms: [
    { a: 0.5, b: -0.5, c: 0.5, d: 0.5, e: 0, f: 0, probability: 0.5 },
    { a: 0.5, b: 0.5, c: -0.5, d: 0.5, e: 0.5, f: 0.5, probability: 0.5 }
  ]
};

/**
 * Generate IFS fractal points
 */
export function generateIFSPoints(
  ifs: IFSFractal,
  iterations: number = 100000
): Array<{ x: number; y: number }> {
  const points: Array<{ x: number; y: number }> = [];
  let x = 0,
    y = 0;

  for (let i = 0; i < iterations; i++) {
    // Choose random transform based on probabilities
    const rand = Math.random();
    let cumulative = 0;
    let selectedTransform = ifs.transforms[0];

    for (const transform of ifs.transforms) {
      cumulative += transform.probability;
      if (rand < cumulative) {
        selectedTransform = transform;
        break;
      }
    }

    // Apply transform
    const newPos = applyTransform(x, y, selectedTransform);
    x = newPos.x;
    y = newPos.y;

    // Skip burn-in iterations
    if (i > 20) {
      points.push({ x, y });
    }
  }

  return points;
}

/**
 * Render IFS fractal to canvas
 */
export function renderIFS(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  ifs: IFSFractal,
  iterations: number = 100000
) {
  const width = canvas.width;
  const height = canvas.height;

  // Clear canvas
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);

  // Generate points
  const points = generateIFSPoints(ifs, iterations);

  // Calculate bounds
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;

  for (const point of points) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  }

  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const padding = 0.1;
  const scale = Math.min(width / (rangeX * (1 + padding)), height / (rangeY * (1 + padding)));

  // Draw points
  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;

  // Initialize to black
  for (let i = 0; i < data.length; i += 4) {
    data[i + 3] = 255;
  }

  // Plot points with antialiasing effect
  for (const point of points) {
    const screenX = Math.round((point.x - minX - rangeX * padding * 0.5) * scale);
    const screenY = Math.round((point.y - minY - rangeY * padding * 0.5) * scale);

    if (screenX >= 0 && screenX < width && screenY >= 0 && screenY < height) {
      const idx = (screenY * width + screenX) * 4;

      // Accumulate color (creates glow effect)
      data[idx] = Math.min(255, data[idx] + 25);
      data[idx + 1] = Math.min(255, data[idx + 1] + 50);
      data[idx + 2] = Math.min(255, data[idx + 2] + 100);
    }
  }

  ctx.putImageData(imageData, 0, 0);
}
