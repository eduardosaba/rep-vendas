/** @type {import('next').NextConfig} */

// 1. Configuração dinâmica do Host do Supabase para Imagens
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

// Padrões iniciais permitidos
const remotePatterns = [
  { protocol: 'http', hostname: 'localhost' },
  { protocol: 'https', hostname: 'lh3.googleusercontent.com' }, // Google Auth
  { protocol: 'https', hostname: 'images.unsplash.com' }, // Unsplash
  { protocol: 'https', hostname: 'via.placeholder.com' }, // Placeholders
  { protocol: 'https', hostname: 'commportal-images.safilo.com' }, // Safilo
  { protocol: 'https', hostname: 'i.imgur.com' }, // Imgur
  { protocol: 'https', hostname: 'avatars.githubusercontent.com' }, // GitHub avatars
  { protocol: 'https', hostname: 'res.cloudinary.com' }, // Cloudinary
  { protocol: 'https', hostname: 'cdn.discordapp.com' }, // Discord CDN
];

// Tenta adicionar o domínio do Supabase se a variável de ambiente existir
try {
  if (supabaseUrl) {
    const u = new globalThis.URL(supabaseUrl);
    remotePatterns.push({
      protocol: (u.protocol || 'https').replace(':', ''),
      hostname: u.hostname,
    });
  }
} catch {
  // Ignora erros de parse se a URL for inválida
}

// 2. Objeto de Configuração do Next.js
const nextConfig = {
  // Otimizações experimentais
  experimental: {
    optimizePackageImports: ['lucide-react', '@supabase/supabase-js'],
  },

  // Configuração de Imagens
  images: {
    remotePatterns,
    // Habilita otimização de imagens pelo Next.js. Isso melhora LCP e carregamento.
    unoptimized: false,
    // Permite otimizar imagens servidas pelo bucket público do Supabase
    remotePatterns: [
      ...remotePatterns,
      {
        protocol: 'https',
        hostname: process.env.NEXT_PUBLIC_SUPABASE_URL
          ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
          : '',
        pathname: '/storage/v1/object/public/**',
      },
    ].filter((r) => r.hostname),
  },

  // Headers de Segurança
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'geolocation=(), microphone=(), camera=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Content-Security-Policy',
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline' https:; connect-src 'self' https: wss:; img-src 'self' data: https:; style-src 'self' 'unsafe-inline' https:; font-src 'self' https:; frame-ancestors 'none';",
          },
        ],
      },
    ];
  },

  // Configuração do Webpack (Mantida para compatibilidade se você rodar com --webpack)
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
        ignored: ['**/node_modules', '**/.next'],
      };

      config.cache = {
        type: 'filesystem',
      };

      config.resolve = {
        ...config.resolve,
        symlinks: false,
      };
    }
    return config;
  },

  // --- CORREÇÃO DO ERRO ---
  // Esta linha diz ao Next.js 16: "Eu sei que tenho config de webpack,
  // mas pode usar o Turbopack com as configurações padrão".
  turbopack: {},
  eslint: {
    // Evita que o passo de lint quebre o build de produção quando há
    // incompatibilidades entre a versão do ESLint e as opções usadas.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
