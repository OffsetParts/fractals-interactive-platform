import * as THREE from 'three';

export type PaletteName = 'deep-space' | 'blue-white-black' | 'viridis' | 'inferno';

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

const PALETTES: Record<PaletteName, string[]> = {
  'deep-space': ['#000000', '#020b1a', '#0b2a68', '#1e90ff', '#a8e6ff', '#ffffff'],
  'blue-white-black': ['#000000', '#0a1a2a', '#1f4e79', '#87cefa', '#ffffff', '#000000'],
  viridis: ['#440154', '#482777', '#3f4a8a', '#31688e', '#26838f', '#1f9d8a', '#6cce5a', '#b6de2b', '#fee825'],
  inferno: ['#000004', '#1f0c48', '#550f6d', '#88226a', '#b63655', '#e35933', '#f98e09', '#f6d746', '#fcffa4'],
};

const textureCache = new Map<PaletteName, THREE.DataTexture>();

export function getPaletteTexture(name: PaletteName): THREE.DataTexture {
  const cached = textureCache.get(name);
  if (cached) return cached;
  const data = buildGradient(PALETTES[name], 256);
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
export const ALL_PALETTES = Object.keys(PALETTES) as PaletteName[];
