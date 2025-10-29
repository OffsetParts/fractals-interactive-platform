# API Documentation

## Endpoints

### Presets

**GET /api/presets**
- Get all public presets
- Response: Array of Preset objects

**GET /api/presets/:id**
- Get specific preset by ID
- Response: Preset object or 404

**POST /api/presets**
- Create new preset (requires auth)
- Body: Preset data
- Response: Created preset

### Render Jobs

**POST /api/render**
- Queue high-quality render job
- Body: { sceneId, params, priority }
- Response: RenderJob object

**GET /api/render/:id**
- Get render job status
- Response: RenderJob with progress

### Authentication

**POST /api/auth/login**
- Login with email/password
- Body: { email, password }
- Response: { user, token, expiresAt }

**POST /api/auth/logout**
- Logout current session
- Headers: Authorization: Bearer <token>
- Response: { success: true }

## Data Types

```typescript
interface FractalConfig {
  id: string;
  name: string;
  type: 'mandelbrot' | 'julia' | 'l-system';
  params: FractalParams;
  colorScheme: ColorScheme;
  iterations: number;
  zoom: number;
  center: ComplexNumber;
  quality: 'draft' | 'normal' | 'high' | 'ultra';
}

interface Preset {
  id: string;
  name: string;
  description: string;
  sceneId: string;
  params: FractalParams;
  owner: string;
  public: boolean;
  createdAt: Date;
}
```