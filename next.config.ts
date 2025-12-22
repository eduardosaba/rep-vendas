/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Next.js 16 experimental flag para middleware
    middlewarePrefetch: 'strict',
  },
  images: {
    // Sem a linha 'qualities', o Next aceita qualquer valor (ex: 80) e otimiza automaticamente.
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
  },
};

export default nextConfig;
