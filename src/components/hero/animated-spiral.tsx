'use client';

import React, { useEffect, useRef } from 'react';

interface AnimatedSpiralProps {
  width?: number;
  height?: number;
  layers?: number;
  speed?: number;
}

export const AnimatedSpiral: React.FC<AnimatedSpiralProps> = ({
  width = 800,
  height = 600,
  layers = 12,
  speed = 0.01
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;

    // Set canvas size
    canvas.width = width;
    canvas.height = height;

    const centerX = width / 2;
    const centerY = height / 2;

    function drawSpiralLayer(
      angle: number,
      layer: number,
      hue: number
    ) {
      // Larger spiral radius for better visibility (Atlas OS aesthetic)
      const spiralRadius = (layer / layers) * Math.min(width, height) * 0.35;
      const points = 120;

      // Atlas OS theme: More vibrant, higher contrast colors
      ctx!.strokeStyle = `hsl(${hue}, 85%, ${55 - layer * 1.5}%)`;
      ctx!.lineWidth = 2.5;
      ctx!.globalAlpha = 0.85 - layer * 0.03;

      ctx!.beginPath();

      for (let i = 0; i < points; i++) {
        const t = i / points;
        const theta = angle + t * Math.PI * 2;
        const r = spiralRadius * t;

        const x = centerX + r * Math.cos(theta);
        const y = centerY + r * Math.sin(theta);

        if (i === 0) ctx!.moveTo(x, y);
        else ctx!.lineTo(x, y);
      }

      ctx!.stroke();
    }

    function animate() {
      // Clear with darker background (Atlas OS dark theme)
      ctx!.fillStyle = 'rgba(13, 13, 25, 0.08)';
      ctx!.fillRect(0, 0, width, height);

      ctx!.globalAlpha = 1;

      // Draw multiple spirals with enhanced layering
      for (let i = 0; i < layers; i++) {
        const angle = time * speed + (i / layers) * Math.PI * 2;
        const hue = (time * 4 + i * 25) % 360;

        drawSpiralLayer(angle, i, hue);
      }

      time += 1;
      animationFrameId = requestAnimationFrame(animate);
    }

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [width, height, layers, speed]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ 
        display: 'block', 
        background: 'linear-gradient(135deg, #0d0d19 0%, #1a1a2e 50%, #0d0d19 100%)',
        filter: 'brightness(0.95)'
      }}
    />
  );
};
