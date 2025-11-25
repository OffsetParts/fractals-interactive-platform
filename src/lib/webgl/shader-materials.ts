/**
 * High-performance THREE.js shader materials for fractal rendering
 * Based on optimized WebGL implementation
 */

import * as THREE from 'three';
import { getPaletteTexture, DEFAULT_PALETTE } from '@/lib/utils/palettes';
import { parseEquationToAst } from '@/lib/math/equation-parser-chevrotain';
import { emitGlsl } from '@/lib/math/equation-glsl-emitter';

export interface ShaderUniforms {
  time: { value: number };
  resolution: { value: THREE.Vector2 };
  offset: { value: THREE.Vector2 };
  scale: { value: number };
  offsetMostSignificant: { value: THREE.Vector2 };
  offsetLeastSignificant: { value: THREE.Vector2 };
    palette: { value: THREE.DataTexture };
    uIters: { value: number };
        uGamma: { value: number };
        uBandCenter: { value: number };
        uBandWidth: { value: number };
        uBandStrength: { value: number };
        uInteriorColor: { value: THREE.Vector3 };
        uInteriorEnabled: { value: number };
                uBands: { value: number };
  [uniform: string]: { value: unknown };
}

const createDefaultUniforms = (): ShaderUniforms => ({
  time: { value: 1.0 },
  resolution: { value: new THREE.Vector2(1, 1) },
  offset: { value: new THREE.Vector2(0, 0) },
  scale: { value: 1.0 },
  offsetMostSignificant: { value: new THREE.Vector2(0, 0) },
    offsetLeastSignificant: { value: new THREE.Vector2(0, 0) },
    palette: { value: getPaletteTexture(DEFAULT_PALETTE) },
        uIters: { value: 150 },
        uGamma: { value: 1.15 },
        uBandCenter: { value: 0.88 },
        uBandWidth: { value: 0.035 },
        uBandStrength: { value: 0.85 },
        uInteriorColor: { value: new THREE.Vector3(0.04, 0.09, 0.18) },
        uInteriorEnabled: { value: 1 },
        uBands: { value: 0 },
        uPower: { value: 2.0 },
});

const defaultVertexShader = `
    precision highp float;

    attribute vec3 position;

    varying vec2 coord;
    void main() {                                       
        gl_Position = vec4(position.xy, 0, 1);
        coord = position.xy;
    }
`;

const fragmentShaderTopShared = `\n\n// A lot of this code is based on code from Inigo Quilez - iq/2013, 
// and it is therefore licensed under the same license as his; the Creative 
// Commons Attribution-NonCommercial-ShareAlike 3.0 Unported License.

precision highp float;
precision mediump int;
precision highp sampler2D;
varying vec2 coord; // The pixel coordinates from (-1, -1) to (1, 1)
uniform vec2 resolution; // The resolution of the draw area
uniform vec2 offset; // The panning offset
uniform float scale; // The zoom factor
uniform sampler2D palette; // 1D gradient palette
uniform int uIters; // dynamic iteration budget
// Cinematic coloring controls
uniform float uGamma; // tone curve
uniform float uBandCenter; // where the white band is centered in t
uniform float uBandWidth; // width of the white band
uniform float uBandStrength; // mix amount for white band
uniform vec3 uInteriorColor; // color for interior points
uniform int uInteriorEnabled; // 1 to color interior, 0 to keep black
uniform int uBands; // optional quantization bands (0 = off)
// Equation parameterization
uniform float uPower; // exponent for z^n when 'n' is used in equation

#define MAX_ITERS 512

vec3 paletteColor(float t) {
    return texture2D(palette, vec2(clamp(t, 0.0, 1.0), 0.5)).rgb;
}

vec3 samplePalette(float t) {
    float tt = clamp(t, 0.0, 1.0);
    if (uBands > 0) {
        float b = float(uBands);
        tt = floor(tt * b) / b;
    }
    tt = pow(tt, max(uGamma, 0.0001));
    vec3 col = paletteColor(tt);
    float denom = max(uBandWidth, 0.0001);
    float band = exp(-0.5 * pow((tt - uBandCenter) / denom, 2.0));
    col = mix(col, vec3(1.0), clamp(uBandStrength, 0.0, 1.0) * band);
    return col;
}

// --- Complex helpers ---
// Modulus as complex value (r,0)
vec2 cmod(vec2 z){ return vec2(length(z), 0.0); }
// Complex exponential
vec2 cexp(vec2 z){ float e = exp(z.x); return vec2(e * cos(z.y), e * sin(z.y)); }
// Complex natural log
vec2 clog(vec2 z){ return vec2(log(length(z)), atan(z.y, z.x)); }
// Scalar hyperbolic helpers (no built-in cosh/sinh in WebGL1)
float coshGL(float x){ float e = exp(x); float inv = exp(-x); return 0.5*(e+inv); }
float sinhGL(float x){ float e = exp(x); float inv = exp(-x); return 0.5*(e-inv); }
// Complex sine
vec2 csin(vec2 z){ return vec2(sin(z.x)*coshGL(z.y), cos(z.x)*sinhGL(z.y)); }
// Complex cosine
vec2 ccos(vec2 z){ return vec2(cos(z.x)*coshGL(z.y), -sin(z.x)*sinhGL(z.y)); }
// Complex argument (angle) as (theta,0)
vec2 carg(vec2 z){ return vec2(atan(z.y, z.x), 0.0); }
// Componentwise absolute (Burning Ship style)
vec2 cabs(vec2 z){ return vec2(abs(z.x), abs(z.y)); }

`;

