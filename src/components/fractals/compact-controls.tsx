'use client';

import React, { useState, useRef, useEffect } from 'react';

interface Parameter {
  name: string;
  min: number;
  max: number;
  value: number;
  step: number;
}

interface CompactControlsProps {
  fractalType: string;
  equation?: string;
  parameters: Parameter[];
  onParameterChange: (name: string, value: number) => void;
  onFractalChange: (type: string) => void;
  onPresetSelect: (preset: string) => void;
  onReset: () => void;
  fps: number;
  renderTime: number;
}

const PRESETS: Record<string, { name: string; type: string; equation?: string; params: Record<string, number> }> = {
  mandelbrot_classic: {
    name: 'Mandelbrot Classic',
    type: 'mandelbrot',
    params: { centerX: -0.5, centerY: 0, zoomLevel: 1, maxIterations: 100 }
  },
  mandelbrot_seahorse: {
    name: 'Seahorse Valley',
    type: 'mandelbrot',
    params: { centerX: -0.7469, centerY: 0.1102, zoomLevel: 6, maxIterations: 256 }
  },
  mandelbrot_spiral: {
    name: 'Spiral',
    type: 'mandelbrot',
    params: { centerX: -0.7, centerY: -0.27015, zoomLevel: 10, maxIterations: 256 }
  },
  julia_classic: {
    name: 'Julia Classic',
    type: 'julia',
    params: { juliaRe: -0.7, juliaIm: 0.27015, maxIterations: 200 }
  },
  julia_dendrite: {
    name: 'Julia Dendrite',
    type: 'julia',
    params: { juliaRe: -0.8, juliaIm: 0.156, maxIterations: 200 }
  },
  burning_ship: {
    name: 'Burning Ship',
    type: 'burningship',
    params: { centerX: -1.75, centerY: -0.02, zoomLevel: 2, maxIterations: 256 }
  },
  newton_default: {
    name: 'Newton',
    type: 'newton',
    params: { maxIterations: 100 }
  },
  tricorn_basic: {
    name: 'Tricorn',
    type: 'tricorn',
    params: { centerX: 0, centerY: 0, zoomLevel: 1, maxIterations: 100 }
  }
};

const FRACTAL_TYPES = [
  { id: 'mandelbrot', label: 'Mandelbrot', icon: '🌀', disabled: false },
  { id: 'julia', label: 'Julia', icon: '💫', disabled: false },
  { id: 'burningship', label: 'Burning Ship', icon: '🔥', disabled: false },
  { id: 'newton', label: 'Newton', icon: '⚡', disabled: false },
  { id: 'tricorn', label: 'Tricorn', icon: '🎯', disabled: false },
  { id: 'lyapunov', label: 'Lyapunov', icon: '📊', disabled: true },
  { id: 'ifs', label: 'L-Systems', icon: '🌿', disabled: false },
  { id: 'custom', label: 'Custom', icon: '✨', disabled: false }
];

export const CompactControls: React.FC<CompactControlsProps> = ({
  fractalType,
  equation,
  parameters,
  onParameterChange,
  onFractalChange,
  onPresetSelect,
  onReset,
  fps,
  renderTime
}) => {
  const [presetOpen, setPresetOpen] = useState(false);
  const presetDropdownRef = useRef<HTMLDivElement>(null);
  const debounceTimersRef = useRef<Record<string, NodeJS.Timeout>>({});

  // Debounce parameter changes (300ms delay before applying)
  const handleParameterChangeDebounced = (name: string, value: number) => {
    // Clear existing timer for this param
    if (debounceTimersRef.current[name]) {
      clearTimeout(debounceTimersRef.current[name]);
    }

    // Set new timer
    debounceTimersRef.current[name] = setTimeout(() => {
      onParameterChange(name, value);
    }, 300);
  };

  // Cleanup on unmount
  useEffect(() => {
    const timers = debounceTimersRef.current;
    return () => {
      Object.values(timers).forEach(timer => clearTimeout(timer));
    };
  }, []);

  // Close preset dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (presetDropdownRef.current && !presetDropdownRef.current.contains(event.target as Node)) {
        setPresetOpen(false);
      }
    };

    if (presetOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [presetOpen]);

  return (
    <div className="space-y-3">
      {/* Equation Display */}
      {equation && (
        <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-700/50 rounded-lg p-3">
          <div className="text-xs text-purple-400 font-mono">{equation}</div>
        </div>
      )}

      {/* Performance Metrics */}
      <div className="flex justify-between items-center text-xs text-gray-500 px-1">
        <span>FPS: {fps}</span>
        <span>Render: {renderTime.toFixed(0)}ms</span>
      </div>

      {/* Fractal Type Selector - Compact Grid */}
      <div className="grid grid-cols-4 gap-1">
        {FRACTAL_TYPES.map((ftype) => (
          <button
            key={ftype.id}
            onClick={() => {
              if (!ftype.disabled) {
                onFractalChange(ftype.id);
                setPresetOpen(false);
              }
            }}
            disabled={ftype.disabled}
            title={ftype.disabled ? `${ftype.label} (Server rendering coming soon)` : ftype.label}
            className={`aspect-square rounded flex flex-col items-center justify-center text-xs font-medium transition ${
              ftype.disabled
                ? 'bg-gray-900 text-gray-600 cursor-not-allowed opacity-50'
                : fractalType === ftype.id
                ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            <span className="text-lg">{ftype.icon}</span>
            <span className="text-[10px] mt-0.5">{ftype.label.split(' ')[0]}</span>
          </button>
        ))}
      </div>

      {/* Parameter Sliders */}
      {parameters.length > 0 && (
        <div className="space-y-2 bg-gray-900/50 rounded-lg p-3 border border-gray-800">
          {parameters.map((param) => (
            <div key={param.name} className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-xs font-medium text-gray-300">{param.name}</label>
                <span className="text-xs text-blue-400 font-mono">{param.value.toFixed(3)}</span>
              </div>
              <input
                type="range"
                min={param.min}
                max={param.max}
                step={param.step}
                value={param.value}
                onChange={(e) => handleParameterChangeDebounced(param.name, parseFloat(e.target.value))}
                className="w-full h-1.5 bg-gray-700 rounded-full appearance-none cursor-pointer accent-blue-500"
              />
            </div>
          ))}
        </div>
      )}

      {/* Presets Dropdown */}
      <div className="relative" ref={presetDropdownRef}>
        <button
          onClick={() => setPresetOpen(!presetOpen)}
          className="w-full px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg border border-gray-700 flex items-center justify-between transition"
        >
          <span>📌 Presets</span>
          <span className={`text-xs transition ${presetOpen ? 'rotate-180' : ''}`}>▼</span>
        </button>

        {presetOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-gray-900 border border-gray-700 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
            {Object.entries(PRESETS).map(([key, preset]) => (
              <button
                key={key}
                onClick={() => {
                  onPresetSelect(key);
                  setPresetOpen(false);
                }}
                className="w-full text-left px-3 py-2 hover:bg-gray-800 text-sm text-gray-300 border-b border-gray-800 last:border-b-0 transition"
              >
                <div className="font-medium">{preset.name}</div>
                <div className="text-xs text-gray-500">{preset.type}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Reset Button */}
      <button
        onClick={onReset}
        className="w-full px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg border border-purple-500 font-medium transition"
      >
        🏠 Reset View
      </button>

      {/* Quick Info */}
      <div className="text-xs text-gray-500 space-y-1 px-1">
        <div>🎡 Scroll to zoom</div>
        <div>🖱️ Drag to pan</div>
        <div>⚙️ Adjust parameters above</div>
      </div>
    </div>
  );
};
