'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import { InlineMath } from 'react-katex';
import 'katex/dist/katex.min.css';
import { ThreeJsFractalRenderer } from '@/components/fractals/ThreeJsFractalRenderer';
import { CompactControls } from '@/components/fractals/compact-controls';
import { ParameterControls } from '@/components/fractals/parameter-controls';
import { AnimationControls } from '@/components/fractals/animation-controls';
import { MaterialKey } from '@/lib/webgl/shader-materials';
import { ALL_PALETTES, DEFAULT_PALETTE, PaletteName } from '@/lib/utils/palettes';
import { FractalSynth } from '@/lib/audio/fractal-synth';
import { MdArrowBack, MdCameraAlt, MdVisibility, MdVisibilityOff, MdClose, MdTune, MdShowChart, MdKeyboard } from 'react-icons/md';

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
    showZ: true,
    showC: false,
    showX: true
  },
  burningship: { 
    label: 'Burning Ship', 
    equation: 'z_{n+1} = (|\\text{Re}(z_n)| + i|\\text{Im}(z_n)|)^x + c',
    defaultIterations: 75, 
    materialKey: 'burningShip',
    showZ: true,
    showC: false,
    showX: true
  },
  burningship_semi: { 
    label: 'Semi Burning Ship', 
    equation: 'z_{n+1} = (|\\text{Re}(z_n)| + i \\cdot \\text{Im}(z_n))^x + c',
    defaultIterations: 75, 
    materialKey: 'semi',
    showZ: true,
    showC: false,
    showX: true
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
    equation: 'z_{n+1} = \\overline{z_n}^2 + c',
    defaultIterations: 75, 
    materialKey: 'tricorn',
    showZ: false,
    showC: false,
    showX: false
  },
  newton: { 
    label: "Newton's Fractal", 
    equation: "z_{n+1} = z_n - \\frac{f(z_n)}{f'(z_n)}",
    defaultIterations: 75, 
    materialKey: 'newton',
    showZ: false,
    showC: false,
    showX: false
  },
  collatz: { 
    label: 'Collatz Spiral', 
    equation: 'z \\cdot \\cos^2(\\pi z a) + \\frac{3z+1}{2} \\cdot \\sin^2(\\pi z a)',
    defaultIterations: 100, 
    materialKey: 'collatz', 
    viewport: { x: 0, y: 0, zoom: 3.0 },
    showZ: false,
    showC: true,
    showX: false
  },
  magnet: { 
    label: 'Magnet (Galaxy)', 
    equation: 'z_{n+1} = \\left(\\frac{z_n^2 + c - 1}{2z_n + c - 2}\\right)^2',
    defaultIterations: 100, 
    materialKey: 'magnet', 
    viewport: { x: 1.5, y: 0, zoom: 2.5 },
    showZ: false,
    showC: false,
    showX: false
  },
  spiral: { 
    label: 'Logarithmic Spiral', 
    equation: 'z_{n+1} = z_n^x \\cdot e^{a+bi}',
    defaultIterations: 100, 
    materialKey: 'spiral', 
    viewport: { x: 0, y: 0, zoom: 2.0 },
    showZ: false,
    showC: true,  // a=growth, b=rotation
    showX: true   // power
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
  const [showControls, setShowControls] = useState<boolean>(false);
  const [showStats, setShowStats] = useState<boolean>(false);
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

  // Trajectory visualization state
  const [trajectoryEnabled, setTrajectoryEnabled] = useState<boolean>(false);
  const [trajectoryPoints, setTrajectoryPoints] = useState<{x: number; y: number; complexX: number; complexY: number}[]>([]);

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

  // Handle preset selection - keeps current viewport and parameters
  const handlePresetSelect = (presetKey: string) => {
    const preset = PRESET_EQUATIONS[presetKey];
    if (!preset) return;

    // Stop sonic playback to prevent glitching during preset change
    if (synthRef.current && sonicEnabled) {
      synthRef.current.stopAll();
    }

    // Track current preset
    setCurrentPresetKey(presetKey);

    // Only change material if different to avoid reinitialization
    if (preset.materialKey !== currentMaterial) {
      setCurrentMaterial(preset.materialKey);
    }
    
    // Don't reset iterations - keep current value
    // Don't reset viewport - keep current view
    // Don't reset parameters - keep current z, c, x values
    // User can explicitly reset with the Reset button if they want defaults
  };

  // Handle reset - returns to current preset's default view AND parameters
  const handleReset = () => {
    const preset = PRESET_EQUATIONS[currentPresetKey];
    if (preset) {
      // Reset to preset's default viewport
      const defaultViewport: FractalViewport = preset.viewport || { x: -0.8, y: 0, zoom: 1.5 };
      setViewport(defaultViewport);
      setMaxIterations(preset.defaultIterations);
      
      // Reset all parameters to defaults
      setZReal(0.0);
      setZImag(0.0);
      setCReal(0.0);
      setCImag(0.0);
      setXReal(2.0);
      setXImag(0.0);
    } else {
      // Fallback for custom equations
      setViewport({ x: -0.8, y: 0, zoom: 1.5 });
      setZReal(0.0);
      setZImag(0.0);
      setCReal(0.0);
      setCImag(0.0);
      setXReal(2.0);
      setXImag(0.0);
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

  // Animation loop - animates parameters smoothly from their current values
  const animationStartRef = useRef<{ time: number; cReal: number; cImag: number; xReal: number; xImag: number; zReal: number; zImag: number } | null>(null);
  
  // Capture current values for animation start (separate from the effect to avoid loops)
  const currentValuesRef = useRef({ cReal, cImag, xReal, xImag, zReal, zImag });
  useEffect(() => {
    // Only update ref when NOT animating (to capture values before animation starts)
    if (!isAnimating) {
      currentValuesRef.current = { cReal, cImag, xReal, xImag, zReal, zImag };
    }
  }, [cReal, cImag, xReal, xImag, zReal, zImag, isAnimating]);
  
  useEffect(() => {
    if (!isAnimating) {
      cancelAnimationFrame(animationFrameRef.current);
      animationStartRef.current = null;
      return;
    }

    const activePreset = PRESET_EQUATIONS[currentPresetKey];
    const shouldAnimateC = activePreset?.showC ?? false;
    const shouldAnimateX = activePreset?.showX ?? false;
    const shouldAnimateZ = activePreset?.showZ ?? false;

    // Capture starting values when animation begins
    if (!animationStartRef.current) {
      const current = currentValuesRef.current;
      animationStartRef.current = {
        time: Date.now(),
        cReal: current.cReal,
        cImag: current.cImag,
        xReal: current.xReal,
        xImag: current.xImag,
        zReal: current.zReal,
        zImag: current.zImag
      };
    }
    const start = animationStartRef.current;

    const animate = () => {
      const elapsed = (Date.now() - start.time) * 0.0005 * animationSpeed;
      
      // Animate from current values with smooth oscillation
      // Use sin for both components so they start at 0 (no jump at t=0)
      if (shouldAnimateC) {
        setCReal(start.cReal + 0.5 * Math.sin(elapsed * 0.5));
        setCImag(start.cImag + 0.5 * Math.sin(elapsed * 0.5 + Math.PI / 2)); // Phase offset, but starts at sin(0)=0 relative to start
      }
      
      if (shouldAnimateX) {
        setXReal(start.xReal + 0.5 * Math.sin(elapsed * 0.3));
        setXImag(start.xImag + 0.3 * Math.sin(elapsed * 0.4 + Math.PI / 3));
      }
      
      if (shouldAnimateZ) {
        setZReal(start.zReal + 0.2 * Math.sin(elapsed * 0.2));
        setZImag(start.zImag + 0.2 * Math.sin(elapsed * 0.25 + Math.PI / 4));
      }
      
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);
    
    return () => {
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isAnimating, animationSpeed, currentPresetKey]);

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

  // Handle canvas clicks for sonic playback and trajectory visualization
  const handleCanvasClick = useCallback((normalizedX: number, normalizedY: number, complexX: number, complexY: number) => {
    // Check if we should do anything
    const shouldPlaySonic = sonicEnabled && synthRef.current;
    const shouldShowTrajectory = trajectoryEnabled;
    
    if (!shouldPlaySonic && !shouldShowTrajectory) return;

    let x = 0;
    let y = 0;
    let iteration = 0;
    let c_real = complexX;
    let c_imag = complexY;

    // Trajectory collection - limit to reasonable number of points
    const maxTrajectoryPoints = Math.min(maxIterations, 200);
    const trajectory: {x: number; y: number; complexX: number; complexY: number}[] = [];

    // Set up initial values based on fractal type
    switch (currentMaterial) {
      case 'julia':
        x = complexX;
        y = complexY;
        c_real = cReal;
        c_imag = cImag;
        break;
      
      case 'burningShip':
      case 'semi':
        // Burning Ship variants: z starts at z_slider, c = click_position (y negated to match shader)
        x = zReal;
        y = zImag;
        c_real = complexX;
        c_imag = -complexY; // Shader negates y
        break;

      case 'tricorn':
        x = 0;
        y = 0;
        c_real = complexX;
        c_imag = complexY;
        break;

      case 'collatz':
        // Collatz Spiral: z = click position (like Julia)
        x = complexX;
        y = complexY;
        c_real = cReal;  // Not used directly, but cReal/cImag affect the formula
        c_imag = cImag;
        break;

      case 'magnet':
        // Magnet: z starts at 0, c = click position
        x = 0;
        y = 0;
        c_real = complexX;
        c_imag = complexY;
        break;

      case 'spiral':
        // Logarithmic Spiral: z = click position
        x = complexX;
        y = complexY;
        c_real = cReal;
        c_imag = cImag;
        break;

      case 'newton':
        x = complexX;
        y = complexY;
        break;

      default:
        // Mandelbrot: z starts at z_slider, c = click_position + c_slider (matches shader)
        x = zReal;
        y = zImag;
        c_real = complexX + cReal;
        c_imag = complexY + cImag;
    }

    // Add starting point to trajectory
    if (shouldShowTrajectory) {
      trajectory.push({ x: normalizedX, y: normalizedY, complexX: x, complexY: y });
    }

    // Helper to add trajectory point (converts complex coords to screen coords)
    const addTrajectoryPoint = (cx: number, cy: number) => {
      if (!shouldShowTrajectory || trajectory.length >= maxTrajectoryPoints) return;
      trajectory.push({ x: 0, y: 0, complexX: cx, complexY: cy });
    };

    // Complex power function for parameterized exponents
    const cpow = (zr: number, zi: number, wr: number, wi: number): [number, number] => {
      const zMag = Math.sqrt(zr * zr + zi * zi);
      if (zMag < 1e-10) return [0, 0];
      const theta = Math.atan2(zi, zr);
      const lnR = Math.log(zMag);
      const realPart = wr * lnR - wi * theta;
      const imagPart = wi * lnR + wr * theta;
      const expReal = Math.exp(Math.max(-50, Math.min(50, realPart)));
      return [expReal * Math.cos(imagPart), expReal * Math.sin(imagPart)];
    };

    // Iterate based on fractal type
    if (currentMaterial === 'burningShip') {
      // Burning Ship: z = (|Re(z)| + i|Im(z)|)^x + c
      while (x * x + y * y <= 256 && iteration < maxIterations) {
        const absX = Math.abs(x);
        const absY = Math.abs(y);
        const [px, py] = cpow(absX, absY, xReal, xImag);
        x = px + c_real;
        y = py + c_imag;
        iteration++;
        addTrajectoryPoint(x, y);
      }
    } else if (currentMaterial === 'semi') {
      // Semi Burning Ship: only real part is absolute
      while (x * x + y * y <= 256 && iteration < maxIterations) {
        const absX = Math.abs(x);
        const [px, py] = cpow(absX, y, xReal, xImag);
        x = px + c_real;
        y = py + c_imag;
        iteration++;
        addTrajectoryPoint(x, y);
      }
    } else if (currentMaterial === 'tricorn') {
      while (x * x + y * y <= 256 && iteration < maxIterations) {
        const xtemp = x * x - y * y + c_real;
        y = -2 * x * y + c_imag;
        x = xtemp;
        iteration++;
        addTrajectoryPoint(x, y);
      }
    } else if (currentMaterial === 'newton') {
      for (let i = 0; i < maxIterations; i++) {
        const x2 = x * x;
        const y2 = y * y;
        const x3_minus_3xy2 = x2 * x - 3 * x * y2;
        const y3x2_minus_y3 = 3 * x2 * y - y2 * y;
        
        const fx = x3_minus_3xy2 - 1.0;
        const fy = y3x2_minus_y3;
        
        const fpx = 3.0 * (x2 - y2);
        const fpy = 3.0 * 2.0 * x * y;
        
        const denom = fpx * fpx + fpy * fpy;
        if (denom < 1e-10) break;
        
        const divRe = (fx * fpx + fy * fpy) / denom;
        const divIm = (fy * fpx - fx * fpy) / denom;
        
        x = x - divRe;
        y = y - divIm;
        addTrajectoryPoint(x, y);
        
        if (divRe * divRe + divIm * divIm < 1e-6) {
          iteration = i;
          break;
        }
        iteration = i + 1;
      }
    } else if (currentMaterial === 'collatz') {
      // Collatz Spiral: smooth Collatz with rotation
      const a = 0.25 + cReal * 0.5;
      const b = cImag * Math.PI;
      const cb = Math.cos(b), sb = Math.sin(b);
      while (x * x + y * y <= 10000 && iteration < maxIterations) {
        const piz = Math.PI * x * a;
        const c2 = Math.cos(piz) ** 2;
        const s2 = Math.sin(piz) ** 2;
        const t1x = x * c2, t1y = y * c2;
        const t2x = (3 * x + 1) * 0.5 * s2, t2y = (3 * y) * 0.5 * s2;
        const zx = t1x + t2x, zy = t1y + t2y;
        x = zx * cb - zy * sb;
        y = zx * sb + zy * cb;
        iteration++;
        addTrajectoryPoint(x, y);
      }
    } else if (currentMaterial === 'magnet') {
      // Magnet: z = [(z^2 + c - 1) / (2z + c - 2)]^2
      const cdiv = (ar: number, ai: number, br: number, bi: number): [number, number] => {
        const denom = br * br + bi * bi;
        if (denom < 1e-10) return [1e10, 1e10];
        return [(ar * br + ai * bi) / denom, (ai * br - ar * bi) / denom];
      };
      while (iteration < maxIterations) {
        const z2r = x * x - y * y;
        const z2i = 2 * x * y;
        const numR = z2r + c_real - 1;
        const numI = z2i + c_imag;
        const denR = 2 * x + c_real - 2;
        const denI = 2 * y + c_imag;
        const [fracR, fracI] = cdiv(numR, numI, denR, denI);
        // Square the fraction
        x = fracR * fracR - fracI * fracI;
        y = 2 * fracR * fracI;
        iteration++;
        addTrajectoryPoint(x, y);
        // Check convergence to 1 or escape
        const diffR = x - 1, diffI = y;
        if (diffR * diffR + diffI * diffI < 1e-6) break;
        if (x * x + y * y > 1000) break;
      }
    } else if (currentMaterial === 'spiral') {
      // Logarithmic Spiral: z^p * e^(a+bi)
      const growthRate = cReal * 0.1;
      const rotationRate = 0.3 + cImag * 0.5;
      const power = xReal;
      const ea = Math.exp(growthRate);
      const spiralReal = ea * Math.cos(rotationRate);
      const spiralImag = ea * Math.sin(rotationRate);
      while (iteration < maxIterations) {
        // Apply z^power
        let zpx = x, zpy = y;
        if (Math.abs(power - 1) > 0.01) {
          const r = Math.sqrt(x * x + y * y);
          if (r > 1e-10) {
            const theta = Math.atan2(y, x);
            const newR = Math.pow(r, power);
            const newTheta = theta * power;
            zpx = newR * Math.cos(newTheta);
            zpy = newR * Math.sin(newTheta);
          }
        }
        // z = z^p * e^(a+bi)
        x = zpx * spiralReal - zpy * spiralImag;
        y = zpx * spiralImag + zpy * spiralReal;
        iteration++;
        addTrajectoryPoint(x, y);
        const dist = Math.sqrt(x * x + y * y);
        if (dist > 100 || dist < 0.0001) break;
      }
    } else if (currentMaterial === 'normal' || (xReal === 2 && xImag === 0)) {
      while (x * x + y * y <= 256 && iteration < maxIterations) {
        const xtemp = x * x - y * y + c_real;
        y = 2 * x * y + c_imag;
        x = xtemp;
        iteration++;
        addTrajectoryPoint(x, y);
      }
    } else {
      while (x * x + y * y <= 256 && iteration < maxIterations) {
        const zMag = Math.sqrt(x * x + y * y);
        if (zMag < 1e-10) {
          x = c_real;
          y = c_imag;
          iteration++;
          addTrajectoryPoint(x, y);
          continue;
        }
        
        const zArg = Math.atan2(y, x);
        const logZMag = Math.log(zMag);
        
        const realPart = xReal * logZMag - xImag * zArg;
        const imagPart = xReal * zArg + xImag * logZMag;
        
        const expReal = Math.exp(realPart);
        const newX = expReal * Math.cos(imagPart) + c_real;
        const newY = expReal * Math.sin(imagPart) + c_imag;
        
        x = newX;
        y = newY;
        iteration++;
        addTrajectoryPoint(x, y);
      }
    }

    // Update trajectory state
    if (shouldShowTrajectory) {
      setTrajectoryPoints(trajectory);
    }

    // Play sound based on escape time (only if sonic enabled)
    if (shouldPlaySonic) {
      let smoothValue = iteration;
      if (iteration < maxIterations && currentMaterial !== 'newton') {
        const zMagSq = x * x + y * y;
        if (zMagSq > 1 && isFinite(zMagSq)) {
          const logZn = Math.log(zMagSq) / 2;
          if (logZn > 0) {
            const nu = Math.log(logZn / Math.log(2)) / Math.log(2);
            if (isFinite(nu)) {
              smoothValue = iteration + 1 - nu;
            }
          }
        }
      }
      
      if (!isFinite(smoothValue) || smoothValue < 0) {
        smoothValue = iteration;
      }

      if (iteration === maxIterations || iteration > maxIterations * 0.95) {
        synthRef.current!.playChord(iteration, maxIterations, normalizedX);
      } else {
        synthRef.current!.playPoint(iteration, maxIterations, normalizedX, smoothValue);
      }
    }
  }, [sonicEnabled, trajectoryEnabled, currentMaterial, cReal, cImag, zReal, zImag, xReal, xImag, maxIterations]);

  // Check if current preset has adjustable parameters
  const hasAdjustableParameters = (PRESET_EQUATIONS[currentPresetKey]?.showZ || 
                                   PRESET_EQUATIONS[currentPresetKey]?.showC || 
                                   PRESET_EQUATIONS[currentPresetKey]?.showX) ?? false;

  // Generate axis numbers for complex plane overlay (memoized for performance)
  const axisNumbers = useMemo(() => {
    if (!interiorEnabled || windowSize.width === 0 || windowSize.height === 0) {
      return { horizontal: [], vertical: [] };
    }

    const aspectRatio = windowSize.width / windowSize.height;
    const viewWidth = viewport.zoom * 2 * aspectRatio;
    const viewHeight = viewport.zoom * 2;

    // Calculate nice tick interval based on zoom
    const getNiceInterval = (range: number): number => {
      const roughInterval = range / 8; // Aim for ~8 ticks
      const magnitude = Math.pow(10, Math.floor(Math.log10(roughInterval)));
      const normalized = roughInterval / magnitude;
      let niceNormalized: number;
      if (normalized <= 1) niceNormalized = 1;
      else if (normalized <= 2) niceNormalized = 2;
      else if (normalized <= 2.5) niceNormalized = 2.5;
      else if (normalized <= 5) niceNormalized = 5;
      else niceNormalized = 10;
      return niceNormalized * magnitude;
    };

    // Determine precision based on interval
    const getPrecision = (interval: number): number => {
      if (interval >= 1) return 0;
      if (interval >= 0.1) return 1;
      if (interval >= 0.01) return 2;
      return 3;
    };

    const hInterval = getNiceInterval(viewWidth);
    const vInterval = getNiceInterval(viewHeight);
    const hPrecision = getPrecision(hInterval);
    const vPrecision = getPrecision(vInterval);

    // Calculate visible range
    const minX = viewport.x - viewWidth / 2;
    const maxX = viewport.x + viewWidth / 2;
    const minY = viewport.y - viewHeight / 2;
    const maxY = viewport.y + viewHeight / 2;

    // Generate horizontal (real) axis numbers
    const horizontal: { value: number; screenPos: number; label: string }[] = [];
    const startX = Math.ceil(minX / hInterval) * hInterval;
    for (let val = startX; val <= maxX; val += hInterval) {
      const screenX = ((val - viewport.x) / (viewport.zoom * aspectRatio) + 1) * 0.5 * windowSize.width;
      if (screenX >= 0 && screenX <= windowSize.width) {
        const label = Math.abs(val) < 1e-10 ? '0' : val.toFixed(hPrecision);
        horizontal.push({ value: val, screenPos: screenX, label });
      }
    }

    // Generate vertical (imaginary) axis numbers
    const vertical: { value: number; screenPos: number; label: string }[] = [];
    const startY = Math.ceil(minY / vInterval) * vInterval;
    for (let val = startY; val <= maxY; val += vInterval) {
      const screenY = (1 - (val - viewport.y) / viewport.zoom) * 0.5 * windowSize.height;
      if (screenY >= 0 && screenY <= windowSize.height) {
        const label = Math.abs(val) < 1e-10 ? '0' : `${val.toFixed(vPrecision)}i`;
        vertical.push({ value: val, screenPos: screenY, label });
      }
    }

    return { horizontal, vertical };
  }, [interiorEnabled, viewport.x, viewport.y, viewport.zoom, windowSize.width, windowSize.height]);

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
            // Clear trajectory on zoom
            if (trajectoryEnabled) setTrajectoryPoints([]);
          }}
          onPan={(x, y) => {
            setViewport((prev) => ({ ...prev, x, y }));
            handleFrameUpdate();
            // Clear trajectory on pan
            if (trajectoryEnabled) setTrajectoryPoints([]);
          }}
        />
      )}

      {/* Trajectory visualization overlay */}
      {trajectoryEnabled && trajectoryPoints.length > 1 && windowSize.width > 0 && (
        <svg
          className="absolute inset-0 pointer-events-none z-5"
          width={windowSize.width}
          height={windowSize.height}
          style={{ overflow: 'visible' }}
        >
          {/* Draw trajectory path */}
          <path
            d={trajectoryPoints.map((pt, i) => {
              // Convert complex coordinates to screen coordinates
              const aspectRatio = windowSize.width / windowSize.height;
              const screenX = ((pt.complexX - viewport.x) / (viewport.zoom * aspectRatio) + 1) * 0.5 * windowSize.width;
              const screenY = (1 - (pt.complexY - viewport.y) / viewport.zoom) * 0.5 * windowSize.height;
              return `${i === 0 ? 'M' : 'L'} ${screenX} ${screenY}`;
            }).join(' ')}
            fill="none"
            stroke="rgba(0, 255, 255, 0.7)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Draw points */}
          {trajectoryPoints.map((pt, i) => {
            const aspectRatio = windowSize.width / windowSize.height;
            const screenX = ((pt.complexX - viewport.x) / (viewport.zoom * aspectRatio) + 1) * 0.5 * windowSize.width;
            const screenY = (1 - (pt.complexY - viewport.y) / viewport.zoom) * 0.5 * windowSize.height;
            const isFirst = i === 0;
            const isLast = i === trajectoryPoints.length - 1;
            
            // Color gradient from green (start) to red (end)
            const t = trajectoryPoints.length > 1 ? i / (trajectoryPoints.length - 1) : 0;
            const r = Math.round(255 * t);
            const g = Math.round(255 * (1 - t));
            
            return (
              <circle
                key={i}
                cx={screenX}
                cy={screenY}
                r={isFirst ? 6 : isLast ? 5 : 3}
                fill={isFirst ? '#00ff00' : isLast ? '#ff0000' : `rgb(${r}, ${g}, 100)`}
                stroke={isFirst || isLast ? 'white' : 'none'}
                strokeWidth={isFirst || isLast ? 2 : 0}
              />
            );
          })}
          {/* Starting point label */}
          {trajectoryPoints.length > 0 && (() => {
            const pt = trajectoryPoints[0];
            const aspectRatio = windowSize.width / windowSize.height;
            const screenX = ((pt.complexX - viewport.x) / (viewport.zoom * aspectRatio) + 1) * 0.5 * windowSize.width;
            const screenY = (1 - (pt.complexY - viewport.y) / viewport.zoom) * 0.5 * windowSize.height;
            return (
              <text x={screenX + 10} y={screenY - 10} fill="white" fontSize="12" fontFamily="monospace">
                z₀
              </text>
            );
          })()}
          {/* End point label */}
          {trajectoryPoints.length > 1 && (() => {
            const pt = trajectoryPoints[trajectoryPoints.length - 1];
            const aspectRatio = windowSize.width / windowSize.height;
            const screenX = ((pt.complexX - viewport.x) / (viewport.zoom * aspectRatio) + 1) * 0.5 * windowSize.width;
            const screenY = (1 - (pt.complexY - viewport.y) / viewport.zoom) * 0.5 * windowSize.height;
            return (
              <text x={screenX + 10} y={screenY - 10} fill="white" fontSize="12" fontFamily="monospace">
                z_{trajectoryPoints.length - 1}
              </text>
            );
          })()}
        </svg>
      )}

      {/* Complex Plane Axis Numbers Overlay */}
      {!hideAllUI && interiorEnabled && windowSize.width > 0 && (
        <div className="absolute inset-0 pointer-events-none z-5">
          {/* Top edge - Real axis numbers */}
          <div className="absolute left-0 right-0" style={{ top: '12px' }}>
            {axisNumbers.horizontal.map((tick, i) => {
              // Passive dock-style effect: bigger/brighter in center, smaller/faded at edges
              const normalizedPos = tick.screenPos / windowSize.width; // 0 to 1
              const distanceFromCenter = Math.abs(normalizedPos - 0.5) * 2; // 0 at center, 1 at edges
              const scale = 1.3 - distanceFromCenter * 0.6; // 1.3 at center, 0.7 at edges
              const opacity = 0.9 - distanceFromCenter * 0.5; // 0.9 at center, 0.4 at edges
              
              return (
                <span
                  key={`top-${i}`}
                  className="absolute font-mono text-xs text-white"
                  style={{
                    left: tick.screenPos,
                    transform: `translateX(-50%) scale(${scale})`,
                    opacity,
                    textShadow: '0 0 4px black, 0 0 8px black, 0 1px 2px black',
                  }}
                >
                  {tick.label}
                </span>
              );
            })}
          </div>

          {/* Bottom edge - Real axis numbers */}
          <div className="absolute left-0 right-0" style={{ bottom: '12px' }}>
            {axisNumbers.horizontal.map((tick, i) => {
              const normalizedPos = tick.screenPos / windowSize.width;
              const distanceFromCenter = Math.abs(normalizedPos - 0.5) * 2;
              const scale = 1.3 - distanceFromCenter * 0.6;
              const opacity = 0.9 - distanceFromCenter * 0.5;
              
              return (
                <span
                  key={`bottom-${i}`}
                  className="absolute font-mono text-xs text-white"
                  style={{
                    left: tick.screenPos,
                    transform: `translateX(-50%) scale(${scale})`,
                    opacity,
                    textShadow: '0 0 4px black, 0 0 8px black, 0 1px 2px black',
                  }}
                >
                  {tick.label}
                </span>
              );
            })}
          </div>

          {/* Left edge - Imaginary axis numbers */}
          <div className="absolute top-0 bottom-0" style={{ left: '12px' }}>
            {axisNumbers.vertical.map((tick, i) => {
              const normalizedPos = tick.screenPos / windowSize.height;
              const distanceFromCenter = Math.abs(normalizedPos - 0.5) * 2;
              const scale = 1.3 - distanceFromCenter * 0.6;
              const opacity = 0.9 - distanceFromCenter * 0.5;
              
              return (
                <span
                  key={`left-${i}`}
                  className="absolute font-mono text-xs text-white"
                  style={{
                    top: tick.screenPos,
                    transform: `translateY(-50%) scale(${scale})`,
                    opacity,
                    textShadow: '0 0 4px black, 0 0 8px black, 0 1px 2px black',
                  }}
                >
                  {tick.label}
                </span>
              );
            })}
          </div>

          {/* Right edge - Imaginary axis numbers */}
          <div className="absolute top-0 bottom-0" style={{ right: '12px' }}>
            {axisNumbers.vertical.map((tick, i) => {
              const normalizedPos = tick.screenPos / windowSize.height;
              const distanceFromCenter = Math.abs(normalizedPos - 0.5) * 2;
              const scale = 1.3 - distanceFromCenter * 0.6;
              const opacity = 0.9 - distanceFromCenter * 0.5;
              
              return (
                <span
                  key={`right-${i}`}
                  className="absolute font-mono text-xs text-white text-right"
                  style={{
                    top: tick.screenPos,
                    transform: `translateY(-50%) scale(${scale})`,
                    transformOrigin: 'right center',
                    opacity,
                    textShadow: '0 0 4px black, 0 0 8px black, 0 1px 2px black',
                  }}
                >
                  {tick.label}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Floating Top Bar with Back Button and Title */}
      <div className="absolute top-0 left-0 right-0 z-10 pointer-events-none">
        <div className="flex items-center justify-between p-4">
          <Link
            href="/"
            className="pointer-events-auto group flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 hover:bg-slate-700/50"
            style={{
              background: 'rgba(15, 23, 42, 0.9)',
              border: '1px solid rgba(100, 116, 139, 0.3)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
            }}
          >
            <MdArrowBack className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
            <span className="text-sm text-slate-400 group-hover:text-white transition-colors">Back</span>
          </Link>
          <div 
            className="px-5 py-2 rounded-lg pointer-events-auto"
            style={{
              background: 'rgba(15, 23, 42, 0.9)',
              border: '1px solid rgba(100, 116, 139, 0.3)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
            }}
          >
            <h1 className="text-base font-semibold text-white">
              Fractal Explorer
            </h1>
          </div>
          <div className="w-24" />
        </div>
      </div>

      {/* Floating Parameter Panel - Bottom Center */}
      {/* Position adjusts based on whether sliders are shown */}
      {!hideAllUI && (
        <div
          className="absolute left-1/2 z-10 transition-all duration-300 ease-out pointer-events-none"
          style={{
            bottom: hasAdjustableParameters ? '16px' : '24px',
            transform: showParameters ? 'translateX(-50%)' : 'translateX(-50%) translateY(150%)',
          }}
        >
            <div 
              className="pointer-events-auto rounded-lg overflow-hidden"
              style={{
                background: 'rgba(15, 23, 42, 0.95)',
                border: '1px solid rgba(100, 116, 139, 0.3)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
              }}
            >
              {/* Header Row - Fractal name & equation */}
              <div 
                className="px-4 py-2.5 flex items-center justify-between gap-4"
                style={{
                  borderBottom: hasAdjustableParameters ? '1px solid rgba(100, 116, 139, 0.3)' : 'none',
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-cyan-400 text-sm font-medium">
                    {PRESET_EQUATIONS[currentPresetKey]?.label || 'Fractal'}
                  </span>
                  <div className="text-white text-sm">
                    <InlineMath math={PRESET_EQUATIONS[currentPresetKey]?.equation || 'z_{n+1} = z_n^2 + c'} />
                  </div>
                </div>
                <button
                  onClick={() => setShowParameters(false)}
                  className="w-6 h-6 flex items-center justify-center text-slate-500 hover:text-white hover:bg-slate-700/50 rounded transition-colors"
                >
                  <MdClose className="w-4 h-4" />
                </button>
              </div>

              {/* Parameters Row */}
              {hasAdjustableParameters && (
                <div className="px-5 py-4 flex items-start gap-6">
                  {/* Parameter Sliders */}
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

                  {/* Divider */}
                  <div className="w-px h-auto self-stretch bg-linear-to-b from-transparent via-gray-600 to-transparent" />

                  {/* Animation Controls */}
                  <AnimationControls
                    isPlaying={isAnimating}
                    onTogglePlay={() => setIsAnimating(!isAnimating)}
                    speed={animationSpeed}
                    onSpeedChange={setAnimationSpeed}
                  />
                </div>
              )}
            </div>
          </div>
      )}

      {/* Floating Controls Panel - Right Side */}
      {!hideAllUI && (
        <div
          className="absolute top-4 right-4 z-10 transition-transform duration-300"
          style={{ transform: showControls ? 'translate(0,0)' : 'translate(110%,0)' }}
        >
          <div 
            className="w-76 pointer-events-auto max-h-[90vh] overflow-y-auto rounded-lg"
            style={{
              background: 'rgba(15, 23, 42, 0.95)',
              border: '1px solid rgba(100, 116, 139, 0.3)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
            }}
          >
            {/* Panel Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/40">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Fractals
              </h2>
              <button
                onClick={() => setShowControls(false)}
                className="w-6 h-6 flex items-center justify-center rounded text-slate-500 hover:text-white hover:bg-slate-700/50 transition-colors"
              >
                <MdClose className="w-4 h-4" />
              </button>
            </div>
            
            {/* Panel Content */}
            <div className="p-4">
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
        </div>
      )}

      {/* Sonic Controls Panel */}
      {!hideAllUI && (
        <div 
          className="absolute top-4 right-[340px] z-10 transition-all duration-300"
          style={{
            transform: showControls ? 'translate(0, 0)' : 'translate(110%, 0)',
            opacity: showControls ? 1 : 0,
            pointerEvents: showControls ? 'auto' : 'none'
          }}
        >
          <div 
            className="pointer-events-auto rounded-xl p-1"
            style={{
              background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 27, 75, 0.85))',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(148, 163, 184, 0.15)',
              boxShadow: '0 15px 40px rgba(0, 0, 0, 0.4)'
            }}
          >
            <div className="flex items-center gap-2 p-2">
              <button
                onClick={() => setSonicEnabled(!sonicEnabled)}
                className={`px-4 py-2.5 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${
                  sonicEnabled
                    ? 'bg-linear-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/30'
                    : 'bg-slate-800/60 text-slate-400 border border-slate-700/50 hover:text-white hover:border-slate-600'
                }`}
                title="Toggle Sonic Mode - Click anywhere to hear the fractal"
              >
                {sonicEnabled ? '🎵' : '🔇'}
                <span>{sonicEnabled ? 'Sonic ON' : 'Sonic'}</span>
              </button>
              <button
                onClick={() => {
                  setTrajectoryEnabled(!trajectoryEnabled);
                  if (trajectoryEnabled) setTrajectoryPoints([]);
                }}
                className={`px-4 py-2.5 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${
                  trajectoryEnabled
                    ? 'bg-linear-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/30'
                    : 'bg-slate-800/60 text-slate-400 border border-slate-700/50 hover:text-white hover:border-slate-600'
                }`}
                title="Toggle Trajectory - Click to see the iteration path"
              >
                📍
                <span>{trajectoryEnabled ? 'Path ON' : 'Path'}</span>
              </button>
              {sonicEnabled && (
                <div className="flex items-center gap-2 px-2 py-1 bg-slate-900/40 rounded-lg border border-slate-700/30">
                  <span className="text-purple-400 text-xs">Vol</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={sonicVolume}
                    onChange={(e) => setSonicVolume(parseFloat(e.target.value))}
                    className="w-16 h-1 rounded-full cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #a78bfa 0%, #a78bfa ${sonicVolume * 100}%, rgba(51, 65, 85, 0.5) ${sonicVolume * 100}%, rgba(51, 65, 85, 0.5) 100%)`
                    }}
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

      {/* Floating Performance Panel - Bottom Right Corner */}
      {!hideAllUI && (
        <div
          className="absolute z-10 transition-all duration-300 ease-out"
          style={{ 
            bottom: '16px',
            right: '16px',
            transform: showStats ? 'translate(0, 0)' : 'translate(0, 150%)',
            opacity: showStats ? 1 : 0,
            pointerEvents: showStats ? 'auto' : 'none'
          }}
        >
          <div 
            className="pointer-events-auto rounded-lg overflow-hidden"
            style={{ 
              width: '180px',
              background: 'rgba(15, 23, 42, 0.92)',
              border: '1px solid rgba(100, 116, 139, 0.3)',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700/40">
              <div className="flex items-center gap-2">
                <MdShowChart className="w-3.5 h-3.5 text-green-400" />
                <h2 className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Performance
                </h2>
              </div>
              <button
                onClick={() => setShowStats(false)}
                className="w-5 h-5 flex items-center justify-center rounded text-slate-500 hover:text-white hover:bg-slate-700/50 transition-colors"
              >
                <MdClose className="w-3.5 h-3.5" />
              </button>
            </div>
            
            {/* Stats */}
            <div className="p-2.5 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-slate-500">FPS</span>
                <span className="text-sm font-bold font-mono text-green-400">{fps.toFixed(0)}</span>
              </div>
              
              <div className="h-px bg-slate-700/40"></div>
              
              <div className="grid grid-cols-2 gap-2">
                <div className="p-1.5 bg-slate-900/50 rounded border border-slate-700/30">
                  <div className="text-[9px] text-slate-500 mb-0.5">Iterations</div>
                  <div className="text-xs font-mono text-cyan-400">{maxIterations}</div>
                </div>
                <div className="p-1.5 bg-slate-900/50 rounded border border-slate-700/30">
                  <div className="text-[9px] text-slate-500 mb-0.5">Material</div>
                  <div className="text-xs font-mono text-purple-400 truncate">{currentMaterial}</div>
                </div>
              </div>
              
              <div className="h-px bg-slate-700/40"></div>
              
              <div className="p-1.5 bg-slate-900/50 rounded border border-slate-700/30">
                <div className="flex justify-between items-center mb-0.5">
                  <span className="text-[9px] text-slate-500">Zoom</span>
                  <span className="text-[10px] font-mono text-pink-400">{viewport.zoom.toFixed(2)}x</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[9px] text-slate-500">Position</span>
                  <span className="text-[9px] font-mono text-cyan-400">
                    ({viewport.x.toFixed(3)}, {viewport.y.toFixed(3)})
                  </span>
                </div>
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
              className="w-10 h-10 rounded-lg flex items-center justify-center transition-all pointer-events-auto hover:bg-slate-700/60"
              style={{
                background: 'rgba(15, 23, 42, 0.9)',
                border: '1px solid rgba(100, 116, 139, 0.3)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
              }}
              title="Show Parameters (P)"
            >
              <MdTune className="w-5 h-5 text-slate-400" />
            </button>
          )}
          {!showControls && (
            <button
              onClick={() => setShowControls(true)}
              className="w-10 h-10 rounded-lg flex items-center justify-center transition-all pointer-events-auto hover:bg-slate-700/60"
              style={{
                background: 'rgba(15, 23, 42, 0.9)',
                border: '1px solid rgba(100, 116, 139, 0.3)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
              }}
              title="Show Fractals (C)"
            >
              <svg className="w-5 h-5 text-slate-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
              </svg>
            </button>
          )}
          {!showStats && (
            <button
              onClick={() => setShowStats(true)}
              className="w-10 h-10 rounded-lg flex items-center justify-center transition-all pointer-events-auto hover:bg-slate-700/60"
              style={{
                background: 'rgba(15, 23, 42, 0.9)',
                border: '1px solid rgba(100, 116, 139, 0.3)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
              }}
              title="Show Stats (S)"
            >
              <MdShowChart className="w-5 h-5 text-slate-400" />
            </button>
          )}
        </div>
      )}

      {/* Left Side Top Controls - Screenshot, Hide */}
      {!hideAllUI && (
        <div className="absolute top-20 left-4 z-20 flex flex-col gap-2">
          {/* Screenshot Button */}
          <button
            onClick={handleScreenshot}
            className="w-10 h-10 rounded-lg flex items-center justify-center transition-all pointer-events-auto hover:bg-slate-700/60"
            style={{
              background: 'rgba(15, 23, 42, 0.9)',
              border: '1px solid rgba(100, 116, 139, 0.3)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
            }}
            title="Screenshot (Shift+S)"
          >
            <MdCameraAlt className="w-5 h-5 text-slate-400" />
          </button>
          
          {/* Hide All UI Button */}
          <button
            onClick={() => setHideAllUI(true)}
            className="w-10 h-10 rounded-lg flex items-center justify-center transition-all pointer-events-auto hover:bg-slate-700/60"
            style={{
              background: 'rgba(15, 23, 42, 0.9)',
              border: '1px solid rgba(100, 116, 139, 0.3)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
            }}
            title="Hide All UI (H)"
          >
            <MdVisibilityOff className="w-5 h-5 text-slate-400" />
          </button>
        </div>
      )}

      {/* Show UI Button - When hidden */}
      {hideAllUI && (
        <button
          onClick={() => setHideAllUI(false)}
          className="absolute top-4 right-4 z-20 w-10 h-10 rounded-lg flex items-center justify-center transition-all pointer-events-auto hover:bg-slate-700/60"
          style={{
            background: 'rgba(15, 23, 42, 0.9)',
            border: '1px solid rgba(100, 116, 139, 0.3)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
          }}
          title="Show UI (H)"
        >
          <MdVisibility className="w-5 h-5 text-slate-400" />
        </button>
      )}

      {/* Bottom Layout: Shortcuts (left), Parameters (center), Performance (right) */}
      {/* Panels stay at corners, don't overlap with center parameter panel */}
      
      {/* Keyboard Shortcuts - Bottom Left Corner */}
      {!hideAllUI && (
        <div 
          className="absolute z-10 pointer-events-auto transition-all duration-300 ease-out rounded-lg overflow-hidden"
          style={{
            bottom: '16px',
            left: '16px',
            width: '180px',
            background: 'rgba(15, 23, 42, 0.92)',
            border: '1px solid rgba(100, 116, 139, 0.3)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
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
              <kbd className="px-1.5 py-0.5 bg-slate-800/80 border border-slate-600/50 rounded text-cyan-400 font-mono text-[9px]">P</kbd>
              <span className="text-slate-500">Params</span>
            </div>
            <div className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 bg-slate-800/80 border border-slate-600/50 rounded text-cyan-400 font-mono text-[9px]">C</kbd>
              <span className="text-slate-500">Fractals</span>
            </div>
            <div className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 bg-slate-800/80 border border-slate-600/50 rounded text-cyan-400 font-mono text-[9px]">S</kbd>
              <span className="text-slate-500">Stats</span>
            </div>
            <div className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 bg-slate-800/80 border border-slate-600/50 rounded text-cyan-400 font-mono text-[9px]">A</kbd>
              <span className="text-slate-500">Advanced</span>
            </div>
            <div className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 bg-slate-800/80 border border-slate-600/50 rounded text-cyan-400 font-mono text-[9px]">H</kbd>
              <span className="text-slate-500">Hide UI</span>
            </div>
            <div className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 bg-slate-800/80 border border-slate-600/50 rounded text-pink-400 font-mono text-[9px]">⇧S</kbd>
              <span className="text-slate-500">Screenshot</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
