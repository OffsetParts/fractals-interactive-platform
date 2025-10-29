import express from 'express';
import { GPURendererFactory } from '../render-service/CUDARenderer';

const router = express.Router();

// Health check for GPU availability
router.get('/gpu/status', async (req, res) => {
  try {
    if (!GPURendererFactory.isGPUAvailable()) {
      return res.status(503).json({ 
        error: 'GPU not available',
        fallback: 'CPU rendering enabled'
      });
    }

    const renderer = await GPURendererFactory.getInstance();
    const gpuInfo = renderer.getGPUInfo();
    
    res.json({
      status: 'available',
      gpu: gpuInfo,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('GPU status check failed:', error);
    res.status(500).json({ error: 'GPU status check failed' });
  }
});

// High-quality render endpoint
router.post('/gpu/render', async (req, res) => {
  try {
    const config: Record<string, unknown> = req.body.config;
    
    if (!config) {
      return res.status(400).json({ error: 'Missing fractal configuration' });
    }

    // Check if GPU is available
    if (!GPURendererFactory.isGPUAvailable()) {
      return res.status(503).json({ 
        error: 'GPU rendering not available',
        suggestion: 'Use client-side WebGPU rendering instead'
      });
    }

    const renderer = await GPURendererFactory.getInstance();
    const result = await renderer.renderHighQuality();
    
    // Convert buffer to base64 for JSON response
    const imageBase64 = result.imageBuffer.toString('base64');
    
    res.json({
      success: true,
      image: `data:image/png;base64,${imageBase64}`,
      renderTime: result.renderTime,
      iterations: result.iterations,
      resolution: '1920x1080',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('GPU render failed:', error);
    res.status(500).json({ 
      error: 'Render failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Deep zoom rendering for extreme magnifications
router.post('/gpu/render/deep-zoom', async (req, res) => {
  try {
    const { config, targetZoom } = req.body;
    
    if (!config || !targetZoom) {
      return res.status(400).json({ error: 'Missing config or targetZoom' });
    }

    if (targetZoom > 10**15) {
      return res.status(400).json({ 
        error: 'Zoom level too high',
        maxZoom: '10^15'
      });
    }

    const renderer = await GPURendererFactory.getInstance();
    const imageBuffer = await renderer.renderDeepZoom();
    
    const imageBase64 = imageBuffer.toString('base64');
    
    res.json({
      success: true,
      image: `data:image/png;base64,${imageBase64}`,
      zoom: targetZoom,
      precision: 'arbitrary',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Deep zoom render failed:', error);
    res.status(500).json({ error: 'Deep zoom render failed' });
  }
});

// Animation rendering
router.post('/gpu/render/animation', async (req, res) => {
  try {
    const { startConfig, endConfig, frames, fps = 30 } = req.body;
    
    if (!startConfig || !endConfig || !frames) {
      return res.status(400).json({ error: 'Missing animation parameters' });
    }

    if (frames > 300) {
      return res.status(400).json({ 
        error: 'Too many frames requested',
        maxFrames: 300
      });
    }

    const renderer = await GPURendererFactory.getInstance();
    const frameBuffers = await renderer.renderAnimation(startConfig, endConfig, frames);
    
    // Convert frames to base64 array
    const frameImages = frameBuffers.map(buffer => 
      `data:image/png;base64,${buffer.toString('base64')}`
    );
    
    res.json({
      success: true,
      frames: frameImages,
      frameCount: frames,
      fps: fps,
      duration: frames / fps,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Animation render failed:', error);
    res.status(500).json({ error: 'Animation render failed' });
  }
});

// Batch rendering for multiple configurations
router.post('/gpu/render/batch', async (req, res) => {
  try {
    const { configs } = req.body;
    
    if (!Array.isArray(configs) || configs.length === 0) {
      return res.status(400).json({ error: 'Invalid configs array' });
    }

    if (configs.length > 50) {
      return res.status(400).json({ 
        error: 'Too many configs in batch',
        maxBatch: 50
      });
    }

    const renderer = await GPURendererFactory.getInstance();
    const results = [];
    
    for (let i = 0; i < configs.length; i++) {
      try {
        const result = await renderer.renderHighQuality();
        results.push({
          index: i,
          success: true,
          image: `data:image/png;base64,${result.imageBuffer.toString('base64')}`,
          renderTime: result.renderTime
        });
      } catch (error) {
        results.push({
          index: i,
          success: false,
          error: error instanceof Error ? error.message : 'Render failed'
        });
      }
    }
    
    res.json({
      success: true,
      results: results,
      total: configs.length,
      successful: results.filter(r => r.success).length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Batch render failed:', error);
    res.status(500).json({ error: 'Batch render failed' });
  }
});

export default router;