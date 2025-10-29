'use client';

import React, { useState, useCallback } from 'react';
import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';
import { FractalConfig } from '@/types';

interface EquationInspectorProps {
  config: FractalConfig;
  onParameterChange?: (param: string, value: number) => void;
  className?: string;
}

interface Parameter {
  id: string;
  name: string;
  symbol: string;
  value: number;
  min: number;
  max: number;
  step: number;
  description: string;
}

export const EquationInspector: React.FC<EquationInspectorProps> = ({
  config,
  onParameterChange,
  className = '',
}) => {
  const [hoveredParam, setHoveredParam] = useState<string | null>(null);
  const [activeParam, setActiveParam] = useState<string | null>(null);

  // Generate parameters based on fractal type
  const getParameters = useCallback((): Parameter[] => {
    switch (config.type) {
      case 'mandelbrot':
        return [
          {
            id: 'iterations',
            name: 'Max Iterations',
            symbol: 'n',
            value: config.iterations,
            min: 50,
            max: 1000,
            step: 10,
            description: 'Maximum number of iterations before considering a point in the set'
          },
          {
            id: 'zoom',
            name: 'Zoom Level',
            symbol: 'z',
            value: config.zoom,
            min: 0.1,
            max: 1000,
            step: 0.1,
            description: 'Magnification level of the fractal view'
          },
          {
            id: 'center_real',
            name: 'Center (Real)',
            symbol: 'c_r',
            value: config.center.real,
            min: -2,
            max: 2,
            step: 0.01,
            description: 'Real part of the complex plane center'
          },
          {
            id: 'center_imag',
            name: 'Center (Imaginary)',
            symbol: 'c_i',
            value: config.center.imaginary,
            min: -2,
            max: 2,
            step: 0.01,
            description: 'Imaginary part of the complex plane center'
          }
        ];
      
      case 'julia':
        const c = (typeof config.params.c === 'object' ? config.params.c as unknown as { real: number; imaginary: number } : null) || { real: -0.8, imaginary: 0.156 };
        return [
          {
            id: 'iterations',
            name: 'Max Iterations',
            symbol: 'n',
            value: config.iterations,
            min: 50,
            max: 1000,
            step: 10,
            description: 'Maximum number of iterations before considering a point in the set'
          },
          {
            id: 'julia_real',
            name: 'Julia Constant (Real)',
            symbol: 'c_r',
            value: c.real,
            min: -2,
            max: 2,
            step: 0.01,
            description: 'Real part of the Julia set constant c'
          },
          {
            id: 'julia_imag',
            name: 'Julia Constant (Imaginary)',
            symbol: 'c_i',
            value: c.imaginary,
            min: -2,
            max: 2,
            step: 0.01,
            description: 'Imaginary part of the Julia set constant c'
          }
        ];
      
      default:
        return [];
    }
  }, [config]);

  const getEquation = useCallback((): string => {
    switch (config.type) {
      case 'mandelbrot':
        return 'z_{n+1} = z_n^2 + c';
      case 'julia':
        return 'z_{n+1} = z_n^2 + c';
      case 'l-system':
        return 'F \\rightarrow F+F-F-F+F';
      default:
        return 'z_{n+1} = f(z_n)';
    }
  }, [config.type]);

  const getEquationExplanation = useCallback((): string => {
    switch (config.type) {
      case 'mandelbrot':
        return `
          \\text{For each point } c \\text{ in the complex plane:} \\\\
          \\text{Start with } z_0 = 0 \\\\
          \\text{Iterate: } z_{n+1} = z_n^2 + c \\\\
          \\text{If } |z_n| > 2 \\text{ after } n \\text{ iterations, } c \\text{ is not in the set}
        `;
      case 'julia':
        return `
          \\text{For a fixed constant } c \\text{ and each point } z_0: \\\\
          \\text{Iterate: } z_{n+1} = z_n^2 + c \\\\
          \\text{If } |z_n| > 2 \\text{ after } n \\text{ iterations, } z_0 \\text{ escapes}
        `;
      default:
        return '';
    }
  }, [config.type]);

  const handleParameterChange = useCallback((param: Parameter, value: number) => {
    if (!onParameterChange) return;

    // Map parameter IDs to config updates
    switch (param.id) {
      case 'iterations':
        onParameterChange('iterations', Math.round(value));
        break;
      case 'zoom':
        onParameterChange('zoom', value);
        break;
      case 'center_real':
        onParameterChange('center.real', value);
        break;
      case 'center_imag':
        onParameterChange('center.imaginary', value);
        break;
      case 'julia_real':
        onParameterChange('julia.real', value);
        break;
      case 'julia_imag':
        onParameterChange('julia.imaginary', value);
        break;
    }
  }, [onParameterChange]);

  const parameters = getParameters();

  return (
    <div className={`bg-white border rounded-lg shadow-sm ${className}`}>
      <div className="p-4 border-b">
        <h3 className="text-lg font-semibold mb-2">Equation Inspector</h3>
        
        {/* Main equation */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="text-center text-xl">
            <BlockMath math={getEquation()} />
          </div>
        </div>

        {/* Detailed explanation */}
        {getEquationExplanation() && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <div className="text-sm">
              <BlockMath math={getEquationExplanation()} />
            </div>
          </div>
        )}
      </div>

      {/* Interactive parameters */}
      <div className="p-4">
        <h4 className="font-medium mb-3">Interactive Parameters</h4>
        
        <div className="space-y-4">
          {parameters.map((param) => (
            <div
              key={param.id}
              className={`p-3 rounded-lg border transition-colors ${
                hoveredParam === param.id || activeParam === param.id
                  ? 'bg-yellow-50 border-yellow-200'
                  : 'bg-gray-50 border-gray-200'
              }`}
              onMouseEnter={() => setHoveredParam(param.id)}
              onMouseLeave={() => setHoveredParam(null)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <InlineMath math={param.symbol} />
                  <span className="text-sm font-medium">{param.name}</span>
                </div>
                <span className="text-sm text-gray-600">
                  {param.value.toFixed(param.step < 1 ? 3 : 0)}
                </span>
              </div>
              
              <input
                type="range"
                min={param.min}
                max={param.max}
                step={param.step}
                value={param.value}
                onChange={(e) => handleParameterChange(param, parseFloat(e.target.value))}
                onFocus={() => setActiveParam(param.id)}
                onBlur={() => setActiveParam(null)}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
              
              <p className="text-xs text-gray-500 mt-1">{param.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Color scheme controls */}
      <div className="p-4 border-t">
        <h4 className="font-medium mb-3">Visualization</h4>
        
        <div className="space-y-3">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={config.colorScheme.smooth}
              onChange={(e) => onParameterChange?.('colorScheme.smooth', e.target.checked ? 1 : 0)}
              className="rounded"
            />
            <span className="text-sm">Smooth coloring</span>
          </label>
          
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={config.colorScheme.histogram}
              onChange={(e) => onParameterChange?.('colorScheme.histogram', e.target.checked ? 1 : 0)}
              className="rounded"
            />
            <span className="text-sm">Histogram equalization</span>
          </label>
        </div>
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        
        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
      `}</style>
    </div>
  );
};