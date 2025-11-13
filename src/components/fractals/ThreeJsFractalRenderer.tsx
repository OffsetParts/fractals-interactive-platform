'use client';

import React, { useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { materials, MaterialKey, createCustomMaterial } from '@/lib/webgl/shader-materials';

export interface ThreeJsFractalRendererProps {
  width: number;
  height: number;
  materialKey: MaterialKey;
  customEquation?: string;
  initialViewport?: { x: number; y: number; zoom: number };
  onZoom?: (zoomLevel: number) => void;
  onPan?: (offsetX: number, offsetY: number) => void;
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
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
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

  // Initialize THREE.js scene
  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb); // skyblue
    sceneRef.current = scene;

    // Camera - orthographic for full-screen coverage
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1000, 1000);
    camera.position.set(0, 0, 1);
    camera.lookAt(0, 0, 0);

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
      material = createCustomMaterial(customEquation);
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
      newMaterial = createCustomMaterial(customEquation);
    } else {
      const materialFactory = materials[materialKey];
      newMaterial = materialFactory();
    }

    // Preserve viewport state
    newMaterial.uniforms.resolution.value.copy(oldMaterial!.uniforms.resolution.value);
    newMaterial.uniforms.offset.value.copy(oldMaterial!.uniforms.offset.value);
    newMaterial.uniforms.scale.value = oldMaterial!.uniforms.scale.value;
    newMaterial.uniforms.time.value = oldMaterial!.uniforms.time.value;

    meshRef.current.material = newMaterial;
    materialRef.current = newMaterial;

    if (oldMaterial) {
      oldMaterial.dispose();
    }
  }, [materialKey, customEquation]);

  // Animation loop
  useEffect(() => {
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);

      if (!rendererRef.current || !sceneRef.current || !materialRef.current) return;

      // Update time for animated fractals (Julia)
      const currentTime = (Date.now() - startTimeRef.current) / 1000;
      materialRef.current.uniforms.time.value = currentTime;

      // Render
      rendererRef.current.render(sceneRef.current, new THREE.OrthographicCamera(-1, 1, 1, -1, -1000, 1000));

      // FPS calculation
      frameCountRef.current++;
      if (frameCountRef.current % 30 === 0) {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        fpsRef.current = frameCountRef.current / elapsed;
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
      onWheel={handleWheel}
      onContextMenu={(e) => e.preventDefault()}
    >
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
    </div>
  );
};
