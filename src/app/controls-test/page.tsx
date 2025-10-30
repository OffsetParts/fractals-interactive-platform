'use client';

import { useEffect, useRef, useState } from 'react';
import { MouseControls, ViewportState } from '@/lib/mouse-controls';

/**
 * Test page for mouse controls without expensive fractal rendering
 * Renders a simple grid pattern that updates instantly
 */
export default function ControlsTestPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseControlsRef = useRef<MouseControls | null>(null);
  const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 });
  const [fps, setFps] = useState(60);
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(Date.now());

  // Initialize mouse controls
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    mouseControlsRef.current = new MouseControls(canvas, (newViewport: ViewportState) => {
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

  // Render test pattern
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const startTime = performance.now();

    // Clear canvas
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Draw grid lines in world space
    const gridSpacing = 50; // Grid every 50 world units
    const lineWidth = 1 / viewport.zoom; // Keep lines constant screen width

    ctx.strokeStyle = '#333';
    ctx.lineWidth = Math.max(1, lineWidth);

    // Calculate visible range
    const minX = Math.floor((viewport.x - centerX / viewport.zoom) / gridSpacing) * gridSpacing;
    const maxX = Math.ceil((viewport.x + centerX / viewport.zoom) / gridSpacing) * gridSpacing;
    const minY = Math.floor((viewport.y - centerY / viewport.zoom) / gridSpacing) * gridSpacing;
    const maxY = Math.ceil((viewport.y + centerY / viewport.zoom) / gridSpacing) * gridSpacing;

    // Vertical lines
    for (let x = minX; x <= maxX; x += gridSpacing) {
      const screenX = (x - viewport.x) * viewport.zoom + centerX;
      ctx.beginPath();
      ctx.moveTo(screenX, 0);
      ctx.lineTo(screenX, canvas.height);
      ctx.stroke();
    }

    // Horizontal lines
    for (let y = minY; y <= maxY; y += gridSpacing) {
      const screenY = (y - viewport.y) * viewport.zoom + centerY;
      ctx.beginPath();
      ctx.moveTo(0, screenY);
      ctx.lineTo(canvas.width, screenY);
      ctx.stroke();
    }

    // Draw axes (thicker)
    ctx.strokeStyle = '#666';
    ctx.lineWidth = Math.max(2, lineWidth * 2);

    // X-axis
    const axisY = (0 - viewport.y) * viewport.zoom + centerY;
    ctx.beginPath();
    ctx.moveTo(0, axisY);
    ctx.lineTo(canvas.width, axisY);
    ctx.stroke();

    // Y-axis
    const axisX = (0 - viewport.x) * viewport.zoom + centerX;
    ctx.beginPath();
    ctx.moveTo(axisX, 0);
    ctx.lineTo(axisX, canvas.height);
    ctx.stroke();

    // Draw some colorful circles at fixed world positions
    const circles = [
      { x: 0, y: 0, radius: 20, color: '#ff0066' },
      { x: 100, y: 100, radius: 30, color: '#00ff66' },
      { x: -150, y: 80, radius: 25, color: '#6600ff' },
      { x: 200, y: -100, radius: 35, color: '#ffcc00' },
      { x: -100, y: -150, radius: 28, color: '#00ccff' },
    ];

    circles.forEach(circle => {
      const screenX = (circle.x - viewport.x) * viewport.zoom + centerX;
      const screenY = (circle.y - viewport.y) * viewport.zoom + centerY;
      const screenRadius = circle.radius * viewport.zoom;

      ctx.fillStyle = circle.color;
      ctx.beginPath();
      ctx.arc(screenX, screenY, screenRadius, 0, Math.PI * 2);
      ctx.fill();

      // Draw label
      ctx.fillStyle = '#fff';
      ctx.font = `${12 * Math.min(1, viewport.zoom)}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(`(${circle.x}, ${circle.y})`, screenX, screenY - screenRadius - 5);
    });

    // Draw viewport info
    ctx.fillStyle = '#fff';
    ctx.font = '14px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`Viewport: (${viewport.x.toFixed(2)}, ${viewport.y.toFixed(2)})`, 10, 20);
    ctx.fillText(`Zoom: ${viewport.zoom.toFixed(3)}x`, 10, 40);
    ctx.fillText(`FPS: ${fps.toFixed(1)}`, 10, 60);

    const renderTime = performance.now() - startTime;
    ctx.fillText(`Render: ${renderTime.toFixed(2)}ms`, 10, 80);

    // Calculate FPS
    frameCountRef.current++;
    const now = Date.now();
    if (now - lastTimeRef.current >= 1000) {
      setFps(frameCountRef.current);
      frameCountRef.current = 0;
      lastTimeRef.current = now;
    }
  }, [viewport, fps]);

  // Handle canvas resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };

    resizeCanvas();
    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(canvas);

    return () => resizeObserver.disconnect();
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col bg-black">
      {/* Header */}
      <div className="bg-zinc-900 border-b border-zinc-800 p-4">
        <h1 className="text-2xl font-bold text-white mb-2">
          Mouse Controls Test
        </h1>
        <p className="text-sm text-gray-400">
          Test pan/zoom without expensive rendering. Should feel smooth and responsive.
        </p>
        <div className="mt-2 text-xs text-gray-500">
          <strong>Controls:</strong> Drag to pan, scroll to zoom. Try zooming in/out and panning at different zoom levels.
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-move"
        />
      </div>

      {/* Instructions */}
      <div className="bg-zinc-900 border-t border-zinc-800 p-4">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-gray-400 mb-1">Expected Behavior:</div>
            <ul className="text-xs text-gray-500 space-y-1">
              <li>• Pan should feel consistent at any zoom level</li>
              <li>• Zoom should be smooth (8% per scroll tick)</li>
              <li>• Inertia should decay naturally</li>
              <li>• Should run at 60 FPS constantly</li>
            </ul>
          </div>
          <div>
            <div className="text-gray-400 mb-1">Current Settings:</div>
            <ul className="text-xs text-gray-500 space-y-1">
              <li>• Friction: 0.92 (momentum decay)</li>
              <li>• Zoom Speed: 1.08 (8% per tick)</li>
              <li>• Debounce: 16ms (60fps max emit)</li>
              <li>• Velocity Scale: 0.5</li>
            </ul>
          </div>
          <div>
            <div className="text-gray-400 mb-1">Test Checklist:</div>
            <ul className="text-xs text-gray-500 space-y-1">
              <li>□ Pan feels smooth and natural</li>
              <li>□ Zoom centers on cursor position</li>
              <li>□ Works well zoomed in (10x+)</li>
              <li>□ Works well zoomed out (0.1x)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
