/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Support for dynamic base path when deployed behind reverse proxy
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  // Ensure trailing slash consistency
  trailingSlash: false,
  // Configure asset prefix for proper static file serving
  assetPrefix: process.env.NEXT_PUBLIC_BASE_PATH || '',
  // Configure output for static deployment
  output: 'standalone',
  // Ensure proper handling of dynamic routes
  experimental: {
    outputFileTracingRoot: process.cwd(),
  },
}

export default nextConfig
