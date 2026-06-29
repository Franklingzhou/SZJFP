import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  transpilePackages: ['lucide-react'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*',
        pathname: '/**',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  async redirects() {
    return [
      // /admin/logs → /admin/operation-logs
      // （不用 page.tsx 的 redirect，因为 Next.js 16 + Turbopack 有 bug：
      //   "logs" 目录下的文件会被错误编译为 Client Component，导致 404）
      {
        source: '/admin/logs',
        destination: '/admin/operation-logs',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
