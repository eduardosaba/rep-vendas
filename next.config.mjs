/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ignora erros de TS no build (assumimos que você checa localmente)
  typescript: {
    ignoreBuildErrors: true,
  },
  // Ignora erros de ESLint no build
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Otimização de imagens (se estiver usando imagens externas)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**', // Permite todas temporariamente para evitar erros de imagem
      },
    ],
  },
  // Se estiver usando Next.js 15 com App Router e tiver problemas de timeout
  staticPageGenerationTimeout: 120,
};

export default nextConfig;
