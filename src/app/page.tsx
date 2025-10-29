'use client';

import React from 'react';
import Link from 'next/link';
import { AnimatedSpiral } from '@/components/hero/animated-spiral';

export default function Home() {
  return (
    <div className="w-full bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-sm border-b border-gray-200/50 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-2">
              <div className="text-2xl">🌀</div>
              <span className="font-semibold text-gray-900">Fractals</span>
            </div>
            <div className="flex items-center space-x-8">
              <a href="#features" className="text-sm text-gray-600 hover:text-gray-900 transition">Features</a>
              <a href="#about" className="text-sm text-gray-600 hover:text-gray-900 transition">About</a>
              <Link href="/explorer" className="px-4 py-2 bg-black text-white rounded-full text-sm font-medium hover:bg-gray-800 transition">
                Launch Explorer
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="min-h-screen flex items-center justify-center pt-16 bg-gradient-to-br from-white via-blue-50 to-white px-4 relative overflow-hidden">
        {/* Full-Screen Animated Spiral Overlay - Fades on load */}
        <div className="fixed inset-0 z-10 opacity-100 animate-fade-out-slow pointer-events-none">
          <AnimatedSpiral width={typeof window !== 'undefined' ? window.innerWidth : 1200} height={typeof window !== 'undefined' ? window.innerHeight : 800} layers={16} speed={0.008} />
        </div>

        <div className="max-w-6xl mx-auto text-center space-y-8 relative z-20">
          <div className="space-y-4">
            <h1 className="text-6xl lg:text-7xl font-bold tracking-tight text-gray-900">
              Explore Infinite
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> Mathematical Beauty</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Real-time interactive visualization of fractals with GPU-powered precision. 
              Discover the elegance of mathematics through dynamic exploration.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
            <Link href="/explorer" className="px-8 py-4 bg-black text-white rounded-full font-semibold hover:bg-gray-800 transition transform hover:scale-105">
              Start Exploring →
            </Link>
            <Link href="/ai-environment" className="px-8 py-4 border-2 border-gray-300 text-gray-900 rounded-full font-semibold hover:border-gray-900 transition transform hover:scale-105">
              AI Environment
            </Link>
          </div>

          {/* Featured Numbers */}
          <div className="grid grid-cols-3 gap-8 pt-12 text-center">
            <div>
              <div className="text-3xl font-bold text-gray-900">∞</div>
              <p className="text-sm text-gray-600 mt-2">Infinite Complexity</p>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-900">60fps</div>
              <p className="text-sm text-gray-600 mt-2">Real-time Rendering</p>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-900">GPU</div>
              <p className="text-sm text-gray-600 mt-2">WebGPU Powered</p>
            </div>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-20 right-10 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-10 left-10 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-50 border-t">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-gray-900 text-center mb-16">Powerful Features</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white rounded-2xl p-8 border border-gray-200/50 hover:border-gray-300 transition">
              <div className="text-4xl mb-4">⚡</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">GPU-Accelerated</h3>
              <p className="text-gray-600">
                WebGPU-powered rendering delivers 60+ FPS even at extreme zoom levels with millions of iterations.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white rounded-2xl p-8 border border-gray-200/50 hover:border-gray-300 transition">
              <div className="text-4xl mb-4">�</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Auto-Precision</h3>
              <p className="text-gray-600">
                Intelligent precision tuning automatically adapts to viewport size and zoom depth for optimal quality.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white rounded-2xl p-8 border border-gray-200/50 hover:border-gray-300 transition">
              <div className="text-4xl mb-4">🌳</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">L-Systems</h3>
              <p className="text-gray-600">
                Generate beautiful patterns with turtle graphics. Koch curves, dragons, and more.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-white rounded-2xl p-8 border border-gray-200/50 hover:border-gray-300 transition">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Live Equations</h3>
              <p className="text-gray-600">
                See mathematical equations update in real-time as you adjust parameters with interactive sliders.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-white rounded-2xl p-8 border border-gray-200/50 hover:border-gray-300 transition">
              <div className="text-4xl mb-4">🎨</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Rich Coloring</h3>
              <p className="text-gray-600">
                Smooth, histogram, and custom coloring modes reveal the structure and beauty of fractals.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-white rounded-2xl p-8 border border-gray-200/50 hover:border-gray-300 transition">
              <div className="text-4xl mb-4">🤖</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">AI Integration</h3>
              <p className="text-gray-600">
                AI-assisted scene planning and Manim code generation for animations and visualizations.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white border-t">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-blue-600">200+</div>
              <p className="text-gray-600 mt-2">Presets</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-purple-600">10B+</div>
              <p className="text-gray-600 mt-2">Colors Available</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-pink-600">∞</div>
              <p className="text-gray-600 mt-2">Zoom Levels</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-green-600">1080p+</div>
              <p className="text-gray-600 mt-2">Resolution</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          <h2 className="text-4xl font-bold text-white">Ready to Explore?</h2>
          <p className="text-xl text-blue-100">
            Dive into the infinite world of mathematical fractals. No installation required.
          </p>
          <Link href="/explorer" className="inline-block px-8 py-4 bg-white text-blue-600 rounded-full font-semibold hover:bg-blue-50 transition transform hover:scale-105">
            Launch Interactive Explorer →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8 border-t">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <div className="text-2xl">🌀</div>
              <span className="font-semibold text-white">Fractals Interactive</span>
            </div>
            <p className="text-sm">
              Built with Next.js, WebGPU, and Mathematical Beauty
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
