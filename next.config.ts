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
  },
};

export default nextConfig;