const fragmentShaderTopAnimateOn = fragmentShaderTopShared + `#define ANIMATE 1 // Set to 1 to render the fractal every frame. Set to 0 to only render upon interaction.
uniform float time; // Time since program start, in seconds\n\n`;

// Very small, safe DSL for equations used in custom material.
// Supported canonical forms (spaces ignored, case-insensitive):
//   - z^2 + c
//   - z^n + c      (uses uPower)
//   - |z|^2 + c    or abs(z)^2 + c   (Burning Ship style)
//   - conj(z)^2 + c                  (Tricorn style)
// Anything else falls back to z^2 + c.
function parseEquationToGLSL(equation: string): string {
    // First, try the Chevrotain-based parser + AST -> GLSL path.
    try {
        const ast = parseEquationToAst(equation);
        const expr = emitGlsl(ast);
        // Ensure we always add "+ c" so the fractal depends on c.
        return `${expr} + c`;
    } catch (err) {
        console.warn('[Equation parser] Falling back to minimal DSL for', equation, err);
    }

    // Fallback: existing small, safe DSL for a few canonical forms.
    const raw = equation.trim().toLowerCase().replace(/\s+/g, '');
    const src = raw.endsWith('+c') ? raw : `${raw}+c`;

    if (src === 'z^2+c' || src === 'z*z+c') {
        return 'vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c';
    }

    if (src === 'z^n+c' || src === 'z**n+c') {
        return 'cpow(z, uPower) + c';
    }

    const zPowConstMatch = src.match(/^z\^([0-9]+)\+c$/);
    if (zPowConstMatch) {
        const k = parseInt(zPowConstMatch[1], 10);
        if (k === 2) {
            return 'vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c';
        }
        if (k === 3) {
            return 'cmul(cmul(z, z), z) + c';
        }
        return `cpow(z, ${k}.0) + c`;
    }

    if (src === '|z|^2+c' || src === 'abs(z)^2+c') {
        return 'vec2(abs(z.x) * abs(z.x) - abs(z.y) * abs(z.y), 2.0 * abs(z.x) * abs(z.y)) + c';
    }

    if (src === 'conj(z)^2+c') {
        return 'vec2(z.x * z.x - z.y * z.y, -2.0 * z.x * z.y) + c';
    }

    console.warn('[Fractal equation] Unsupported equation, falling back to z^2 + c:', equation);
    return 'vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c';
}

// Create custom material from equation
export const createCustomMaterial = (equation: string): THREE.RawShaderMaterial => {
  const glslIteration = parseEquationToGLSL(equation);
  if (typeof window !== 'undefined') {
    console.log('[Fractal equation GLSL]', equation, '=>', glslIteration);
  }

  return new THREE.RawShaderMaterial({
    uniforms: createDefaultUniforms(),
    vertexShader: defaultVertexShader,
    fragmentShader: `// Custom fractal: ${equation}${fragmentShaderTopShared}
#define ANTIALIAS_LEVEL 1

vec2 cmul(vec2 a, vec2 b) {
    return vec2(a.x * b.x - a.y * b.y, a.y * b.x + a.x * b.y);
}

vec2 cdiv(vec2 a, vec2 b) {
    float d = dot(b, b);
    return vec2((a.x * b.x + a.y * b.y) / d, (a.y * b.x - a.x * b.y) / d);
}

vec2 cpow(vec2 z, float exponent) {
    float angle = atan(z.y, z.x);
    float r = length(z);
    return pow(r, exponent) * vec2(cos(exponent * angle), sin(exponent * angle));
}

void main() {
	vec2 worldCoord = vec2(coord.x * (resolution.x / resolution.y), coord.y) * scale + offset;
	gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);

	const float aa = float(ANTIALIAS_LEVEL);
	vec2 cellSize = scale / resolution;
	float insideAccum = 0.0;
	for (float y = 0.0; y < 1.0; y += 1.0 / aa) {
		for (float x = 0.0; x < 1.0; x += 1.0 / aa) {
            vec2 c = vec2(worldCoord.x + x * cellSize.x, worldCoord.y + y * cellSize.y);

            int result = 0;
            vec2 z = vec2(0.0, 0.0);
            for (int i = 1; i <= MAX_ITERS; i++) {  
                if (i > uIters) { result = i; break; }
                if (dot(z, z) >= 100000.0) {result = i; break;}
                z = ${glslIteration};
            }

            // Smooth gradient coloring via palette
            if (dot(z, z) >= 4.0) {
                float nu = float(result) - log2(log2(length(z)));
                float t = clamp(nu / max(float(uIters), 1.0), 0.0, 1.0);
                gl_FragColor.rgb += samplePalette(t);
            } else {
                insideAccum += 1.0;
            }
        }
    }

    float totalSamples = aa * aa;
    gl_FragColor.rgb /= totalSamples;
    if (uInteriorEnabled == 1) {
        float fracInside = insideAccum / totalSamples;
        gl_FragColor.rgb = mix(gl_FragColor.rgb, uInteriorColor, clamp(fracInside, 0.0, 1.0));
    }
}`
  });
};

