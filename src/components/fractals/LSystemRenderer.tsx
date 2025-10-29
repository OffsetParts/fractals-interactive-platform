'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { LSystemGenerator, TurtleInterpreter, LSystemConfig, LSYSTEM_PRESETS } from '@/lib/l-systems/LSystemEngine';

interface LSystemRendererProps {
  config: LSystemConfig;
  width: number;
  height: number;
  onConfigChange?: (config: LSystemConfig) => void;
  className?: string;
}

export const LSystemRenderer: React.FC<LSystemRendererProps> = ({
  config,
  width,
  height,
  onConfigChange,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentIteration, setCurrentIteration] = useState(0);
  const animationFrameRef = useRef<number | undefined>(undefined);

  const calculateBounds = useCallback((lSystemString: string, config: LSystemConfig) => {
    const turtle = new TurtleInterpreter({
      x: 0,
      y: 0,
      angle: -Math.PI / 2,
      length: config.length
    });

    const paths = turtle.interpret(lSystemString, config);
    
    if (paths.length === 0) {
      return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
    }

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    for (const path of paths) {
      minX = Math.min(minX, path.x1, path.x2);
      maxX = Math.max(maxX, path.x1, path.x2);
      minY = Math.min(minY, path.y1, path.y2);
      maxY = Math.max(maxY, path.y1, path.y2);
    }

    return { minX, maxX, minY, maxY };
  }, []);

  const renderLSystem = useCallback((iterationCount?: number) => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);

    // Generate L-system string
    const generator = new LSystemGenerator({
      ...config,
      iterations: iterationCount ?? config.iterations
    });
    const lSystemString = generator.generate();

    // Calculate bounds for centering
    const bounds = calculateBounds(lSystemString, config);
    const scale = Math.min(
      (width * 0.8) / (bounds.maxX - bounds.minX || 1),
      (height * 0.8) / (bounds.maxY - bounds.minY || 1)
    );

    // Center the drawing
    const centerX = width / 2 - (bounds.minX + bounds.maxX) / 2 * scale;
    const centerY = height / 2 - (bounds.minY + bounds.maxY) / 2 * scale;

    // Interpret and draw
    const turtle = new TurtleInterpreter({
      x: centerX,
      y: centerY,
      angle: -Math.PI / 2, // Start pointing up
      length: config.length * scale
    });

    const paths = turtle.interpret(lSystemString, {
      ...config,
      length: config.length * scale
    });

    // Draw paths
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = Math.max(1, scale * 0.5);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    for (const path of paths) {
      ctx.moveTo(path.x1, path.y1);
      ctx.lineTo(path.x2, path.y2);
    }
    ctx.stroke();

    // Draw generation info
    ctx.fillStyle = '#374151';
    ctx.font = '12px monospace';
    ctx.fillText(
      `Generation ${iterationCount ?? config.iterations} | ${lSystemString.length} symbols`,
      10,
      height - 10
    );

  }, [config, width, height, calculateBounds]);

  const startAnimation = useCallback(() => {
    setIsAnimating(true);
    setCurrentIteration(0);
    
    const animate = () => {
      setCurrentIteration(prev => {
        const next = prev + 1;
        renderLSystem(next);
        
        if (next >= config.iterations) {
          setIsAnimating(false);
          return prev;
        }
        
        animationFrameRef.current = requestAnimationFrame(() => {
          setTimeout(animate, 500); // 500ms delay between iterations
        });
        
        return next;
      });
    };

    animate();
  }, [config.iterations, renderLSystem]);

  const stopAnimation = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    setIsAnimating(false);
    setCurrentIteration(config.iterations);
    renderLSystem();
  }, [config.iterations, renderLSystem]);

  // Render when config changes
  useEffect(() => {
    if (!isAnimating) {
      renderLSystem();
    }
  }, [config, renderLSystem, isAnimating]);

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="border border-gray-300"
        style={{
          width: `${width}px`,
          height: `${height}px`,
        }}
      />
      
      {/* Animation controls */}
      <div className="absolute top-2 right-2 flex space-x-2">
        <button
          onClick={isAnimating ? stopAnimation : startAnimation}
          className={`px-3 py-1 text-sm rounded ${
            isAnimating
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'bg-blue-500 text-white hover:bg-blue-600'
          }`}
        >
          {isAnimating ? 'Stop' : 'Animate'}
        </button>
      </div>

      {/* Preset selector */}
      <div className="absolute bottom-2 left-2">
        <select
          value={Object.keys(LSYSTEM_PRESETS).find(key => 
            JSON.stringify(LSYSTEM_PRESETS[key]) === JSON.stringify(config)
          ) || 'custom'}
          onChange={(e) => {
            if (e.target.value !== 'custom' && onConfigChange) {
              onConfigChange(LSYSTEM_PRESETS[e.target.value]);
            }
          }}
          className="px-2 py-1 text-sm border rounded bg-white"
        >
          <option value="custom">Custom</option>
          {Object.keys(LSYSTEM_PRESETS).map(key => (
            <option key={key} value={key}>
              {key.replace(/([A-Z])/g, ' $1').trim()}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};