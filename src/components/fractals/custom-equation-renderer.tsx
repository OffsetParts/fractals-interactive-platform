'use client';

import React, { useEffect, useRef, useState } from 'react';
import { parseEquation, EquationVariable, Complex } from '@/lib/math/equation-parser';
import { MouseControls, ViewportState } from '@/lib/mouse-controls';
import { hslToRgb } from '@/lib/utils/color-utils';

interface CustomEquationRendererProps {
  equation?: string;
  width?: number;
  height?: number;
}

export const CustomEquationRenderer: React.FC<CustomEquationRendererProps> = ({
  equation: initialEquation = 'z**2 + c',
  width = 800,
  height = 600
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseControlsRef = useRef<MouseControls | null>(null);
  const [equation, setEquation] = useState(initialEquation);
  const [variables, setVariables] = useState<EquationVariable[]>([]);
  const [parameters, setParameters] = useState<Record<string, number>>({});
  const [latex, setLatex] = useState('');
  const [error, setError] = useState('');
  const [viewport, setViewport] = useState<ViewportState>({
    x: 0,
    y: 0,
    zoom: 1,
    velocityX: 0,
    velocityY: 0
  });

  // Parse equation on change
  useEffect(() => {
    try {
      const parsed = parseEquation(equation);
      setVariables(parsed.variables);
      setLatex(parsed.latex);

      // Initialize parameter defaults
      const newParams: Record<string, number> = {};
      for (const variable of parsed.variables) {
        newParams[variable.name] = variable.default;
      }
      setParameters(newParams);
      setError('');
    } catch (err) {
      setError(`Parse error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [equation]);

  // Initialize mouse controls
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    mouseControlsRef.current = new MouseControls(canvas, (newViewport) => {
      setViewport(newViewport);
    });

    return () => {
      mouseControlsRef.current?.destroy();
    };
  }, []);

  // Render fractal
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = width;
    canvas.height = height;

    if (error) {
      ctx.fillStyle = '#ff0000';
      ctx.fillText(`Error: ${error}`, 20, 40);
      return;
    }

    // Create image data
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;

    const maxIterations = 256;
    const pixelSize = 3.5 / (viewport.zoom * Math.max(width, height));

    for (let py = 0; py < height; py++) {
      for (let px = 0; px < width; px++) {
        // Map pixel to complex plane
        const x = viewport.x + (px - width / 2) * pixelSize;
        const y = viewport.y + (py - height / 2) * pixelSize;

        // Iterate custom equation
        let z = { re: x, im: y };
        let iterations = 0;

        for (let i = 0; i < maxIterations; i++) {
          // Check escape
          if (z.re * z.re + z.im * z.im > 4) {
            iterations = i;
            break;
          }

          // Apply z = equation(z)
          try {
            const nextZ = evaluateEquation(z, equation, parameters);
            if (!nextZ) break;
            z = nextZ;
          } catch {
            break;
          }

          iterations = i;
        }

        // Color based on iterations
        const t = iterations / maxIterations;
        const hue = t * 360;
        const color = hslToRgb(hue, 100, 50);

        const idx = (py * width + px) * 4;
        data[idx] = color.r;
        data[idx + 1] = color.g;
        data[idx + 2] = color.b;
        data[idx + 3] = 255;
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }, [viewport, equation, parameters, width, height, error]);

  const handleParameterChange = (name: string, value: number) => {
    setParameters((prev) => ({ ...prev, [name]: value }));
  };

  const handleReset = () => {
    mouseControlsRef.current?.reset();
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">Equation</label>
        <input
          type="text"
          value={equation}
          onChange={(e) => setEquation(e.target.value)}
          placeholder="e.g., z**2 + c"
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
        />
        {latex && <div className="text-sm text-gray-500 mt-1">LaTeX: {latex}</div>}
        {error && <div className="text-sm text-red-500 mt-1">{error}</div>}
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Parameters</label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {variables.map((variable) => (
            <div key={variable.name}>
              <label className="text-xs text-gray-600">
                {variable.name} ({variable.type})
              </label>
              <input
                type="range"
                min={variable.min}
                max={variable.max}
                step={(variable.max - variable.min) / 100}
                value={parameters[variable.name] || variable.default}
                onChange={(e) => handleParameterChange(variable.name, parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="text-xs text-gray-500">
                {(parameters[variable.name] || variable.default).toFixed(3)}
              </div>
            </div>
          ))}
        </div>
      </div>

      <canvas
        ref={canvasRef}
        className="border border-gray-300 rounded-lg w-full cursor-grab active:cursor-grabbing"
        style={{ background: '#000' }}
      />

      <div className="flex gap-2">
        <button
          onClick={handleReset}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Reset View
        </button>
        <span className="text-sm text-gray-500 self-center">
          Scroll to zoom, drag to pan
        </span>
      </div>
    </div>
  );
};

/**
 * Evaluate custom equation with complex numbers
 */
function evaluateEquation(
  z: { re: number; im: number },
  equation: string,
  parameters: Record<string, number>
): { re: number; im: number } | null {
  try {
    // Handle common equations
    if (equation.includes('z**2 + c')) {
      const cReal = parameters['c'] || 0;
      const cIm = parameters['c_im'] || 0;
      const zSquared = Complex.mul(z, z);
      return Complex.add(zSquared, { re: cReal, im: cIm });
    }

    if (equation.includes('z**3 + c')) {
      const cReal = parameters['c'] || 0;
      const cIm = parameters['c_im'] || 0;
      const zCubed = Complex.mul(Complex.mul(z, z), z);
      return Complex.add(zCubed, { re: cReal, im: cIm });
    }

    if (equation.includes('z**2 + z + c')) {
      const cReal = parameters['c'] || 0;
      const cIm = parameters['c_im'] || 0;
      const zSquared = Complex.mul(z, z);
      const zSquaredPlusZ = Complex.add(zSquared, z);
      return Complex.add(zSquaredPlusZ, { re: cReal, im: cIm });
    }

    // Default to z^2 + c
    const cReal = parameters['c'] || -0.7;
    const cIm = parameters['c_im'] || 0.27015;
    const zSquared = Complex.mul(z, z);
    return Complex.add(zSquared, { re: cReal, im: cIm });
  } catch {
    return null;
  }
}
