'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { ThreeJsFractalRenderer } from '@/components/fractals/ThreeJsFractalRenderer';
import { CompactControls } from '@/components/fractals/compact-controls';
import { ParameterControls } from '@/components/fractals/parameter-controls';
import { AnimationControls } from '@/components/fractals/animation-controls';
import { MaterialKey } from '@/lib/webgl/shader-materials';
import { ALL_PALETTES, DEFAULT_PALETTE, PaletteName } from '@/lib/utils/palettes';
import { FractalSynth } from '@/lib/audio/fractal-synth';

interface FractalViewport {
  x: number;
  y: number;
  zoom: number;
}

// Fractal presets with parameterization
interface PresetConfig {
  label: string;
  equation: string;
  defaultIterations: number;
  materialKey: MaterialKey;
  viewport?: FractalViewport;
  showZ?: boolean;
  showC?: boolean;
  showX?: boolean;
  [key: string]: unknown;
}

const PRESET_EQUATIONS: Record<string, PresetConfig> = {
  mandelbrot: { 
    label: 'Mandelbrot', 
    equation: 'z_{n+1} = z_n^x + c',
    defaultIterations: 75, 
    materialKey: 'normal',
    showZ: false,
    showC: false,
    showX: true
  },
  burningship: { 
    label: 'Burning Ship', 
    equation: 'z_{n+1} = (|Re(z_n)| + i|Im(z_n)|)^2 + c',
    defaultIterations: 75, 
    materialKey: 'burningShip',
    showZ: false,
    showC: false,
    showX: false
  },
  burningship_z3: { 
    label: 'Burning Ship z³', 
    equation: 'z_{n+1} = (|Re(z_n)| + i|Im(z_n)|)^3 + c',
    defaultIterations: 75, 
    materialKey: 'burningShipZ3',
    showZ: false,
    showC: false,
    showX: false
  },
  burningship_semi: { 
    label: 'Semi Burning Ship', 
    equation: 'z_{n+1} = (|Re(z_n)| + iIm(z_n))^2 + c',
    defaultIterations: 75, 
    materialKey: 'semi',
    showZ: false,
    showC: false,
    showX: false
  },
  julia: { 
    label: 'Julia Set', 
    equation: 'z_{n+1} = z_n^x + c',
    defaultIterations: 75, 
    materialKey: 'julia',
    showZ: false,
    showC: true,
    showX: true
  },
  tricorn: { 
    label: 'Tricorn (Mandelbar)', 
    equation: 'z_{n+1} = conj(z_n)^2 + c',
    defaultIterations: 75, 
    materialKey: 'tricorn',
    showZ: false,
    showC: false,
    showX: false
  },
  newton: { 
    label: "Newton's Fractal", 
    equation: 'z_{n+1} = z_n - f(z_n)/f\'(z_n)',
    defaultIterations: 75, 
    materialKey: 'newton',
    showZ: false,
    showC: false,
    showX: false
  },
  spiral: { 
    label: 'Spiral/Galaxy', 
    equation: 'z_{n+1} = z_n · e^{ic} + c',
    defaultIterations: 75, 
    materialKey: 'spiral', 
    viewport: { x: 0, y: 0, zoom: 1.5 },
    showZ: false,
    showC: true,
    showX: false
  }
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
  const [maxIterations, setMaxIterations] = useState<number>(75);
  const [palette, setPalette] = useState<PaletteName>(DEFAULT_PALETTE);
  const [autoIters, setAutoIters] = useState<boolean>(false);
  const [autoTone, setAutoTone] = useState<boolean>(false);
  const [gamma, setGamma] = useState<number>(0.35); // Low gamma for thick borders
  const [bandStrength, setBandStrength] = useState<number>(1.2); // Higher band strength for visible borders
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
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [hideAllUI, setHideAllUI] = useState<boolean>(false);
  const fpsCounterRef = useRef<{ frameCount: number; lastTime: number }>({ frameCount: 0, lastTime: Date.now() });

  // Animation state
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [animationSpeed, setAnimationSpeed] = useState<number>(1.0);
  const animationFrameRef = useRef<number>(0);

  // Sonic/Audio state
  const [sonicEnabled, setSonicEnabled] = useState<boolean>(false);
  const [sonicVolume, setSonicVolume] = useState<number>(0.3);
  const synthRef = useRef<FractalSynth | null>(null);

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

  // Initialize audio synth
  useEffect(() => {
    synthRef.current = new FractalSynth();
    return () => {
      synthRef.current?.destroy();
    };
  }, []);

  // Update synth volume when changed
  useEffect(() => {
    if (synthRef.current) {
      synthRef.current.setVolume(sonicVolume);
    }
  }, [sonicVolume]);

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
          if (e.shiftKey) {
            // Shift+S: Take screenshot
            handleScreenshot();
          } else {
            setShowStats((prev) => !prev);
          }
          break;
        case 'h':
          setHideAllUI((prev) => !prev);
          break;
        case 'a':
          setShowAdvanced((prev) => !prev);
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

    // Only change material if different to avoid reinitialization (which breaks sonic)
    if (preset.materialKey !== currentMaterial) {
      setCurrentMaterial(preset.materialKey);
    }
    
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

  // Screenshot handler
  const handleScreenshot = useCallback(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      a.download = `fractal-${currentPresetKey}-${timestamp}.png`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }, [currentPresetKey]);

  // Handle canvas clicks for sonic playback
  const handleCanvasClick = useCallback((normalizedX: number, normalizedY: number, complexX: number, complexY: number) => {
    if (!sonicEnabled || !synthRef.current) return;

    let x = 0;
    let y = 0;
    let iteration = 0;
    let c_real = complexX;
    let c_imag = complexY;

    // Set up initial values based on fractal type
    switch (currentMaterial) {
      case 'julia':
        // Julia: c is constant from sliders, z starts at click position
        x = complexX;
        y = complexY;
        c_real = cReal;
        c_imag = cImag;
        break;
      
      case 'burningShip':
      case 'burningShipZ3':
      case 'semi':
        // Burning Ship variants: c from click, z starts at 0
        x = 0;
        y = 0;
        c_real = complexX;
        c_imag = complexY;
        break;

      case 'tricorn':
        // Tricorn: c from click, z starts at 0
        x = 0;
        y = 0;
        c_real = complexX;
        c_imag = complexY;
        break;

      case 'newton':
        // Newton: z starts at click position
        x = complexX;
        y = complexY;
        break;

      case 'spiral':
        // Spiral: c from click, z starts at 0, with rotation
        x = 0;
        y = 0;
        c_real = complexX;
        c_imag = complexY;
        break;

      default:
        // Mandelbrot and custom: c from click, z starts at 0 (or use sliders if set)
        x = zReal;
        y = zImag;
        c_real = complexX;
        c_imag = complexY;
    }

    // Iterate based on fractal type
    if (currentMaterial === 'burningShip') {
      // Burning Ship: z = (|Re(z)| + i|Im(z)|)^2 + c
      while (x * x + y * y <= 256 && iteration < maxIterations) {
        const absX = Math.abs(x);
        const absY = Math.abs(y);
        const xtemp = absX * absX - absY * absY + c_real;
        y = 2 * absX * absY + c_imag;
        x = xtemp;
        iteration++;
      }
    } else if (currentMaterial === 'burningShipZ3') {
      // Burning Ship z^3
      while (x * x + y * y <= 256 && iteration < maxIterations) {
        const absX = Math.abs(x);
        const absY = Math.abs(y);
        const r2 = absX * absX + absY * absY;
        const r = Math.sqrt(r2);
        const xtemp = r2 * absX - 3.0 * absX * absY * absY + c_real;
        y = 3.0 * absX * absX * absY - r2 * absY + c_imag;
        x = xtemp;
        iteration++;
      }
    } else if (currentMaterial === 'semi') {
      // Semi Burning Ship
      while (x * x + y * y <= 256 && iteration < maxIterations) {
        const absX = Math.abs(x);
        const xtemp = absX * absX - y * y + c_real;
        y = 2 * absX * y + c_imag;
        x = xtemp;
        iteration++;
      }
    } else if (currentMaterial === 'tricorn') {
      // Tricorn: z = conj(z)^2 + c
      while (x * x + y * y <= 256 && iteration < maxIterations) {
        const xtemp = x * x - y * y + c_real;
        y = -2 * x * y + c_imag; // Negative conjugate
        x = xtemp;
        iteration++;
      }
    } else if (currentMaterial === 'newton') {
      // Newton's method for z^3 - 1 = 0
      for (let i = 0; i < maxIterations; i++) {
        const x2 = x * x;
        const y2 = y * y;
        const x3_minus_3xy2 = x2 * x - 3 * x * y2;
        const y3x2_minus_y3 = 3 * x2 * y - y2 * y;
        
        // f(z) = z^3 - 1
        const fx = x3_minus_3xy2 - 1.0;
        const fy = y3x2_minus_y3;
        
        // f'(z) = 3z^2
        const fpx = 3.0 * (x2 - y2);
        const fpy = 3.0 * 2.0 * x * y;
        
        // Complex division: f(z) / f'(z)
        const denom = fpx * fpx + fpy * fpy;
        if (denom < 1e-10) break;
        
        const divRe = (fx * fpx + fy * fpy) / denom;
        const divIm = (fy * fpx - fx * fpy) / denom;
        
        // Newton iteration: z = z - f(z)/f'(z)
        x = x - divRe;
        y = y - divIm;
        
        // Check convergence
        if (divRe * divRe + divIm * divIm < 1e-6) {
          iteration = i;
          break;
        }
        iteration = i + 1;
      }
    } else if (currentMaterial === 'spiral') {
      // Spiral: z = rotate(z) + c
      while (x * x + y * y <= 100 && iteration < maxIterations) {
        const angle = 0.1;
        const rotX = x * Math.cos(angle) - y * Math.sin(angle);
        const rotY = x * Math.sin(angle) + y * Math.cos(angle);
        x = rotX + c_real;
        y = rotY + c_imag;
        iteration++;
      }
    } else {
      // Standard Mandelbrot/Julia with complex exponentiation: z = z^x + c
      while (x * x + y * y <= 256 && iteration < maxIterations) {
        // Complex exponentiation: z^x where x = xReal + i*xImag
        const zMag = Math.sqrt(x * x + y * y);
        if (zMag < 1e-10) break;
        
        const zArg = Math.atan2(y, x);
        const logZMag = Math.log(zMag);
        
        // x * ln(z) = (xReal + i*xImag) * (logZMag + i*zArg)
        const realPart = xReal * logZMag - xImag * zArg;
        const imagPart = xReal * zArg + xImag * logZMag;
        
        // exp(x * ln(z))
        const expReal = Math.exp(realPart);
        const newX = expReal * Math.cos(imagPart) + c_real;
        const newY = expReal * Math.sin(imagPart) + c_imag;
        
        x = newX;
        y = newY;
        iteration++;
      }
    }

    // Calculate smooth value for better audio mapping
    let smoothValue = iteration;
    if (iteration < maxIterations && currentMaterial !== 'newton') {
      const logZn = Math.log(x * x + y * y) / 2;
      const nu = Math.log(logZn / Math.log(2)) / Math.log(2);
      smoothValue = iteration + 1 - nu;
    }

    // Play sound based on escape time
    if (iteration === maxIterations || iteration > maxIterations * 0.95) {
      // Very stable - play chord
      synthRef.current.playChord(iteration, maxIterations, normalizedX);
    } else {
      // Play single tone
      synthRef.current.playPoint(iteration, maxIterations, normalizedX, smoothValue);
    }
  }, [sonicEnabled, currentMaterial, cReal, cImag, zReal, zImag, xReal, xImag, maxIterations]);

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
          onClick={handleCanvasClick}
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
      {!hideAllUI && (
        <div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 transition-transform duration-300"
          style={{ transform: showParameters ? 'translate(-50%, 0)' : 'translate(-50%, 150%)' }}
        >
          <div className="bg-black/70 backdrop-blur-md border border-gray-700/50 rounded-lg shadow-2xl p-4 min-w-[700px] max-w-[900px] pointer-events-auto">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Parameters</h2>
              <button
                onClick={() => setShowParameters(false)}
                className="text-gray-500 hover:text-gray-300 transition text-xs"
              >
                ✕ Hide
              </button>
            </div>
            
            {/* Equation Display */}
            <div className="mb-3 p-3 bg-black/40 border border-cyan-500/20 rounded-lg">
              <div className="font-mono text-sm text-cyan-300 text-center" dangerouslySetInnerHTML={{ __html: PRESET_EQUATIONS[currentPresetKey]?.equation || 'z<sub>n+1</sub> = z<sub>n</sub><sup>x</sup> + c' }} />
              {PRESET_EQUATIONS[currentPresetKey]?.showX && (
                <div className="font-mono text-xs text-gray-400 text-center mt-1">
                  where x = {xReal.toFixed(2)} {xImag >= 0 ? '+' : ''} {xImag.toFixed(2)}i
                </div>
              )}
              {PRESET_EQUATIONS[currentPresetKey]?.showC && currentMaterial === 'julia' && (
                <div className="font-mono text-xs text-gray-400 text-center mt-1">
                  where c = {cReal.toFixed(2)} {cImag >= 0 ? '+' : ''} {cImag.toFixed(2)}i
                </div>
              )}
              {PRESET_EQUATIONS[currentPresetKey]?.showC && currentMaterial === 'spiral' && (
                <div className="font-mono text-xs text-gray-400 text-center mt-1">
                  where c = {cReal.toFixed(2)} {cImag >= 0 ? '+' : ''} {cImag.toFixed(2)}i
                </div>
              )}
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
              showZ={PRESET_EQUATIONS[currentPresetKey]?.showZ ?? false}
              showC={PRESET_EQUATIONS[currentPresetKey]?.showC ?? false}
              showX={PRESET_EQUATIONS[currentPresetKey]?.showX ?? false}
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
      )}

      {/* Floating Controls Panel - Right Side (anchored top-right for accessibility) */}
      {!hideAllUI && (
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
            showAdvanced={showAdvanced}
            onShowAdvancedChange={setShowAdvanced}
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
      )}

      {/* Sonic Controls in Right Panel spot when controls are visible */}
      {!hideAllUI && showControls && (
        <div className="absolute top-4 right-[340px] z-10">
          <div className="bg-black/70 backdrop-blur-md border border-gray-700/50 rounded-lg shadow-2xl p-3 pointer-events-auto">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSonicEnabled(!sonicEnabled)}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                  sonicEnabled
                    ? 'bg-purple-600 hover:bg-purple-700 text-white'
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                }`}
                title="Toggle Sonic Mode"
              >
                {sonicEnabled ? '🎵 Sonic ON' : '🔇 Sonic OFF'}
              </button>
              {sonicEnabled && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-xs">Vol</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={sonicVolume}
                    onChange={(e) => setSonicVolume(parseFloat(e.target.value))}
                    className="w-20 accent-purple-500"
                  />
                  <span className="text-white text-xs font-mono w-8">
                    {Math.round(sonicVolume * 100)}%
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Floating Stats Panel - Bottom Right */}
      {!hideAllUI && (
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
      )}

      {/* Toggle Buttons - Left Side (only visible when panels are hidden) */}
      {!hideAllUI && (
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
      )}

      {/* Top Right Controls - Screenshot, Hide All, Sonic */}
      {!hideAllUI && (
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
          {/* Screenshot Button */}
          <button
            onClick={handleScreenshot}
            className="bg-black/70 backdrop-blur-md border border-gray-700/50 p-3 rounded-lg text-white hover:bg-black/90 transition pointer-events-auto"
            title="Screenshot (Shift+S)"
          >
            <span className="text-sm">📸</span>
          </button>
          
          {/* Hide All UI Button */}
          <button
            onClick={() => setHideAllUI(true)}
            className="bg-black/70 backdrop-blur-md border border-gray-700/50 p-3 rounded-lg text-white hover:bg-black/90 transition pointer-events-auto"
            title="Hide All UI (H)"
          >
            <span className="text-sm">👁️</span>
          </button>
          
          {/* Sonic Controls - Shifts when controls panel is visible */}
          {!showControls && (
            <div className="bg-black/70 backdrop-blur-md border border-gray-700/50 rounded-lg shadow-2xl p-3 pointer-events-auto">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSonicEnabled(!sonicEnabled)}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                    sonicEnabled
                      ? 'bg-purple-600 hover:bg-purple-700 text-white'
                      : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                  }`}
                  title="Toggle Sonic Mode"
                >
                  {sonicEnabled ? '🎵 Sonic ON' : '🔇 Sonic OFF'}
                </button>
                {sonicEnabled && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 text-xs">Vol</span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={sonicVolume}
                      onChange={(e) => setSonicVolume(parseFloat(e.target.value))}
                      className="w-20 accent-purple-500"
                    />
                    <span className="text-white text-xs font-mono w-8">
                      {Math.round(sonicVolume * 100)}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Show UI Button - When hidden */}
      {hideAllUI && (
        <button
          onClick={() => setHideAllUI(false)}
          className="absolute top-4 right-4 z-20 bg-black/70 backdrop-blur-md border border-gray-700/50 p-3 rounded-lg text-white hover:bg-black/90 transition pointer-events-auto"
          title="Show UI (H)"
        >
          <span className="text-sm">👁️</span>
        </button>
      )}

      {/* Keyboard Shortcuts Help - Bottom Left */}
      {!hideAllUI && (
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
            <div>
              <kbd className="bg-gray-700 px-1.5 py-0.5 rounded">A</kbd> Advanced
            </div>
            <div>
              <kbd className="bg-gray-700 px-1.5 py-0.5 rounded">H</kbd> Hide UI
            </div>
            <div>
              <kbd className="bg-gray-700 px-1.5 py-0.5 rounded">⇧S</kbd> Screenshot
            </div>
            <div>Drag: Pan | Wheel: Zoom</div>
          </div>
        </div>
      )}
    </div>
  );
}
