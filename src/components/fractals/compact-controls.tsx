'use client';

import React, { useState } from 'react';

interface CompactControlsProps {
  presets: Record<string, { label: string; defaultIterations: number; [key: string]: unknown }>;
  onPresetSelect: (presetKey: string) => void;
  maxIterations: number;
  onIterationsChange: (value: number) => void;
  onReset: () => void;
  fps: number;
  renderTime: number;
  palette: string;
  palettes: string[];
  onPaletteChange: (name: string) => void;
  autoIterations?: boolean;
  onAutoIterationsChange?: (enabled: boolean) => void;
  autoTone?: boolean;
  onAutoToneChange?: (enabled: boolean) => void;
  gamma?: number;
  onGammaChange?: (v: number) => void;
  bandStrength?: number;
  onBandStrengthChange?: (v: number) => void;
  bandCenter?: number;
  onBandCenterChange?: (v: number) => void;
  bandWidth?: number;
  onBandWidthChange?: (v: number) => void;
  interiorEnabled?: boolean;
  onInteriorEnabledChange?: (enabled: boolean) => void;
  bands?: number;
  onBandsChange?: (v: number) => void;
  power?: number;
  onPowerChange?: (v: number) => void;
}

export function CompactControls({
  presets,
  onPresetSelect,
  maxIterations,
  onIterationsChange,
  onReset,
  fps,
  renderTime,
  palette,
  palettes,
  onPaletteChange,
  autoIterations = true,
  onAutoIterationsChange,
  autoTone = true,
  onAutoToneChange,
  gamma = 1.15,
  onGammaChange,
  bandStrength = 0.85,
  onBandStrengthChange,
  bandCenter = 0.88,
  onBandCenterChange,
  bandWidth = 0.035,
  onBandWidthChange,
  interiorEnabled = true,
  onInteriorEnabledChange,
  bands = 0,
  onBandsChange,
  power = 2,
  onPowerChange
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

      {/* Auto Iterations Toggle */}
      <div className="mt-2">
        <label className="flex items-center text-sm text-gray-300">
          <input
            type="checkbox"
            className="mr-2"
            checked={autoIterations}
            onChange={(e) => onAutoIterationsChange?.(e.target.checked)}
          />
          Auto Iterations (FPS adaptive)
        </label>
      </div>

      {/* Tone Controls */}
      <div className="space-y-3">
        <div>
          <label className="flex items-center text-sm text-gray-300">
            <input type="checkbox" className="mr-2" checked={autoTone} onChange={(e) => onAutoToneChange?.(e.target.checked)} />
            Auto Tone (zoom adaptive)
          </label>
        </div>
        {!autoTone && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Gamma: {gamma.toFixed(2)}</label>
              <input type="range" min="0.6" max="2.2" step="0.01" value={gamma} onChange={(e) => onGammaChange?.(parseFloat(e.target.value))} className="w-full h-2 bg-gray-700 rounded" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Band Strength: {bandStrength.toFixed(2)}</label>
              <input type="range" min="0.0" max="1.5" step="0.01" value={bandStrength} onChange={(e) => onBandStrengthChange?.(parseFloat(e.target.value))} className="w-full h-2 bg-gray-700 rounded" />
            </div>
          </>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Band Center: {bandCenter.toFixed(2)}</label>
            <input type="range" min="0.0" max="1.0" step="0.005" value={bandCenter} onChange={(e) => onBandCenterChange?.(parseFloat(e.target.value))} className="w-full h-2 bg-gray-700 rounded" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Band Width: {bandWidth.toFixed(3)}</label>
            <input type="range" min="0.005" max="0.2" step="0.001" value={bandWidth} onChange={(e) => onBandWidthChange?.(parseFloat(e.target.value))} className="w-full h-2 bg-gray-700 rounded" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 items-center">
          <label className="flex items-center text-sm text-gray-300">
            <input type="checkbox" className="mr-2" checked={interiorEnabled} onChange={(e) => onInteriorEnabledChange?.(e.target.checked)} />
            Interior Blue
          </label>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Bands: {bands}</label>
            <input type="range" min="0" max="64" step="1" value={bands} onChange={(e) => onBandsChange?.(parseInt(e.target.value))} className="w-full h-2 bg-gray-700 rounded" />
          </div>
        </div>
      </div>

      {/* Power (n) for z^n when used in equation */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2" title="Used when your equation includes z^n, (expr)^n or **n">Power n: {((power ?? 2).toFixed(2))}</label>
        <input
          type="range"
          min="0.1"
          max="8.0"
          step="0.01"
          value={power ?? 2}
          onChange={(e) => onPowerChange?.(parseFloat(e.target.value))}
          className="w-full h-2 bg-gray-700 rounded"
        />
      </div>

      {/* Palette Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Palette</label>
        <select
          value={palette}
          onChange={(e) => onPaletteChange(e.target.value)}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm hover:border-gray-600 transition"
        >
          {palettes.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
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
