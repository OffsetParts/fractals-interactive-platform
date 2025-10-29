/**
 * Lyapunov Fractal Engine
 * Measures orbital stability and chaos
 */

/**
 * Calculate Lyapunov exponent for a parameter pair (a, b)
 * Sequence: x -> r*x*(1-x) with r alternating between a and b
 */
export function lyapunovExponent(a: number, b: number, maxIterations: number = 1000): number {
  let x = 0.5;
  let sum = 0;

  // Burn in iterations
  for (let i = 0; i < 100; i++) {
    x = a * x * (1 - x);
    x = b * x * (1 - x);
  }

  // Calculate Lyapunov exponent
  for (let i = 0; i < maxIterations; i++) {
    // Apply r=a
    const dxA = a * (1 - 2 * x);
    x = a * x * (1 - x);

    // Apply r=b
    const dxB = b * (1 - 2 * x);
    x = b * x * (1 - x);

    // Lyapunov exponent = (1/n) * sum(log|dx/dt|)
    sum += Math.log(Math.abs(dxA * dxB));
  }

  return sum / maxIterations;
}

/**
 * Render Lyapunov fractal to canvas
 */
export function renderLyapunov(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  aMin: number = 2,
  aMax: number = 4,
  bMin: number = 2,
  bMax: number = 4,
  maxIterations: number = 1000
) {
  const width = canvas.width;
  const height = canvas.height;
  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;

  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      // Map pixel to parameter space
      const a = aMin + (px / width) * (aMax - aMin);
      const b = bMin + (py / height) * (bMax - bMin);

      // Calculate Lyapunov exponent
      const exponent = lyapunovExponent(a, b, maxIterations);

      // Color based on exponent
      let color: { r: number; g: number; b: number };

      if (exponent < 0) {
        // Stable (chaos-free) - blue
        const intensity = Math.min(1, Math.abs(exponent) / 2);
        color = {
          r: Math.round(50 + intensity * 50),
          g: Math.round(100 + intensity * 50),
          b: Math.round(200 + intensity * 55)
        };
      } else {
        // Chaotic - red to yellow
        const intensity = Math.min(1, exponent / 2);
        color = {
          r: Math.round(200 + intensity * 55),
          g: Math.round(100 + intensity * 155),
          b: Math.round(50 + intensity * 50)
        };
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