// Debug gradient material: visualize domain mapping and palette
export const createDebugGradientMaterial = (): THREE.RawShaderMaterial => {
    return new THREE.RawShaderMaterial({
        uniforms: createDefaultUniforms(),
        vertexShader: defaultVertexShader,
        fragmentShader: `// Debug gradient${fragmentShaderTopShared}
#define ANTIALIAS_LEVEL 1

void main() {
    vec2 worldCoord = vec2(coord.x * (resolution.x / resolution.y), coord.y) * scale + offset;
    float r = length(worldCoord);
    float ang = atan(worldCoord.y, worldCoord.x);
    float t = clamp(0.5 + 0.5 * sin(3.0 * ang) * exp(-r*0.5), 0.0, 1.0);
    vec3 base = vec3(0.5 + 0.5 * sin(2.0 * ang), 0.35 + 0.35 * cos(ang + r), 0.25 + 0.25 * sin(r));
    vec3 pal = samplePalette(t);
    vec3 col = mix(base, pal, 0.7);
    // Axis overlay (thickness ~1 pixel in world units)
    float thickness = scale / resolution.y;
    if (abs(worldCoord.x) < thickness || abs(worldCoord.y) < thickness) {
        col = vec3(1.0);
    }
    gl_FragColor = vec4(col, 1.0);
}`
    });
};

// Simple RGB test material (no palette) to validate pipeline
export const createRGBTestMaterial = (): THREE.RawShaderMaterial => {
    return new THREE.RawShaderMaterial({
        uniforms: createDefaultUniforms(),
        vertexShader: defaultVertexShader,
        fragmentShader: `// RGB test (no palette)
precision highp float;
varying vec2 coord;
uniform vec2 resolution;
uniform vec2 offset;
uniform float scale;

void main() {
    vec2 uv = (coord * 0.5 + 0.5);
    vec2 world = vec2(coord.x * (resolution.x / resolution.y), coord.y) * scale + offset;
    float r = 0.5 + 0.5 * sin(6.2831 * uv.x);
    float g = 0.5 + 0.5 * sin(6.2831 * uv.y + 1.57);
    float b = 0.5 + 0.5 * sin(6.2831 * (uv.x + uv.y) + 3.14);
    // Overlay axes in white
    float thickness = scale / resolution.y;
    if (abs(world.x) < thickness || abs(world.y) < thickness) {
        gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
    } else {
        gl_FragColor = vec4(r, g, b, 1.0);
    }
}`
    });
};

// Mandelbrot without palette (grayscale) to isolate palette issues
export const createMandelbrotMonoMaterial = (): THREE.RawShaderMaterial => {
    return new THREE.RawShaderMaterial({
        uniforms: createDefaultUniforms(),
        vertexShader: defaultVertexShader,
        fragmentShader: `// Mandelbrot grayscale (no palette)${fragmentShaderTopShared}
#define ANTIALIAS_LEVEL 1

void main() {
    vec2 worldCoord = vec2(coord.x * (resolution.x / resolution.y), coord.y) * scale + offset;
    gl_FragColor = vec4(0.0);
    const float aa = float(ANTIALIAS_LEVEL);
    vec2 cellSize = scale / resolution;
    for (int yi = 0; yi < ANTIALIAS_LEVEL; yi++) {
        for (int xi = 0; xi < ANTIALIAS_LEVEL; xi++) {
            vec2 jitter = vec2((float(xi) + 0.5) / aa, (float(yi) + 0.5) / aa);
            vec2 c = vec2(worldCoord.x + jitter.x * cellSize.x, worldCoord.y + jitter.y * cellSize.y);
            vec2 z = vec2(0.0);
            int result = 0;
            for (int i = 1; i <= MAX_ITERS; i++) {
                if (i > uIters) { result = i; break; }
                z = vec2(z.x*z.x - z.y*z.y, 2.0*z.x*z.y) + c;
                if (dot(z,z) > 4.0) { result = i; break; }
            }
            if (dot(z,z) >= 4.0) {
                float nu = float(result) - log2(log2(length(z)));
                float t = clamp(nu / max(float(uIters), 1.0), 0.0, 1.0);
                gl_FragColor.rgb += vec3(t);
            }
        }
    }
    gl_FragColor.rgb /= aa * aa;
    gl_FragColor.a = 1.0;
}`
    });
};
 // Mandelbrot Set (Standard)
export const createMandelbrotMaterial = (): THREE.RawShaderMaterial => {
  return new THREE.RawShaderMaterial({
    uniforms: createDefaultUniforms(),
    vertexShader: defaultVertexShader,
        fragmentShader: `// Smooth-colored mandelbrot set${fragmentShaderTopShared}
#define ANTIALIAS_LEVEL 1

vec2 cmul(vec2 a, vec2 b) {
    return vec2(a.x * b.x - a.y * b.y, a.y * b.x + a.x * b.y);
}

vec2 cpow(vec2 z, float exponent) {
    float angle = atan(z.y / z.x);
    return pow(length(z), exponent) * vec2(cos(exponent * angle), sin(exponent * angle));
}

void main() {
	vec2 worldCoord = vec2(coord.x * (resolution.x / resolution.y), coord.y) * scale + offset;
	gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);

	const float aa = float(ANTIALIAS_LEVEL);
	vec2 cellSize = scale / resolution;
	for (float y = 0.0; y < 1.0; y += 1.0 / aa) {
		for (float x = 0.0; x < 1.0; x += 1.0 / aa) {
            vec2 c = vec2(worldCoord.x + x * cellSize.x, worldCoord.y + y * cellSize.y);

            int result = 0;
            vec2 z = vec2(0.0, 0.0);
            for (int i = 1; i <= MAX_ITERS; i++) {  
                if (i > uIters) { result = i; break; }
                if (dot(z, z) >= 100000.0) {result = i; break;}
                z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;  
            }

            if (dot(z, z) >= 4.0) {
                float nu = float(result) - log2(log2(length(z)));
                float t = clamp(nu / float(uIters), 0.0, 1.0);
                gl_FragColor.rgb += samplePalette(t);
            }
        }
    }

    gl_FragColor.rgb /= aa * aa;
}`
  });
};

