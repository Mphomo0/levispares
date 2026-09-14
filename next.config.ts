import type { NextConfig } from 'next'

{
  const url = process.env.NEXT_PUBLIC_CONVEX_URL ?? ''
  console.log('DEBUG_CONVEX_URL_LENGTH:', url.length)
  console.log('DEBUG_CONVEX_URL_MATCHES_RIGHTFUL:', url.includes('rightful-axolotl-603'))
  console.log('DEBUG_CONVEX_URL_MATCHES_HAPPY:', url.includes('happy-otter-123'))
  console.log('DEBUG_CONVEX_URL_REVERSED:', url.split('').reverse().join(''))
  console.log('DEBUG_CONVEX_DEPLOYMENT_VAR:', JSON.stringify(process.env.CONVEX_DEPLOYMENT))
}

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'levispares.co.za' }],
        destination: 'https://www.levispares.co.za/:path*',
        permanent: true,
      },
    ]
  },
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
