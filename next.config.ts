/** @type {import('next').NextConfig} */
const nextConfig = {
  // Removida a flag 'experimental' que estava causando conflito na build
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'commportal-images.safilo.com',
      },
    ],
    // Workaround: desabilita o proxy/otimização de imagens do Next.js
    // para evitar erros de verificação TLS em Node durante o desenvolvimento.
    // Remover ou ajustar em produção após corrigir a cadeia de certificados remota.
    unoptimized: true,
  },
};

export default nextConfig;
