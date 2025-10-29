// Mandelbrot Set Compute Shader (WebGPU)
struct Uniforms {
    center: vec2<f32>,
    zoom: f32,
    max_iterations: u32,
    width: f32,
    height: f32,
    smooth: f32,
    _padding: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var output_texture: texture_storage_2d<rgba8unorm, write>;

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let coords = vec2<i32>(global_id.xy);
    let dimensions = vec2<i32>(i32(uniforms.width), i32(uniforms.height));
    
    if (coords.x >= dimensions.x || coords.y >= dimensions.y) {
        return;
    }
    
    // Convert pixel coordinates to complex plane
    let aspect_ratio = uniforms.width / uniforms.height;
    let range = 4.0 / uniforms.zoom;
    
    let x = uniforms.center.x + (f32(coords.x) / uniforms.width - 0.5) * range * aspect_ratio;
    let y = uniforms.center.y + (0.5 - f32(coords.y) / uniforms.height) * range;
    
    let c = vec2<f32>(x, y);
    let result = mandelbrot(c, uniforms.max_iterations);
    
    var color: vec3<f32>;
    if (uniforms.smooth > 0.5) {
        color = smooth_color(result.iterations, result.final_z);
    } else {
        color = basic_color(result.iterations, uniforms.max_iterations);
    }
    
    textureStore(output_texture, coords, vec4<f32>(color, 1.0));
}

struct MandelbrotResult {
    iterations: f32,
    final_z: vec2<f32>,
}

fn mandelbrot(c: vec2<f32>, max_iter: u32) -> MandelbrotResult {
    var z = vec2<f32>(0.0, 0.0);
    var i: u32 = 0;
    
    for (i = 0; i < max_iter; i++) {
        let z_squared = complex_square(z);
        z = complex_add(z_squared, c);
        
        if (complex_magnitude_squared(z) > 4.0) {
            break;
        }
    }
    
    return MandelbrotResult(f32(i), z);
}

fn julia(z: vec2<f32>, c: vec2<f32>, max_iter: u32) -> MandelbrotResult {
    var current_z = z;
    var i: u32 = 0;
    
    for (i = 0; i < max_iter; i++) {
        let z_squared = complex_square(current_z);
        current_z = complex_add(z_squared, c);
        
        if (complex_magnitude_squared(current_z) > 4.0) {
            break;
        }
    }
    
    return MandelbrotResult(f32(i), current_z);
}

// Complex number operations
fn complex_add(a: vec2<f32>, b: vec2<f32>) -> vec2<f32> {
    return vec2<f32>(a.x + b.x, a.y + b.y);
}

fn complex_square(z: vec2<f32>) -> vec2<f32> {
    return vec2<f32>(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y);
}

fn complex_magnitude_squared(z: vec2<f32>) -> f32 {
    return z.x * z.x + z.y * z.y;
}

// Color schemes
fn basic_color(iterations: f32, max_iterations: u32) -> vec3<f32> {
    if (iterations >= f32(max_iterations)) {
        return vec3<f32>(0.0, 0.0, 0.0); // Black for points in the set
    }
    
    let t = iterations / f32(max_iterations);
    return vec3<f32>(
        0.5 + 0.5 * cos(6.28318 * t + 0.0),
        0.5 + 0.5 * cos(6.28318 * t + 2.0),
        0.5 + 0.5 * cos(6.28318 * t + 4.0)
    );
}

fn smooth_color(iterations: f32, final_z: vec2<f32>) -> vec3<f32> {
    let magnitude = sqrt(complex_magnitude_squared(final_z));
    let smooth_iter = iterations + 1.0 - log2(log2(magnitude));
    
    let t = smooth_iter / 100.0; // Normalize for color mapping
    
    // HSV to RGB conversion for smooth gradients
    return hsv_to_rgb(vec3<f32>(t * 360.0, 0.8, 0.9));
}

fn hsv_to_rgb(hsv: vec3<f32>) -> vec3<f32> {
    let h = hsv.x / 60.0;
    let s = hsv.y;
    let v = hsv.z;
    
    let c = v * s;
    let x = c * (1.0 - abs((h % 2.0) - 1.0));
    let m = v - c;
    
    var rgb: vec3<f32>;
    
    if (h < 1.0) {
        rgb = vec3<f32>(c, x, 0.0);
    } else if (h < 2.0) {
        rgb = vec3<f32>(x, c, 0.0);
    } else if (h < 3.0) {
        rgb = vec3<f32>(0.0, c, x);
    } else if (h < 4.0) {
        rgb = vec3<f32>(0.0, x, c);
    } else if (h < 5.0) {
        rgb = vec3<f32>(x, 0.0, c);
    } else {
        rgb = vec3<f32>(c, 0.0, x);
    }
    
    return rgb + vec3<f32>(m, m, m);
}