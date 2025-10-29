#version 300 es
precision highp float;

uniform vec2 u_center;
uniform float u_zoom;
uniform int u_iterations;
uniform vec2 u_resolution;
uniform float u_time;
uniform int u_smooth;
uniform vec2 u_julia_c; // For Julia sets

in vec2 v_uv;
out vec4 fragColor;

vec2 complex_square(vec2 z) {
    return vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y);
}

vec2 complex_add(vec2 a, vec2 b) {
    return vec2(a.x + b.x, a.y + b.y);
}

float complex_magnitude_squared(vec2 z) {
    return z.x * z.x + z.y * z.y;
}

struct FractalResult {
    float iterations;
    vec2 final_z;
};

FractalResult mandelbrot(vec2 c, int max_iter) {
    vec2 z = vec2(0.0, 0.0);
    
    for (int i = 0; i < max_iter; i++) {
        if (complex_magnitude_squared(z) > 4.0) {
            return FractalResult(float(i), z);
        }
        z = complex_add(complex_square(z), c);
    }
    
    return FractalResult(float(max_iter), z);
}

FractalResult julia(vec2 z, vec2 c, int max_iter) {
    for (int i = 0; i < max_iter; i++) {
        if (complex_magnitude_squared(z) > 4.0) {
            return FractalResult(float(i), z);
        }
        z = complex_add(complex_square(z), c);
    }
    
    return FractalResult(float(max_iter), z);
}

vec3 hsv_to_rgb(vec3 hsv) {
    float h = hsv.x / 60.0;
    float s = hsv.y;
    float v = hsv.z;
    
    float c = v * s;
    float x = c * (1.0 - abs(mod(h, 2.0) - 1.0));
    float m = v - c;
    
    vec3 rgb;
    
    if (h < 1.0) {
        rgb = vec3(c, x, 0.0);
    } else if (h < 2.0) {
        rgb = vec3(x, c, 0.0);
    } else if (h < 3.0) {
        rgb = vec3(0.0, c, x);
    } else if (h < 4.0) {
        rgb = vec3(0.0, x, c);
    } else if (h < 5.0) {
        rgb = vec3(x, 0.0, c);
    } else {
        rgb = vec3(c, 0.0, x);
    }
    
    return rgb + vec3(m);
}

vec3 basic_color(float iterations, int max_iterations) {
    if (iterations >= float(max_iterations)) {
        return vec3(0.0); // Black for points in the set
    }
    
    float t = iterations / float(max_iterations);
    return vec3(
        0.5 + 0.5 * cos(6.28318 * t + 0.0),
        0.5 + 0.5 * cos(6.28318 * t + 2.0),
        0.5 + 0.5 * cos(6.28318 * t + 4.0)
    );
}

vec3 smooth_color(float iterations, vec2 final_z) {
    float magnitude = sqrt(complex_magnitude_squared(final_z));
    float smooth_iter = iterations + 1.0 - log2(log2(magnitude));
    
    float t = smooth_iter / 100.0;
    return hsv_to_rgb(vec3(t * 360.0, 0.8, 0.9));
}

void main() {
    // Convert UV to complex plane coordinates
    float aspect_ratio = u_resolution.x / u_resolution.y;
    float range = 4.0 / u_zoom;
    
    vec2 c = u_center + (v_uv - 0.5) * range * vec2(aspect_ratio, 1.0);
    
    // For Julia sets, use the current position as z and u_julia_c as c
    FractalResult result;
    if (length(u_julia_c) > 0.0) {
        result = julia(c, u_julia_c, u_iterations);
    } else {
        result = mandelbrot(c, u_iterations);
    }
    
    vec3 color;
    if (u_smooth == 1) {
        color = smooth_color(result.iterations, result.final_z);
    } else {
        color = basic_color(result.iterations, u_iterations);
    }
    
    fragColor = vec4(color, 1.0);
}