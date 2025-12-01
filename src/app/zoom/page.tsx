'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { ThreeJsFractalRenderer } from '@/components/fractals/ThreeJsFractalRenderer';
import { MaterialKey } from '@/lib/webgl/shader-materials';
import { PaletteName } from '@/lib/utils/palettes';
import { MdArrowBack, MdCameraAlt, MdPlayArrow, MdPause, MdKeyboard } from 'react-icons/md';

// Curated zoom presets with self-similar coordinates for seamless looping
interface ZoomPreset {
  id: string;
  label: string;
  materialKey: MaterialKey;
  target: { x: number; y: number };
  startZoom: number;
  palette: PaletteName;
  cReal?: number;
  cImag?: number;
}

const ZOOM_PRESETS: ZoomPreset[] = [
  {
    id: 'mandelbrot_seahorse',
    label: 'Mandelbrot Seahorse',
    materialKey: 'normal',
    target: { x: -0.743643887037151, y: 0.131825904205330 },
    startZoom: 1.2,
    palette: 'inferno',
  },
  {
    id: 'mandelbrot_spiral',
    label: 'Mandelbrot Spiral',
    materialKey: 'normal',
    target: { x: -0.761574, y: -0.0847596 },
    startZoom: 1.2,
    palette: 'deep-space',
  },
  {
    id: 'julia_dendrite',
    label: 'Julia Dendrite',
    materialKey: 'julia',
    target: { x: 0, y: 0 },
    startZoom: 1.5,
    palette: 'viridis',
    cReal: -0.70176,
    cImag: -0.3842,
  },
  {
    id: 'burning_ship',
    label: 'Burning Ship',
    materialKey: 'burningShip',
    target: { x: -1.762, y: -0.028 },
    startZoom: 1.0,
    palette: 'sonic',
  },
];

// Speed multipliers
const SPEED_OPTIONS = [
  { label: 'Slow', multiplier: 0.5 },
  { label: 'Normal', multiplier: 1.0 },
  { label: 'Fast', multiplier: 2.0 },
];

