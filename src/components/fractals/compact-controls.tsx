'use client';

import React, { useState } from 'react';

interface CompactControlsProps {
  presets: Record<string, { label: string; defaultIterations: number; equation?: string; materialKey?: string; viewport?: unknown; showZ?: boolean; showC?: boolean; showX?: boolean; [key: string]: unknown }>;
  onPresetSelect: (presetKey: string) => void;
  maxIterations: number;
  onIterationsChange: (value: number) => void;
  onReset: () => void;
  fps: number;
  renderTime: number;
  palette: string;
  palettes: string[];
  onPaletteChange: (name: string) => void;
  showAdvanced?: boolean;
  onShowAdvancedChange?: (show: boolean) => void;
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

// Section header component
const SectionHeader: React.FC<{ children: React.ReactNode; color: 'cyan' | 'purple' | 'pink' | 'green' | 'amber' }> = ({ children, color }) => {
  const colorClasses = {
    cyan: 'from-cyan-500/20 to-cyan-500/5 text-cyan-400 border-l-cyan-500',
    purple: 'from-purple-500/20 to-purple-500/5 text-purple-400 border-l-purple-500',
    pink: 'from-pink-500/20 to-pink-500/5 text-pink-400 border-l-pink-500',
    green: 'from-green-500/20 to-green-500/5 text-green-400 border-l-green-500',
    amber: 'from-amber-500/20 to-amber-500/5 text-amber-400 border-l-amber-500',
  };

  return (
    <div className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1.5 rounded-r bg-gradient-to-r ${colorClasses[color]} border-l-2`}>
      {children}
    </div>
  );
};

// Slider component with gradient fill
const Slider: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  color?: string;
  unit?: string;
}> = ({ label, value, min, max, step = 0.01, onChange, color = '#22d3ee', unit = '' }) => {
  const percent = ((value - min) / (max - min)) * 100;
  
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-xs text-slate-400">{label}</span>
        <span 
          className="text-xs font-mono px-2 py-0.5 rounded bg-black/40 border border-slate-700/50"
          style={{ color }}
        >
          {typeof value === 'number' ? (Number.isInteger(step) ? value : value.toFixed(step >= 0.1 ? 1 : step >= 0.01 ? 2 : 3)) : value}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 rounded-full cursor-pointer appearance-none"
        style={{ 
          background: `linear-gradient(to right, ${color} 0%, ${color} ${percent}%, rgba(51, 65, 85, 0.5) ${percent}%, rgba(51, 65, 85, 0.5) 100%)` 
        }}
      />
    </div>
  );
};

// Toggle component
const Toggle: React.FC<{
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  color?: string;
}> = ({ label, checked, onChange, color = '#22d3ee' }) => (
  <button 
    type="button"
    onClick={() => onChange(!checked)}
    className="flex items-center gap-3 cursor-pointer group w-full text-left"
  >
    <div 
      className={`relative w-10 h-5 rounded-full transition-all duration-200 flex-shrink-0 ${checked ? '' : 'bg-slate-700/50'}`}
      style={{ background: checked ? `linear-gradient(135deg, ${color}, ${color}88)` : undefined }}
    >
      <div 
        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-md transition-all duration-200 ${checked ? 'left-5' : 'left-0.5'}`}
      />
    </div>
    <span className="text-sm text-slate-300 group-hover:text-white transition-colors">{label}</span>
  </button>
);

export function CompactControls({
  presets,
  onPresetSelect,
  maxIterations,
  onIterationsChange,
  onReset,
  palette,
  palettes,
  onPaletteChange,
  showAdvanced = false,
  onShowAdvancedChange,
  autoTone = false,
  onAutoToneChange,
  gamma = 0.85,
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
}: CompactControlsProps) {
  const [isPresetsOpen, setIsPresetsOpen] = useState(false);

  return (
    <div className="space-y-5">
      {/* ═══ PRESETS ═══ */}
      <div className="space-y-2">
        <SectionHeader color="cyan">Fractal Type</SectionHeader>
        <div className="relative">
          <button
            onClick={() => setIsPresetsOpen(!isPresetsOpen)}
            className="w-full px-4 py-2.5 bg-slate-900/60 border border-slate-600/50 rounded-lg text-white text-sm hover:border-cyan-500/50 hover:bg-slate-800/60 transition-all flex items-center justify-between group"
          >
            <span>Choose a fractal...</span>
            <svg 
              className={`w-4 h-4 text-slate-400 group-hover:text-cyan-400 transition-all ${isPresetsOpen ? 'rotate-180' : ''}`} 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {isPresetsOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-slate-900/95 backdrop-blur-xl border border-slate-600/50 rounded-lg shadow-2xl shadow-black/50 z-20 max-h-64 overflow-y-auto">
              {Object.entries(presets).map(([key, preset]) => (
                <button
                  key={key}
                  onClick={() => {
                    onPresetSelect(key);
                    setIsPresetsOpen(false);
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm text-slate-300 hover:bg-cyan-500/10 hover:text-cyan-400 transition-all border-b border-slate-700/30 last:border-b-0 first:rounded-t-lg last:rounded-b-lg"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ═══ ITERATIONS ═══ */}
      <div className="space-y-2">
        <SectionHeader color="purple">Quality</SectionHeader>
        <div className="p-3 bg-slate-900/40 rounded-lg border border-slate-700/30 space-y-3">
          <Slider
            label="Max Iterations"
            value={maxIterations}
            min={10}
            max={512}
            step={5}
            onChange={onIterationsChange}
            color="#a78bfa"
          />
        </div>
      </div>

      {/* ═══ DISPLAY OPTIONS ═══ */}
      <div className="space-y-2">
        <SectionHeader color="green">Display</SectionHeader>
        <div className="p-3 bg-slate-900/40 rounded-lg border border-slate-700/30 space-y-3">
          <Toggle
            label="Complex Plane Grid"
            checked={interiorEnabled}
            onChange={(checked) => onInteriorEnabledChange?.(checked)}
            color="#22c55e"
          />
        </div>
      </div>

      {/* ═══ ADVANCED TOGGLE ═══ */}
      <button
        onClick={() => onShowAdvancedChange?.(!showAdvanced)}
        className={`w-full py-2.5 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
          showAdvanced 
            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
            : 'bg-slate-800/50 text-slate-400 border border-slate-700/30 hover:bg-slate-700/50 hover:text-white'
        }`}
      >
        <svg className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        {showAdvanced ? 'Hide Advanced' : 'Show Advanced'}
      </button>

      {/* ═══ ADVANCED CONTROLS ═══ */}
      {showAdvanced && (
        <div className="space-y-4 animate-fade-in">
          <div className="space-y-2">
            <SectionHeader color="amber">Tone Mapping</SectionHeader>
            <div className="p-3 bg-slate-900/40 rounded-lg border border-slate-700/30 space-y-4">
              <Toggle
                label="Auto Tone (zoom adaptive)"
                checked={autoTone}
                onChange={(checked) => onAutoToneChange?.(checked)}
                color="#fbbf24"
              />
              
              {!autoTone && (
                <div className="space-y-4 pt-2 border-t border-slate-700/30">
                  <Slider
                    label="Gamma"
                    value={gamma}
                    min={0.1}
                    max={3.0}
                    step={0.01}
                    onChange={(v) => onGammaChange?.(v)}
                    color="#fbbf24"
                  />
                  <Slider
                    label="Band Strength"
                    value={bandStrength}
                    min={0.0}
                    max={3.0}
                    step={0.01}
                    onChange={(v) => onBandStrengthChange?.(v)}
                    color="#fbbf24"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-700/30">
                <Slider
                  label="Band Center"
                  value={bandCenter}
                  min={0.0}
                  max={1.0}
                  step={0.01}
                  onChange={(v) => onBandCenterChange?.(v)}
                  color="#f472b6"
                />
                <Slider
                  label="Band Width"
                  value={bandWidth}
                  min={0.01}
                  max={0.2}
                  step={0.01}
                  onChange={(v) => onBandWidthChange?.(v)}
                  color="#f472b6"
                />
              </div>

              <Slider
                label="Bands"
                value={bands}
                min={0}
                max={64}
                step={1}
                onChange={(v) => onBandsChange?.(v)}
                color="#f472b6"
              />
            </div>
          </div>
        </div>
      )}

      {/* ═══ PALETTE ═══ */}
      <div className="space-y-2">
        <SectionHeader color="pink">Color Palette</SectionHeader>
        <select
          value={palette}
          onChange={(e) => onPaletteChange(e.target.value)}
          className="w-full px-4 py-2.5 bg-slate-900/60 border border-slate-600/50 rounded-lg text-white text-sm hover:border-pink-500/50 transition-all cursor-pointer appearance-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23f472b6'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 0.75rem center',
            backgroundSize: '1rem',
            paddingRight: '2.5rem'
          }}
        >
          {palettes.map((p) => (
            <option key={p} value={p} className="bg-slate-900">{p}</option>
          ))}
        </select>
      </div>

      {/* ═══ RESET ═══ */}
      <button
        onClick={onReset}
        className="w-full py-2.5 px-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-sm font-medium rounded-lg transition-all shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 flex items-center justify-center gap-2"
      >
        <span>🏠</span>
        <span>Reset View</span>
      </button>

      {/* ═══ TIPS ═══ */}
      <div className="p-3 bg-slate-900/30 rounded-lg border border-slate-700/20">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">Controls</div>
        <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="text-cyan-400">🎡</span>
            <span>Scroll to zoom</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-purple-400">🖱️</span>
            <span>Drag to pan</span>
          </div>
        </div>
      </div>
    </div>
  );
}
