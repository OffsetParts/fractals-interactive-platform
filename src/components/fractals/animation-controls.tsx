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
  return (
    <div className="bg-black/60 backdrop-blur-sm border border-purple-500/30 rounded-lg p-3 flex items-center gap-4">
      {/* Play/Pause Button */}
      <button
        onClick={onTogglePlay}
        className={`px-4 py-2 rounded-lg font-medium transition ${
          isPlaying
            ? 'bg-red-600 hover:bg-red-700 text-white'
            : 'bg-green-600 hover:bg-green-700 text-white'
        }`}
      >
        {isPlaying ? '⏸ Pause' : '▶ Play'}
      </button>

      {/* Speed Control */}
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-400">Speed:</label>
        <input
          type="range"
          min="0.1"
          max="3"
          step="0.1"
          value={speed}
          onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
          className="w-24 h-1.5 bg-gray-700 rounded cursor-pointer"
        />
        <span className="text-xs text-cyan-400 font-mono w-8">{speed.toFixed(1)}x</span>
      </div>
    </div>
  );
};