// Palette Ramp visualizer (samples palette across X)
export const createPaletteRampMaterial = (): THREE.RawShaderMaterial => {
    return new THREE.RawShaderMaterial({
        uniforms: createDefaultUniforms(),
        vertexShader: defaultVertexShader,
        fragmentShader: `// Palette ramp visualizer${fragmentShaderTopShared}
#define ANTIALIAS_LEVEL 1

void main() {
    vec2 uv = coord * 0.5 + 0.5;
    float t = clamp(uv.x, 0.0, 1.0);
    vec3 col = paletteColor(t);
    // Tick marks
    float tick = step(0.495, abs(fract(uv.x * 10.0) - 0.5));
    col = mix(col, vec3(1.0), smoothstep(0.49, 0.5, tick));
    gl_FragColor = vec4(col, 1.0);
}`
    });
};

// High Precision Mandelbrot
export const createHighPrecisionMaterial = (): THREE.RawShaderMaterial => {
  return new THREE.RawShaderMaterial({
    uniforms: createDefaultUniforms(),
    vertexShader: defaultVertexShader,
    fragmentShader: `// Greater depth Mandelbrot set

// Uses a structure of two floats for higher number precision.
// The shader is obtained from https://cdn.rawgit.com/LMLB/4242936fe79fb9de803c20d1196db8f3/raw/4731034f78414f98500a399d82389c70fe2590b2/Mandelbrot%2520WebGL%2520Example%2520%28Syntopia%25202012%29.htm
// Website title: Mandelbrot WebGL Example (Syntopia 2012)
// I have modified inputs/colors to match the other shaders in this app.${fragmentShaderTopShared}
// "offset" uniform split into two variables for higher bit precision
uniform vec2 offsetMostSignificant;
uniform vec2 offsetLeastSignificant;

#define ANTIALIAS_LEVEL 1
#define ITERATIONS 300

vec2 pixelSize = 2.0 / resolution;

// Mandelbrot coords
float zoom = scale;
vec2 center = offsetMostSignificant;
vec2 centerD = offsetLeastSignificant;

// Julia coords
vec2 center2 = center;
float zoom2 = zoom;

float times_frc(float a, float b) {
    return mix(0.0, a * b, b != 0.0 ? 1.0 : 0.0);
}

float plus_frc(float a, float b) {
    return mix(a, a + b, b != 0.0 ? 1.0 : 0.0);
}

float minus_frc(float a, float b) {
    return mix(a, a - b, b != 0.0 ? 1.0 : 0.0);
}

// Double emulation based on GLSL Mandelbrot Shader by Henry Thasler (www.thasler.org/blog)
//
// Emulation based on Fortran-90 double-single package. See http://crd.lbl.gov/~dhbailey/mpdist/
// Substract: res = ds_add(a, b) => res = a + b
vec2 add (vec2 dsa, vec2 dsb) {
    vec2 dsc;
    float t1, t2, e;

    t1 = plus_frc(dsa.x, dsb.x);
    e = minus_frc(t1, dsa.x);
    t2 = plus_frc(plus_frc(plus_frc(minus_frc(dsb.x, e), minus_frc(dsa.x, minus_frc(t1, e))), dsa.y), dsb.y);
    dsc.x = plus_frc(t1, t2);
    dsc.y = minus_frc(t2, minus_frc(dsc.x, t1));
    return dsc;
}

// Substract: res = ds_sub(a, b) => res = a - b
vec2 sub (vec2 dsa, vec2 dsb) {
    vec2 dsc;
    float e, t1, t2;

    t1 = minus_frc(dsa.x, dsb.x);
    e = minus_frc(t1, dsa.x);
    t2 = minus_frc(plus_frc(plus_frc(minus_frc(minus_frc(0.0, dsb.x), e), minus_frc(dsa.x, minus_frc(t1, e))), dsa.y), dsb.y);

    dsc.x = plus_frc(t1, t2);
    dsc.y = minus_frc(t2, minus_frc(dsc.x, t1));
    return dsc;
}

// Compare: res = -1 if a < b
//              = 0 if a == b
//              = 1 if a > b
float cmp(vec2 dsa, vec2 dsb) {
    if (dsa.x < dsb.x) {
    return -1.;
    }
    if (dsa.x > dsb.x) {
    return 1.;
    }
    if (dsa.y < dsb.y) {
    return -1.;
    }
    if (dsa.y > dsb.y) {
    return 1.;
    }
    return 0.;
}

// Multiply: res = ds_mul(a, b) => res = a * b
vec2 mul (vec2 dsa, vec2 dsb) {
    vec2 dsc;
    float c11, c21, c2, e, t1, t2;
    float a1, a2, b1, b2, cona, conb, split = 8193.;

    cona = times_frc(dsa.x, split);
    conb = times_frc(dsb.x, split);
    a1 = minus_frc(cona, minus_frc(cona, dsa.x));
    b1 = minus_frc(conb, minus_frc(conb, dsb.x));
    a2 = minus_frc(dsa.x, a1);
    b2 = minus_frc(dsb.x, b1);

    c11 = times_frc(dsa.x, dsb.x);
    c21 = plus_frc(times_frc(a2, b2), plus_frc(times_frc(a2, b1), plus_frc(times_frc(a1, b2), minus_frc(times_frc(a1, b1), c11))));

    c2 = plus_frc(times_frc(dsa.x, dsb.y), times_frc(dsa.y, dsb.x));

    t1 = plus_frc(c11, c2);
    e = minus_frc(t1, c11);
    t2 = plus_frc(plus_frc(times_frc(dsa.y, dsb.y), plus_frc(minus_frc(c2, e), minus_frc(c11, minus_frc(t1, e)))), c21);

    dsc.x = plus_frc(t1, t2);
    dsc.y = minus_frc(t2, minus_frc(dsc.x, t1));

    return dsc;
}

// create double-single number from float
vec2 set(float a) {
    return vec2(a, 0.0);
}

vec2 complexMul(vec2 a, vec2 b) {
    return vec2(a.x*b.x -  a.y*b.y,a.x*b.y + a.y * b.x);
}

// double complex multiplication
vec4 dcMul(vec4 a, vec4 b) {
    return vec4(sub(mul(a.xy,b.xy),mul(a.zw,b.zw)),add(mul(a.xy,b.zw),mul(a.zw,b.xy)));
}

vec4 dcAdd(vec4 a, vec4 b) {
    return vec4(add(a.xy,b.xy),add(a.zw,b.zw));
}

// Length of double complex
vec2 dcLength(vec4 a) {
    return add(mul(a.xy,a.xy),mul(a.zw,a.zw));
}

vec4 dcSet(vec2 a) {
    return vec4(a.x,0.,a.y,0.);
}

vec4 dcSet(vec2 a, vec2 ad) {
    return vec4(a.x, ad.x,a.y,ad.y);
}

// Multiply double-complex with double
vec4 dcMul(vec4 a, vec2 b) {
    return vec4(mul(a.xy,b),mul(a.wz,b));
}

vec2 ds_abs(vec2 dsa) {
    return dsa.x < 0.0 ? sub(vec2(0.0), dsa) : dsa;
}

vec3 colorDoublePrecision(vec2 p) {

    vec4 c = dcAdd(dcMul(dcSet(p),vec2(zoom,0.)),dcSet(center, centerD));
    //c.zw = sub(vec2(0.0), c.zw); // Uncomment for burning ship fractal

    vec4 dZ = dcSet(vec2(0.0,0.0));
    vec4 add = c;

    int j = ITERATIONS;
    for (int i = 0; i <= ITERATIONS; i++) {
        if (cmp(dcLength(dZ), set(1000.0))>0.) {break;}
        
        // Uncomment for burning ship fractal
        //dZ.xy = ds_abs(dZ.xy);
        //dZ.zw = ds_abs(dZ.zw);
            
        dZ = dcAdd(dcMul(dZ,dZ),add);
        j = i;
    }

    if (j < ITERATIONS) {
        float nu = float(j) - log2(log2(length(vec2(dZ.x, dZ.z))));
        float t = clamp(nu / float(uIters), 0.0, 1.0);
        return paletteColor(t);
    } else {
        // Inside
        return vec3(0.0);
    }
}

void main() {
    vec3 v = vec3(0.0,0.0,0.0);
    float d = 1.0/float(ANTIALIAS_LEVEL);
    vec2 ard = vec2(pixelSize.x,pixelSize.y)*d;
    for (int x=0; x <ANTIALIAS_LEVEL;x++) {
        for (int y=0; y <ANTIALIAS_LEVEL;y++) {
            vec2 c = vec2(coord.x * (resolution.x / resolution.y), coord.y) +vec2(x,y)*ard;
            vec2 p = c*zoom2 + center2;
            v += colorDoublePrecision(c);
        }
    }
    gl_FragColor = vec4(pow(v/float(ANTIALIAS_LEVEL*ANTIALIAS_LEVEL),vec3(0.99999)),1.0);
}`
  });
};

