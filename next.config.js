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
    unoptimized: true,
  },

  // Headers de Segurança
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
};

export default nextConfig;
