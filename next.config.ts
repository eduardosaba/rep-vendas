import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'commportal-images.safilo.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'i.imgur.com' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
    ],
    deviceSizes: [640, 750, 828, 1080],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    formats: ['image/webp'],
    minimumCacheTTL: 31536000,
    dangerouslyAllowSVG: true,
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self';",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' *.infinitepay.io *.google.com *.google.com.br applepay.cdn-apple.com *.unico.io *.amplitude.com *.cloudflare.com *.clarity.ms *.onlinemetrix.net *.online-metrix.net *.sentry.io;",
              "style-src 'self' 'unsafe-inline' fonts.googleapis.com;",
              "font-src 'self' data: fonts.gstatic.com fonts.googleapis.com *.infinitepay.io;",
              "img-src 'self' data: https: blob:;",
              "connect-src 'self' *.supabase.co *.infinitepay.io *.amplitude.com *.cloudflare.com *.clarity.ms *.sentry.io *.ingest.sentry.io;",
              "frame-src 'self' *.infinitepay.io;",
              "worker-src 'self' blob:;", // Necessário para alguns scripts de analytics/sentry
            ].join(' '),
          },
        ],
      },
    ];
  },

  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  productionBrowserSourceMaps: true,

  experimental: {
    optimizePackageImports: ['lucide-react', '@supabase/supabase-js'],
  },
};

export default withSentryConfig(nextConfig, {
  org: "repvendas",
  project: "javascript-nextjs",
  silent: !process.env.CI,
  widenClientFileUpload: true,
  webpack: {
    automaticVercelMonitors: true,
    treeshake: {
      removeDebugLogging: true,
    },
  },
});