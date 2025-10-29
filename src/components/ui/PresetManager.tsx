'use client';

import React, { useState } from 'react';
import { FractalConfig, Preset, ComplexNumber } from '@/types';

interface PresetManagerProps {
  currentConfig: FractalConfig;
  onLoadPreset: (config: FractalConfig) => void;
  onSavePreset?: (preset: Preset) => void;
  className?: string;
}

// Sample presets - in a real app these would come from an API
const SAMPLE_PRESETS: Preset[] = [
  {
    id: '1',
    name: 'Classic Mandelbrot',
    description: 'The iconic Mandelbrot set view',
    sceneId: 'mandelbrot-1',
    owner: 'system',
    public: true,
    createdAt: new Date(),
    params: {
      center: { real: -0.5, imaginary: 0 },
      zoom: 1,
      iterations: 100,
      colorScheme: {
        id: 'classic',
        name: 'Classic',
        colors: ['#000033', '#000055', '#0000ff', '#0055ff', '#00ffff', '#55ff00', '#ffff00', '#ff5500', '#ff0000'],
        smooth: true,
        histogram: false
      }
    }
  },
  {
    id: '2',
    name: 'Seahorse Valley',
    description: 'Detailed view of the seahorse valley',
    sceneId: 'mandelbrot-2',
    owner: 'system',
    public: true,
    createdAt: new Date(),
    params: {
      center: { real: -0.75, imaginary: 0.1 },
      zoom: 50,
      iterations: 200,
      colorScheme: {
        id: 'sunset',
        name: 'Sunset',
        colors: ['#ff0000', '#ff8800', '#ffff00', '#88ff00', '#00ff00'],
        smooth: true,
        histogram: true
      }
    }
  },
  {
    id: '3',
    name: 'Julia Set - Classic',
    description: 'Beautiful Julia set with c = -0.8 + 0.156i',
    sceneId: 'julia-1',
    owner: 'system',
    public: true,
    createdAt: new Date(),
    params: {
      c: { real: -0.8, imaginary: 0.156 },
      center: { real: 0, imaginary: 0 },
      zoom: 1,
      iterations: 150,
      colorScheme: {
        id: 'ocean',
        name: 'Ocean',
        colors: ['#000033', '#003366', '#006699', '#0099cc', '#00ccff'],
        smooth: true,
        histogram: false
      }
    }
  }
];

export const PresetManager: React.FC<PresetManagerProps> = ({
  currentConfig,
  onLoadPreset,
  onSavePreset,
  className = '',
}) => {
  const [presets] = useState<Preset[]>(SAMPLE_PRESETS);
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveDescription, setSaveDescription] = useState('');

  const handleLoadPreset = (presetId: string) => {
    const preset = presets.find(p => p.id === presetId);
    if (preset) {
      // Convert preset params to FractalConfig
      const config: FractalConfig = {
        ...currentConfig,
        ...preset.params,
        type: preset.sceneId.includes('julia') ? 'julia' : 
              preset.sceneId.includes('mandelbrot') ? 'mandelbrot' : 
              currentConfig.type
      };
      onLoadPreset(config);
      setSelectedPreset(presetId);
    }
  };

  const handleSavePreset = () => {
    if (!onSavePreset || !saveName.trim()) return;

    const newPreset: Preset = {
      id: Date.now().toString(),
      name: saveName,
      description: saveDescription,
      sceneId: `${currentConfig.type}-${Date.now()}`,
      owner: 'user',
      public: false,
      createdAt: new Date(),
      params: {
        center: currentConfig.center,
        zoom: currentConfig.zoom,
        iterations: currentConfig.iterations,
        colorScheme: currentConfig.colorScheme,
        ...(currentConfig.type === 'julia' && { c: currentConfig.params.c })
      }
    };

    onSavePreset(newPreset);
    setShowSaveModal(false);
    setSaveName('');
    setSaveDescription('');
  };

  const generateShareableURL = () => {
    const params = new URLSearchParams({
      fractal: currentConfig.type,
      centerReal: currentConfig.center.real.toString(),
      centerImag: currentConfig.center.imaginary.toString(),
      zoom: currentConfig.zoom.toString(),
      iterations: currentConfig.iterations.toString(),
      smooth: currentConfig.colorScheme.smooth.toString(),
      histogram: currentConfig.colorScheme.histogram.toString(),
      ...(currentConfig.type === 'julia' && currentConfig.params.c && {
        juliaReal: (currentConfig.params.c as ComplexNumber).real.toString(),
        juliaImag: (currentConfig.params.c as ComplexNumber).imaginary.toString(),
      })
    });

    return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generateShareableURL());
      alert('Share URL copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };

  return (
    <div className={`bg-white border rounded-lg shadow-sm ${className}`}>
      <div className="p-4 border-b">
        <h3 className="text-lg font-semibold mb-3">Presets & Sharing</h3>
        
        {/* Preset Selector */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Load Preset:</label>
          <div className="flex space-x-2">
            <select
              value={selectedPreset}
              onChange={(e) => handleLoadPreset(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a preset...</option>
              {presets.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Preset Preview */}
        {selectedPreset && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            {(() => {
              const preset = presets.find(p => p.id === selectedPreset);
              return preset ? (
                <div>
                  <h4 className="font-medium">{preset.name}</h4>
                  <p className="text-sm text-gray-600 mt-1">{preset.description}</p>
                  <div className="text-xs text-gray-500 mt-2">
                    Created by {preset.owner} • {preset.createdAt.toLocaleDateString()}
                  </div>
                </div>
              ) : null;
            })()}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-2">
          <button
            onClick={() => setShowSaveModal(true)}
            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            Save Current
          </button>
          
          <button
            onClick={copyToClipboard}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Share URL
          </button>
        </div>
      </div>

      {/* Current Config Display */}
      <div className="p-4">
        <h4 className="font-medium mb-2">Current Configuration</h4>
        <div className="text-xs font-mono bg-gray-100 p-2 rounded overflow-x-auto">
          <div>Type: {currentConfig.type}</div>
          <div>Center: {currentConfig.center.real.toFixed(6)} + {currentConfig.center.imaginary.toFixed(6)}i</div>
          <div>Zoom: {currentConfig.zoom.toFixed(2)}</div>
          <div>Iterations: {currentConfig.iterations}</div>
          <div>Quality: {currentConfig.quality}</div>
        </div>
      </div>

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-90vw">
            <h3 className="text-lg font-semibold mb-4">Save Preset</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Name:</label>
              <input
                type="text"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="My Amazing Fractal"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Description:</label>
              <textarea
                value={saveDescription}
                onChange={(e) => setSaveDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-20 resize-none"
                placeholder="A brief description of this fractal configuration..."
              />
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={handleSavePreset}
                disabled={!saveName.trim()}
                className="flex-1 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save
              </button>
              
              <button
                onClick={() => setShowSaveModal(false)}
                className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};