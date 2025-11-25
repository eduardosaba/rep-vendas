/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configurações otimizadas para desenvolvimento mais rápido
  experimental: {
    // Otimizar imports de pacotes específicos
    optimizePackageImports: ['lucide-react', '@supabase/supabase-js'],
  },

  // Configurações de imagem simplificadas
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
    unoptimized: true,
  },

  // Headers básicos
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
        ],
      },
    ];
  },

  // Configurações de webpack otimizadas para desenvolvimento
  webpack: (config, { dev }) => {
    if (dev) {
      // Otimizações para desenvolvimento
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
        ignored: ['**/node_modules', '**/.next'],
      };

      // Cache mais eficiente
      config.cache = {
        type: 'filesystem',
      };

      // Resolver mais rápido
      config.resolve = {
        ...config.resolve,
        symlinks: false,
      };
    }
    return config;
  },

  // Configuração do Turbopack para Next.js 16
  turbopack: {},
};

export default nextConfig;
