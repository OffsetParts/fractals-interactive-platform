'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { ThreeJsFractalRenderer } from '@/components/fractals/ThreeJsFractalRenderer';
import { CompactControls } from '@/components/fractals/compact-controls';
import { ParameterControls } from '@/components/fractals/parameter-controls';
import { AnimationControls } from '@/components/fractals/animation-controls';
import { MaterialKey } from '@/lib/webgl/shader-materials';
import { ALL_PALETTES, DEFAULT_PALETTE, PaletteName } from '@/lib/utils/palettes';

interface FractalViewport {
  x: number;
  y: number;
  zoom: number;
}

// Fractal presets with parameterization
const PRESET_EQUATIONS: Record<string, { label: string; defaultIterations: number; materialKey: MaterialKey; viewport?: FractalViewport }> = {
  mandelbrot: { label: 'Mandelbrot', defaultIterations: 50, materialKey: 'normal' },
  burningship: { label: 'Burning Ship', defaultIterations: 50, materialKey: 'burningShip' },
  burningship_z3: { label: 'Burning Ship z³', defaultIterations: 50, materialKey: 'burningShipZ3' },
  burningship_semi: { label: 'Semi Burning Ship', defaultIterations: 50, materialKey: 'semi' },
  julia: { label: 'Julia Set', defaultIterations: 50, materialKey: 'julia' },
  tricorn: { label: 'Tricorn (Mandelbar)', defaultIterations: 50, materialKey: 'tricorn' },
  newton: { label: "Newton's Fractal", defaultIterations: 50, materialKey: 'newton' },
  spiral: { label: 'Spiral/Galaxy (z + c)', defaultIterations: 50, materialKey: 'spiral', viewport: { x: 0, y: 0, zoom: 1.5 } }
};

