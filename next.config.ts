import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure Vercel bundles minimal server for app router
  output: 'standalone',
  eslint: {
    // Prevent ESLint from failing the production build on Vercel
    ignoreDuringBuilds: true,
  },
  // React 19 support is default in Next 15; keep experimental toggles minimal
  experimental: {
    // leave empty unless needed; avoids unexpected build-time flags on Vercel
  },
};

export default nextConfig;
