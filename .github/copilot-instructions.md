# Fractals Interactive Learning Platform - Copilot Instructions

This project is an educational web platform for interactive fractal exploration with the following key components:

## Project Architecture
- **Frontend**: Next.js + React with WebGPU/WebGL2 shaders for real-time fractal rendering
- **Math Integration**: KaTeX/MathJax with interactive equation inspector 
- **Performance**: Web Workers, WASM fallback, progressive refinement
- **Server**: Node.js/FastAPI for auth, presets, GPU render job queuing
- **Streaming**: WebRTC for teacher-led broadcast mode
- **AI**: Guardrailed scene planning and Manim codegen assistance

## Key Features
- Escape-time fractals (Mandelbrot, Julia sets) with smooth/histogram coloring
- L-systems and space-filling curves (Koch, Dragon, Hilbert, Peano)
- Interactive parameter sliders with live equation highlighting
- Shareable URLs and JSON presets
- Heavy-mode GPU rendering with classroom broadcasting
- Distance estimation for sharp edges and shading

## Development Guidelines
- Use TypeScript throughout for type safety
- Implement WebGPU shaders with WebGL2 fallback
- Design for 30+ FPS at 1080p, <30ms slider response
- Follow performance targets: 200-500 iterations client-side
- Implement proper rate limiting and sandboxing for security
- Use feature flags for experimental rendering kernels

## File Organization
- `/src/components/fractals/` - Fractal rendering components
- `/src/shaders/` - WebGPU/WebGL shader code
- `/src/lib/math/` - Mathematical utilities and equation parsing
- `/src/server/` - Server-side API and rendering services
- `/src/types/` - TypeScript type definitions
- `/docs/` - Technical documentation and API specs