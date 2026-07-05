import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    // Cache optimized images for 31 days to cut repeat transformations
    // and cache writes on Vercel Image Optimization.
    minimumCacheTTL: 2678400,
    // WebP only — adding AVIF doubles the number of transformations.
    formats: ['image/webp'],
    deviceSizes: [640, 828, 1080, 1920],
    imageSizes: [80, 160, 384],
    qualities: [75],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'img.clerk.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'ik.imagekit.io',
        pathname: '/**',
      },
    ],
  },
}

export default nextConfig
