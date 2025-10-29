'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { MouseControls, ViewportState } from '@/lib/mouse-controls';
import { renderNewton } from '@/lib/fractal-engines/newton-fractal';
import { renderTricorn } from '@/lib/fractal-engines/tricorn-fractal';
import { renderLyapunov } from '@/lib/fractal-engines/lyapunov-fractal';
import { renderIFS, sierpinski, fern, dragon } from '@/lib/fractal-engines/ifs-fractal';
import { CustomEquationRenderer } from '@/components/fractals/custom-equation-renderer';
import { CompactControls } from '@/components/fractals/compact-controls';
import { EquationDisplay } from '@/components/fractals/equation-display';
import { hslToRgb } from '@/lib/utils/color-utils';

type FractalType = 'mandelbrot' | 'julia' | 'burningship' | 'newton' | 'tricorn' | 'lyapunov' | 'ifs' | 'custom';

interface FractalState {
  centerX: number;
  centerY: number;
  zoomLevel: number;
  maxIterations: number;
  colorMode: 'smooth' | 'histogram' | 'binary';
  juliaRe: number;
  juliaIm: number;
  ifsFractal: 'sierpinski' | 'fern' | 'dragon';
}

export default function FractalExplorer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseControlsRef = useRef<InstanceType<typeof MouseControls> | null>(null);
  const [fractalType, setFractalType] = useState<FractalType>('mandelbrot');
  const [fractalState, setFractalState] = useState<FractalState>({
    centerX: -0.5,
    centerY: 0,
    zoomLevel: 1,
    maxIterations: 100,
    colorMode: 'smooth',
    juliaRe: -0.7,
    juliaIm: 0.27015,
    ifsFractal: 'sierpinski'
  });
  const [viewport, setViewport] = useState<ViewportState>({
    x: -0.5,
    y: 0,
    zoom: 1,
    velocityX: 0,
    velocityY: 0
  });

  // Store viewport per fractal type for state preservation
  const viewportCacheRef = useRef<Record<FractalType, ViewportState>>({
    mandelbrot: { x: -0.5, y: 0, zoom: 1, velocityX: 0, velocityY: 0 },
    julia: { x: 0, y: 0, zoom: 1, velocityX: 0, velocityY: 0 },
    burningship: { x: -1.75, y: -0.02, zoom: 1, velocityX: 0, velocityY: 0 },
    newton: { x: 0, y: 0, zoom: 1, velocityX: 0, velocityY: 0 },
    tricorn: { x: 0, y: 0, zoom: 1, velocityX: 0, velocityY: 0 },
    lyapunov: { x: 0, y: 0, zoom: 1, velocityX: 0, velocityY: 0 },
    ifs: { x: 0, y: 0, zoom: 1, velocityX: 0, velocityY: 0 },
    custom: { x: 0, y: 0, zoom: 1, velocityX: 0, velocityY: 0 }
  });

  const [fps, setFps] = useState<number>(60);
  const [renderTime, setRenderTime] = useState<number>(0);
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number } | null>(null);
  const frameCountRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(Date.now());

  // Initialize mouse controls
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    mouseControlsRef.current = new MouseControls(canvas, (newViewport) => {
      setViewport(newViewport);
      // Update center based on viewport
      setFractalState(prev => ({
        ...prev,
        centerX: newViewport.x,
        centerY: newViewport.y,
        zoomLevel: Math.log2(newViewport.zoom)
      }));
    });

    return () => {
      mouseControlsRef.current?.destroy();
    };
  }, []);

  // Render fractal
  const renderFractal = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const startTime = performance.now();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Use mouse viewport if available
    const centerX = viewport.x !== undefined ? viewport.x : fractalState.centerX;
    const centerY = viewport.y !== undefined ? viewport.y : fractalState.centerY;
    const zoom = viewport.zoom !== undefined ? viewport.zoom : Math.pow(2, fractalState.zoomLevel);

    if (fractalType === 'newton') {
      renderNewton(canvas, ctx, centerX, centerY, zoom, fractalState.maxIterations);
    } else if (fractalType === 'tricorn') {
      const colorScheme = fractalState.colorMode === 'binary' ? 'classic' : fractalState.colorMode;
      renderTricorn(canvas, ctx, centerX, centerY, zoom, fractalState.maxIterations, colorScheme);
    } else if (fractalType === 'lyapunov') {
      renderLyapunov(canvas, ctx, centerX - 2, centerX + 2, centerY - 2, centerY + 2, fractalState.maxIterations);
    } else if (fractalType === 'ifs') {
      const ifsList = { sierpinski, fern, dragon };
      renderIFS(canvas, ctx, ifsList[fractalState.ifsFractal], 50000);
    } else {
      // Standard fractals: mandelbrot, julia, burningship, custom
      const imageData = ctx.createImageData(width, height);
      const data = imageData.data;

      // Calculate bounds in complex plane
      const zoomFactor = 3.5 / (zoom * Math.max(width, height));
      const xmin = centerX - (width / 2) * zoomFactor;
      const xmax = centerX + (width / 2) * zoomFactor;
      const ymin = centerY - (height / 2) * zoomFactor;
      const ymax = centerY + (height / 2) * zoomFactor;

      const maxIter = fractalState.maxIterations;
      let pixelIndex = 0;

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const px = xmin + (x / width) * (xmax - xmin);
          const py = ymin + (y / height) * (ymax - ymin);

          let iterations = 0;
          let zx = 0, zy = 0;

          while (iterations < maxIter && zx * zx + zy * zy < 4) {
            let nextZx, nextZy;
            
            if (fractalType === 'julia') {
              // Julia set with configurable c
              const cx = fractalState.juliaRe;
              const cy = fractalState.juliaIm;
              nextZx = zx * zx - zy * zy + cx;
              nextZy = 2 * zx * zy + cy;
            } else if (fractalType === 'burningship') {
              // Burning Ship uses absolute values
              const ax = Math.abs(zx);
              const ay = Math.abs(zy);
              nextZx = ax * ax - ay * ay + px;
              nextZy = 2 * ax * ay + py;
            } else {
              // Mandelbrot
              nextZx = zx * zx - zy * zy + px;
              nextZy = 2 * zx * zy + py;
            }

            zx = nextZx;
            zy = nextZy;
            iterations++;
          }

          // Color mapping
          let r, g, b;
          if (fractalState.colorMode === 'binary') {
            const color = iterations === maxIter ? 0 : 255;
            r = g = b = color;
          } else if (fractalState.colorMode === 'histogram') {
            const hue = (iterations / maxIter * 360) % 360;
            const saturation = 100;
            const lightness = iterations === maxIter ? 0 : 50;
            const color = hslToRgb(hue, saturation, lightness);
            r = color.r;
            g = color.g;
            b = color.b;
          } else {
            // Smooth coloring
            const smoothIter = iterations + 1 - Math.log2(Math.log2(zx * zx + zy * zy));
            const color = Math.sin(smoothIter * 0.1) * 127 + 128;
            r = Math.floor(color);
            g = Math.floor((color * 1.5) % 256);
            b = Math.floor((color * 2) % 256);
          }

          data[pixelIndex] = r;
          data[pixelIndex + 1] = g;
          data[pixelIndex + 2] = b;
          data[pixelIndex + 3] = 255;
          pixelIndex += 4;
        }
      }

      ctx.putImageData(imageData, 0, 0);
    }

    const endTime = performance.now();
    setRenderTime(endTime - startTime);

    // Update FPS
    frameCountRef.current++;
    const now = Date.now();
    if (now - lastTimeRef.current >= 1000) {
      setFps(frameCountRef.current);
      frameCountRef.current = 0;
      lastTimeRef.current = now;
    }
  }, [fractalType, fractalState, viewport]);

  // Handle canvas resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (rect) {
        canvas.width = rect.width;
        canvas.height = rect.height;
        renderFractal();
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [renderFractal]);

  // Render fractal when state changes
  useEffect(() => {
    renderFractal();
  }, [renderFractal]);

  // Handle mouse interactions
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    const zoomFactor = Math.pow(2, -fractalState.zoomLevel);
    const xmin = fractalState.centerX - (canvas.width / canvas.height) * zoomFactor;
    const xmax = fractalState.centerX + (canvas.width / canvas.height) * zoomFactor;
    const ymin = fractalState.centerY - zoomFactor;
    const ymax = fractalState.centerY + zoomFactor;

    const newCenterX = xmin + x * (xmax - xmin);
    const newCenterY = ymin + y * (ymax - ymin);

    setFractalState(prev => ({
      ...prev,
      centerX: newCenterX,
      centerY: newCenterY,
      zoomLevel: prev.zoomLevel + 2
    }));
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    setHoveredPoint({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  // Build parameter list from fractal state
  const buildParameters = useCallback((): Array<{name: string; min: number; max: number; value: number; step: number}> => {
    const params = [];

    if (fractalType === 'julia') {
      params.push(
        { name: 'c_re', min: -2, max: 2, value: fractalState.juliaRe, step: 0.01 },
        { name: 'c_im', min: -2, max: 2, value: fractalState.juliaIm, step: 0.01 }
      );
    } else if (fractalType === 'ifs') {
      // IFS parameters shown as selector in controls
    }

    return params;
  }, [fractalType, fractalState]);

  // Handle parameter changes from UI
  const handleParameterChange = (name: string, value: number) => {
    if (name === 'c_re') {
      setFractalState(prev => ({ ...prev, juliaRe: value }));
    } else if (name === 'c_im') {
      setFractalState(prev => ({ ...prev, juliaIm: value }));
    }
  };

  // Handle preset selection
  const handlePresetSelect = (presetKey: string) => {
    interface PresetConfig {
      type: FractalType;
      centerX?: number;
      centerY?: number;
      zoomLevel?: number;
      maxIterations?: number;
      juliaRe?: number;
      juliaIm?: number;
    }

    const presets: Record<string, PresetConfig> = {
      mandelbrot_classic: { type: 'mandelbrot', centerX: -0.5, centerY: 0, zoomLevel: 1, maxIterations: 100 },
      mandelbrot_seahorse: { type: 'mandelbrot', centerX: -0.7469, centerY: 0.1102, zoomLevel: 6, maxIterations: 256 },
      mandelbrot_spiral: { type: 'mandelbrot', centerX: -0.7, centerY: -0.27015, zoomLevel: 10, maxIterations: 256 },
      julia_classic: { type: 'julia', juliaRe: -0.7, juliaIm: 0.27015, maxIterations: 200 },
      julia_dendrite: { type: 'julia', juliaRe: -0.8, juliaIm: 0.156, maxIterations: 200 },
      burning_ship: { type: 'burningship', centerX: -1.75, centerY: -0.02, zoomLevel: 2, maxIterations: 256 },
      newton_default: { type: 'newton', maxIterations: 100 },
      tricorn_basic: { type: 'tricorn', centerX: 0, centerY: 0, zoomLevel: 1, maxIterations: 100 }
    };

    const preset = presets[presetKey];
    if (preset) {
      setFractalType(preset.type);
      const updates: Partial<FractalState> = {};
      if (preset.centerX !== undefined) updates.centerX = preset.centerX;
      if (preset.centerY !== undefined) updates.centerY = preset.centerY;
      if (preset.zoomLevel !== undefined) updates.zoomLevel = preset.zoomLevel;
      if (preset.maxIterations !== undefined) updates.maxIterations = preset.maxIterations;
      if (preset.juliaRe !== undefined) updates.juliaRe = preset.juliaRe;
      if (preset.juliaIm !== undefined) updates.juliaIm = preset.juliaIm;
      
      setFractalState(prev => ({ ...prev, ...updates }));
      
      // Reset viewport for new preset
      const newViewport = { x: preset.centerX ?? -0.5, y: preset.centerY ?? 0, zoom: Math.pow(2, preset.zoomLevel ?? 1), velocityX: 0, velocityY: 0 };
      viewportCacheRef.current[preset.type] = newViewport;
      setViewport(newViewport);
      
      if (mouseControlsRef.current) {
        mouseControlsRef.current.setViewport(newViewport);
      }
    }
  };

  // Handle fractal type change - restore cached viewport
  const handleFractalChange = (type: string) => {
    const newType = type as FractalType;
    setFractalType(newType);
    
    // Restore previously cached viewport for this fractal type
    const cachedViewport = viewportCacheRef.current[newType];
    setViewport(cachedViewport);
    
    if (mouseControlsRef.current) {
      mouseControlsRef.current.setViewport(cachedViewport);
    }
  };

  // Handle reset - return to home position
  const handleReset = () => {
    const defaultViewport: ViewportState = {
      x: fractalType === 'burningship' ? -1.75 : 0,
      y: fractalType === 'burningship' ? -0.02 : 0,
      zoom: 1,
      velocityX: 0,
      velocityY: 0
    };
    
    viewportCacheRef.current[fractalType] = defaultViewport;
    setViewport(defaultViewport);
    
    if (mouseControlsRef.current) {
      mouseControlsRef.current.setViewport(defaultViewport);
    }
  };

  // Sync viewport cache when viewport changes
  useEffect(() => {
    viewportCacheRef.current[fractalType] = viewport;
  }, [fractalType, viewport]);

  return (
    <div className="w-full h-screen flex flex-col bg-black">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-3 flex items-center justify-between">
        <Link href="/" className="text-white hover:text-gray-300 transition">
          ← Back
        </Link>
        <h1 className="text-white text-lg font-semibold">Fractal Explorer</h1>
        <div className="w-32" /> {/* Spacer for centering */}
      </div>

      {fractalType === 'custom' ? (
        // Custom equation renderer
        <div className="flex-1 flex gap-6 p-6 overflow-auto">
          <div className="flex-1">
            <CustomEquationRenderer width={800} height={600} equation="z**2 + c" />
          </div>
        </div>
      ) : (
        // Compact fractal explorer layout
        <div className="flex-1 flex gap-4 p-4">
          {/* Main Canvas - Takes most space */}
          <div className="flex-1 flex flex-col">
            <div className="flex-1 bg-gray-900 rounded-lg border border-gray-700 overflow-hidden relative">
              <canvas
                ref={canvasRef}
                onClick={handleCanvasClick}
                onMouseMove={handleMouseMove}
                className="w-full h-full cursor-crosshair"
                width={800}
                height={600}
              />
              
              {/* Tooltip */}
              {hoveredPoint && (
                <div className="absolute text-xs text-gray-400 pointer-events-none" style={{
                  left: hoveredPoint.x + 10,
                  top: hoveredPoint.y + 10
                }}>
                  Click to zoom
                </div>
              )}
            </div>
          </div>

          {/* Compact Control Panel - Right sidebar */}
          <div className="w-72 overflow-y-auto pr-2">
            <EquationDisplay 
              fractalType={fractalType} 
              julia={fractalType === 'julia' ? { re: fractalState.juliaRe, im: fractalState.juliaIm } : undefined}
            />
            <div className="mt-3">
              <CompactControls
                fractalType={fractalType}
                parameters={buildParameters()}
                onParameterChange={handleParameterChange}
                onFractalChange={handleFractalChange}
                onPresetSelect={handlePresetSelect}
                onReset={handleReset}
                fps={fps}
                renderTime={renderTime}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
