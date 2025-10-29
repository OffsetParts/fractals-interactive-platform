'use client';

import React, { useState } from 'react';
import Link from 'next/link';

type EnvironmentTab = 'overview' | 'scene-planner' | 'codegen' | 'settings';

export default function AIEnvironment() {
  const [activeTab, setActiveTab] = useState<EnvironmentTab>('overview');
  const [sceneName, setSceneName] = useState('');
  const [sceneDescription, setSceneDescription] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateScene = async () => {
    if (!sceneDescription.trim()) {
      alert('Please describe your scene');
      return;
    }

    setIsGenerating(true);
    // Simulated API call - will be replaced with real AI service
    setTimeout(() => {
      const mockCode = `from manim import *

class FractalScene(Scene):
    def construct(self):
        # ${sceneDescription}
        
        # Create fractal
        mandelbrot = self.create_mandelbrot()
        self.play(FadeIn(mandelbrot))
        self.wait(2)
        
        # Add zoom animation
        self.play(
            mandelbrot.animate.scale(2),
            run_time=3
        )
        self.wait(2)
    
    def create_mandelbrot(self):
        # Placeholder for fractal generation
        circle = Circle()
        return circle
`;
      setGeneratedCode(mockCode);
      setIsGenerating(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-gray-950/80 backdrop-blur-sm border-b border-gray-800 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="text-gray-400 hover:text-white transition text-sm">
              ← Back to Home
            </Link>
            <h1 className="text-xl font-semibold text-white">🤖 AI Environment</h1>
            <div className="w-20" />
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="pt-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {/* Header */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-white mb-3">Fractal AI Environment</h2>
          <p className="text-gray-400">
            Harness AI to plan scenes, generate animations, and explore fractals with natural language.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b border-gray-700">
          {(['overview', 'scene-planner', 'codegen', 'settings'] as EnvironmentTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 font-medium text-sm transition border-b-2 ${
                activeTab === tab
                  ? 'text-blue-400 border-blue-400'
                  : 'text-gray-400 border-transparent hover:text-gray-300'
              }`}
            >
              {tab === 'overview' && '📊 Overview'}
              {tab === 'scene-planner' && '🎬 Scene Planner'}
              {tab === 'codegen' && '💻 Code Generator'}
              {tab === 'settings' && '⚙️ Settings'}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Capabilities */}
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">🎯 AI Capabilities</h3>
                <ul className="space-y-3">
                  {[
                    { icon: '📝', title: 'Scene Planning', desc: 'Describe scenes in natural language' },
                    { icon: '🎨', title: 'Animation Generation', desc: 'Auto-generate Manim animations' },
                    { icon: '🔍', title: 'Parameter Optimization', desc: 'AI-suggested fractal parameters' },
                    { icon: '💡', title: 'Exploration Guidance', desc: 'Smart zoom and parameter suggestions' }
                  ].map((capability, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="text-xl">{capability.icon}</span>
                      <div>
                        <div className="font-semibold text-white">{capability.title}</div>
                        <div className="text-sm text-gray-400">{capability.desc}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Status */}
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">📈 Environment Status</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Scene Manager</span>
                    <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded font-mono">scaffolding</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Manim Integration</span>
                    <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded font-mono">planned</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">AI Service</span>
                    <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded font-mono">demo mode</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">GPU Rendering</span>
                    <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded font-mono">ready</span>
                  </div>
                </div>
              </div>

              {/* Features Grid */}
              <div className="md:col-span-2">
                <h3 className="text-lg font-semibold text-white mb-4">🚀 Integration Points</h3>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { title: 'Scene Planning', status: 'Ready for Development' },
                    { title: 'Codegen Pipeline', status: 'Ready for Development' },
                    { title: 'Parameter Suggestions', status: 'Ready for Development' },
                    { title: 'Manim Export', status: 'Ready for Development' }
                  ].map((feature, i) => (
                    <div key={i} className="bg-gray-800 border border-gray-700 rounded p-4">
                      <div className="font-semibold text-white text-sm">{feature.title}</div>
                      <div className="text-xs text-gray-400 mt-1">{feature.status}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Scene Planner Tab */}
          {activeTab === 'scene-planner' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">✍️ Scene Description</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Scene Name</label>
                    <input
                      type="text"
                      value={sceneName}
                      onChange={(e) => setSceneName(e.target.value)}
                      placeholder="e.g., 'Mandelbrot Exploration'"
                      className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Scene Description</label>
                    <textarea
                      value={sceneDescription}
                      onChange={(e) => setSceneDescription(e.target.value)}
                      placeholder="Describe your scene in natural language. Example: 'Zoom into the Mandelbrot set at coordinates (-0.7, 0.27), showing the self-similar fractal patterns...'"
                      rows={8}
                      className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none resize-none"
                    />
                  </div>
                  <button
                    onClick={handleGenerateScene}
                    disabled={isGenerating}
                    className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white rounded font-semibold transition"
                  >
                    {isGenerating ? '✨ Generating...' : '✨ Generate Scene'}
                  </button>
                </div>
              </div>

              {/* Examples */}
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 h-fit">
                <h4 className="font-semibold text-white mb-3">💡 Example Prompts</h4>
                <div className="space-y-2">
                  {[
                    'Smooth zoom into Julia set at -0.7 + 0.27i',
                    'Rotate through Mandelbrot with color shifting',
                    'L-System tree growth animation',
                    'Multi-view fractal comparison'
                  ].map((example, i) => (
                    <button
                      key={i}
                      onClick={() => setSceneDescription(example)}
                      className="w-full text-left px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded text-sm text-gray-300 transition"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Code Generator Tab */}
          {activeTab === 'codegen' && (
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">💻 Generated Manim Code</h3>
              {generatedCode ? (
                <div className="bg-black rounded p-4 overflow-x-auto">
                  <pre className="text-gray-300 text-sm font-mono">
                    {generatedCode}
                  </pre>
                </div>
              ) : (
                <div className="bg-gray-800 border border-gray-700 rounded p-8 text-center">
                  <p className="text-gray-400">No code generated yet. Use the Scene Planner to generate animation code.</p>
                </div>
              )}
              
              <div className="flex gap-3 mt-4">
                <button className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded transition">
                  📋 Copy Code
                </button>
                <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition">
                  ▶️ Preview
                </button>
                <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded transition">
                  🎬 Render with Manim
                </button>
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">🔧 AI Settings</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">AI Provider</label>
                    <select className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded text-white">
                      <option>OpenAI GPT-4 (Recommended)</option>
                      <option>Local LLM (Development)</option>
                      <option>Claude 3</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Scene Complexity</label>
                    <select className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded text-white">
                      <option>Simple (30s animation)</option>
                      <option>Medium (60s animation)</option>
                      <option>Complex (120s+ animation)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Resolution</label>
                    <select className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded text-white">
                      <option>720p (Draft)</option>
                      <option>1080p (Default)</option>
                      <option>4K (High Quality)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">📊 Rendering Options</h3>
                <div className="space-y-3">
                  <label className="flex items-center gap-3">
                    <input type="checkbox" defaultChecked className="w-4 h-4 rounded" />
                    <span className="text-sm text-gray-300">Use GPU acceleration</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input type="checkbox" defaultChecked className="w-4 h-4 rounded" />
                    <span className="text-sm text-gray-300">Enable CUDA support</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input type="checkbox" className="w-4 h-4 rounded" />
                    <span className="text-sm text-gray-300">Cache intermediate frames</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input type="checkbox" defaultChecked className="w-4 h-4 rounded" />
                    <span className="text-sm text-gray-300">Preview before rendering</span>
                  </label>
                </div>
              </div>

              <div className="md:col-span-2 bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-yellow-300 mb-2">⚡ Development Status</h3>
                <p className="text-sm text-yellow-200">
                  This AI Environment is currently in scaffolding mode. The interface is ready, but integration with AI services, Manim rendering, and GPU acceleration are planned for the next phase. You can test scene descriptions in demo mode.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-800 bg-gray-950 py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-400">
          <p>🤖 AI Environment for Fractals • Powered by Next.js + TensorFlow.js + Manim</p>
        </div>
      </footer>
    </div>
  );
}
