/**
 * Color Utility Functions
 * Centralized color conversion and manipulation
 */

export interface RGBColor {
  r: number;
  g: number;
  b: number;
}

export interface RGBAColor extends RGBColor {
  a: number;
}

/**
 * Convert HSL to RGB
 * @param h Hue (0-360)
 * @param s Saturation (0-100)
 * @param l Lightness (0-100)
 */
export function hslToRgb(h: number, s: number, l: number): RGBColor {
  h = h % 360;
  s = s / 100;
  l = l / 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r = 0,
    g = 0,
    b = 0;

  if (h < 60) {
    r = c;
    g = x;
  } else if (h < 120) {
    r = x;
    g = c;
  } else if (h < 180) {
    g = c;
    b = x;
  } else if (h < 240) {
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255)
  };
}

/**
 * Convert HSL to RGBA
 */
export function hslToRgba(h: number, s: number, l: number, a: number = 1): RGBAColor {
  const rgb = hslToRgb(h, s, l);
  return { ...rgb, a: Math.round(a * 255) };
}

/**
 * Convert RGB to HSL
 */
export function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) {
    return { h: 0, s: 0, l: l * 100 };
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h = 0;
  switch (max) {
    case r:
      h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      break;
    case g:
      h = ((b - r) / d + 2) / 6;
      break;
    case b:
      h = ((r - g) / d + 4) / 6;
      break;
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

/**
 * Create color gradient between two HSL colors
 */
export function gradientColor(
  iterations: number,
  maxIterations: number,
  startHue: number = 0,
  endHue: number = 360,
  saturation: number = 100,
  lightness: number = 50
): RGBColor {
  const t = iterations / maxIterations;
  const hue = startHue + (endHue - startHue) * t;
  return hslToRgb(hue, saturation, lightness);
}

/**
 * Create smooth color from iterations (smooth coloring algorithm)
 */
export function smoothColor(
  iterations: number,
  maxIterations: number,
  finalMagnitude: number
): RGBColor {
  let smoothIter = iterations;

  if (finalMagnitude > 0) {
    smoothIter = iterations + 1 - Math.log2(Math.log2(finalMagnitude));
  }

  const t = (smoothIter % maxIterations) / maxIterations;
  const hue = t * 360;

  return hslToRgb(hue, 100, 50);
}

/**
 * Create histogram-equalized color
 */
export function histogramColor(iterations: number, maxIterations: number): RGBColor {
  if (iterations >= maxIterations) {
    return { r: 0, g: 0, b: 0 };
  }

  const normalized = Math.sqrt(iterations / maxIterations);
  const hue = normalized * 360;

  return hslToRgb(hue, 80, 40 + normalized * 20);
}

/**
 * Create classic/discrete color bands
 */
export function classicColor(iterations: number, maxIterations: number): RGBColor {
  if (iterations >= maxIterations) {
    return { r: 0, g: 0, b: 0 };
  }

  const bands = Math.floor((iterations / maxIterations) * 8);
  const hue = (bands * 45) % 360;

  return hslToRgb(hue, 100, 50);
}

/**
 * Write RGB color to image data
 */
export function writePixel(
  data: Uint8ClampedArray,
  index: number,
  color: RGBColor,
  alpha: number = 255
): void {
  data[index] = color.r;
  data[index + 1] = color.g;
  data[index + 2] = color.b;
  data[index + 3] = alpha;
}

/**
 * Color mode selector
 */
export function getColor(
  mode: 'smooth' | 'histogram' | 'classic',
  iterations: number,
  maxIterations: number,
  magnitude?: number
): RGBColor {
  switch (mode) {
    case 'smooth':
      return smoothColor(iterations, maxIterations, magnitude || 0);
    case 'histogram':
      return histogramColor(iterations, maxIterations);
    case 'classic':
    default:
      return classicColor(iterations, maxIterations);
  }
}