// Burning Ship
export const createBurningShipMaterial = (): THREE.RawShaderMaterial => {
  return new THREE.RawShaderMaterial({
    uniforms: createDefaultUniforms(),
    vertexShader: defaultVertexShader,
        fragmentShader: `// Burning ship fractal${fragmentShaderTopShared}
#define ANTIALIAS_LEVEL 1

vec2 cmul(vec2 a, vec2 b) {
    return vec2(a.x * b.x - a.y * b.y, a.y * b.x + a.x * b.y);
}

vec2 cpow(vec2 z, float exponent) {
    float angle = atan(z.y / z.x);
    return pow(length(z), exponent) * vec2(cos(exponent * angle), sin(exponent * angle));
}

void main() {
	vec2 worldCoord = vec2(coord.x * (resolution.x / resolution.y), coord.y) * scale + offset;
	gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);

	const float aa = float(ANTIALIAS_LEVEL);
	vec2 cellSize = scale / resolution;
	for (float y = 0.0; y < 1.0; y += 1.0 / aa) {
		for (float x = 0.0; x < 1.0; x += 1.0 / aa) {
            vec2 c = vec2(worldCoord.x + x * cellSize.x, worldCoord.y + y * cellSize.y);
            c.y = -c.y;

            int result = 0;
            vec2 z = vec2(0.0, 0.0);
            for (int i = 1; i <= MAX_ITERS; i++) {  
                if (i > uIters) { result = i; break; }
                if (dot(z, z) >= 100000.0) {result = i; break;}
                z = abs(z);
                z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;  
            }

            if (dot(z, z) >= 4.0) {
                float nu = float(result) - log2(log2(length(z)));
                float t = clamp(nu / float(uIters), 0.0, 1.0);
                gl_FragColor.rgb += paletteColor(t);
            }
        }
    }

    gl_FragColor.rgb /= aa * aa;
}`
  });
};

