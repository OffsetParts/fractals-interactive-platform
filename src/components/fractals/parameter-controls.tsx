'use client';

import React from 'react';

interface ParameterControlsProps {
  z_real: number;
  z_imag: number;
  c_real: number;
  c_imag: number;
  x_real: number;
  x_imag: number;
  onZRealChange: (value: number) => void;
  onZImagChange: (value: number) => void;
  onCRealChange: (value: number) => void;
  onCImagChange: (value: number) => void;
  onXRealChange: (value: number) => void;
  onXImagChange: (value: number) => void;
  showZ?: boolean;
  showC?: boolean;
  showX?: boolean;
}

// Enhanced slider with gradient fill
const Slider: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  color?: string;
}> = ({ label, value, min, max, step = 0.001, onChange, color = '#06b6d4' }) => {
  const percent = ((value - min) / (max - min)) * 100;
  
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between items-center">
        <span className="text-[11px] text-gray-400">{label}</span>
        <span className="text-xs text-white font-mono bg-gray-800 px-2 py-0.5 rounded border border-gray-700">
          {value.toFixed(3)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer"
        style={{ 
          background: `linear-gradient(to right, ${color} 0%, ${color} ${percent}%, #1f2937 ${percent}%, #1f2937 100%)` 
        }}
      />
      <div className="flex justify-between text-[9px] text-gray-600 font-mono px-0.5">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
};

// Parameter group with header
const ParameterGroup: React.FC<{
  label: string;
  color: string;
  children: React.ReactNode;
}> = ({ label, color, children }) => (
  <div className="flex flex-col gap-2">
    <div 
      className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded"
      style={{ 
        background: `linear-gradient(135deg, ${color}20, ${color}10)`,
        color: color,
        borderLeft: `2px solid ${color}`
      }}
    >
      {label}
    </div>
    <div className="grid grid-cols-2 gap-3 px-1">
      {children}
    </div>
  </div>
);

export const ParameterControls: React.FC<ParameterControlsProps> = ({
  z_real,
  z_imag,
  c_real,
  c_imag,
  x_real,
  x_imag,
  onZRealChange,
  onZImagChange,
  onCRealChange,
  onCImagChange,
  onXRealChange,
  onXImagChange,
  showZ = true,
  showC = true,
  showX = true
}) => {
  return (
    <div className="flex gap-6">
      {/* Z Parameters */}
      {showZ && (
        <ParameterGroup label="Initial Point z₀" color="#22d3ee">
          <Slider label="Real" value={z_real} min={-3} max={3} onChange={onZRealChange} color="#22d3ee" />
          <Slider label="Imaginary" value={z_imag} min={-3} max={3} onChange={onZImagChange} color="#22d3ee" />
        </ParameterGroup>
      )}

      {/* C Parameters */}
      {showC && (
        <ParameterGroup label="Constant c" color="#a78bfa">
          <Slider label="Real" value={c_real} min={-3} max={3} onChange={onCRealChange} color="#a78bfa" />
          <Slider label="Imaginary" value={c_imag} min={-3} max={3} onChange={onCImagChange} color="#a78bfa" />
        </ParameterGroup>
      )}

      {/* X Parameters (Exponent) */}
      {showX && (
        <ParameterGroup label="Exponent x" color="#f472b6">
          <Slider label="Real" value={x_real} min={-6} max={6} onChange={onXRealChange} color="#f472b6" />
          <Slider label="Imaginary" value={x_imag} min={-6} max={6} onChange={onXImagChange} color="#f472b6" />
        </ParameterGroup>
      )}
    </div>
  );
};
