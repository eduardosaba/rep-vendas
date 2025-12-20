/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Next.js 16 experimental flag para middleware
    middlewarePrefetch: 'strict',
  },
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
