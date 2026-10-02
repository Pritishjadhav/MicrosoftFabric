import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Allow large file uploads via API routes
  // Note: Next.js default body size limit for API routes is 4MB in some configs.
  // For production large-file uploads, consider direct-to-OneLake with SAS tokens.
  experimental: {
    serverActions: {
      bodySizeLimit: '105mb',
    },
  },

  // Security headers
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
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },

  // Redirect /files to /dashboard/files
  async redirects() {
    return [
      {
        source: '/files',
        destination: '/dashboard/files',
        permanent: false,
      },
      {
        source: '/upload',
        destination: '/dashboard/upload',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
