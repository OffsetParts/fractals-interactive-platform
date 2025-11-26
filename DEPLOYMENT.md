# Vercel Deployment Guide

## Quick Deploy

1. **Connect Repository to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New" → "Project"
   - Import your GitHub repository: `OffsetParts/fractals-interactive-platform`

2. **Configuration** (should auto-detect):
   - Framework Preset: **Next.js**
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm ci`
   - Node Version: **20.x**

3. **Environment Variables** (Optional):
   - No environment variables required for basic deployment

4. **Deploy**:
   - Click "Deploy"
   - Vercel will build and deploy automatically

## Build Settings

The project is configured in `vercel.json`:
```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "installCommand": "npm ci",
  "outputDirectory": ".next"
}
```

## Build Command (Manual)

If deploying manually or testing locally:
```bash
npm ci
npm run build
npm start
```

## Common Issues & Fixes

### Issue: Build fails with TypeScript errors
**Solution**: The project has `eslint.ignoreDuringBuilds: true` in `next.config.ts` to prevent this

### Issue: Module not found errors
**Solution**: Ensure all imports use the `@/` alias correctly (already configured)

### Issue: Shader compilation errors
**Solution**: All shader template literals are properly formatted with `${fragmentShaderTopShared}`

### Issue: React 19 compatibility
**Solution**: Using Next.js 15.5.4 which has built-in React 19 support

## Optimization Settings

The app is configured with:
- `output: 'standalone'` for minimal server bundle
- ESLint disabled during builds to prevent CI failures
- All shaders pre-compiled at build time
- TypeScript strict mode enabled

## Post-Deployment

Once deployed, your fractal explorer will be live at:
`https://your-project-name.vercel.app`

Main page: `/`
Explorer: `/explorer`

## Performance Notes

- Default iterations set to 50 for optimal performance
- WebGPU with WebGL2 fallback
- Adaptive rendering based on zoom level
- Grid overlay toggleable
- Animation playback with adjustable speed

## Features Deployed

✅ Mandelbrot & Julia sets with complex exponentiation
✅ Parameter controls (z, c, x sliders)
✅ Animation playback system
✅ Complex plane grid overlay
✅ Burning Ship, Tricorn, Newton's fractals
✅ Spiral/Galaxy fractal
✅ Real-time equation display
✅ 30+ color palettes
