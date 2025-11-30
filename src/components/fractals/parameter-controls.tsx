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
  const visibleCount = [showZ, showC, showX].filter(Boolean).length;
  const gridCols = visibleCount === 3 ? 'grid-cols-3' : visibleCount === 2 ? 'grid-cols-2' : 'grid-cols-1';

  return (
    <div className="bg-linear-to-r from-purple-900/30 to-cyan-900/30 border border-purple-500/30 rounded-lg p-3">
      {/* Dynamic column layout */}
      <div className={`grid ${gridCols} gap-4`}>
        {/* First Column: Z Parameters */}
        {showZ && <div className="space-y-2">
          <h3 className="text-xs font-medium text-gray-300 mb-1">Initial Z (z₀)</h3>
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[10px] text-gray-400">Real (z_r)</label>
              <span className="text-[10px] text-cyan-400 font-mono">{z_real.toFixed(3)}</span>
            </div>
            <input
              type="range"
              min="-3"
              max="3"
              step="0.01"
              value={z_real}
              onChange={(e) => onZRealChange(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-gray-700 rounded cursor-pointer"
            />
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[10px] text-gray-400">Imaginary (z_i)</label>
              <span className="text-[10px] text-cyan-400 font-mono">{z_imag.toFixed(3)}</span>
            </div>
            <input
              type="range"
              min="-3"
              max="3"
              step="0.01"
              value={z_imag}
              onChange={(e) => onZImagChange(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-gray-700 rounded cursor-pointer"
            />
          </div>
        </div>}

        {/* Second Column: C Parameters */}
        {showC && <div className="space-y-2">
          <h3 className="text-xs font-medium text-gray-300 mb-1">Constant C</h3>
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[10px] text-gray-400">Real (c_r)</label>
              <span className="text-[10px] text-cyan-400 font-mono">{c_real.toFixed(3)}</span>
            </div>
            <input
              type="range"
              min="-3"
              max="3"
              step="0.01"
              value={c_real}
              onChange={(e) => onCRealChange(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-gray-700 rounded cursor-pointer"
            />
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[10px] text-gray-400">Imaginary (c_i)</label>
              <span className="text-[10px] text-cyan-400 font-mono">{c_imag.toFixed(3)}</span>
            </div>
            <input
              type="range"
              min="-3"
              max="3"
              step="0.01"
              value={c_imag}
              onChange={(e) => onCImagChange(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-gray-700 rounded cursor-pointer"
            />
          </div>
        </div>}

        {/* Third Column: X Parameters (Exponent) */}
        {showX && <div className="space-y-2">
          <h3 className="text-xs font-medium text-gray-300 mb-1">Exponent X</h3>
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[10px] text-gray-400">Real (x_r)</label>
              <span className="text-[10px] text-cyan-400 font-mono">{x_real.toFixed(3)}</span>
            </div>
            <input
              type="range"
              min="-6"
              max="6"
              step="0.01"
              value={x_real}
              onChange={(e) => onXRealChange(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-gray-700 rounded cursor-pointer"
            />
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[10px] text-gray-400">Imaginary (x_i)</label>
              <span className="text-[10px] text-cyan-400 font-mono">{x_imag.toFixed(3)}</span>
            </div>
            <input
              type="range"
              min="-6"
              max="6"
              step="0.01"
              value={x_imag}
              onChange={(e) => onXImagChange(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-gray-700 rounded cursor-pointer"
            />
          </div>
        </div>}
      </div>
    </div>
  );
};
