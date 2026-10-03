import type { NextConfig } from 'next'

// Categories reorganised in October 2026: old category pages point to the
// group their parts now live in, so old links and search results keep working.
const MOVED_CATEGORIES: Record<string, string> = {
  'body': 'cabin-body-parts',
  'exterior': 'cabin-body-parts',
  'door-components': 'cabin-body-parts',
  'door-panel': 'cabin-body-parts',
  'mudguard': 'cabin-body-parts',
  'bumper': 'cabin-body-parts',
  'fender': 'cabin-body-parts',
  'grill': 'cabin-body-parts',
  'garnish': 'cabin-body-parts',
  'locks': 'cabin-body-parts',
  'handle': 'cabin-body-parts',
  'step-panel': 'cabin-body-parts',
  'alloy-steps': 'cabin-body-parts',
  'mirror': 'cabin-body-parts',
  'mirror-arm': 'cabin-body-parts',
  'window': 'cabin-body-parts',
  'corner-panel': 'cabin-body-parts',
  'inner-pillar': 'cabin-body-parts',
  'front-panel': 'cabin-body-parts',
  'electrical-components': 'electrical-electronics',
  'corner-light': 'electrical-electronics',
  'fog-light': 'electrical-electronics',
  'fan': 'cooling-system',
  'expansion-tank': 'cooling-system',
  'engine-components': 'engine-engine-parts',
  'mechanical-component': 'engine-engine-parts',
  'gear-lever': 'transmission-clutch',
  'steering': 'suspension-steering',
  'axle': 'drivetrain',
  'logo': 'accessories',
}

const nextConfig: NextConfig = {
  experimental: {
    // Splits these barrel-style packages into per-symbol imports at build
    // time so pulling one icon/primitive doesn't bundle the whole library.
    optimizePackageImports: ['lucide-react', 'radix-ui'],
  },
  async redirects() {
    return [
      ...Object.entries(MOVED_CATEGORIES).map(([from, to]) => ({
        source: `/shop/category/${from}`,
        destination: `/shop/category/${to}`,
        permanent: true,
      })),
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