// Semi Burning Ship (only imaginary part absolute)
export const createSemiBurningShipMaterial = (): THREE.RawShaderMaterial => {
  return new THREE.RawShaderMaterial({
    uniforms: createDefaultUniforms(),
    vertexShader: defaultVertexShader,
        fragmentShader: `// Burning ship fractal, but only the imaginary part of
// the complex number is made absolute${fragmentShaderTopShared}
#define ANTIALIAS_LEVEL 1

vec2 cmul(vec2 a, vec2 b) {
    return vec2(a.x * b.x - a.y * b.y, a.y * b.x + a.x * b.y);
}

vec2 cpow(vec2 z, float exponent) {
    float angle = atan(z.y / z.x);
    return pow(length(z), exponent) * vec2(cos(exponent * angle), sin(exponent * angle));
}

void main() {
	vec2 worldCoord = vec2(coord.x * (resolution.x / resolution.y), coord.y) * scale + offset;
	gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);

	const float aa = float(ANTIALIAS_LEVEL);
	vec2 cellSize = scale / resolution;
	for (float y = 0.0; y < 1.0; y += 1.0 / aa) {
		for (float x = 0.0; x < 1.0; x += 1.0 / aa) {
            vec2 c = vec2(worldCoord.x + x * cellSize.x, worldCoord.y + y * cellSize.y);
            c.y = -c.y;

            int result = 0;
            vec2 z = vec2(0.0, 0.0);
            for (int i = 1; i <= MAX_ITERS; i++) {  
                if (i > uIters) { result = i; break; }
                if (dot(z, z) >= 100000.0) {result = i; break;}
                z.y = abs(z.y);
                z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;  
            }

            if (dot(z, z) >= 4.0) {
                float nu = float(result) - log2(log2(length(z)));
                float t = clamp(nu / float(uIters), 0.0, 1.0);
                gl_FragColor.rgb += paletteColor(t);
            }
        }
    }

    gl_FragColor.rgb /= aa * aa;
}`
  });
};

// Burning Ship z^3
export const createBurningShipZ3Material = (): THREE.RawShaderMaterial => {
  return new THREE.RawShaderMaterial({
    uniforms: createDefaultUniforms(),
    vertexShader: defaultVertexShader,
        fragmentShader: `// z^3 burning ship fractal${fragmentShaderTopShared}
#define ANTIALIAS_LEVEL 1

vec2 cmul(vec2 a, vec2 b) {
    return vec2(a.x * b.x - a.y * b.y, a.y * b.x + a.x * b.y);
}

vec2 cpow(vec2 z, float exponent) {
    float angle = atan(z.y / z.x);
    return pow(length(z), exponent) * vec2(cos(exponent * angle), sin(exponent * angle));
}

void main() {
	vec2 worldCoord = vec2(coord.x * (resolution.x / resolution.y), coord.y) * scale + offset;
	gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);

	const float aa = float(ANTIALIAS_LEVEL);
	vec2 cellSize = scale / resolution;
	for (float y = 0.0; y < 1.0; y += 1.0 / aa) {
		for (float x = 0.0; x < 1.0; x += 1.0 / aa) {
            vec2 c = vec2(worldCoord.x + x * cellSize.x, worldCoord.y + y * cellSize.y);
            c.y = -c.y;

            int result = 0;
            vec2 z = vec2(0.0, 0.0);
            for (int i = 1; i <= MAX_ITERS; i++) {  
                if (i > uIters) { result = i; break; }
                if (dot(z, z) >= 100000.0) {result = i; break;}
                z = abs(z);
                z = cmul(cmul(z, z), z) + c;  
            }

            if (dot(z, z) >= 4.0) {
                float nu = float(result) - (log(log(length(z))) / log(3.0));
                float t = clamp(nu / float(uIters), 0.0, 1.0);
                gl_FragColor.rgb += paletteColor(t);
            }
        }
    }

    gl_FragColor.rgb /= aa * aa;
}`
  });
};

// Julia Set
export const createJuliaMaterial = (): THREE.RawShaderMaterial => {
  return new THREE.RawShaderMaterial({
    uniforms: createDefaultUniforms(),
    vertexShader: defaultVertexShader,
        fragmentShader: `// Julia fractal${fragmentShaderTopAnimateOn}
#define ANTIALIAS_LEVEL 1

vec2 cmul(vec2 a, vec2 b) {
    return vec2(a.x * b.x - a.y * b.y, a.y * b.x + a.x * b.y);
}

vec2 cpow(vec2 z, float exponent) {
    float angle = atan(z.y / z.x);
    return pow(length(z), exponent) * vec2(cos(exponent * angle), sin(exponent * angle));
}

void main() {
	vec2 worldCoord = vec2(coord.x * (resolution.x / resolution.y), coord.y) * scale + offset;
	gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);

	const float aa = float(ANTIALIAS_LEVEL);
	vec2 cellSize = scale / resolution;
	for (float y = 0.0; y < 1.0; y += 1.0 / aa) {
		for (float x = 0.0; x < 1.0; x += 1.0 / aa) {
            vec2 z = vec2(worldCoord.x + x * cellSize.x, worldCoord.y + y * cellSize.y);
            
            int result = 0;
            vec2 c = vec2(-0.73 + sin(0.27015 * 2.0 + time * 0.2) * 0.05, 0.27015);
            for (int i = 1; i <= MAX_ITERS; i++) {
                if (i > uIters) { result = i; break; }
                if (dot(z, z) >= 100000.0) {result = i; break;}
                z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;  
            }

            if (dot(z, z) >= 4.0) {
                float nu = float(result) - log2(log2(length(z)));
                float t = clamp(nu / float(uIters), 0.0, 1.0);
                gl_FragColor.rgb += paletteColor(t);
            }
        }
    }
    
    gl_FragColor.rgb /= aa * aa;
}`
  });
};