export default function FractalExplorer() {
  // Material/renderer state
  const [currentMaterial, setCurrentMaterial] = useState<MaterialKey>('normal');
  const [currentPresetKey, setCurrentPresetKey] = useState<string>('mandelbrot');
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  // Complex parameter state
  const [zReal, setZReal] = useState<number>(0.0);
  const [zImag, setZImag] = useState<number>(0.0);
  const [cReal, setCReal] = useState<number>(0.0);
  const [cImag, setCImag] = useState<number>(0.0);
  const [xReal, setXReal] = useState<number>(2.0); // Default exponent is 2 (classic Mandelbrot/Julia)
  const [xImag, setXImag] = useState<number>(0.0);

  // Core state
  const [maxIterations, setMaxIterations] = useState<number>(50);
  const [palette, setPalette] = useState<PaletteName>(DEFAULT_PALETTE);
  const [autoIters, setAutoIters] = useState<boolean>(false);
  const [autoTone, setAutoTone] = useState<boolean>(false);
  const [gamma, setGamma] = useState<number>(1.15);
  const [bandStrength, setBandStrength] = useState<number>(0.85);
  const [bandCenter, setBandCenter] = useState<number>(0.88);
  const [bandWidth, setBandWidth] = useState<number>(0.035);
  const [interiorEnabled, setInteriorEnabled] = useState<boolean>(false);
  const [bands, setBands] = useState<number>(0);
  const [power, setPower] = useState<number>(2.0);

  // Viewport state
  const [viewport, setViewport] = useState<FractalViewport>({ x: -0.8, y: 0, zoom: 1.5 });

  // Rendering stats
  const [fps, setFps] = useState<number>(60);

  // UI visibility states for collapsible panels
  const [showParameters, setShowParameters] = useState<boolean>(true);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [showStats, setShowStats] = useState<boolean>(true);
  const fpsCounterRef = useRef<{ frameCount: number; lastTime: number }>({ frameCount: 0, lastTime: Date.now() });

  // Animation state
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [animationSpeed, setAnimationSpeed] = useState<number>(1.0);
  const animationFrameRef = useRef<number>(0);

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
        case 'p':
          setShowParameters((prev) => !prev);
          break;
        case 'c':
          setShowControls((prev) => !prev);
          break;
        case 's':
          setShowStats((prev) => !prev);
          break;
        case 'h':
          // Hide all panels
          setShowParameters(false);
          setShowControls(false);
          setShowStats(false);
          break;
        case 'a':
          // Show all panels
          setShowParameters(true);
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

    // Set material and iterations
    setCurrentMaterial(preset.materialKey);
    setMaxIterations(preset.defaultIterations);

    // Use custom viewport if provided, otherwise use default
    const newViewport: FractalViewport = preset.viewport || { x: -0.8, y: 0, zoom: 1.5 };
    setViewport(newViewport);

    // Reset parameters to defaults
    setZReal(0.0);
    setZImag(0.0);
    setCReal(0.0);
    setCImag(0.0);
    setXReal(2.0);
    setXImag(0.0);
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

  // Animation loop - rotates through c values for Julia-like effects
  useEffect(() => {
    if (!isAnimating) {
      cancelAnimationFrame(animationFrameRef.current);
      return;
    }

    const animate = () => {
      const time = Date.now() * 0.0005 * animationSpeed;
      
      // Animate c parameters in a circular pattern
      setCReal(0.7 * Math.cos(time * 0.5));
      setCImag(0.7 * Math.sin(time * 0.5));
      
      // Animate exponent for X-Set exploration
      setXReal(2.0 + 1.0 * Math.sin(time * 0.3));
      setXImag(0.5 * Math.cos(time * 0.4));
      
      // Optionally animate z0 for interesting effects
      // setZReal(0.3 * Math.sin(time * 0.2));
      // setZImag(0.3 * Math.cos(time * 0.25));
      
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);
    
    return () => {
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isAnimating, animationSpeed]);

  return (
    <div className="w-full h-screen relative bg-black overflow-hidden">
      {/* Full-screen THREE.js Canvas */}
      {windowSize.width > 0 && windowSize.height > 0 && (
        <ThreeJsFractalRenderer
          width={windowSize.width}
          height={windowSize.height}
          materialKey={currentMaterial}
          initialViewport={viewport}
          iterations={maxIterations}
          paletteName={palette}
          autoAdjustIterations={autoIters}
          autoTone={autoTone}
          gamma={gamma}
          bandStrength={bandStrength}
          bandCenter={bandCenter}
          bandWidth={bandWidth}
          interiorEnabled={interiorEnabled}
          bands={bands}
          power={power}
          zReal={zReal}
          zImag={zImag}
          cReal={cReal}
          cImag={cImag}
          xReal={xReal}
          xImag={xImag}
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

      {/* Floating Parameter Panel - Bottom Center */}
      <div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 transition-transform duration-300"
        style={{ transform: showParameters ? 'translate(-50%, 0)' : 'translate(-50%, 150%)' }}
      >
        <div className="bg-black/70 backdrop-blur-md border border-gray-700/50 rounded-lg shadow-2xl p-4 min-w-[600px] max-w-[700px] pointer-events-auto">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Complex Parameters</h2>
            <button
              onClick={() => setShowParameters(false)}
              className="text-gray-500 hover:text-gray-300 transition text-xs"
            >
              ✕ Hide
            </button>
          </div>
          
          {/* Equation Display */}
          <div className="mb-3 p-3 bg-black/40 border border-cyan-500/20 rounded-lg">
            <div className="font-mono text-sm text-cyan-300 text-center">
              z<sub>n+1</sub> = z<sub>n</sub><sup>x</sup> + c
            </div>
            <div className="font-mono text-xs text-gray-400 text-center mt-1">
              where x = {xReal.toFixed(2)} {xImag >= 0 ? '+' : ''} {xImag.toFixed(2)}i
            </div>
          </div>

          <ParameterControls
            z_real={zReal}
            z_imag={zImag}
            c_real={cReal}
            c_imag={cImag}
            x_real={xReal}
            x_imag={xImag}
            onZRealChange={setZReal}
            onZImagChange={setZImag}
            onCRealChange={setCReal}
            onCImagChange={setCImag}
            onXRealChange={setXReal}
            onXImagChange={setXImag}
          />

          {/* Animation Controls */}
          <div className="mt-3">
            <AnimationControls
              isPlaying={isAnimating}
              onTogglePlay={() => setIsAnimating(!isAnimating)}
              speed={animationSpeed}
              onSpeedChange={setAnimationSpeed}
            />
          </div>
        </div>
      </div>

      {/* Floating Controls Panel - Right Side (anchored top-right for accessibility) */}
      <div
        className="absolute top-4 right-4 z-10 transition-transform duration-300"
        style={{ transform: showControls ? 'translate(0,0)' : 'translate(110%,0)' }}
      >
        <div className="bg-black/70 backdrop-blur-md border border-gray-700/50 rounded-lg shadow-2xl p-4 w-80 pointer-events-auto max-h-[90vh] overflow-y-auto">
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
            onReset={handleReset}
            fps={fps}
            renderTime={0}
            palette={palette}
            palettes={ALL_PALETTES}
            onPaletteChange={(name) => setPalette(name as PaletteName)}
            autoIterations={autoIters}
            onAutoIterationsChange={(enabled) => setAutoIters(enabled)}
            autoTone={autoTone}
            onAutoToneChange={(enabled) => setAutoTone(enabled)}
            gamma={gamma}
            onGammaChange={setGamma}
            bandStrength={bandStrength}
            onBandStrengthChange={setBandStrength}
            bandCenter={bandCenter}
            onBandCenterChange={setBandCenter}
            bandWidth={bandWidth}
            onBandWidthChange={setBandWidth}
            interiorEnabled={interiorEnabled}
            onInteriorEnabledChange={setInteriorEnabled}
            bands={bands}
            onBandsChange={setBands}
            power={power}
            onPowerChange={setPower}
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
        {!showParameters && (
          <button
            onClick={() => setShowParameters(true)}
            className="bg-black/60 backdrop-blur-sm border border-gray-700/50 p-3 rounded-lg text-white hover:bg-black/80 transition pointer-events-auto"
            title="Show Parameters (P)"
          >
            <span className="text-sm">🎛️</span>
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
            <kbd className="bg-gray-700 px-1.5 py-0.5 rounded">P</kbd> Parameters
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
