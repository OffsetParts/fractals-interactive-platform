/**
 * High-performance THREE.js shader materials for fractal rendering
 * Based on optimized WebGL implementation
 */

import * as THREE from 'three';

export interface ShaderUniforms {
  time: { value: number };
  resolution: { value: THREE.Vector2 };
  offset: { value: THREE.Vector2 };
  scale: { value: number };
  offsetMostSignificant: { value: THREE.Vector2 };
  offsetLeastSignificant: { value: THREE.Vector2 };
  [uniform: string]: { value: unknown };
}

const createDefaultUniforms = (): ShaderUniforms => ({
  time: { value: 1.0 },
  resolution: { value: new THREE.Vector2(1, 1) },
  offset: { value: new THREE.Vector2(0, 0) },
  scale: { value: 1.0 },
  offsetMostSignificant: { value: new THREE.Vector2(0, 0) },
  offsetLeastSignificant: { value: new THREE.Vector2(0, 0) }
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
varying vec2 coord; // The pixel coordinates from (-1, -1) to (1, 1)
uniform vec2 resolution; // The resolution of the draw area
uniform vec2 offset; // The panning offset
uniform float scale; // The zoom factor\n\n`;

const fragmentShaderTopAnimateOn = fragmentShaderTopShared + `#define ANIMATE 1 // Set to 1 to render the fractal every frame. Set to 0 to only render upon interaction.
uniform float time; // Time since program start, in seconds\n\n`;

// Parse equation string to GLSL code
function parseEquationToGLSL(equation: string): string {
  let glsl = equation
    // Replace ** with proper power handling
    .replace(/z\*\*(\d+)/g, (_, exp) => {
      const n = parseInt(exp);
      if (n === 2) return '(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y)';
      if (n === 3) return 'cmul(cmul(z, z), z)';
      return `cpow(z, ${exp}.0)`;
    })
    // Handle abs(z)
    .replace(/abs\(z\)/g, 'vec2(abs(z.x), abs(z.y))')
    // Handle conj(z) - complex conjugate
    .replace(/conj\(z\)/g, 'vec2(z.x, -z.y)')
    // Replace z^2 with proper complex multiplication
    .replace(/z\^2/g, 'vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y)')
    .replace(/z\^3/g, 'cmul(cmul(z, z), z)')
    // Replace + c with proper complex addition
    .replace(/\+\s*c/g, '+ c');
  
  return glsl;
}

// Create custom material from equation
export const createCustomMaterial = (equation: string): THREE.RawShaderMaterial => {
  const glslIteration = parseEquationToGLSL(equation);
  
  return new THREE.RawShaderMaterial({
    uniforms: createDefaultUniforms(),
    vertexShader: defaultVertexShader,
    fragmentShader: `// Custom fractal: ${equation}${fragmentShaderTopShared}
#define ANTIALIAS_LEVEL 1
#define ITERATIONS 150

vec2 cmul(vec2 a, vec2 b) {
    return vec2(a.x * b.x - a.y * b.y, a.y * b.x + a.x * b.y);
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
	for (float y = 0.0; y < 1.0; y += 1.0 / aa) {
		for (float x = 0.0; x < 1.0; x += 1.0 / aa) {
            vec2 c = vec2(worldCoord.x + x * cellSize.x, worldCoord.y + y * cellSize.y);

            int result = 0;
            vec2 z = vec2(0.0, 0.0);
            for (int i = 1; i <= ITERATIONS; i++) {  
                if (dot(z, z) >= 100000.0) {result = i; break;}
                z = ${glslIteration};
            }

            // Vibrant Coloring
            if (dot(z, z) >= 4.0) {
                float weight = fract(clamp((float(result) - log2(log2(length(z)))) / float(ITERATIONS), 0.0, 1.0) * 3.0) * 3.0;
                vec3 color0 = vec3(0.0, 0.7, 1.0);  // Cyan
                vec3 color1 = vec3(1.0, 0.0, 0.5);  // Hot pink
                vec3 color2 = vec3(1.0, 0.9, 0.0);  // Bright yellow
                if (weight < 1.0) gl_FragColor.rgb += mix(color0, color1, fract(weight)); 
                else if (weight < 2.0) gl_FragColor.rgb += mix(color1, color2, fract(weight));  
                else gl_FragColor.rgb += mix(color2, color0, fract(weight));
            }
        }
    }

    gl_FragColor.rgb /= aa * aa;
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
#define ITERATIONS 150

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
            for (int i = 1; i <= ITERATIONS; i++) {  
                if (dot(z, z) >= 100000.0) {result = i; break;}
                z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;  
            }

            // Vibrant Coloring
            if (dot(z, z) >= 4.0) {
                float weight = fract(clamp((float(result) - log2(log2(length(z)))) / float(ITERATIONS), 0.0, 1.0) * 3.0) * 3.0;
                vec3 color0 = vec3(0.0, 0.7, 1.0);  // Cyan
                vec3 color1 = vec3(1.0, 0.0, 0.5);  // Hot pink
                vec3 color2 = vec3(1.0, 0.9, 0.0);  // Bright yellow
                if (weight < 1.0) gl_FragColor.rgb += mix(color0, color1, fract(weight)); 
                else if (weight < 2.0) gl_FragColor.rgb += mix(color1, color2, fract(weight));  
                else gl_FragColor.rgb += mix(color2, color0, fract(weight));
            }
        }
    }

    gl_FragColor.rgb /= aa * aa;
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
        float weight = fract(clamp((float(j) - log2(log2(length(vec2(dZ.x, dZ.z))))) / float(ITERATIONS), 0.0, 1.0) * 3.0) * 3.0;
        vec3 color0 = vec3(0.0, 0.7, 1.0);  // Cyan
        vec3 color1 = vec3(1.0, 0.0, 0.5);  // Hot pink
        vec3 color2 = vec3(1.0, 0.9, 0.0);  // Bright yellow
        vec3 finalColor;
        if (weight < 1.0) finalColor = mix(color0, color1, fract(weight)); 
        else if (weight < 2.0) finalColor = mix(color1, color2, fract(weight));  
        else finalColor = mix(color2, color0, fract(weight));
        return finalColor;
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
#define ITERATIONS 150

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
            for (int i = 1; i <= ITERATIONS; i++) {  
                if (dot(z, z) >= 100000.0) {result = i; break;}
                z = abs(z);
                z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;  
            }

            // Coloring
            if (dot(z, z) >= 4.0) {
                float weight = fract(clamp((float(result) - log2(log2(length(z)))) / float(ITERATIONS), 0.0, 1.0) * 3.0) * 3.0;
                vec3 color0 = vec3(0.0, 0.7, 1.0);  // Cyan
                vec3 color1 = vec3(1.0, 0.0, 0.5);  // Hot pink
                vec3 color2 = vec3(1.0, 0.9, 0.0);  // Bright yellow
                if (weight < 1.0) gl_FragColor.rgb += mix(color0, color1, fract(weight)); 
                else if (weight < 2.0) gl_FragColor.rgb += mix(color1, color2, fract(weight));  
                else gl_FragColor.rgb += mix(color2, color0, fract(weight));
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
#define ITERATIONS 150

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
            for (int i = 1; i <= ITERATIONS; i++) {  
                if (dot(z, z) >= 100000.0) {result = i; break;}
                z.y = abs(z.y);
                z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;  
            }

            // Coloring
            if (dot(z, z) >= 4.0) {
                float weight = fract(clamp((float(result) - log2(log2(length(z)))) / float(ITERATIONS), 0.0, 1.0) * 3.0) * 3.0;
                vec3 color0 = vec3(0.0, 0.7, 1.0);  // Cyan
                vec3 color1 = vec3(1.0, 0.0, 0.5);  // Hot pink
                vec3 color2 = vec3(1.0, 0.9, 0.0);  // Bright yellow
                if (weight < 1.0) gl_FragColor.rgb += mix(color0, color1, fract(weight)); 
                else if (weight < 2.0) gl_FragColor.rgb += mix(color1, color2, fract(weight));  
                else gl_FragColor.rgb += mix(color2, color0, fract(weight));
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
#define ITERATIONS 150

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
            for (int i = 1; i <= ITERATIONS; i++) {  
                if (dot(z, z) >= 100000.0) {result = i; break;}
                z = abs(z);
                z = cmul(cmul(z, z), z) + c;  
            }

            // Smooth coloring
            if (dot(z, z) >= 4.0) {
                float weight = fract(clamp((float(result) - log(log(length(z))) / log(3.0)) / float(ITERATIONS), 0.0, 1.0) * 3.0) * 3.0;
                vec3 color0 = vec3(0.0, 0.7, 1.0);  // Cyan
                vec3 color1 = vec3(1.0, 0.0, 0.5);  // Hot pink
                vec3 color2 = vec3(1.0, 0.9, 0.0);  // Bright yellow
                if (weight < 1.0) gl_FragColor.rgb += mix(color0, color1, fract(weight)); 
                else if (weight < 2.0) gl_FragColor.rgb += mix(color1, color2, fract(weight));  
                else gl_FragColor.rgb += mix(color2, color0, fract(weight));
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
#define ITERATIONS 150

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
            for (int i = 1; i <= ITERATIONS; i++) {
                if (dot(z, z) >= 100000.0) {result = i; break;}
                z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;  
            }

            // Coloring
            if (dot(z, z) >= 4.0) {
                float weight = fract(clamp((float(result) - log2(log2(length(z)))) / float(ITERATIONS), 0.0, 1.0) * 3.0) * 3.0;
                vec3 color0 = vec3(0.0, 0.7, 1.0);  // Cyan
                vec3 color1 = vec3(1.0, 0.0, 0.5);  // Hot pink
                vec3 color2 = vec3(1.0, 0.9, 0.0);  // Bright yellow
                if (weight < 1.0) gl_FragColor.rgb += mix(color0, color1, fract(weight)); 
                else if (weight < 2.0) gl_FragColor.rgb += mix(color1, color2, fract(weight));  
                else gl_FragColor.rgb += mix(color2, color0, fract(weight));
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
#define ITERATIONS 150

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
			for (int i = 0; i < ITERATIONS; i++) {
				if (dot(z, z) > 1024.0) {broke = 1.0; break;}

				// Z' -> 2·Z·Z' + 1
				dz = 2.0 * vec2(z.x * dz.x - z.y * dz.y, z.x * dz.y + z.y * dz.x) + vec2(1.0, 0.0);
					
				// Z -> Z² + c
				z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
			}

			// d(c) = |Z|·log|Z|/|Z'|
			float distance = 0.5 * sqrt(dot(z,z) / dot(dz,dz)) * log(dot(z,z));
			if (broke < 0.5) distance = 0.0;
			
			// Coloring
			if (dot(z, z) >= 4.0) {
				float weight = fract(clamp(pow(4.0 * distance, 0.03), 0.0, 1.0) * 3.0) * 3.0;
				vec3 color0 = vec3(0.0, 0.7, 1.0);  // Cyan
				vec3 color1 = vec3(1.0, 0.5, 0.0);
				vec3 color2 = vec3(0.0, 0.0, 0.5);
				if (weight < 1.0) gl_FragColor.rgb += mix(color0, color1, fract(weight)); 
				else if (weight < 2.0) gl_FragColor.rgb += mix(color1, color2, fract(weight));  
				else gl_FragColor.rgb += mix(color2, color0, fract(weight));
			}
		}
	}

	gl_FragColor.rgb /= aa * aa;
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
#define ITERATIONS 150

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
            for (int i = 1; i <= ITERATIONS; i++) {  
                if (dot(z, z) >= 100000.0) {result = i; break;}
                // Conjugate: z̄² = (x - iy)² = x² - y² - 2ixy
                z = vec2(z.x * z.x - z.y * z.y, -2.0 * z.x * z.y) + c;  
            }

            // Vibrant Coloring
            if (dot(z, z) >= 4.0) {
                float weight = fract(clamp((float(result) - log2(log2(length(z)))) / float(ITERATIONS), 0.0, 1.0) * 3.0) * 3.0;
                vec3 color0 = vec3(0.0, 0.7, 1.0);  // Cyan
                vec3 color1 = vec3(1.0, 0.0, 0.5);  // Hot pink
                vec3 color2 = vec3(1.0, 0.9, 0.0);  // Bright yellow
                if (weight < 1.0) gl_FragColor.rgb += mix(color0, color1, fract(weight)); 
                else if (weight < 2.0) gl_FragColor.rgb += mix(color1, color2, fract(weight));  
                else gl_FragColor.rgb += mix(color2, color0, fract(weight));
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
            
            vec3 color0 = vec3(0.0, 0.7, 1.0);  // Cyan - root 1
            vec3 color1 = vec3(1.0, 0.0, 0.5);  // Hot pink - root 2
            vec3 color2 = vec3(1.0, 0.9, 0.0);  // Bright yellow - root 3
            
            float convergenceSpeed = float(result) / float(ITERATIONS);
            vec3 baseColor;
            if (root < 1.0) baseColor = color0;
            else if (root < 2.0) baseColor = color1;
            else baseColor = color2;
            
            gl_FragColor.rgb += baseColor * (1.0 - convergenceSpeed * 0.5);
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
    fragmentShader: `// Sierpinski Triangle via Chaos Game${fragmentShaderTopShared}
#define ANTIALIAS_LEVEL 1

void main() {
	vec2 worldCoord = vec2(coord.x * (resolution.x / resolution.y), coord.y) * scale + offset;
	gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);

	const float aa = float(ANTIALIAS_LEVEL);
	vec2 cellSize = scale / resolution;
	
	for (float y = 0.0; y < 1.0; y += 1.0 / aa) {
		for (float x = 0.0; x < 1.0; x += 1.0 / aa) {
            vec2 p = vec2(worldCoord.x + x * cellSize.x, worldCoord.y + y * cellSize.y);
            
            // Three vertices of equilateral triangle
            vec2 v1 = vec2(0.0, 0.0);
            vec2 v2 = vec2(1.0, 0.0);
            vec2 v3 = vec2(0.5, 0.866);
            
            // Check if point forms Sierpinski triangle pattern
            // Using the deterministic subdivision approach
            vec2 testPoint = p * 2.0; // Scale into working space
            
            float intensity = 0.0;
            
            // Test multiple iterations of subdivision
            for (int iter = 0; iter < 8; iter++) {
                // Center of triangle
                vec2 center = (v1 + v2 + v3) / 3.0;
                
                // Check which sub-triangle the point is in
                vec2 localP = testPoint - center;
                
                // Barycentric test simplified
                float s1 = sign(localP.x - 0.0);
                float s2 = sign(localP.y - 0.0);
                
                // Determine which third to remove (middle)
                vec2 mid1 = (v1 + v2) * 0.5;
                vec2 mid2 = (v2 + v3) * 0.5;
                vec2 mid3 = (v3 + v1) * 0.5;
                
                // Check if in removed region (middle triangle)
                float d1 = length(testPoint - mid1);
                float d2 = length(testPoint - mid2);
                float d3 = length(testPoint - mid3);
                
                float minDist = min(d1, min(d2, d3));
                
                // If too close to midpoints, it's in removed region
                if (minDist < 0.15 / pow(2.0, float(iter))) {
                    intensity = 0.0;
                    break;
                }
                
                // Scale down for next iteration
                testPoint = testPoint * 2.0;
                
                if (iter > 3) {
                    intensity = 1.0;
                }
            }
            
            if (intensity > 0.0) {
                // Colorful gradient based on position
                vec3 color0 = vec3(0.0, 0.7, 1.0);  // Cyan
                vec3 color1 = vec3(1.0, 0.0, 0.5);  // Hot pink
                vec3 color2 = vec3(1.0, 0.9, 0.0);  // Bright yellow
                
                float colorMix = fract(p.x * 2.0 + p.y * 3.0);
                vec3 finalColor;
                if (colorMix < 0.33) finalColor = color0;
                else if (colorMix < 0.66) finalColor = color1;
                else finalColor = color2;
                
                gl_FragColor.rgb += finalColor * intensity;
            }
        }
    }

    gl_FragColor.rgb /= aa * aa;
}`
  });
};

export const materials = {
  normal: createMandelbrotMaterial,
  hp: createHighPrecisionMaterial,
  burningShip: createBurningShipMaterial,
  semi: createSemiBurningShipMaterial,
  burningShipZ3: createBurningShipZ3Material,
  julia: createJuliaMaterial,
  distance: createDistanceMaterial,
  tricorn: createTricornMaterial,
  newton: createNewtonMaterial,
  ifs: createIFSMaterial,
  custom: createMandelbrotMaterial // Placeholder, will be overridden dynamically
} as const;

export type MaterialKey = keyof typeof materials;
