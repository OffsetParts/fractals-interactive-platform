import express from 'express';
import cors from 'cors';
import { RenderJobManager } from './render-service/RenderJobManager';
import { PresetManager } from './api/PresetManager';
import { AuthService } from './auth/AuthService';

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize services
const renderJobManager = new RenderJobManager();
const presetManager = new PresetManager();
const authService = new AuthService();

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Preset routes
app.get('/api/presets', async (req, res) => {
  try {
    const presets = await presetManager.getPublicPresets();
    res.json(presets);
  } catch (error) {
    console.error('Error fetching presets:', error);
    res.status(500).json({ error: 'Failed to fetch presets' });
  }
});

app.get('/api/presets/:id', async (req, res) => {
  try {
    const preset = await presetManager.getPreset(req.params.id);
    if (!preset) {
      return res.status(404).json({ error: 'Preset not found' });
    }
    res.json(preset);
  } catch (error) {
    console.error('Error fetching preset:', error);
    res.status(500).json({ error: 'Failed to fetch preset' });
  }
});

app.post('/api/presets', async (req, res) => {
  try {
    // TODO: Add authentication middleware
    const preset = await presetManager.createPreset(req.body);
    res.status(201).json(preset);
  } catch (error) {
    console.error('Error creating preset:', error);
    res.status(500).json({ error: 'Failed to create preset' });
  }
});

// Render job routes
app.post('/api/render', async (req, res) => {
  try {
    const { sceneId, params, priority = 'normal' } = req.body;
    
    if (!sceneId || !params) {
      return res.status(400).json({ error: 'Missing sceneId or params' });
    }

    const job = await renderJobManager.queueJob({
      sceneId,
      params,
      priority,
      userId: req.headers['user-id'] as string || 'anonymous'
    });

    res.status(201).json(job);
  } catch (error) {
    console.error('Error queuing render job:', error);
    res.status(500).json({ error: 'Failed to queue render job' });
  }
});

app.get('/api/render/:id', async (req, res) => {
  try {
    const job = await renderJobManager.getJob(req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    res.json(job);
  } catch (error) {
    console.error('Error fetching render job:', error);
    res.status(500).json({ error: 'Failed to fetch render job' });
  }
});

app.get('/api/render/:id/status', async (req, res) => {
  try {
    const status = await renderJobManager.getJobStatus(req.params.id);
    if (!status) {
      return res.status(404).json({ error: 'Job not found' });
    }
    res.json(status);
  } catch (error) {
    console.error('Error fetching job status:', error);
    res.status(500).json({ error: 'Failed to fetch job status' });
  }
});

// User routes (placeholder for authentication)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    res.json(result);
  } catch (error) {
    console.error('Login error:', error);
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

app.post('/api/auth/logout', async (req, res) => {
  try {
    await authService.logout(req.headers.authorization);
    res.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// Lesson routes (for future classroom features)
app.get('/api/lessons', async (req, res) => {
  try {
    // TODO: Implement lesson management
    res.json([]);
  } catch (error) {
    console.error('Error fetching lessons:', error);
    res.status(500).json({ error: 'Failed to fetch lessons' });
  }
});

// WebRTC signaling for broadcast mode (placeholder)
app.post('/api/broadcast/start', async (req, res) => {
  try {
    // TODO: Implement WebRTC signaling server
    const sessionId = `broadcast_${Date.now()}`;
    res.json({ sessionId, signallingUrl: `/ws/broadcast/${sessionId}` });
  } catch (error) {
    console.error('Error starting broadcast:', error);
    res.status(500).json({ error: 'Failed to start broadcast' });
  }
});

// Error handling middleware
// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    requestId: req.headers['x-request-id']
  });
});

// Start server
app.listen(port, () => {
  console.log(`Fractals API server running on port ${port}`);
  console.log(`Health check: http://localhost:${port}/health`);
});

export default app;