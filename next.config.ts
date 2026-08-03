import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Set STANDALONE=false to use standard mode (npm start instead of node .next/standalone/server.js)
  // Standard mode is simpler for local Windows development - no static asset copy needed
  output: process.env.STANDALONE === 'false' ? undefined : 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts'],
  },
  turbopack: {},
};

export default nextConfig;