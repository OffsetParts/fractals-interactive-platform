import { FractalConfig, WebGPUCapabilities } from '@/types';

export class WebGLRenderer {
  private canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private frameBuffer: WebGLFramebuffer | null = null;
  private texture: WebGLTexture | null = null;
  private vertexBuffer: WebGLBuffer | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  async initialize(): Promise<void> {
    this.gl = this.canvas.getContext('webgl2');
    if (!this.gl) {
      throw new Error('WebGL2 not supported');
    }

    // Enable necessary extensions
    const ext = this.gl.getExtension('EXT_color_buffer_float');
    if (!ext) {
      console.warn('EXT_color_buffer_float not supported, using reduced precision');
    }

    await this.createShaders();
    this.createBuffers();
  }

  private async createShaders(): Promise<void> {
    if (!this.gl) return;

    const vertexShaderSource = await this.loadShader('/shaders/vertex.glsl');
    const fragmentShaderSource = await this.loadShader('/shaders/mandelbrot.glsl');

    const vertexShader = this.compileShader(this.gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = this.compileShader(this.gl.FRAGMENT_SHADER, fragmentShaderSource);

    this.program = this.gl.createProgram();
    if (!this.program) {
      throw new Error('Failed to create shader program');
    }

    this.gl.attachShader(this.program, vertexShader);
    this.gl.attachShader(this.program, fragmentShader);
    this.gl.linkProgram(this.program);

    if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
      const error = this.gl.getProgramInfoLog(this.program);
      throw new Error(`Shader program linking failed: ${error}`);
    }
  }

  private compileShader(type: number, source: string): WebGLShader {
    if (!this.gl) throw new Error('WebGL context not available');

    const shader = this.gl.createShader(type);
    if (!shader) {
      throw new Error('Failed to create shader');
    }

    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      const error = this.gl.getShaderInfoLog(shader);
      this.gl.deleteShader(shader);
      throw new Error(`Shader compilation failed: ${error}`);
    }

    return shader;
  }

  private createBuffers(): void {
    if (!this.gl) return;

    // Create full-screen quad
    const vertices = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
       1,  1,
    ]);

    this.vertexBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);

    // Create texture for intermediate results if needed
    this.texture = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
    this.gl.texImage2D(
      this.gl.TEXTURE_2D,
      0,
      this.gl.RGBA32F,
      this.canvas.width,
      this.canvas.height,
      0,
      this.gl.RGBA,
      this.gl.FLOAT,
      null
    );
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
  }

  async render(config: FractalConfig): Promise<void> {
    if (!this.gl || !this.program) {
      throw new Error('WebGL not properly initialized');
    }

    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    this.gl.useProgram(this.program);

    // Set uniforms
    this.setUniforms(config);

    // Bind vertex buffer
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
    const positionLocation = this.gl.getAttribLocation(this.program, 'a_position');
    this.gl.enableVertexAttribArray(positionLocation);
    this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0);

    // Draw full-screen quad
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
  }

  private setUniforms(config: FractalConfig): void {
    if (!this.gl || !this.program) return;

    // Set fractal parameters
    const centerLocation = this.gl.getUniformLocation(this.program, 'u_center');
    this.gl.uniform2f(centerLocation, config.center.real, config.center.imaginary);

    const zoomLocation = this.gl.getUniformLocation(this.program, 'u_zoom');
    this.gl.uniform1f(zoomLocation, config.zoom);

    const iterationsLocation = this.gl.getUniformLocation(this.program, 'u_iterations');
    this.gl.uniform1i(iterationsLocation, config.iterations);

    const resolutionLocation = this.gl.getUniformLocation(this.program, 'u_resolution');
    this.gl.uniform2f(resolutionLocation, this.canvas.width, this.canvas.height);

    const timeLocation = this.gl.getUniformLocation(this.program, 'u_time');
    this.gl.uniform1f(timeLocation, Date.now() / 1000);

    // Set color scheme parameters
    const smoothLocation = this.gl.getUniformLocation(this.program, 'u_smooth');
    this.gl.uniform1i(smoothLocation, config.colorScheme.smooth ? 1 : 0);

    // Set Julia set parameter if applicable
    if (config.type === 'julia' && config.params.c && typeof config.params.c === 'object') {
      const juliaLocation = this.gl.getUniformLocation(this.program, 'u_julia_c');
      const c = config.params.c as unknown as { real: number; imaginary: number };
      this.gl.uniform2f(juliaLocation, c.real, c.imaginary);
    }
  }

  private async loadShader(path: string): Promise<string> {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`Failed to load shader: ${path}`);
    }
    return response.text();
  }

  getCapabilities(): WebGPUCapabilities {
    return {
      supported: false, // This is WebGL, not WebGPU
      features: [],
      limits: {}
    };
  }

  destroy(): void {
    if (this.gl) {
      if (this.program) {
        this.gl.deleteProgram(this.program);
      }
      if (this.vertexBuffer) {
        this.gl.deleteBuffer(this.vertexBuffer);
      }
      if (this.texture) {
        this.gl.deleteTexture(this.texture);
      }
      if (this.frameBuffer) {
        this.gl.deleteFramebuffer(this.frameBuffer);
      }
    }
  }
}