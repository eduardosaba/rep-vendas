/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**', // Permite imagens de qualquer lugar (Supabase, Unsplash, etc)
      },
    ],
  },
};

export default nextConfig;
