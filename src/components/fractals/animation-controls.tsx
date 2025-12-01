'use client';

import React from 'react';

interface AnimationControlsProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  speed: number;
  onSpeedChange: (speed: number) => void;
}

export const AnimationControls: React.FC<AnimationControlsProps> = ({
  isPlaying,
  onTogglePlay,
  speed,
  onSpeedChange
}) => {
  const percent = ((speed - 0.1) / (3 - 0.1)) * 100;
  
  return (
    <div className="flex flex-col gap-2">
      <div 
        className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded"
        style={{ 
          background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.12), rgba(34, 197, 94, 0.06))',
          color: '#22c55e',
          borderLeft: '2px solid #22c55e'
        }}
      >
        Animation
      </div>
      <div className="flex items-center gap-3 px-1">
        {/* Play/Pause Button */}
        <button
          onClick={onTogglePlay}
          className={`w-10 h-10 rounded-lg font-medium text-lg transition-all flex items-center justify-center ${
            isPlaying
              ? 'bg-lienar-to-br from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 text-white shadow-lg shadow-red-500/25'
              : 'bg-linear-to-br from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 text-white shadow-lg shadow-green-500/25'
          }`}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>

        {/* Speed Control */}
        <div className="flex flex-col gap-1.5 flex-1">
          <div className="flex justify-between items-center">
            <span className="text-[11px] text-gray-400">Speed</span>
            <span className="text-xs text-white font-mono bg-gray-800 px-2 py-0.5 rounded border border-gray-700">
              {speed.toFixed(1)}x
            </span>
          </div>
          <input
            type="range"
            min="0.1"
            max="3"
            step="0.1"
            value={speed}
            onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
            className="w-full h-2 rounded-full appearance-none cursor-pointer"
            style={{ 
              background: `linear-gradient(to right, #22c55e 0%, #22c55e ${percent}%, #1f2937 ${percent}%, #1f2937 100%)` 
            }}
          />
          <div className="flex justify-between text-[9px] text-gray-600 font-mono px-0.5">
            <span>0.1x</span>
            <span>3x</span>
          </div>
        </div>
      </div>
    </div>
  );
};
