import * as THREE from 'three';

export type PaletteName = 'deep-space' | 'blue-white-black' | 'viridis' | 'inferno' | 'sonic';

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  const bigint = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return { r, g, b };
}

function buildGradient(colors: string[], size = 256): Uint8Array {
  const stops = colors.map(hexToRgb);
  const data = new Uint8Array(size * 4);
  for (let i = 0; i < size; i++) {
    const t = i / (size - 1);
    const pos = t * (stops.length - 1);
    const i0 = Math.floor(pos);
    const i1 = Math.min(stops.length - 1, i0 + 1);
    const f = pos - i0;
    const r = Math.round(stops[i0].r * (1 - f) + stops[i1].r * f);
    const g = Math.round(stops[i0].g * (1 - f) + stops[i1].g * f);
    const b = Math.round(stops[i0].b * (1 - f) + stops[i1].b * f);
    data[i * 4 + 0] = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = b;
    data[i * 4 + 3] = 255;
  }
  return data;
}

/**
 * Build a "sonic" palette that maps iteration count to colors
 * based on the same frequency algorithm used in FractalSynth.
 * 
 * Stability (t) mapping:
 * - t > 0.95 (very stable): 100-150 Hz → deep bass → dark red/brown
 * - t > 0.70 (moderately stable): 150-400 Hz → musical → warm orange/yellow
 * - t > 0.30 (borderline): 400-1000 Hz → tension → green/cyan
 * - t < 0.30 (chaotic): 1000-2000 Hz → harsh/noise → blue/purple/white
 * 
 * Colors represent pitch: low freq = warm/dark, high freq = cool/bright
 */
function buildSonicPalette(size = 256): Uint8Array {
  const data = new Uint8Array(size * 4);
  
  for (let i = 0; i < size; i++) {
    const stability = i / (size - 1); // 0 = chaotic (escaped quickly), 1 = stable (didn't escape)
    
    let r: number, g: number, b: number;
    
    if (stability > 0.95) {
      // Very stable - deep, resonant bass tones (100-150 Hz)
      // Dark burgundy/maroon - represents the deepest, most stable sounds
      const t = (stability - 0.95) / 0.05;
      r = Math.round(60 + t * 20);   // 60-80
      g = Math.round(10 + t * 10);   // 10-20
      b = Math.round(20 + t * 10);   // 20-30
    } else if (stability > 0.70) {
      // Moderately stable - musical mid tones (150-400 Hz)
      // Warm gradient from red-orange to golden yellow
      const t = (stability - 0.70) / 0.25;
      r = Math.round(180 + t * 75);  // 180-255
      g = Math.round(50 + t * 150);  // 50-200
      b = Math.round(20 + t * 30);   // 20-50
    } else if (stability > 0.30) {
      // Borderline - tension frequencies (400-1000 Hz)
      // Cool gradient from yellow-green to cyan
      const t = (stability - 0.30) / 0.40;
      r = Math.round(200 - t * 150); // 200-50
      g = Math.round(200 + t * 55);  // 200-255
      b = Math.round(50 + t * 150);  // 50-200
    } else {
      // Chaotic - harsh high frequencies (1000-2000 Hz)
      // Cold gradient from cyan to bright white/purple
      const t = stability / 0.30;
      r = Math.round(50 + (1 - t) * 180);   // 230-50 (reverse: more chaotic = brighter)
      g = Math.round(255 - (1 - t) * 100);  // 155-255
      b = Math.round(200 + (1 - t) * 55);   // 255-200
    }
    
    data[i * 4 + 0] = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = b;
    data[i * 4 + 3] = 255;
  }
  
  return data;
}

const PALETTES: Record<Exclude<PaletteName, 'sonic'>, string[]> = {
  'deep-space': ['#000000', '#020b1a', '#0b2a68', '#1e90ff', '#a8e6ff', '#ffffff'],
  'blue-white-black': ['#000000', '#0a1a2a', '#1f4e79', '#87cefa', '#ffffff', '#000000'],
  viridis: ['#440154', '#482777', '#3f4a8a', '#31688e', '#26838f', '#1f9d8a', '#6cce5a', '#b6de2b', '#fee825'],
  inferno: ['#000004', '#1f0c48', '#550f6d', '#88226a', '#b63655', '#e35933', '#f98e09', '#f6d746', '#fcffa4'],
};

const textureCache = new Map<PaletteName, THREE.DataTexture>();

export function getPaletteTexture(name: PaletteName): THREE.DataTexture {
  const cached = textureCache.get(name);
  if (cached) return cached;
  
  // Use special sonic palette builder, or standard gradient for others
  const data = name === 'sonic' 
    ? buildSonicPalette(256) 
    : buildGradient(PALETTES[name], 256);
    
  const tex = new THREE.DataTexture(data, 256, 1, THREE.RGBAFormat);
  tex.needsUpdate = true;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  // Authoring is in sRGB; mark texture color space for correct output transform
  // three@0.180 uses colorSpace; SRGBColorSpace ensures expected gradient appearance
  // Disable mipmaps for 1D usage
  (tex as any).colorSpace = (THREE as any).SRGBColorSpace ?? (tex as any).colorSpace;
  tex.generateMipmaps = false;
  textureCache.set(name, tex);
  return tex;
}

export const DEFAULT_PALETTE: PaletteName = 'deep-space';
export const ALL_PALETTES: PaletteName[] = [...Object.keys(PALETTES) as Exclude<PaletteName, 'sonic'>[], 'sonic'];
