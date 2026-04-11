import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/settings',
        destination: '/wallet',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
