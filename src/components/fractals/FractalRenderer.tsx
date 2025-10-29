'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { FractalConfig, RenderStats, WebGPUCapabilities } from '@/types';
import { WebGPURenderer } from '@/lib/webgpu/WebGPURenderer';
import { WebGLRenderer } from '@/lib/webgpu/WebGLRenderer';
import { useRenderStats } from '@/lib/hooks/useRenderStats';

interface FractalRendererProps {
  config: FractalConfig;
  width: number;
  height: number;
  onRenderComplete?: (stats: RenderStats) => void;
  onConfigChange?: (config: FractalConfig) => void;
  className?: string;
}

export const FractalRenderer: React.FC<FractalRendererProps> = ({
  config,
  width,
  height,
  onRenderComplete,
  onConfigChange,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<WebGPURenderer | WebGLRenderer | null>(null);
  const [capabilities, setCapabilities] = useState<WebGPUCapabilities | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const { stats, updateStats } = useRenderStats();

  // Initialize renderer based on WebGPU support
  useEffect(() => {
    const initRenderer = async () => {
      if (!canvasRef.current) return;

      try {
        // Try WebGPU first
        const webgpuRenderer = new WebGPURenderer(canvasRef.current);
        await webgpuRenderer.initialize();
        
        rendererRef.current = webgpuRenderer;
        setCapabilities(webgpuRenderer.getCapabilities());
      } catch (error) {
        console.warn('WebGPU not available, falling back to WebGL2:', error);
        
        try {
          // Fallback to WebGL2
          const webglRenderer = new WebGLRenderer(canvasRef.current);
          await webglRenderer.initialize();
          
          rendererRef.current = webglRenderer;
          setCapabilities({
            supported: false,
            features: [],
            limits: {}
          });
        } catch (webglError) {
          console.error('Neither WebGPU nor WebGL2 available:', webglError);
        }
      }
    };

    initRenderer();

    return () => {
      if (rendererRef.current) {
        rendererRef.current.destroy();
      }
    };
  }, []);

  // Render fractal when config changes
  useEffect(() => {
    const render = async () => {
      if (!rendererRef.current || isRendering) return;

      setIsRendering(true);
      const startTime = performance.now();

      try {
        await rendererRef.current.render(config);
        
        const endTime = performance.now();
        const renderTime = endTime - startTime;
        
        const newStats: RenderStats = {
          fps: 1000 / renderTime,
          renderTime,
          iterations: config.iterations,
          pixelsProcessed: width * height
        };

        updateStats(newStats);
        onRenderComplete?.(newStats);
      } catch (error) {
        console.error('Render error:', error);
      } finally {
        setIsRendering(false);
      }
    };

    render();
  }, [config, width, height, isRendering, onRenderComplete, updateStats]);

  // Handle canvas interactions (zoom, pan)
  const handleCanvasClick = useCallback((event: React.MouseEvent) => {
    if (!onConfigChange) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Convert canvas coordinates to complex plane
    const aspectRatio = width / height;
    const range = 4 / config.zoom;
    
    const real = config.center.real + (x / width - 0.5) * range * aspectRatio;
    const imaginary = config.center.imaginary + (0.5 - y / height) * range;

    // Zoom in on click
    const newConfig: FractalConfig = {
      ...config,
      center: { real, imaginary },
      zoom: config.zoom * 2
    };

    onConfigChange(newConfig);
  }, [config, width, height, onConfigChange]);

  const handleCanvasWheel = useCallback((event: React.WheelEvent) => {
    if (!onConfigChange) return;

    event.preventDefault();
    
    const zoomFactor = event.deltaY > 0 ? 0.8 : 1.25;
    const newConfig: FractalConfig = {
      ...config,
      zoom: config.zoom * zoomFactor
    };

    onConfigChange(newConfig);
  }, [config, onConfigChange]);

  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onClick={handleCanvasClick}
        onWheel={handleCanvasWheel}
        className="border border-gray-300 cursor-crosshair"
        style={{
          width: `${width}px`,
          height: `${height}px`,
          imageRendering: config.quality === 'ultra' ? 'auto' : 'pixelated'
        }}
      />
      
      {isRendering && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="text-white">Rendering...</div>
        </div>
      )}

      {/* Debug info */}
      {process.env.NODE_ENV === 'development' && stats && (
        <div className="absolute top-2 left-2 bg-black bg-opacity-75 text-white text-xs p-2 rounded">
          <div>FPS: {stats.fps.toFixed(1)}</div>
          <div>Render Time: {stats.renderTime.toFixed(1)}ms</div>
          <div>Iterations: {stats.iterations}</div>
          <div>Renderer: {capabilities?.supported ? 'WebGPU' : 'WebGL2'}</div>
        </div>
      )}
    </div>
  );
};