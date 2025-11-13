'use client';

import React, { useState } from 'react';

interface CompactControlsProps {
  presets: Record<string, { label: string; defaultIterations: number; [key: string]: unknown }>;
  onPresetSelect: (presetKey: string) => void;
  maxIterations: number;
  onIterationsChange: (value: number) => void;
  colorMode: 'smooth' | 'histogram' | 'binary';
  onColorModeChange: (mode: 'smooth' | 'histogram' | 'binary') => void;
  onReset: () => void;
  fps: number;
  renderTime: number;
}

export function CompactControls({
  presets,
  onPresetSelect,
  maxIterations,
  onIterationsChange,
  colorMode,
  onColorModeChange,
  onReset,
  fps,
  renderTime
}: CompactControlsProps) {
  const [isPresetsOpen, setIsPresetsOpen] = useState(false);

  return (
    <div className="space-y-4">
      {/* Performance Metrics */}
      <div className="flex justify-between items-center text-xs text-gray-500">
        <span>FPS: {fps}</span>
        <span>Render: {renderTime.toFixed(1)}ms</span>
      </div>

      {/* Presets Dropdown */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Presets</label>
        <div className="relative">
          <button
            onClick={() => setIsPresetsOpen(!isPresetsOpen)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm hover:border-gray-600 transition"
          >
            Choose a preset...
          </button>
          {isPresetsOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded shadow-lg z-10 max-h-64 overflow-y-auto">
              {Object.entries(presets).map(([key, preset]) => (
                <button
                  key={key}
                  onClick={() => {
                    onPresetSelect(key);
                    setIsPresetsOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition border-b border-gray-700 last:border-b-0"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Iterations Slider */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Max Iterations: {maxIterations}
        </label>
        <input
          type="range"
          min="10"
          max="1000"
          step="10"
          value={maxIterations}
          onChange={(e) => onIterationsChange(parseInt(e.target.value))}
          className="w-full h-2 bg-gray-700 rounded cursor-pointer"
        />
      </div>

      {/* Color Mode */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Color Mode</label>
        <div className="space-y-2">
          {(['smooth', 'histogram', 'binary'] as const).map((mode) => (
            <label key={mode} className="flex items-center text-sm text-gray-300">
              <input
                type="radio"
                name="colorMode"
                value={mode}
                checked={colorMode === mode}
                onChange={() => onColorModeChange(mode)}
                className="mr-2"
              />
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </label>
          ))}
        </div>
      </div>

      {/* Reset Button */}
      <button
        onClick={onReset}
        className="w-full px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded transition"
      >
        🏠 Reset View
      </button>

      {/* Quick Controls Info */}
      <div className="text-xs text-gray-400 space-y-1 pt-4 border-t border-gray-700">
        <div>🎡 Scroll to zoom</div>
        <div>🖱️ Drag to pan</div>
      </div>
    </div>
  );
}
