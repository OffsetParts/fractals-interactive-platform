'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { ThreeJsFractalRenderer } from '@/components/fractals/ThreeJsFractalRenderer';
import { CompactControls } from '@/components/fractals/compact-controls';
import { MaterialKey } from '@/lib/webgl/shader-materials';

// Dynamically import EquationDisplay with no SSR (requires MathJax)
const EquationDisplay = dynamic(
  () => import('@/components/fractals/equation-display').then(mod => ({ default: mod.EquationDisplay })),
  { ssr: false }
);

interface FractalViewport {
  x: number;
  y: number;
  zoom: number;
}

// Preset equations that auto-fill the equation bar
const PRESET_EQUATIONS: Record<string, { label: string; defaultIterations: number; materialKey: MaterialKey; equation: string; viewport?: FractalViewport }> = {
  mandelbrot: { label: 'Mandelbrot', defaultIterations: 256, materialKey: 'normal', equation: 'z^2 + c' },
  seahorse: { 
    label: 'Seahorse Valley', 
    defaultIterations: 256, 
    materialKey: 'normal', 
    equation: 'z^2 + c',
    viewport: { x: -0.745, y: 0.105, zoom: 0.015 }
  },
  mandelbrot_hp: { label: 'Mandelbrot (High Precision)', defaultIterations: 256, materialKey: 'hp', equation: 'z^2 + c' },
  mandelbrot_distance: { label: 'Mandelbrot (Distance)', defaultIterations: 256, materialKey: 'distance', equation: 'z^2 + c' },
  burningship: { label: 'Burning Ship', defaultIterations: 256, materialKey: 'burningShip', equation: '|z|^2 + c' },
  burningship_z3: { label: 'Burning Ship z³', defaultIterations: 256, materialKey: 'burningShipZ3', equation: '|z|^3 + c' },
  burningship_semi: { label: 'Semi Burning Ship', defaultIterations: 256, materialKey: 'semi', equation: '(\\text{Re}(z) + |\\text{Im}(z)|i)^2 + c' },
  julia: { label: 'Julia Set', defaultIterations: 200, materialKey: 'julia', equation: 'z^2 + c_{\\text{const}}' },
  tricorn: { label: 'Tricorn (Mandelbar)', defaultIterations: 256, materialKey: 'tricorn', equation: '\\bar{z}^2 + c' },
  newton: { label: "Newton's Fractal", defaultIterations: 50, materialKey: 'newton', equation: 'z - \\frac{z^3 - 1}{3z^2}' },
  ifs: { 
    label: 'IFS (Sierpinski)', 
    defaultIterations: 15, 
    materialKey: 'ifs', 
    equation: '\\text{IFS}(z)',
    viewport: { x: 0, y: 0.2, zoom: 1.8 }
  },
};