// Distance-based coloring
export const createDistanceMaterial = (): THREE.RawShaderMaterial => {
  return new THREE.RawShaderMaterial({
    uniforms: createDefaultUniforms(),
    vertexShader: defaultVertexShader,
        fragmentShader: `// Mandelbrot set with distance-based coloring
// You can increase the antialiasing level here by increasing ANTIALIAS.${fragmentShaderTopShared}
#define ANTIALIAS_LEVEL 1
// Iterations controlled by uIters

vec2 cmul(vec2 a, vec2 b) {
    return vec2(a.x * b.x - a.y * b.y, a.y * b.x + a.x * b.y);
}

vec2 cpow(vec2 z, float exponent) {
    float angle = atan(z.y / z.x);
    return pow(length(z), exponent) * vec2(cos(exponent * angle), sin(exponent * angle));
}

void main() {
	vec2 worldCoord = vec2(coord.x * (resolution.x / resolution.y), coord.y) * scale + offset;
	gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);

	const float aa = float(ANTIALIAS_LEVEL);
	vec2 cellSize = scale / resolution;
	for (float y = 0.0; y < 1.0; y += 1.0 / aa) {
		for (float x = 0.0; x < 1.0; x += 1.0 / aa) {
			float broke = 0.0;
			vec2 z = vec2(0.0);
			vec2 dz = vec2(0.0);
			vec2 c = vec2(worldCoord.x + x * cellSize.x, worldCoord.y + y * cellSize.y);
            for (int i = 0; i < MAX_ITERS; i++) {
                if (i >= uIters) {broke = 1.0; break;}
				if (dot(z, z) > 1024.0) {broke = 1.0; break;}

				// Z' -> 2·Z·Z' + 1
				dz = 2.0 * vec2(z.x * dz.x - z.y * dz.y, z.x * dz.y + z.y * dz.x) + vec2(1.0, 0.0);
					
				// Z -> Z² + c
				z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
			}

            // d(c) = |Z|·log|Z|/|Z'|
			float distance = 0.5 * sqrt(dot(z,z) / dot(dz,dz)) * log(dot(z,z));
			if (broke < 0.5) distance = 0.0;
			
            if (dot(z, z) >= 4.0) {
                float t = clamp(pow(4.0 * distance, 0.03), 0.0, 1.0);
                gl_FragColor.rgb += paletteColor(t);
			}
		}
	}

	gl_FragColor.rgb /= aa * aa;
}`
  });
};

// Heatmap with axis overlay (no palette) to debug iteration and visibility
export const createHeatmapMaterial = (): THREE.RawShaderMaterial => {
    return new THREE.RawShaderMaterial({
        uniforms: createDefaultUniforms(),
        vertexShader: defaultVertexShader,
    fragmentShader: `// Heatmap iteration debug${fragmentShaderTopShared}
#undef MAX_ITERS
#define MAX_ITERS 1024
#define ANTIALIAS_LEVEL 1

void main() {
    vec2 worldCoord = vec2(coord.x * (resolution.x / resolution.y), coord.y) * scale + offset;
    gl_FragColor = vec4(0.0);

    vec2 cellSize = scale / resolution;
    const float invAA = 1.0 / float(ANTIALIAS_LEVEL);
    for (int yi = 0; yi < ANTIALIAS_LEVEL; yi++) {
        for (int xi = 0; xi < ANTIALIAS_LEVEL; xi++) {
            vec2 jitter = vec2((float(xi) + 0.5) * invAA, (float(yi) + 0.5) * invAA);
            vec2 c = vec2(worldCoord.x + jitter.x * cellSize.x, worldCoord.y + jitter.y * cellSize.y);
            vec2 z = vec2(0.0);
            int it = 0;
            for (int i = 1; i <= MAX_ITERS; i++) {
                if (i > uIters) { it = i; break; }
                z = vec2(z.x*z.x - z.y*z.y, 2.0*z.x*z.y) + c;
                if (dot(z,z) > 4.0) { it = i; break; }
            }
            float t = clamp(float(it) / max(float(uIters), 1.0), 0.0, 1.0);
            gl_FragColor.rgb += vec3(t);
        }
    }
    gl_FragColor.rgb /= float(ANTIALIAS_LEVEL * ANTIALIAS_LEVEL);

    // Axis overlay
    float thickness = scale / resolution.y;
    if (abs(worldCoord.x) < thickness || abs(worldCoord.y) < thickness) {
        gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(1.0), 0.85);
    }
    gl_FragColor.a = 1.0;
}`
    });
};

// Tricorn (Mandelbar) - Uses complex conjugate
export const createTricornMaterial = (): THREE.RawShaderMaterial => {
  return new THREE.RawShaderMaterial({
    uniforms: createDefaultUniforms(),
    vertexShader: defaultVertexShader,
        fragmentShader: `// Tricorn (Mandelbar) fractal - uses conjugate z̄² + c${fragmentShaderTopShared}
#define ANTIALIAS_LEVEL 1

void main() {
	vec2 worldCoord = vec2(coord.x * (resolution.x / resolution.y), coord.y) * scale + offset;
	gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);

	const float aa = float(ANTIALIAS_LEVEL);
	vec2 cellSize = scale / resolution;
	for (float y = 0.0; y < 1.0; y += 1.0 / aa) {
		for (float x = 0.0; x < 1.0; x += 1.0 / aa) {
            vec2 c = vec2(worldCoord.x + x * cellSize.x, worldCoord.y + y * cellSize.y);

            int result = 0;
            vec2 z = vec2(0.0, 0.0);
            for (int i = 1; i <= MAX_ITERS; i++) {  
                if (i > uIters) { result = i; break; }
                if (dot(z, z) >= 100000.0) {result = i; break;}
                // Conjugate: z̄² = (x - iy)² = x² - y² - 2ixy
                z = vec2(z.x * z.x - z.y * z.y, -2.0 * z.x * z.y) + c;  
            }

            if (dot(z, z) >= 4.0) {
                float nu = float(result) - log2(log2(length(z)));
                float t = clamp(nu / float(uIters), 0.0, 1.0);
                gl_FragColor.rgb += paletteColor(t);
            }
        }
    }

    gl_FragColor.rgb /= aa * aa;
}`
  });
};

