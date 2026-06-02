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
              // Adicionado 'unsafe-inline' para o Supabase (às vezes necessário para scripts de auth)
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.gstatic.com *.infinitepay.io *.google.com *.google.com.br applepay.cdn-apple.com *.unico.io *.amplitude.com *.cloudflare.com *.clarity.ms *.onlinemetrix.net *.online-metrix.net *.sentry.io;",
              "style-src 'self' 'unsafe-inline' fonts.googleapis.com;",
              "font-src 'self' data: fonts.gstatic.com fonts.googleapis.com *.infinitepay.io;",
              "img-src 'self' data: https: blob:;",
              // CORREÇÃO CRÍTICA ABAIXO:
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://fcmregistrations.googleapis.com https://firebaseinstallations.googleapis.com https://www.googleapis.com *.infinitepay.io *.amplitude.com *.cloudflare.com *.clarity.ms *.sentry.io *.ingest.sentry.io;",
              "frame-src 'self' *.infinitepay.io;",
              "media-src 'self' https://res.cloudinary.com;",
              // Adicionado 'blob:' e 'data:' aqui para suportar workers do Supabase
              "worker-src 'self' blob: data:;",
            ].join(' '),
          },
        ],
      },
    ];
  },

  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: false },
  productionBrowserSourceMaps: true,

  experimental: {
    optimizePackageImports: ['lucide-react', '@supabase/supabase-js'],
  },
};

export default withSentryConfig(nextConfig, {
  org: 'repvendas',
  project: 'javascript-nextjs',
  silent: !process.env.CI,
  widenClientFileUpload: true,
  webpack: {
    automaticVercelMonitors: true,
    treeshake: {
      removeDebugLogging: true,
    },
  },
});
