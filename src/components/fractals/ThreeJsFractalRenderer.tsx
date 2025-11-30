'use client';

import React, { useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { materials, MaterialKey, createCustomMaterial } from '@/lib/webgl/shader-materials';
import { getPaletteTexture, PaletteName, DEFAULT_PALETTE } from '@/lib/utils/palettes';

export interface ThreeJsFractalRendererProps {
  width: number;
  height: number;
  materialKey: MaterialKey;
  customEquation?: string;
  initialViewport?: { x: number; y: number; zoom: number };
  onZoom?: (zoomLevel: number) => void;
  onPan?: (offsetX: number, offsetY: number) => void;
  onClick?: (x: number, y: number, complexX: number, complexY: number) => void; // For sonic playback
  iterations?: number;
  paletteName?: PaletteName;
  autoAdjustIterations?: boolean;
  autoAdjustSmoothing?: number; // 0..1 per frame smoothing toward target
  autoTone?: boolean;
  gamma?: number;
  bandStrength?: number;
  bandCenter?: number;
  bandWidth?: number;
  interiorEnabled?: boolean;
  bands?: number;
  power?: number; // exponent parameter for z^n when equation uses 'n'
  zReal?: number;
  zImag?: number;
  cReal?: number;
  cImag?: number;
  xReal?: number;
  xImag?: number;
}

interface ViewState {
  offset: { x: number; y: number };
  scale: number;
  time: number;
}

export const ThreeJsFractalRenderer: React.FC<ThreeJsFractalRendererProps> = ({
  width,
  height,
  materialKey,
  customEquation,
  initialViewport,
  onZoom,
  onPan,
  onClick,
  iterations = 150,
  paletteName = DEFAULT_PALETTE,
  autoAdjustIterations = true,
  autoAdjustSmoothing = 0.15,
  autoTone = true,
  gamma = 1.15,
  bandStrength = 0.85,
  bandCenter = 0.88,
  bandWidth = 0.035,
  interiorEnabled = true,
  bands = 0,
  power = 2.0,
  zReal = 0.0,
  zImag = 0.0,
  cReal = 0.0,
  cImag = 0.0,
  xReal = 2.0,
  xImag = 0.0,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const materialRef = useRef<THREE.RawShaderMaterial | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);

  // Viewport/interaction state
  const viewStateRef = useRef<ViewState>({
    offset: { 
      x: initialViewport?.x ?? -0.8, 
      y: initialViewport?.y ?? 0 
    },
    scale: initialViewport?.zoom ?? 1.5,
    time: 0,
  });

  const dragStateRef = useRef({
    isDragging: false,
    dragStart: { x: 0, y: 0 },
    state: 'NONE', // 'NONE', 'PAN', 'ZOOM'
  });

  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const frameCountRef = useRef<number>(0);
  const fpsRef = useRef<number>(60);
  const targetFpsRef = useRef<number>(60);
  const targetItersRef = useRef<number>(iterations);
  const currentItersRef = useRef<number>(iterations);
  const autoEnabledRef = useRef<boolean>(autoAdjustIterations);
  const maxItersCapRef = useRef<number>(512);
  const autoToneRef = useRef<boolean>(autoTone);
  const toneParamsRef = useRef({ gamma, bandStrength, bandCenter, bandWidth, interiorEnabled, bands });

  const extractMaxItersCap = useCallback((shader: string | undefined): number => {
    if (!shader) return 512;
    const m = shader.match(/#define\s+MAX_ITERS\s+(\d+)/);
    return m ? Math.max(1, parseInt(m[1], 10)) : 512;
  }, []);

  const maybeRecompileWithCap = useCallback((desiredCap: number) => {
    if (!materialRef.current) return;
    const currentCap = maxItersCapRef.current;
    if (desiredCap <= currentCap) return;
    const newCap = Math.min(2048, desiredCap);
    const fs = (materialRef.current as any).fragmentShader as string | undefined;
    if (!fs) return;
    const replaced = fs.replace(/#define\s+MAX_ITERS\s+\d+/, `#define MAX_ITERS ${newCap}`);
    if (replaced !== fs) {
      (materialRef.current as any).fragmentShader = replaced;
      materialRef.current.needsUpdate = true;
      maxItersCapRef.current = newCap;
    }
  }, []);

  // Initialize THREE.js scene
  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    sceneRef.current = scene;

    // Camera - orthographic for full-screen coverage
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    camera.position.set(0, 0, 1);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current || undefined,
      preserveDrawingBuffer: true,
      antialias: false,
      precision: 'highp',
    });
    renderer.autoClear = false;
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    rendererRef.current = renderer;

    if (!canvasRef.current) {
      containerRef.current.appendChild(renderer.domElement);
      canvasRef.current = renderer.domElement;
    }

    // Geometry - simple plane
    const geometry = new THREE.PlaneGeometry(2, 2, 1, 1);

    // Create and set material
    let material: THREE.RawShaderMaterial;
    if (materialKey === 'custom' && customEquation) {
      material = createCustomMaterial();
    } else {
      const materialFactory = materials[materialKey];
      material = materialFactory();
    }
    materialRef.current = material;

    // Update uniforms with initial values
    material.uniforms.resolution.value.set(width, height);
    material.uniforms.offset.value.copy(
      new THREE.Vector2(viewStateRef.current.offset.x, viewStateRef.current.offset.y)
    );
    material.uniforms.scale.value = viewStateRef.current.scale;
    // Palette + iterations
    material.uniforms.palette.value = getPaletteTexture(paletteName);
    material.uniforms.uIters.value = iterations;
    if (material.uniforms.uPower) material.uniforms.uPower.value = power;
    if (material.uniforms.uZ0) material.uniforms.uZ0.value = new THREE.Vector2(zReal, zImag);
    if (material.uniforms.uC) material.uniforms.uC.value = new THREE.Vector2(cReal, cImag);
    if (material.uniforms.uX) material.uniforms.uX.value = new THREE.Vector2(xReal, xImag);
    if (material.uniforms.uGamma) material.uniforms.uGamma.value = toneParamsRef.current.gamma;
    if (material.uniforms.uBandStrength) material.uniforms.uBandStrength.value = toneParamsRef.current.bandStrength;
    if (material.uniforms.uBandCenter) material.uniforms.uBandCenter.value = toneParamsRef.current.bandCenter;
    if (material.uniforms.uBandWidth) material.uniforms.uBandWidth.value = toneParamsRef.current.bandWidth;
    if (material.uniforms.uInteriorEnabled) material.uniforms.uInteriorEnabled.value = toneParamsRef.current.interiorEnabled ? 1 : 0;
    if (material.uniforms.uBands) material.uniforms.uBands.value = toneParamsRef.current.bands|0;

    // Mesh
    const mesh = new THREE.Mesh(geometry, material);
    sceneRef.current.add(mesh);
    meshRef.current = mesh;

    // Handle resize
    const handleResize = () => {
      const newWidth = containerRef.current?.clientWidth || width;
      const newHeight = containerRef.current?.clientHeight || height;

      renderer.setSize(newWidth, newHeight);
      material.uniforms.resolution.value.set(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, [width, height, materialKey]);

  // Update viewport when initialViewport prop changes
  useEffect(() => {
    if (!initialViewport || !materialRef.current) return;

    viewStateRef.current.offset.x = initialViewport.x;
    viewStateRef.current.offset.y = initialViewport.y;
    viewStateRef.current.scale = initialViewport.zoom;

    // Update uniforms
    materialRef.current.uniforms.offset.value.set(initialViewport.x, initialViewport.y);
    materialRef.current.uniforms.scale.value = initialViewport.zoom;

    // Update high precision uniforms if they exist
    if (materialRef.current.uniforms.offsetMostSignificant) {
      materialRef.current.uniforms.offsetMostSignificant.value.set(initialViewport.x, initialViewport.y);
      materialRef.current.uniforms.offsetLeastSignificant.value.set(
        initialViewport.x - Math.fround(initialViewport.x),
        initialViewport.y - Math.fround(initialViewport.y)
      );
    }
  }, [initialViewport]);

  // Update material when materialKey or customEquation changes
  useEffect(() => {
    if (!sceneRef.current || !meshRef.current) return;

    const oldMaterial = materialRef.current;
    
    let newMaterial: THREE.RawShaderMaterial;
    if (materialKey === 'custom' && customEquation) {
      newMaterial = createCustomMaterial();
    } else {
      const materialFactory = materials[materialKey];
      newMaterial = materialFactory();
    }

    // Preserve viewport state
    newMaterial.uniforms.resolution.value.copy(oldMaterial!.uniforms.resolution.value);
    newMaterial.uniforms.offset.value.copy(oldMaterial!.uniforms.offset.value);
    newMaterial.uniforms.scale.value = oldMaterial!.uniforms.scale.value;
    newMaterial.uniforms.time.value = oldMaterial!.uniforms.time.value;
    // Palette + iterations
    newMaterial.uniforms.palette.value = getPaletteTexture(paletteName);
    (newMaterial.uniforms.palette.value as THREE.DataTexture).needsUpdate = true;
    newMaterial.uniforms.uIters.value = iterations;
    targetItersRef.current = iterations;
    currentItersRef.current = iterations;
    maxItersCapRef.current = extractMaxItersCap((newMaterial as any).fragmentShader as string | undefined);
    // Preserve fractal parameters (z, c, x) from props
    if (newMaterial.uniforms.uZ0) newMaterial.uniforms.uZ0.value = new THREE.Vector2(zReal, zImag);
    if (newMaterial.uniforms.uC) newMaterial.uniforms.uC.value = new THREE.Vector2(cReal, cImag);
    if (newMaterial.uniforms.uX) newMaterial.uniforms.uX.value = new THREE.Vector2(xReal, xImag);
    if (newMaterial.uniforms.uPower) newMaterial.uniforms.uPower.value = power;
    if (newMaterial.uniforms.uGamma) newMaterial.uniforms.uGamma.value = toneParamsRef.current.gamma;
    if (newMaterial.uniforms.uBandStrength) newMaterial.uniforms.uBandStrength.value = toneParamsRef.current.bandStrength;
    if (newMaterial.uniforms.uBandCenter) newMaterial.uniforms.uBandCenter.value = toneParamsRef.current.bandCenter;
    if (newMaterial.uniforms.uBandWidth) newMaterial.uniforms.uBandWidth.value = toneParamsRef.current.bandWidth;
    if (newMaterial.uniforms.uInteriorEnabled) newMaterial.uniforms.uInteriorEnabled.value = toneParamsRef.current.interiorEnabled ? 1 : 0;
    if (newMaterial.uniforms.uBands) newMaterial.uniforms.uBands.value = toneParamsRef.current.bands|0;

    meshRef.current.material = newMaterial;
    materialRef.current = newMaterial;

    if (oldMaterial) {
      oldMaterial.dispose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [materialKey, customEquation]);
  // Note: paletteName, iterations, and z/c/x params have their own effects - no need to recreate material

  // React to palette changes without recreating material
  useEffect(() => {
    if (!materialRef.current) return;
    materialRef.current.uniforms.palette.value = getPaletteTexture(paletteName);
    (materialRef.current.uniforms.palette.value as THREE.DataTexture).needsUpdate = true;
  }, [paletteName]);

  // Update uPower when prop changes
  useEffect(() => {
    if (!materialRef.current) return;
    if (materialRef.current.uniforms.uPower) {
      materialRef.current.uniforms.uPower.value = power;
    }
  }, [power]);

  // Update z, c, and x parameters
  useEffect(() => {
    if (!materialRef.current) return;
    if (materialRef.current.uniforms.uZ0) {
      materialRef.current.uniforms.uZ0.value = new THREE.Vector2(zReal, zImag);
    }
    if (materialRef.current.uniforms.uC) {
      materialRef.current.uniforms.uC.value = new THREE.Vector2(cReal, cImag);
    }
    if (materialRef.current.uniforms.uX) {
      materialRef.current.uniforms.uX.value = new THREE.Vector2(xReal, xImag);
    }
  }, [zReal, zImag, cReal, cImag, xReal, xImag]);

  useEffect(() => {
    if (!materialRef.current) return;
    targetItersRef.current = iterations;
  }, [iterations]);

  useEffect(() => {
    autoEnabledRef.current = autoAdjustIterations;
  }, [autoAdjustIterations]);

  useEffect(() => { autoToneRef.current = autoTone; }, [autoTone]);
  useEffect(() => {
    toneParamsRef.current = { gamma, bandStrength, bandCenter, bandWidth, interiorEnabled, bands };
    if (!materialRef.current) return;
    if (!autoToneRef.current) {
      if (materialRef.current.uniforms.uGamma) materialRef.current.uniforms.uGamma.value = gamma;
      if (materialRef.current.uniforms.uBandStrength) materialRef.current.uniforms.uBandStrength.value = bandStrength;
    }
    if (materialRef.current.uniforms.uBandCenter) materialRef.current.uniforms.uBandCenter.value = bandCenter;
    if (materialRef.current.uniforms.uBandWidth) materialRef.current.uniforms.uBandWidth.value = bandWidth;
    if (materialRef.current.uniforms.uInteriorEnabled) materialRef.current.uniforms.uInteriorEnabled.value = interiorEnabled ? 1 : 0;
    if (materialRef.current.uniforms.uBands) materialRef.current.uniforms.uBands.value = bands|0;
  }, [gamma, bandStrength, bandCenter, bandWidth, interiorEnabled, bands, autoTone]);

  // Animation loop
  useEffect(() => {
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);

      if (!rendererRef.current || !sceneRef.current || !materialRef.current) return;

      // Update time for animated fractals (Julia)
      const currentTime = (Date.now() - startTimeRef.current) / 1000;
      materialRef.current.uniforms.time.value = currentTime;

      // Adaptive cinematic tone based on zoom depth (compromise for overview vs deep zoom)
      if (autoToneRef.current) {
        const s = Math.max(1e-9, viewStateRef.current.scale);
        const depth = Math.max(0, Math.min(1, (Math.log2(1 / s) + 2.0) / 12.0));
        const effectiveGamma = 0.9 + (1.6 - 0.9) * depth;
        const effectiveBandStrength = 0.2 + (0.9 - 0.2) * depth;
        if (materialRef.current.uniforms.uGamma) materialRef.current.uniforms.uGamma.value = effectiveGamma;
        if (materialRef.current.uniforms.uBandStrength) materialRef.current.uniforms.uBandStrength.value = effectiveBandStrength;
      }

      // Render with persistent camera
      if (cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }

      // FPS calculation
      frameCountRef.current++;
      if (frameCountRef.current % 30 === 0) {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        fpsRef.current = frameCountRef.current / elapsed;
        // Update target iterations based on FPS bands
        if (autoEnabledRef.current) {
          const currentTarget = targetItersRef.current;
          let nextTarget = currentTarget;
          if (fpsRef.current > targetFpsRef.current + 5 && currentTarget < 2000) {
            nextTarget = Math.min(2000, currentTarget + 20);
          } else if (fpsRef.current < targetFpsRef.current - 5 && currentTarget > 30) {
            nextTarget = Math.max(30, currentTarget - 20);
          }
          targetItersRef.current = nextTarget;
          // Request a higher compile-time cap if needed
          if (nextTarget > maxItersCapRef.current) {
            maybeRecompileWithCap(nextTarget);
          }
        }
      }

      // Smoothly tween current iterations toward target
      if (materialRef.current) {
        const t = Math.max(0, Math.min(1, autoAdjustSmoothing));
        const current = currentItersRef.current;
        const target = autoEnabledRef.current ? targetItersRef.current : targetItersRef.current; // still follow manual updates
        const next = current + (target - current) * t;
        currentItersRef.current = next;
        const rounded = Math.max(1, Math.round(next));
        materialRef.current.uniforms.uIters.value = rounded;
        // Safety: if manual target exceeds cap, trigger recompile
        if (rounded > maxItersCapRef.current) {
          maybeRecompileWithCap(rounded);
        }
      }
    };

    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Handle mouse interactions
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    dragStateRef.current.isDragging = true;
    dragStateRef.current.dragStart = { x: e.clientX, y: e.clientY };

    if (e.button === 0) {
      dragStateRef.current.state = 'PAN';
    } else if (e.button === 1 || e.button === 2) {
      dragStateRef.current.state = 'ZOOM';
    }
  }, []);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (!onClick || !canvasRef.current) return;

    // Only trigger click if not dragging
    const clickThreshold = 5; // pixels
    const deltaX = Math.abs(e.clientX - dragStateRef.current.dragStart.x);
    const deltaY = Math.abs(e.clientY - dragStateRef.current.dragStart.y);
    
    if (deltaX > clickThreshold || deltaY > clickThreshold) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    // Convert pixel to complex plane coordinates
    const normalizedX = px / rect.width;
    const normalizedY = py / rect.height;
    
    const aspectRatio = rect.width / rect.height;
    const complexX = ((normalizedX - 0.5) * 2 * aspectRatio * viewStateRef.current.scale) + viewStateRef.current.offset.x;
    const complexY = ((0.5 - normalizedY) * 2 * viewStateRef.current.scale) + viewStateRef.current.offset.y;

    onClick(normalizedX, normalizedY, complexX, complexY);
  }, [onClick]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragStateRef.current.isDragging || !canvasRef.current || !materialRef.current) return;

    const deltaX = e.clientX - dragStateRef.current.dragStart.x;
    const deltaY = e.clientY - dragStateRef.current.dragStart.y;

    const rect = canvasRef.current.getBoundingClientRect();
    const ndcDeltaX = (deltaX / rect.width) * 2;
    const ndcDeltaY = (deltaY / rect.height) * 2;

    if (dragStateRef.current.state === 'PAN') {
      viewStateRef.current.offset.x -= ndcDeltaX * viewStateRef.current.scale;
      viewStateRef.current.offset.y += ndcDeltaY * viewStateRef.current.scale;

      // Update standard offset uniform
      materialRef.current.uniforms.offset.value.set(
        viewStateRef.current.offset.x,
        viewStateRef.current.offset.y
      );

      // Update high precision uniforms if they exist
      if (materialRef.current.uniforms.offsetMostSignificant) {
        const x = viewStateRef.current.offset.x;
        const y = viewStateRef.current.offset.y;
        materialRef.current.uniforms.offsetMostSignificant.value.set(x, y);
        materialRef.current.uniforms.offsetLeastSignificant.value.set(
          x - Math.fround(x), 
          y - Math.fround(y)
        );
      }

      onPan?.(viewStateRef.current.offset.x, viewStateRef.current.offset.y);
    } else if (dragStateRef.current.state === 'ZOOM') {
      const zoomFactor = Math.pow(2, deltaY * 0.01);
      viewStateRef.current.scale *= zoomFactor;
      materialRef.current.uniforms.scale.value = viewStateRef.current.scale;

      onZoom?.(viewStateRef.current.scale);
    }

    dragStateRef.current.dragStart = { x: e.clientX, y: e.clientY };
  }, [onZoom, onPan]);

  const handleMouseUp = useCallback(() => {
    dragStateRef.current.isDragging = false;
    dragStateRef.current.state = 'NONE';
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();

    if (!materialRef.current || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const aspectRatio = rect.width / rect.height;
    
    // Get mouse position in normalized device coordinates (-1 to 1)
    const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    // Calculate fractal space coordinates under the mouse before zoom
    // Account for aspect ratio in X direction (matches shader calculation)
    const fractalX = viewStateRef.current.offset.x + mouseX * aspectRatio * viewStateRef.current.scale;
    const fractalY = viewStateRef.current.offset.y + mouseY * viewStateRef.current.scale;

    // Inverted: scroll down (deltaY > 0) = zoom in (smaller scale)
    const zoomFactor = e.deltaY > 0 ? 1.25 : 0.8;
    const newScale = viewStateRef.current.scale * zoomFactor;
    viewStateRef.current.scale = newScale;

    // Adjust center to keep the mouse-pointed location fixed
    viewStateRef.current.offset.x = fractalX - mouseX * aspectRatio * newScale;
    viewStateRef.current.offset.y = fractalY - mouseY * newScale;

    // Update uniforms
    materialRef.current.uniforms.scale.value = newScale;
    materialRef.current.uniforms.offset.value.set(
      viewStateRef.current.offset.x,
      viewStateRef.current.offset.y
    );

    // Update high precision uniforms if they exist
    if (materialRef.current.uniforms.offsetMostSignificant) {
      const x = viewStateRef.current.offset.x;
      const y = viewStateRef.current.offset.y;
      materialRef.current.uniforms.offsetMostSignificant.value.set(x, y);
      materialRef.current.uniforms.offsetLeastSignificant.value.set(
        x - Math.fround(x), 
        y - Math.fround(y)
      );
    }

    onZoom?.(newScale);
    onPan?.(viewStateRef.current.offset.x, viewStateRef.current.offset.y);
  }, [onZoom, onPan]);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', position: 'relative' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleClick}
      onWheel={handleWheel}
      onContextMenu={(e) => e.preventDefault()}
    >
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
    </div>
  );
};
