/// <reference types="@webgpu/types" />
import { FractalConfig, WebGPUCapabilities } from '@/types';

export class WebGPURenderer {
  private canvas: HTMLCanvasElement;
  private device: GPUDevice | null = null;
  private context: GPUCanvasContext | null = null;
  private renderPipeline: GPURenderPipeline | null = null;
  private computePipeline: GPUComputePipeline | null = null;
  private uniformBuffer: GPUBuffer | null = null;
  private outputTexture: GPUTexture | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  async initialize(): Promise<void> {
    if (!navigator.gpu) {
      throw new Error('WebGPU not supported');
    }

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      throw new Error('WebGPU adapter not available');
    }

    this.device = await adapter.requestDevice();
    this.context = this.canvas.getContext('webgpu');
    
    if (!this.context) {
      throw new Error('WebGPU context not available');
    }

    const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
    this.context.configure({
      device: this.device,
      format: canvasFormat,
    });

    await this.createPipelines();
    this.createBuffers();
  }

  private async createPipelines(): Promise<void> {
    if (!this.device) return;

    // Load shaders
    const mandelbrotShader = await this.loadShader('/shaders/mandelbrot.wgsl');
    const renderShader = await this.loadShader('/shaders/render.wgsl');

    // Create compute pipeline for fractal calculation
    this.computePipeline = this.device.createComputePipeline({
      layout: 'auto',
      compute: {
        module: this.device.createShaderModule({ code: mandelbrotShader }),
        entryPoint: 'main',
      },
    });

    // Create render pipeline for display
    this.renderPipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: this.device.createShaderModule({ code: renderShader }),
        entryPoint: 'vs_main',
      },
      fragment: {
        module: this.device.createShaderModule({ code: renderShader }),
        entryPoint: 'fs_main',
        targets: [{
          format: navigator.gpu.getPreferredCanvasFormat(),
        }],
      },
      primitive: {
        topology: 'triangle-strip',
      },
    });
  }

  private createBuffers(): void {
    if (!this.device) return;

    // Create uniform buffer for fractal parameters
    this.uniformBuffer = this.device.createBuffer({
      size: 256, // Enough for all fractal parameters
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Create output texture for compute shader
    this.outputTexture = this.device.createTexture({
      size: {
        width: this.canvas.width,
        height: this.canvas.height,
      },
      format: 'rgba8unorm',
      usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
    });
  }

  async render(config: FractalConfig): Promise<void> {
    if (!this.device || !this.computePipeline || !this.renderPipeline || !this.context) {
      throw new Error('WebGPU not properly initialized');
    }

    // Update uniform buffer with fractal parameters
    this.updateUniforms(config);

    const commandEncoder = this.device.createCommandEncoder();

    // Compute pass
    const computePass = commandEncoder.beginComputePass();
    computePass.setPipeline(this.computePipeline);
    
    const computeBindGroup = this.device.createBindGroup({
      layout: this.computePipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: { buffer: this.uniformBuffer! },
        },
        {
          binding: 1,
          resource: this.outputTexture!.createView(),
        },
      ],
    });

    computePass.setBindGroup(0, computeBindGroup);
    
    const workgroupSize = 8;
    const workgroupsX = Math.ceil(this.canvas.width / workgroupSize);
    const workgroupsY = Math.ceil(this.canvas.height / workgroupSize);
    
    computePass.dispatchWorkgroups(workgroupsX, workgroupsY);
    computePass.end();

    // Render pass
    const renderPassDescriptor: GPURenderPassDescriptor = {
      colorAttachments: [
        {
          view: this.context.getCurrentTexture().createView(),
          clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
    };

    const renderPass = commandEncoder.beginRenderPass(renderPassDescriptor);
    renderPass.setPipeline(this.renderPipeline);

    const renderBindGroup = this.device.createBindGroup({
      layout: this.renderPipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: this.outputTexture!.createView(),
        },
      ],
    });

    renderPass.setBindGroup(0, renderBindGroup);
    renderPass.draw(4); // Full-screen quad
    renderPass.end();

    this.device.queue.submit([commandEncoder.finish()]);
  }

  private updateUniforms(config: FractalConfig): void {
    if (!this.device || !this.uniformBuffer) return;

    // Create uniform data array
    const uniformData = new Float32Array([
      config.center.real,
      config.center.imaginary,
      config.zoom,
      config.iterations,
      this.canvas.width,
      this.canvas.height,
      config.colorScheme.smooth ? 1.0 : 0.0,
      0.0, // padding
    ]);

    this.device.queue.writeBuffer(this.uniformBuffer, 0, uniformData);
  }

  private async loadShader(path: string): Promise<string> {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`Failed to load shader: ${path}`);
    }
    return response.text();
  }

  getCapabilities(): WebGPUCapabilities {
    if (!this.device) {
      return {
        supported: false,
        features: [],
        limits: {}
      };
    }

    return {
      supported: true,
      features: Array.from(this.device.features),
      limits: {
        maxComputeWorkgroupSizeX: this.device.limits.maxComputeWorkgroupSizeX,
        maxComputeWorkgroupSizeY: this.device.limits.maxComputeWorkgroupSizeY,
        maxComputeInvocationsPerWorkgroup: this.device.limits.maxComputeInvocationsPerWorkgroup,
      }
    };
  }

  destroy(): void {
    this.outputTexture?.destroy();
    this.uniformBuffer?.destroy();
    this.device?.destroy();
  }
}