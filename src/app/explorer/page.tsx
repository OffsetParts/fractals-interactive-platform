'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { MouseControls } from '@/lib/mouse-controls';
import { parseEquation, evaluateEquation, ParsedEquation } from '@/lib/math/equation-parser';
import { CompactControls } from '@/components/fractals/compact-controls';
import { EquationDisplay } from '@/components/fractals/equation-display';
import { hslToRgb } from '@/lib/utils/color-utils';

interface ViewportCache {
  [key: string]: FractalViewport;
}

interface FractalViewport {
  x: number;
  y: number;
  zoom: number;
}

// Preset equations that auto-fill the equation bar
const PRESET_EQUATIONS: Record<string, { equation: string; label: string; defaultIterations: number; type?: 'mandelbrot' | 'julia' | 'newton' | 'burningship'; viewport?: FractalViewport }> = {
  mandelbrot: { equation: 'z**2 + c', label: 'Mandelbrot', defaultIterations: 256, type: 'mandelbrot' },
  mandelbrot_burning: { equation: 'z**2 + c', label: 'Burning Ship', defaultIterations: 256, type: 'burningship' },
  julia_classic: { equation: 'z**2 + c', label: 'Julia Set', defaultIterations: 200, type: 'julia' },
  julia_dendrite: { equation: 'z**2 + c', label: 'Julia Dendrite', defaultIterations: 200, type: 'julia' },
  seahorse_valley: { 
    equation: 'z**2 + c', 
    label: 'Seahorse Valley', 
    defaultIterations: 512, 
    type: 'mandelbrot',
    viewport: { x: -0.745, y: 0.1, zoom: 50 }
  },
  mandelbrot3: { equation: 'z**3 + c', label: 'Mandelbrot z³', defaultIterations: 256, type: 'mandelbrot' },
  mandelbrot4: { equation: 'z**4 + c', label: 'Mandelbrot z⁴', defaultIterations: 256, type: 'mandelbrot' },
};