export default function ZoomTestingPage() {
  // Window size
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  // Preset and rendering state
  const [currentPresetIndex, setCurrentPresetIndex] = useState(0);
  const [iterations, setIterations] = useState(150);
  
  // Zoom state
  const [zoom, setZoom] = useState(ZOOM_PRESETS[0].startZoom);
  const [isPlaying, setIsPlaying] = useState(true);
  const [speedIndex, setSpeedIndex] = useState(1); // Default to Normal (1x)
  
  // Debug/UI state
  const [showDebugFade, setShowDebugFade] = useState(true);
  const [canvasOpacity, setCanvasOpacity] = useState(1);
  const [hideUI, setHideUI] = useState(false);
  
  // FPS tracking with rolling average
  const [fps, setFps] = useState(60);
  const fpsRef = useRef<{ times: number[]; lastTime: number }>({
    times: [],
    lastTime: performance.now(),
  });
  
  // Animation refs
  const animationRef = useRef<number>(0);
  const zoomRef = useRef(zoom);
  
  // Keep zoomRef in sync
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  // Get current preset
  const currentPreset = ZOOM_PRESETS[currentPresetIndex];
  const speedMultiplier = SPEED_OPTIONS[speedIndex].multiplier;

  // Initialize window size
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

  // Reset zoom when preset changes
  useEffect(() => {
    const preset = ZOOM_PRESETS[currentPresetIndex];
    setZoom(preset.startZoom);
    zoomRef.current = preset.startZoom;
  }, [currentPresetIndex]);

  // Main zoom animation loop with FPS tracking
  useEffect(() => {
    if (!isPlaying) {
      cancelAnimationFrame(animationRef.current);
      return;
    }

    const RESET_THRESHOLD = 0.00002; // ~2×10⁻⁵ - safe margin before float32 precision issues
    const ZOOM_RATE = 0.003; // Base zoom rate per frame
    const FADE_DURATION = 250; // ms

    const animate = () => {
      const now = performance.now();
      const delta = now - fpsRef.current.lastTime;
      fpsRef.current.lastTime = now;

      // Update FPS (rolling average of last 10 frames)
      fpsRef.current.times.push(1000 / delta);
      if (fpsRef.current.times.length > 10) {
        fpsRef.current.times.shift();
      }
      const avgFps = fpsRef.current.times.reduce((a, b) => a + b, 0) / fpsRef.current.times.length;
      setFps(avgFps);

      // Update zoom
      const newZoom = zoomRef.current * (1 - ZOOM_RATE * speedMultiplier);

      // Check for reset threshold
      if (newZoom < RESET_THRESHOLD) {
        // Reset with optional fade
        if (showDebugFade) {
          setCanvasOpacity(0);
          setTimeout(() => {
            const preset = ZOOM_PRESETS[currentPresetIndex];
            zoomRef.current = preset.startZoom;
            setZoom(preset.startZoom);
            setTimeout(() => setCanvasOpacity(1), 50);
          }, FADE_DURATION);
        } else {
          const preset = ZOOM_PRESETS[currentPresetIndex];
          zoomRef.current = preset.startZoom;
          setZoom(preset.startZoom);
        }
      } else {
        zoomRef.current = newZoom;
        setZoom(newZoom);
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying, speedMultiplier, showDebugFade, currentPresetIndex]);

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
      a.download = `zoom-${currentPreset.id}-${timestamp}.png`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }, [currentPreset.id]);

  // Navigate presets
  const nextPreset = useCallback(() => {
    setCurrentPresetIndex((prev) => (prev + 1) % ZOOM_PRESETS.length);
  }, []);

  const prevPreset = useCallback(() => {
    setCurrentPresetIndex((prev) => (prev - 1 + ZOOM_PRESETS.length) % ZOOM_PRESETS.length);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          setIsPlaying((prev) => !prev);
          break;
        case '1':
          setSpeedIndex(0); // Slow
          break;
        case '2':
          setSpeedIndex(1); // Normal
          break;
        case '3':
          setSpeedIndex(2); // Fast
          break;
        case 's':
        case 'S':
          handleScreenshot();
          break;
        case 'd':
        case 'D':
          setShowDebugFade((prev) => !prev);
          break;
        case 'ArrowLeft':
          prevPreset();
          break;
        case 'ArrowRight':
          nextPreset();
          break;
        case 'h':
        case 'H':
          setHideUI((prev) => !prev);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleScreenshot, nextPreset, prevPreset]);

  // Viewport for renderer (centered on target, using current zoom)
  const viewport = {
    x: currentPreset.target.x,
    y: currentPreset.target.y,
    zoom: zoom,
  };

  return (
    <div className="w-full h-screen relative bg-black overflow-hidden">
      {/* Full-screen THREE.js Canvas */}
      {windowSize.width > 0 && windowSize.height > 0 && (
        <div
          className="absolute inset-0 transition-opacity"
          style={{
            opacity: canvasOpacity,
            transitionDuration: showDebugFade ? '250ms' : '0ms',
          }}
        >
          <ThreeJsFractalRenderer
            width={windowSize.width}
            height={windowSize.height}
            materialKey={currentPreset.materialKey}
            initialViewport={viewport}
            iterations={iterations}
            paletteName={currentPreset.palette}
            cReal={currentPreset.cReal ?? 0}
            cImag={currentPreset.cImag ?? 0}
            autoAdjustIterations={false}
            autoTone={false}
          />
        </div>
      )}

      {/* Top Bar - Back, Title, Stats */}
      {!hideUI && (
        <div className="absolute top-0 left-0 right-0 z-10 pointer-events-none">
          <div className="flex items-center justify-between p-4">
            {/* Back Button */}
            <Link
              href="/"
              className="pointer-events-auto group flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 hover:bg-slate-700/50"
              style={{
                background: 'rgba(15, 23, 42, 0.9)',
                border: '1px solid rgba(100, 116, 139, 0.3)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
              }}
            >
              <MdArrowBack className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
              <span className="text-sm text-slate-400 group-hover:text-white transition-colors">Back</span>
            </Link>

            {/* Title */}
            <div
              className="px-5 py-2 rounded-lg pointer-events-auto"
              style={{
                background: 'rgba(15, 23, 42, 0.9)',
                border: '1px solid rgba(100, 116, 139, 0.3)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
              }}
            >
              <h1 className="text-base font-semibold text-white">Infinite Zoom Testing</h1>
            </div>

            {/* FPS & Zoom Display */}
            <div
              className="pointer-events-auto px-4 py-2 rounded-lg flex items-center gap-4"
              style={{
                background: 'rgba(15, 23, 42, 0.9)',
                border: '1px solid rgba(100, 116, 139, 0.3)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
              }}
            >
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-500 uppercase">FPS</span>
                <span className="text-sm font-bold font-mono text-green-400">{fps.toFixed(0)}</span>
              </div>
              <div className="w-px h-4 bg-slate-700" />
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-500 uppercase">Zoom</span>
                <span className="text-sm font-mono text-cyan-400">{zoom.toExponential(2)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Control Panel - Bottom Center */}
      {!hideUI && (
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 pointer-events-auto"
        >
          <div
            className="rounded-lg overflow-hidden"
            style={{
              background: 'rgba(15, 23, 42, 0.95)',
              border: '1px solid rgba(100, 116, 139, 0.3)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
            }}
          >
            {/* Preset Selector Row */}
            <div className="px-4 py-3 border-b border-slate-700/40 flex items-center gap-4">
              <button
                onClick={prevPreset}
                className="w-8 h-8 flex items-center justify-center rounded bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-700 transition"
              >
                ←
              </button>
              <div className="flex-1 text-center">
                <span className="text-cyan-400 text-sm font-medium">{currentPreset.label}</span>
              </div>
              <button
                onClick={nextPreset}
                className="w-8 h-8 flex items-center justify-center rounded bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-700 transition"
              >
                →
              </button>
            </div>

            {/* Controls Row */}
            <div className="px-4 py-3 flex items-center gap-4">
              {/* Play/Pause */}
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`w-10 h-10 flex items-center justify-center rounded-lg transition ${
                  isPlaying
                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg shadow-green-500/30'
                    : 'bg-slate-800/60 text-slate-400 border border-slate-700/50 hover:text-white'
                }`}
              >
                {isPlaying ? <MdPause className="w-5 h-5" /> : <MdPlayArrow className="w-5 h-5" />}
              </button>

              {/* Speed Buttons */}
              <div className="flex gap-1">
                {SPEED_OPTIONS.map((option, i) => (
                  <button
                    key={option.label}
                    onClick={() => setSpeedIndex(i)}
                    className={`px-3 py-1.5 rounded text-xs font-medium transition ${
                      speedIndex === i
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-700'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              {/* Divider */}
              <div className="w-px h-8 bg-slate-700/50" />

              {/* Iterations */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-500 uppercase">Iters</span>
                <input
                  type="range"
                  min="50"
                  max="500"
                  step="25"
                  value={iterations}
                  onChange={(e) => setIterations(parseInt(e.target.value))}
                  className="w-20 h-1 rounded-full cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #06b6d4 0%, #06b6d4 ${((iterations - 50) / 450) * 100}%, rgba(51, 65, 85, 0.5) ${((iterations - 50) / 450) * 100}%, rgba(51, 65, 85, 0.5) 100%)`,
                  }}
                />
                <span className="text-xs font-mono text-cyan-400 w-8">{iterations}</span>
              </div>

              {/* Divider */}
              <div className="w-px h-8 bg-slate-700/50" />

              {/* Debug Fade Toggle */}
              <button
                onClick={() => setShowDebugFade(!showDebugFade)}
                className={`px-3 py-1.5 rounded text-xs font-medium transition ${
                  showDebugFade
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
                title="Toggle fade transition on loop reset"
              >
                Fade {showDebugFade ? 'ON' : 'OFF'}
              </button>

              {/* Screenshot */}
              <button
                onClick={handleScreenshot}
                className="w-10 h-10 flex items-center justify-center rounded-lg bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-700 transition"
                title="Screenshot (S)"
              >
                <MdCameraAlt className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Panel - Bottom Left */}
      {!hideUI && (
        <div
          className="absolute z-10 pointer-events-auto rounded-lg overflow-hidden"
          style={{
            bottom: '16px',
            left: '16px',
            width: '180px',
            background: 'rgba(15, 23, 42, 0.92)',
            border: '1px solid rgba(100, 116, 139, 0.3)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
          }}
        >
          {/* Header */}
          <div className="px-3 py-2 border-b border-slate-700/40 flex items-center gap-2">
            <MdKeyboard className="w-3.5 h-3.5 text-slate-400" />
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Shortcuts</div>
          </div>

          {/* Shortcuts Grid */}
          <div className="p-2.5 grid grid-cols-2 gap-x-2 gap-y-1.5 text-[10px]">
            <div className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 bg-slate-800/80 border border-slate-600/50 rounded text-cyan-400 font-mono text-[9px]">Space</kbd>
              <span className="text-slate-500">Play/Pause</span>
            </div>
            <div className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 bg-slate-800/80 border border-slate-600/50 rounded text-cyan-400 font-mono text-[9px]">S</kbd>
              <span className="text-slate-500">Screenshot</span>
            </div>
            <div className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 bg-slate-800/80 border border-slate-600/50 rounded text-cyan-400 font-mono text-[9px]">1/2/3</kbd>
              <span className="text-slate-500">Speed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 bg-slate-800/80 border border-slate-600/50 rounded text-cyan-400 font-mono text-[9px]">D</kbd>
              <span className="text-slate-500">Fade</span>
            </div>
            <div className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 bg-slate-800/80 border border-slate-600/50 rounded text-cyan-400 font-mono text-[9px]">←/→</kbd>
              <span className="text-slate-500">Preset</span>
            </div>
            <div className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 bg-slate-800/80 border border-slate-600/50 rounded text-cyan-400 font-mono text-[9px]">H</kbd>
              <span className="text-slate-500">Hide UI</span>
            </div>
          </div>
        </div>
      )}

      {/* Show UI Button - When hidden */}
      {hideUI && (
        <button
          onClick={() => setHideUI(false)}
          className="absolute top-4 right-4 z-20 w-10 h-10 rounded-lg flex items-center justify-center transition-all pointer-events-auto hover:bg-slate-700/60"
          style={{
            background: 'rgba(15, 23, 42, 0.9)',
            border: '1px solid rgba(100, 116, 139, 0.3)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          }}
          title="Show UI (H)"
        >
          <MdKeyboard className="w-5 h-5 text-slate-400" />
        </button>
      )}
    </div>
  );
}