export default function FractalExplorer() {
  // Material/renderer state
  const [currentMaterial, setCurrentMaterial] = useState<MaterialKey>('normal');
  const [currentEquation, setCurrentEquation] = useState<string>('z^2 + c');
  const [currentPresetKey, setCurrentPresetKey] = useState<string>('mandelbrot');
  const [isCustomEquation, setIsCustomEquation] = useState<boolean>(false);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  // Core state
  const [maxIterations, setMaxIterations] = useState<number>(150);

  // Viewport state
  const [viewport, setViewport] = useState<FractalViewport>({ x: 0, y: 0, zoom: 1 });

  // Rendering stats
  const [fps, setFps] = useState<number>(60);

  // UI visibility states for collapsible panels
  const [showEquation, setShowEquation] = useState<boolean>(true);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [showStats, setShowStats] = useState<boolean>(true);
  const fpsCounterRef = useRef<{ frameCount: number; lastTime: number }>({ frameCount: 0, lastTime: Date.now() });

  // Initialize window size on mount
  useEffect(() => {
    const updateSize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
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
          setShowEquation((prev) => !prev);
          break;
        case 'c':
          setShowControls((prev) => !prev);
          break;
        case 's':
          setShowStats((prev) => !prev);
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

  // Handle preset selection
  const handlePresetSelect = (presetKey: string) => {
    const preset = PRESET_EQUATIONS[presetKey];
    if (!preset) return;

    // Track current preset
    setCurrentPresetKey(presetKey);
    setIsCustomEquation(false);

    // Set material, equation, and iterations
    setCurrentMaterial(preset.materialKey);
    setCurrentEquation(preset.equation);
    setMaxIterations(preset.defaultIterations);

    // Use custom viewport if provided, otherwise use default
    const newViewport: FractalViewport = preset.viewport || { x: -0.8, y: 0, zoom: 1.5 };
    setViewport(newViewport);
  };

  // Handle equation change - switch to custom mode
  const handleEquationChange = (newEquation: string) => {
    setCurrentEquation(newEquation);
    if (!isCustomEquation) {
      setIsCustomEquation(true);
      setCurrentMaterial('custom');
      setCurrentPresetKey('custom');
    }
  };

  // Handle reset - returns to current preset's default view
  const handleReset = () => {
    const preset = PRESET_EQUATIONS[currentPresetKey];
    if (preset) {
      // Reset to preset's default viewport
      const defaultViewport: FractalViewport = preset.viewport || { x: -0.8, y: 0, zoom: 1.5 };
      setViewport(defaultViewport);
      setMaxIterations(preset.defaultIterations);
    } else {
      // Fallback for custom equations
      setViewport({ x: -0.8, y: 0, zoom: 1.5 });
    }
  };

  // FPS counter update
  const handleFrameUpdate = useCallback(() => {
    fpsCounterRef.current.frameCount++;
    const now = Date.now();
    if (now - fpsCounterRef.current.lastTime >= 1000) {
      setFps(fpsCounterRef.current.frameCount);
      fpsCounterRef.current.frameCount = 0;
      fpsCounterRef.current.lastTime = now;
    }
  }, []);

  return (
    <div className="w-full h-screen relative bg-black overflow-hidden">
      {/* Full-screen THREE.js Canvas */}
      {windowSize.width > 0 && windowSize.height > 0 && (
        <ThreeJsFractalRenderer
          width={windowSize.width}
          height={windowSize.height}
          materialKey={currentMaterial}
          customEquation={isCustomEquation ? currentEquation : undefined}
          initialViewport={viewport}
          onZoom={(zoomLevel) => {
            setViewport((prev) => ({ ...prev, zoom: zoomLevel }));
            handleFrameUpdate();
          }}
          onPan={(x, y) => {
            setViewport((prev) => ({ ...prev, x, y }));
            handleFrameUpdate();
          }}
        />
      )}

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
            Fractal Explorer (Optimized)
          </h1>
          <div className="w-24" />
        </div>
      </div>

      {/* Floating Equation Panel - Bottom Center */}
      <div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 transition-transform duration-300"
        style={{ transform: showEquation ? 'translate(-50%, 0)' : 'translate(-50%, 150%)' }}
      >
        <div className="bg-black/70 backdrop-blur-md border border-gray-700/50 rounded-lg shadow-2xl p-4 min-w-[400px] max-w-[600px] pointer-events-auto">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Current Equation</h2>
            <button
              onClick={() => setShowEquation(false)}
              className="text-gray-500 hover:text-gray-300 transition text-xs"
            >
              ✕ Hide
            </button>
          </div>
          <EquationDisplay
            equation={currentEquation}
            onEquationChange={handleEquationChange}
            parsed={null}
          />
        </div>
      </div>

      {/* Floating Controls Panel - Right Side */}
      <div
        className="absolute top-1/2 right-0 -translate-y-1/2 z-10 transition-transform duration-300"
        style={{ transform: showControls ? 'translate(0, -50%)' : 'translate(110%, -50%)' }}
      >
        <div className="bg-black/70 backdrop-blur-md border border-gray-700/50 rounded-l-lg shadow-2xl p-4 w-80 pointer-events-auto max-h-[80vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-gray-400 text-xs font-semibold uppercase tracking-wider">
              Fractals
            </h2>
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
            colorMode="smooth"
            onColorModeChange={() => {}}
            onReset={handleReset}
            fps={fps}
            renderTime={0}
          />
        </div>
      </div>

      {/* Floating Stats Panel - Bottom Right */}
      <div
        className="absolute bottom-4 right-4 z-10 transition-transform duration-300"
        style={{ transform: showStats ? 'translate(0, 0)' : 'translate(0, 150%)' }}
      >
        <div className="bg-black/70 backdrop-blur-md border border-gray-700/50 rounded-lg shadow-2xl p-3 min-w-[220px] pointer-events-auto">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider">
              Performance
            </h2>
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
              <span className="text-green-400 font-mono">{fps.toFixed(0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Material:</span>
              <span className="text-blue-400 font-mono text-[9px]">{currentMaterial}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Zoom:</span>
              <span className="text-purple-400 font-mono text-[9px]">
                {viewport.zoom.toFixed(2)}x
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Pos:</span>
              <span className="text-cyan-400 font-mono text-[9px]">
                ({viewport.x.toFixed(2)}, {viewport.y.toFixed(2)})
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
            title="Show Fractals (C)"
          >
            <span className="text-sm">🎨</span>
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
        <div className="font-semibold mb-2 text-white">Shortcuts</div>
        <div className="space-y-1 font-mono text-[9px]">
          <div>
            <kbd className="bg-gray-700 px-1.5 py-0.5 rounded">E</kbd> Equation
          </div>
          <div>
            <kbd className="bg-gray-700 px-1.5 py-0.5 rounded">C</kbd> Fractals
          </div>
          <div>
            <kbd className="bg-gray-700 px-1.5 py-0.5 rounded">S</kbd> Stats
          </div>
          <div>Drag: Pan | Wheel: Zoom</div>
        </div>
      </div>
    </div>
  );
}
