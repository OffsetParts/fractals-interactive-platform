'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { FractalSynth } from '@/lib/audio/fractal-synth';

/**
 * Sonic Fractals - Interactive Landing Page
 * Click to explore the Mandelbrot set through sound
 * Stable points = harmonic tones, Chaotic points = noise bursts
 */
export default function SonicFractals() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null); // For orbit visualization
  const synthRef = useRef<FractalSynth | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.3);
  const [showInstructions, setShowInstructions] = useState(true);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const maxIterations = 256;

  // Viewport for Mandelbrot set (centered on interesting region)
  const viewportRef = useRef({
    x: -0.5,
    y: 0,
    zoom: 0.4,
  });

  // Initialize audio synth
  useEffect(() => {
    synthRef.current = new FractalSynth();
    return () => synthRef.current?.destroy();
  }, []);

  // Update volume
  useEffect(() => {
    if (synthRef.current) {
      synthRef.current.setVolume(volume);
    }
  }, [volume]);

  // Render Mandelbrot set
  const renderFractal = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    
    // Skip if canvas not sized yet
    if (width === 0 || height === 0) return;

    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;

    const viewport = viewportRef.current;

    for (let py = 0; py < height; py++) {
      for (let px = 0; px < width; px++) {
        // Convert pixel to complex plane with proper aspect ratio
        // Use height as base scale to maintain vertical proportions
        const x0 = ((px - width / 2) / height) / viewport.zoom + viewport.x;
        const y0 = ((py - height / 2) / height) / viewport.zoom + viewport.y;

        let x = 0;
        let y = 0;
        let iteration = 0;
        let xtemp;

        // Mandelbrot iteration
        while (x * x + y * y <= 4 && iteration < maxIterations) {
          xtemp = x * x - y * y + x0;
          y = 2 * x * y + y0;
          x = xtemp;
          iteration++;
        }

        // Calculate smooth coloring
        let smoothValue = iteration;
        if (iteration < maxIterations) {
          const logZn = Math.log(x * x + y * y) / 2;
          const nu = Math.log(logZn / Math.log(2)) / Math.log(2);
          smoothValue = iteration + 1 - nu;
        }

        // Color based on iterations (smooth gradient)
        const idx = (py * width + px) * 4;
        
        if (iteration === maxIterations) {
          // Inside the set - black
          data[idx] = 0;
          data[idx + 1] = 0;
          data[idx + 2] = 0;
        } else {
          // Outside the set - gradient based on escape time
          const t = smoothValue / maxIterations;
          
          // Beautiful purple-blue-cyan gradient
          const r = Math.floor(9 * (1 - t) * t * t * t * 255);
          const g = Math.floor(15 * (1 - t) * (1 - t) * t * t * 255);
          const b = Math.floor(8.5 * (1 - t) * (1 - t) * (1 - t) * t * 255);
          
          data[idx] = r;
          data[idx + 1] = g;
          data[idx + 2] = b;
        }
        data[idx + 3] = 255; // Alpha
      }
    }

    ctx.putImageData(imageData, 0, 0);
  };

  // Handle canvas resize and render
  useEffect(() => {
    const canvas = canvasRef.current;
    const overlayCanvas = overlayCanvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      // Use window dimensions for full screen
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      canvas.width = width;
      canvas.height = height;
      
      // Also resize overlay canvas
      if (overlayCanvas) {
        overlayCanvas.width = width;
        overlayCanvas.height = height;
      }
      
      // Re-render after resize
      renderFractal();
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  // Draw orbit visualization - lines connecting iteration points
  const drawOrbit = (px: number, py: number) => {
    const canvas = canvasRef.current;
    const overlayCanvas = overlayCanvasRef.current;
    if (!canvas || !overlayCanvas) return;

    const overlayCtx = overlayCanvas.getContext('2d');
    if (!overlayCtx) return;

    const viewport = viewportRef.current;
    const width = canvas.width;
    const height = canvas.height;
    
    const x0 = ((px - width / 2) / height) / viewport.zoom + viewport.x;
    const y0 = ((py - height / 2) / height) / viewport.zoom + viewport.y;

    // Calculate orbit points
    let x = 0;
    let y = 0;
    let iteration = 0;
    const orbitPoints: { x: number; y: number }[] = [];

    // Store all iteration points
    while (x * x + y * y <= 4 && iteration < maxIterations) {
      // Convert complex point to screen coordinates
      const screenX = ((x - viewport.x) * height * viewport.zoom) + width / 2;
      const screenY = ((y - viewport.y) * height * viewport.zoom) + height / 2;
      orbitPoints.push({ x: screenX, y: screenY });

      const xtemp = x * x - y * y + x0;
      y = 2 * x * y + y0;
      x = xtemp;
      iteration++;
    }

    // Determine color based on stability
    const stability = iteration / maxIterations;
    let strokeColor: string;
    let lineWidth: number;

    if (stability > 0.95) {
      // Very stable - bright, thick loops
      strokeColor = 'rgba(138, 43, 226, 0.8)'; // Purple
      lineWidth = 2;
    } else if (stability > 0.5) {
      // Moderately stable - medium
      strokeColor = 'rgba(0, 191, 255, 0.6)'; // Blue
      lineWidth = 1.5;
    } else {
      // Chaotic - thin, fading quickly
      strokeColor = 'rgba(255, 69, 0, 0.4)'; // Red
      lineWidth = 1;
    }

    // Draw lines connecting iteration points
    overlayCtx.strokeStyle = strokeColor;
    overlayCtx.lineWidth = lineWidth;
    overlayCtx.lineCap = 'round';
    overlayCtx.lineJoin = 'round';

    if (orbitPoints.length > 1) {
      overlayCtx.beginPath();
      overlayCtx.moveTo(orbitPoints[0].x, orbitPoints[0].y);
      
      for (let i = 1; i < orbitPoints.length; i++) {
        overlayCtx.lineTo(orbitPoints[i].x, orbitPoints[i].y);
      }
      
      overlayCtx.stroke();

      // Draw starting point
      overlayCtx.fillStyle = strokeColor;
      overlayCtx.beginPath();
      overlayCtx.arc(orbitPoints[0].x, orbitPoints[0].y, 3, 0, Math.PI * 2);
      overlayCtx.fill();
    }
  };

  // Clear overlay canvas
  const clearOverlay = () => {
    const overlayCanvas = overlayCanvasRef.current;
    if (!overlayCanvas) return;
    const ctx = overlayCanvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    }
  };

  // Handle mouse down
  const handleMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    setIsMouseDown(true);
    handleInteraction(event);
  };

  // Handle mouse move (when held down)
  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isMouseDown) return;
    handleInteraction(event);
  };

  // Handle mouse up
  const handleMouseUp = () => {
    setIsMouseDown(false);
    // Fade out orbits over time
    setTimeout(() => {
      clearOverlay();
    }, 2000);
  };

  // Unified interaction handler
  const handleInteraction = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const synth = synthRef.current;
    if (!canvas || !synth) return;

    setIsPlaying(true);
    setShowInstructions(false);

    const rect = canvas.getBoundingClientRect();
    const px = event.clientX - rect.left;
    const py = event.clientY - rect.top;

    // Clear previous orbits
    clearOverlay();

    // Draw new orbit
    drawOrbit(px, py);

    // Convert pixel to complex plane with proper aspect ratio
    const viewport = viewportRef.current;
    const width = canvas.width;
    const height = canvas.height;
    
    const x0 = ((px - width / 2) / height) / viewport.zoom + viewport.x;
    const y0 = ((py - height / 2) / height) / viewport.zoom + viewport.y;

    // Calculate escape time for this point
    let x = 0;
    let y = 0;
    let iteration = 0;
    let xtemp;

    while (x * x + y * y <= 4 && iteration < maxIterations) {
      xtemp = x * x - y * y + x0;
      y = 2 * x * y + y0;
      x = xtemp;
      iteration++;
    }

    // Calculate smooth value
    let smoothValue = iteration;
    if (iteration < maxIterations) {
      const logZn = Math.log(x * x + y * y) / 2;
      const nu = Math.log(logZn / Math.log(2)) / Math.log(2);
      smoothValue = iteration + 1 - nu;
    }

    // Play sound based on stability
    const normalizedX = px / canvas.width;
    
    if (iteration === maxIterations || iteration > maxIterations * 0.95) {
      // Very stable - play chord
      synth.playChord(iteration, maxIterations, normalizedX);
    } else {
      // Play single tone
      synth.playPoint(iteration, maxIterations, normalizedX, smoothValue);
    }
  };

  return (
    <main className="fixed inset-0 w-screen h-screen bg-black overflow-hidden m-0 p-0">
      {/* Hero Section - Non-interactive overlay */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/90 to-transparent p-8 pointer-events-none">
        <h1 className="text-5xl md:text-7xl font-bold text-white mb-4 tracking-tight">
          Sonic Fractals
        </h1>
        <p className="text-xl md:text-2xl text-gray-300 max-w-3xl">
          Explore the <span className="text-purple-400">Mandelbrot set</span> through sound.
          Click anywhere to hear <strong>chaos and harmony</strong>.
        </p>
      </div>

      {/* Instructions Overlay */}
      {showInstructions && (
        <div 
          className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-md cursor-pointer"
          onClick={() => setShowInstructions(false)}
        >
          <div 
            className="bg-zinc-900 border-2 border-purple-500/50 rounded-2xl p-10 max-w-2xl mx-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-4xl font-bold text-white mb-6 text-center">
              How It Works 🎵
            </h2>
            <div className="space-y-5 text-gray-300">
              <p className="text-lg">
                The Mandelbrot set visualizes mathematical <strong className="text-purple-400">stability vs. chaos</strong>.
                Each point either escapes to infinity or stays bounded forever.
              </p>
              <div className="grid grid-cols-2 gap-4 my-6">
                <div className="bg-purple-900/40 border-2 border-purple-500/60 rounded-xl p-5">
                  <div className="text-purple-300 font-bold mb-2 text-lg">🎼 Stable Points</div>
                  <div className="text-sm text-gray-400">
                    Deep inside the set. Produce <strong>harmonic tones</strong> with long, resonant sustain.
                  </div>
                </div>
                <div className="bg-red-900/40 border-2 border-red-500/60 rounded-xl p-5">
                  <div className="text-red-300 font-bold mb-2 text-lg">💥 Chaotic Points</div>
                  <div className="text-sm text-gray-400">
                    Quick escape to infinity. Create <strong>harsh bursts</strong> that dissipate instantly.
                  </div>
                </div>
              </div>
              <div className="text-center mt-8">
                <button
                  onClick={() => setShowInstructions(false)}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-4 px-12 rounded-xl transition-all transform hover:scale-105 text-lg"
                >
                  Click to Begin 🎵
                </button>
                <p className="text-sm text-gray-500 mt-3">or click anywhere outside this box</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fractal Canvas - Full Screen */}
      <div className="fixed inset-0 w-full h-full m-0 p-0">
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 w-full h-full m-0 p-0"
        />
        {/* Overlay canvas for orbit visualization */}
        <canvas
          ref={overlayCanvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="absolute top-0 left-0 w-full h-full cursor-crosshair m-0 p-0"
        />
      </div>

      {/* Controls - Non-interactive except for the controls themselves */}
      <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/90 to-transparent p-6 pointer-events-none">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center gap-6 justify-center pointer-events-auto">
          {/* Volume Control */}
          <div className="flex items-center gap-3 bg-zinc-900/90 backdrop-blur-sm rounded-full px-6 py-3 border border-zinc-700">
            <span className="text-gray-400 text-sm font-medium">🔊 Volume</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-32 accent-purple-500"
            />
            <span className="text-white text-sm font-mono w-10">
              {Math.round(volume * 100)}%
            </span>
          </div>

          {/* Status Indicator */}
          {isPlaying && (
            <div className="flex items-center gap-2 text-green-400 text-sm bg-zinc-900/90 backdrop-blur-sm rounded-full px-6 py-3 border border-green-700/50">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              Audio Active
            </div>
          )}

          {/* Call to Action */}
          <Link
            href="/explorer"
            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-8 py-3 rounded-full transition-all transform hover:scale-105 shadow-lg"
          >
            Visual Explorer →
          </Link>

          <Link
            href="/controls-test"
            className="bg-zinc-700 hover:bg-zinc-600 text-white font-semibold px-6 py-3 rounded-full transition-all text-sm"
          >
            Test Controls
          </Link>
        </div>
      </div>
    </main>
  );
}