export default function FractalExplorer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseControlsRef = useRef<InstanceType<typeof MouseControls> | null>(null);

  // Core state: equation drives everything
  const [equationInput, setEquationInput] = useState<string>('z**2 + c');
  const [parsedEquation, setParsedEquation] = useState<ParsedEquation | null>(null);
  const [maxIterations, setMaxIterations] = useState<number>(128); // Lower default for better interactivity
  const [adaptiveIterations, setAdaptiveIterations] = useState<number>(128); // Auto-adjusted for performance
  const [colorMode, setColorMode] = useState<'smooth' | 'histogram' | 'binary'>('smooth');
  const [currentPreset, setCurrentPreset] = useState<string>('mandelbrot'); // Track current preset for fractal type

  // Viewport state
  const [viewport, setViewport] = useState<FractalViewport>({ x: 0, y: 0, zoom: 1 });
  const viewportCacheRef = useRef<ViewportCache>({});

  // Rendering stats
  const [fps, setFps] = useState<number>(60);
  const [renderTime, setRenderTime] = useState<number>(0);
  const frameCountRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(Date.now());
  const renderTimesRef = useRef<number[]>([]); // Track recent render times for adaptive adjustment

  // UI visibility states for collapsible panels
  const [showEquation, setShowEquation] = useState<boolean>(true);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [showStats, setShowStats] = useState<boolean>(true);

  // Parse equation whenever it changes
  useEffect(() => {
    try {
      const parsed = parseEquation(equationInput);
      setParsedEquation(parsed);
    } catch (e) {
      console.error('Failed to parse equation:', e);
      setParsedEquation(null);
    }
  }, [equationInput]);

  // Initialize mouse controls
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    mouseControlsRef.current = new MouseControls(canvas, (newViewport) => {
      setViewport({
        x: newViewport.x,
        y: newViewport.y,
        zoom: newViewport.zoom
      });
    });

    return () => {
      mouseControlsRef.current?.destroy();
    };
  }, []);

  // Keyboard shortcuts for toggling panels
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Only handle if not typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      switch (e.key.toLowerCase()) {
        case 'e':
          setShowEquation(prev => !prev);
          break;
        case 'c':
          setShowControls(prev => !prev);
          break;
        case 's':
          setShowStats(prev => !prev);
          break;
        case 'h':
          // Hide all panels
          setShowEquation(false);
          setShowControls(false);
          setShowStats(false);
          break;
        case 'a':
          // Show all panels
          setShowEquation(true);
          setShowControls(true);
          setShowStats(true);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  // Main render function - unified for all equations
  const renderEquation = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !parsedEquation) return;

    const startTime = performance.now();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Use adaptive iterations for rendering
    const currentIterations = adaptiveIterations;

    // Calculate bounds in complex plane
    const zoomFactor = 3.5 / (viewport.zoom * Math.max(width, height));
    const xmin = viewport.x - (width / 2) * zoomFactor;
    const xmax = viewport.x + (width / 2) * zoomFactor;
    const ymin = viewport.y - (height / 2) * zoomFactor;
    const ymax = viewport.y + (height / 2) * zoomFactor;

    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;

    let pixelIndex = 0;
    
    // Get fractal type from current preset
    const presetInfo = PRESET_EQUATIONS[currentPreset];
    const fractalType = presetInfo?.type || 'mandelbrot';

    for (let py = 0; py < height; py++) {
      for (let px = 0; px < width; px++) {
        const cx = xmin + (px / width) * (xmax - xmin);
        const cy = ymin + (py / height) * (ymax - ymin);

        // Initialize z and c based on fractal type
        let z: { re: number; im: number };
        let c: { re: number; im: number };
        
        if (fractalType === 'julia') {
          // Julia sets: z starts at pixel, c is a constant
          z = { re: cx, im: cy };
          c = currentPreset === 'julia_classic' 
            ? { re: -0.4, im: 0.6 }   // Classic Julia set parameter
            : { re: 0.285, im: 0.01 }; // Dendrite parameter
        } else if (fractalType === 'newton') {
          // Newton fractals: only use z, c is not needed
          z = { re: cx, im: cy };
          c = { re: 0, im: 0 }; // Unused but needed for evaluateEquation
        } else if (fractalType === 'burningship') {
          // Burning Ship: z and c both start at pixel, but abs() applied differently
          z = { re: cx, im: cy };
          c = { re: cx, im: cy };
        } else {
          // Mandelbrot-like: both z and c are pixel coordinates
          z = { re: 0, im: 0 };
          c = { re: cx, im: cy };
        }

        let iterations = 0;

        try {
          for (let i = 0; i < currentIterations; i++) {
            // Special handling for Burning Ship (apply abs before iteration)
            if (fractalType === 'burningship') {
              z = { re: Math.abs(z.re), im: Math.abs(z.im) };
            }
            
            // Evaluate equation with current z and c
            const result = evaluateEquation(parsedEquation, { z, c });

            if (result && typeof result === 'object' && result.re !== undefined && result.im !== undefined) {
              z = result;
              const magnitude = Math.sqrt(z.re ** 2 + z.im ** 2);
              
              // Newton fractals use convergence test instead of escape
              if (fractalType === 'newton') {
                // Check if z has converged to a root (stopped changing)
                if (i > 0 && magnitude < 0.0001) {
                  iterations = i;
                  break;
                }
              } else {
                // Standard escape test for Mandelbrot/Julia/Burning Ship
                if (magnitude > 2) {
                  iterations = i;
                  break;
                }
              }

              if (magnitude > 1e10) {
                iterations = currentIterations;
                break;
              }
            } else {
              iterations = currentIterations;
              break;
            }
          }
        } catch {
          iterations = currentIterations;
        }

        // Color the pixel
        let r, g, b;
        if (colorMode === 'binary') {
          const color = iterations === currentIterations ? 0 : 255;
          r = g = b = color;
        } else if (colorMode === 'histogram') {
          const hue = ((iterations / currentIterations) * 360) % 360;
          const rgb = hslToRgb(hue, 100, iterations === currentIterations ? 0 : 50);
          r = rgb.r;
          g = rgb.g;
          b = rgb.b;
        } else {
          // Smooth coloring
          const smoothIter = iterations + 1 - Math.log2(Math.log2(Math.sqrt(z.re ** 2 + z.im ** 2)));
          const hue = (smoothIter * 15) % 360;
          const rgb = hslToRgb(hue, 100, 50);
          r = rgb.r;
          g = rgb.g;
          b = rgb.b;
        }

        data[pixelIndex] = r;
        data[pixelIndex + 1] = g;
        data[pixelIndex + 2] = b;
        data[pixelIndex + 3] = 255;
        pixelIndex += 4;
      }
    }

    ctx.putImageData(imageData, 0, 0);

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

    // Adaptive iteration adjustment for 60 FPS target
    const targetFrameTime = 16.67; // 60 FPS = ~16.67ms per frame
    const renderTime = performance.now() - startTime;
    
    // Store recent render times (keep last 10)
    renderTimesRef.current.push(renderTime);
    if (renderTimesRef.current.length > 10) {
      renderTimesRef.current.shift();
    }

    // Calculate average render time
    const avgRenderTime = renderTimesRef.current.reduce((sum, t) => sum + t, 0) / renderTimesRef.current.length;

    // Adjust iterations if we have enough samples
    if (renderTimesRef.current.length >= 5) {
      if (avgRenderTime > targetFrameTime * 1.5) {
        // Too slow - reduce iterations (but not below 16)
        const newIterations = Math.max(16, Math.floor(adaptiveIterations * 0.85));
        if (newIterations !== adaptiveIterations) {
          setAdaptiveIterations(newIterations);
          console.log(`🔽 Reducing iterations to ${newIterations} (avg render: ${avgRenderTime.toFixed(1)}ms)`);
        }
      } else if (avgRenderTime < targetFrameTime * 0.7 && adaptiveIterations < maxIterations) {
        // Fast enough - can increase iterations (but not above user's max)
        const newIterations = Math.min(maxIterations, Math.floor(adaptiveIterations * 1.15));
        if (newIterations !== adaptiveIterations) {
          setAdaptiveIterations(newIterations);
          console.log(`🔼 Increasing iterations to ${newIterations} (avg render: ${avgRenderTime.toFixed(1)}ms)`);
        }
      }
    }
  }, [parsedEquation, viewport, maxIterations, colorMode, adaptiveIterations, currentPreset]);

  // Handle canvas resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Use full window dimensions for full-screen canvas
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      // Only update if size actually changed
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        renderEquation();
      }
    };

    // Call on mount
    handleResize();

    // Listen to window resize
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [renderEquation]);

  // Render whenever equation or viewport changes
  useEffect(() => {
    renderEquation();
  }, [renderEquation]);

  // Handle preset selection
  const handlePresetSelect = (presetKey: string) => {
    const preset = PRESET_EQUATIONS[presetKey];
    if (!preset) return;

    // Track current preset for fractal type detection
    setCurrentPreset(presetKey);

    // Auto-fill equation and iterations
    setEquationInput(preset.equation);
    setMaxIterations(preset.defaultIterations);

    // Use custom viewport if provided, otherwise use default
    const defaultViewport: FractalViewport = preset.viewport || { x: 0, y: 0, zoom: 1 };
    viewportCacheRef.current[presetKey] = defaultViewport;
    setViewport(defaultViewport);

    if (mouseControlsRef.current) {
      mouseControlsRef.current.setViewport({
        x: defaultViewport.x,
        y: defaultViewport.y,
        zoom: defaultViewport.zoom,
        velocityX: 0,
        velocityY: 0
      });
    }
  };

  // Handle equation changes from the equation display
  const handleEquationChange = (newEquation: string) => {
    setEquationInput(newEquation);
  };

  // Handle reset
  const handleReset = () => {
    const defaultViewport: FractalViewport = { x: 0, y: 0, zoom: 1 };
    setViewport(defaultViewport);

    if (mouseControlsRef.current) {
      mouseControlsRef.current.setViewport({
        x: defaultViewport.x,
        y: defaultViewport.y,
        zoom: defaultViewport.zoom,
        velocityX: 0,
        velocityY: 0
      });
    }
  };

  return (
    <div className="w-full h-screen relative bg-black overflow-hidden">
      {/* Full-screen Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full block"
        style={{ touchAction: 'none' }}
      />

      {/* Floating Top Bar with Back Button and Title */}
      <div className="absolute top-0 left-0 right-0 z-10 pointer-events-none">
        <div className="flex items-center justify-between p-4">
          <Link 
            href="/" 
            className="pointer-events-auto bg-black/60 backdrop-blur-sm border border-gray-700/50 px-4 py-2 rounded-lg text-white hover:bg-black/80 transition flex items-center gap-2"
          >
            <span>←</span>
            <span className="text-sm">Back</span>
          </Link>
          <h1 className="pointer-events-auto bg-black/60 backdrop-blur-sm border border-gray-700/50 px-6 py-2 rounded-lg text-white text-lg font-semibold">
            Fractal Explorer
          </h1>
          <div className="w-24" />
        </div>
      </div>

      {/* Floating Equation Panel - Top Center */}
      <div 
        className="absolute top-20 left-1/2 -translate-x-1/2 z-10 transition-transform duration-300"
        style={{ transform: showEquation ? 'translate(-50%, 0)' : 'translate(-50%, -150%)' }}
      >
        <div className="bg-black/70 backdrop-blur-md border border-gray-700/50 rounded-lg shadow-2xl p-4 min-w-[600px] max-w-[800px] pointer-events-auto">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Equation</h2>
            <button
              onClick={() => setShowEquation(false)}
              className="text-gray-500 hover:text-gray-300 transition text-xs"
            >
              ✕ Hide
            </button>
          </div>
          <EquationDisplay
            equation={equationInput}
            onEquationChange={handleEquationChange}
            parsed={parsedEquation}
          />
        </div>
      </div>

      {/* Floating Controls Panel - Right Side */}
      <div 
        className="absolute top-1/2 right-0 -translate-y-1/2 z-10 transition-transform duration-300"
        style={{ transform: showControls ? 'translate(0, -50%)' : 'translate(110%, -50%)' }}
      >
        <div className="bg-black/70 backdrop-blur-md border border-gray-700/50 rounded-l-lg shadow-2xl p-4 w-80 pointer-events-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Controls</h2>
            <button
              onClick={() => setShowControls(false)}
              className="text-gray-500 hover:text-gray-300 transition text-xs"
            >
              ✕ Hide
            </button>
          </div>
          <CompactControls
            presets={PRESET_EQUATIONS}
            onPresetSelect={handlePresetSelect}
            maxIterations={maxIterations}
            onIterationsChange={setMaxIterations}
            colorMode={colorMode}
            onColorModeChange={setColorMode}
            onReset={handleReset}
            fps={fps}
            renderTime={renderTime}
          />
        </div>
      </div>

      {/* Floating Stats Panel - Bottom Right */}
      <div 
        className="absolute bottom-4 right-4 z-10 transition-transform duration-300"
        style={{ transform: showStats ? 'translate(0, 0)' : 'translate(0, 150%)' }}
      >
        <div className="bg-black/70 backdrop-blur-md border border-gray-700/50 rounded-lg shadow-2xl p-3 min-w-[200px] pointer-events-auto">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider">Performance</h2>
            <button
              onClick={() => setShowStats(false)}
              className="text-gray-500 hover:text-gray-300 transition text-xs"
            >
              ✕
            </button>
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">FPS:</span>
              <span className="text-green-400 font-mono">{fps}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Render:</span>
              <span className="text-blue-400 font-mono">{renderTime.toFixed(1)}ms</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Max Iter:</span>
              <span className="text-blue-400 font-mono">{maxIterations}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Current:</span>
              <span className={adaptiveIterations < maxIterations ? "text-yellow-400 font-mono" : "text-green-400 font-mono"}>
                {adaptiveIterations} {adaptiveIterations < maxIterations && "⚠️"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Toggle Buttons - Left Side (only visible when panels are hidden) */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-2">
        {!showEquation && (
          <button
            onClick={() => setShowEquation(true)}
            className="bg-black/60 backdrop-blur-sm border border-gray-700/50 p-3 rounded-lg text-white hover:bg-black/80 transition pointer-events-auto"
            title="Show Equation (E)"
          >
            <span className="text-sm">📐</span>
          </button>
        )}
        {!showControls && (
          <button
            onClick={() => setShowControls(true)}
            className="bg-black/60 backdrop-blur-sm border border-gray-700/50 p-3 rounded-lg text-white hover:bg-black/80 transition pointer-events-auto"
            title="Show Controls (C)"
          >
            <span className="text-sm">⚙️</span>
          </button>
        )}
        {!showStats && (
          <button
            onClick={() => setShowStats(true)}
            className="bg-black/60 backdrop-blur-sm border border-gray-700/50 p-3 rounded-lg text-white hover:bg-black/80 transition pointer-events-auto"
            title="Show Stats (S)"
          >
            <span className="text-sm">📊</span>
          </button>
        )}
      </div>

      {/* Keyboard Shortcuts Help - Bottom Left */}
      <div className="absolute bottom-4 left-4 z-10 bg-black/60 backdrop-blur-sm border border-gray-700/50 rounded-lg p-3 pointer-events-auto text-xs text-gray-400">
        <div className="font-semibold mb-2 text-white">Keyboard Shortcuts</div>
        <div className="space-y-1 font-mono">
          <div><kbd className="bg-gray-700 px-1.5 py-0.5 rounded">E</kbd> Equation</div>
          <div><kbd className="bg-gray-700 px-1.5 py-0.5 rounded">C</kbd> Controls</div>
          <div><kbd className="bg-gray-700 px-1.5 py-0.5 rounded">S</kbd> Stats</div>
          <div><kbd className="bg-gray-700 px-1.5 py-0.5 rounded">H</kbd> Hide All</div>
          <div><kbd className="bg-gray-700 px-1.5 py-0.5 rounded">A</kbd> Show All</div>
        </div>
      </div>
    </div>
  );
}