// Newton's Fractal - Newton-Raphson root finding for z³ - 1
export const createNewtonMaterial = (): THREE.RawShaderMaterial => {
  return new THREE.RawShaderMaterial({
    uniforms: createDefaultUniforms(),
    vertexShader: defaultVertexShader,
        fragmentShader: `// Newton's fractal for z³ - 1 = 0${fragmentShaderTopShared}
#define ANTIALIAS_LEVEL 1
#define ITERATIONS 50

vec2 cmul(vec2 a, vec2 b) {
    return vec2(a.x * b.x - a.y * b.y, a.y * b.x + a.x * b.y);
}

vec2 cdiv(vec2 a, vec2 b) {
    float d = dot(b, b);
    return vec2((a.x * b.x + a.y * b.y) / d, (a.y * b.x - a.x * b.y) / d);
}

void main() {
	vec2 worldCoord = vec2(coord.x * (resolution.x / resolution.y), coord.y) * scale + offset;
	gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);

	const float aa = float(ANTIALIAS_LEVEL);
	vec2 cellSize = scale / resolution;
	for (float y = 0.0; y < 1.0; y += 1.0 / aa) {
		for (float x = 0.0; x < 1.0; x += 1.0 / aa) {
            vec2 z = vec2(worldCoord.x + x * cellSize.x, worldCoord.y + y * cellSize.y);

            int result = 0;
            for (int i = 0; i < ITERATIONS; i++) {
                // f(z) = z³ - 1
                vec2 z2 = cmul(z, z);
                vec2 z3 = cmul(z2, z);
                vec2 fz = z3 - vec2(1.0, 0.0);
                
                // f'(z) = 3z²
                vec2 fpz = 3.0 * z2;
                
                // Newton: z_new = z - f(z)/f'(z)
                vec2 delta = cdiv(fz, fpz);
                z = z - delta;
                
                if (length(delta) < 0.0001) {
                    result = i;
                    break;
                }
            }

            // Color based on which root we converged to
            // Three cube roots of unity: 1, e^(2πi/3), e^(4πi/3)
            float angle = atan(z.y, z.x);
            float root = mod(angle + 3.14159, 6.28318) / 2.09439; // Normalize to 0-3
            
                        // Map to palette using angle and speed for subtle variation
                        float convergenceSpeed = float(result) / float(ITERATIONS);
                        float t = clamp((root / 3.0) * 0.6 + (1.0 - convergenceSpeed) * 0.4, 0.0, 1.0);
                        gl_FragColor.rgb += paletteColor(t);
        }
    }

    gl_FragColor.rgb /= aa * aa;
}`
  });
};

// IFS (Sierpinski Triangle) - Using Chaos Game algorithm
export const createIFSMaterial = (): THREE.RawShaderMaterial => {
  return new THREE.RawShaderMaterial({
    uniforms: createDefaultUniforms(),
    vertexShader: defaultVertexShader,
        fragmentShader: `// Sierpinski Triangle via domain folding${fragmentShaderTopShared}
#define ANTIALIAS_LEVEL 1

void main() {
    vec2 worldCoord = vec2(coord.x * (resolution.x / resolution.y), coord.y) * scale + offset;
    gl_FragColor = vec4(0.0);
    const float aa = float(ANTIALIAS_LEVEL);
    vec2 cellSize = scale / resolution;
    for (float y = 0.0; y < 1.0; y += 1.0/aa) {
        for (float x = 0.0; x < 1.0; x += 1.0/aa) {
            vec2 p = vec2(worldCoord.x + x * cellSize.x, worldCoord.y + y * cellSize.y);
            // Normalize to [0,1] triangle domain
            p = (p + vec2(1.0)) * 0.5;
            float m = 0.0;
            for (int i = 0; i < 8; i++) {
                if (p.x + p.y > 1.0) p = vec2(1.0) - p;
                p = fract(p * 2.0);
                m += 1.0;
            }
            float t = m / 8.0;
            gl_FragColor.rgb += samplePalette(t);
        }
    }
    gl_FragColor.rgb /= aa * aa;
    gl_FragColor.a = 1.0;
}`
  });
};

export const materials = {
    normal: () => createCustomMaterial('z^2 + c'),
  hp: createHighPrecisionMaterial,
  burningShip: createBurningShipMaterial,
  semi: createSemiBurningShipMaterial,
  burningShipZ3: createBurningShipZ3Material,
  julia: createJuliaMaterial,
  distance: createDistanceMaterial,
  tricorn: createTricornMaterial,
  newton: createNewtonMaterial,
  ifs: createIFSMaterial,
    rgbTest: createRGBTestMaterial,
    mono: createMandelbrotMonoMaterial,
    paletteRamp: createPaletteRampMaterial,
    heatmap: createHeatmapMaterial,
    debug: createDebugGradientMaterial,
  custom: createMandelbrotMaterial // Placeholder, will be overridden dynamically
} as const;

export type MaterialKey = keyof typeof materials;
