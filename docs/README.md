# Fractals Interactive Learning Platform

A modern web platform for interactive exploration of mathematical fractals, designed for educational use with real-time rendering, equation inspection, and classroom broadcasting capabilities.

## Features

### Core Fractals
- **Mandelbrot Set**: Classic escape-time fractal with smooth coloring
- **Julia Sets**: Parameterized fractals with interactive constant adjustment
- **L-Systems**: Turtle graphics for Koch curves, Dragon curves, Hilbert curves
- **Space-filling Curves**: Peano, Hilbert, and other mathematical curves

### Interactive Features
- **Real-time Rendering**: WebGPU-accelerated with WebGL2 fallback
- **Equation Inspector**: Live math equations with interactive parameter sliders
- **Preset System**: Save, share, and load fractal configurations
- **URL Sharing**: Shareable deep links with embedded parameters
- **Quality Control**: Draft to Ultra quality settings for performance tuning

### Educational Tools
- **Classroom Mode**: Teacher-led broadcasts with WebRTC streaming
- **Progressive Animation**: Step-by-step generation visualization
- **Mathematical Context**: LaTeX equations with parameter highlighting
- **Performance Metrics**: Real-time FPS and render statistics

## Technology Stack

### Frontend
- **Next.js 15** with React 19 and TypeScript
- **WebGPU/WebGL2** for GPU-accelerated fractal computation
- **KaTeX** for mathematical equation rendering
- **Tailwind CSS** for responsive UI design
- **Zustand** for state management

### Backend
- **Express.js** API server with TypeScript
- **WebRTC** for classroom broadcasting
- **GPU Render Service** for heavy computation offloading
- **JSON-based** preset and lesson storage

### Performance
- **Target**: 30+ FPS at 1080p, <30ms slider response
- **Client Rendering**: 200-500 iterations for real-time interaction
- **Server Rendering**: High-iteration deep zooms and distance estimation
- **Progressive Refinement**: Quality improves over time

## Quick Start

### Development Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Run Development Server**
   ```bash
   npm run dev
   ```

3. **Start API Server** (optional)
   ```bash
   npm run server:dev
   ```

4. **Access the Platform**
   - Frontend: http://localhost:3000
   - API: http://localhost:3001

### Basic Usage

1. **Explore Fractals**: Click and scroll on the canvas to zoom and pan
2. **Adjust Parameters**: Use the equation inspector sliders to modify fractal properties
3. **Try Presets**: Load predefined configurations from the preset manager
4. **Switch Modes**: Toggle between Fractals and L-Systems in the header
5. **Save & Share**: Create custom presets and share via URL

## Architecture

### File Structure
```
src/
├── components/
│   ├── fractals/          # Fractal rendering components
│   ├── math/              # Mathematical UI components
│   └── ui/                # General UI components
├── lib/
│   ├── webgpu/            # WebGPU/WebGL renderers
│   ├── l-systems/         # L-system generation engine
│   ├── math/              # Mathematical utilities
│   └── hooks/             # React hooks
├── server/
│   ├── api/               # REST API handlers
│   ├── auth/              # Authentication service
│   └── render-service/    # GPU rendering service
├── shaders/               # WGSL and GLSL shader code
└── types/                 # TypeScript type definitions
```

### Rendering Pipeline

1. **Parameter Input**: User adjusts sliders or clicks canvas
2. **Config Update**: React state updates fractal configuration
3. **Renderer Selection**: WebGPU preferred, WebGL2 fallback
4. **Shader Execution**: Compute shaders calculate fractal iterations
5. **Color Mapping**: Apply smooth/histogram coloring schemes
6. **Display**: Render to canvas with performance metrics

### GPU Compute Shaders

- **Mandelbrot Kernel**: Optimized escape-time iteration
- **Julia Kernel**: Parameterized constant support
- **Color Mapping**: HSV gradients and smooth coloring
- **Distance Estimation**: Sharp edges and 3D-like shading

## Educational Use Cases

### Classroom Teaching
- **Interactive Demonstrations**: Real-time parameter exploration
- **Mathematical Connections**: Live equation highlighting
- **Student Engagement**: Hands-on fractal discovery
- **Broadcasting Mode**: Teacher shares view to all students

### Self-Directed Learning
- **Preset Exploration**: Curated fractal collections
- **Progressive Complexity**: From basic to advanced concepts
- **Performance Understanding**: FPS and iteration trade-offs
- **Mathematical Insight**: Equation-to-visual connections

## Configuration

### Environment Variables
```bash
# API Server
PORT=3001
NODE_ENV=development

# WebGPU Settings
WEBGPU_VALIDATION=true
MAX_COMPUTE_WORKGROUPS=65535

# Rendering Limits
MAX_ITERATIONS_CLIENT=1000
MAX_ITERATIONS_SERVER=10000
RENDER_TIMEOUT_MS=30000

# Broadcasting
WEBRTC_STUN_SERVERS=stun:stun.l.google.com:19302
MAX_BROADCAST_VIEWERS=30
```

### Quality Presets
- **Draft**: 100 iterations, fast interaction
- **Normal**: 300 iterations, balanced quality/speed
- **High**: 500 iterations, crisp detail
- **Ultra**: 1000+ iterations, maximum quality

## Development

### Adding New Fractals

1. **Define Type**: Add to `FractalConfig.type` union
2. **Create Shader**: Add WGSL/GLSL compute kernel
3. **Update Renderer**: Handle new type in WebGPU/WebGL renderers
4. **Add Presets**: Create sample configurations
5. **Update UI**: Add controls to equation inspector

### Performance Optimization

- **Shader Profiling**: Use browser GPU debugging tools
- **Iteration Limiting**: Adaptive quality based on zoom level
- **Memory Management**: Efficient buffer reuse
- **Progressive Rendering**: Lower quality for interaction, higher for final

### Testing

```bash
# Unit Tests
npm test

# E2E Tests
npm run test:e2e

# Performance Benchmarks
npm run test:perf
```

## Deployment

### Production Build
```bash
npm run build
npm start
```

### Docker Deployment
```bash
docker build -t fractals-platform .
docker run -p 3000:3000 -p 3001:3001 fractals-platform
```

### CDN Assets
- Static presets and shaders served from CDN
- Pre-rendered fractal animations for fallback
- Optimized shader compilation caching

## Contributing

1. **Fork Repository**: Create your feature branch
2. **Follow Style Guide**: ESLint and Prettier configured
3. **Add Tests**: Unit tests for new functionality
4. **Performance Testing**: Ensure 30+ FPS targets
5. **Documentation**: Update README and JSDoc comments

## License

MIT License - See [LICENSE](LICENSE) file for details.

## Acknowledgments

- **Mathematical Foundations**: Benoit Mandelbrot, Gaston Julia
- **L-System Theory**: Aristid Lindenmayer
- **WebGPU Specification**: W3C GPU for the Web Community Group
- **Educational Inspiration**: 3Blue1Brown, Numberphile