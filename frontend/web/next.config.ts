import type { NextConfig } from "next";

const rawDevOrigins = process.env.ALLOWED_DEV_ORIGINS || process.env.NEXT_PUBLIC_ALLOWED_DEV_ORIGINS || '';
const parsedDevOrigins = rawDevOrigins
  .split(',')
  .map((s) => s.trim().replace(/^https?:\/\//, ''))
  .filter(Boolean);

const isProduction = process.env.NODE_ENV === 'production';
const defaultDevOrigins = isProduction
  ? ['localhost', '127.0.0.1']
  : ['172.16.6.10', 'localhost', '127.0.0.1', '172.16.6.10:3000', 'localhost:3000', '127.0.0.1:3000', '192.168.1.6', '192.168.1.6:3000'];
const allowedDevOrigins = Array.from(new Set([...defaultDevOrigins, ...parsedDevOrigins]));

// Remote image hosts are an explicit allowlist. A wildcard hostname would turn
// /_next/image into an open proxy that will fetch any HTTPS URL on request.
// Extend with ALLOWED_IMAGE_HOSTS (comma-separated, no protocol or path).
const allowedImageHosts = (
  process.env.ALLOWED_IMAGE_HOSTS || 'res.cloudinary.com,app.progeni.live'
)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  // Do not advertise the framework to clients.
  poweredByHeader: false,
  allowedDevOrigins,
  turbopack: {
    root: __dirname,
  },
  /* Baseline security headers for every app response. */
  async headers() {
    const isProd = process.env.NODE_ENV === 'production';
    return [
      {
        source: '/mediapipe/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, HEAD, OPTIONS' },
          { key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' },
        ],
      },
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-DNS-Prefetch-Control', value: 'off' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(self), geolocation=()',
          },
          ...(isProd
            ? [
              {
                key: 'Strict-Transport-Security',
                value: 'max-age=15552000; includeSubDomains',
              },
            ]
            : []),
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              `script-src 'self' 'unsafe-inline'${isProd ? '' : " 'unsafe-eval'"} https://cdn.jsdelivr.net https://static.cloudflareinsights.com https://checkout.razorpay.com`,
              "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
              "img-src 'self' data: https: blob: https://*.razorpay.com",
              "font-src 'self' data: https://cdn.jsdelivr.net",
              "connect-src 'self' https://pay.progeni.live https://cdn.jsdelivr.net https://cloudflareinsights.com https://*.cloudflareinsights.com wss://*.livekit.cloud https://*.livekit.cloud https://api.razorpay.com https://lumberjack.razorpay.com",
              "worker-src 'self' blob:",
              "media-src 'self' blob: data:",
              "frame-src 'self' https://pay.progeni.live https://api.razorpay.com https://checkout.razorpay.com",
              "child-src 'self' https://pay.progeni.live https://api.razorpay.com https://checkout.razorpay.com",
              "frame-ancestors 'self'",
              "form-action 'self' https://pay.progeni.live https://api.razorpay.com",
            ].join('; '),
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
        ],
      },
    ];
  },
  /* Allow CORS and clean media asset loading */
  images: {
    remotePatterns: allowedImageHosts.map((hostname) => ({
      protocol: 'https' as const,
      hostname,
    })),
  },
  /* Canonical URL consolidation: every duplicate/stub route below used to
     render as a second copy of the same page (or a client-side JS redirect).
     One HTTP redirect each keeps URLs single-valued for SEO and removes the
     re-export pages from the router. */
  async redirects() {
    return [
      { source: '/sitemap', destination: '/sitemap.xml', permanent: true },
      {
        source: '/super-admin/permissions',
        destination: '/super-admin/roles',
        permanent: false,
      },
      { source: '/careers', destination: '/career', permanent: false },
      { source: '/pay-us-now', destination: '/pricing', permanent: false },
      { source: '/candidate/dashboard/interviews', destination: '/candidate/interviews', permanent: false },
      { source: '/candidate/dashboard/practice', destination: '/candidate/practice', permanent: false },
      { source: '/candidate/dashboard/skills', destination: '/candidate/skills', permanent: false },
      { source: '/recruiter/dashboard/dossiers', destination: '/recruiter/dossiers', permanent: false },
      { source: '/recruiter/dashboard/profile', destination: '/recruiter/profile', permanent: false },
      { source: '/recruiter/dashboard/rubrics', destination: '/recruiter/rubrics', permanent: false },
      { source: '/super-admin/transactions', destination: '/super-admin/billing?tab=ledger', permanent: false },
      { source: '/super-admin/billing-audit', destination: '/super-admin/billing?tab=ledger', permanent: false },
    ];
  },
  /* Proxy all requests on api subdomains (or /api/* on main domain) to the Flask backend */
  async rewrites() {
    const defaultBackend = process.env.NODE_ENV === 'production'
      ? 'https://api-atlas.progeni.live'
      : 'http://127.0.0.1:5000';
    const flaskBase = (process.env.NEXT_PUBLIC_API_URL?.split(',')[0] || '').replace(/\/+$/, '') || defaultBackend;
    return {
      beforeFiles: [
        // Dedicated API subdomain routing: all traffic on api-atlas.* or api.* routes purely to backend API
        {
          has: [{ type: 'host', value: 'api-atlas.progeni.live' }],
          source: '/:path*',
          destination: `${flaskBase}/:path*`,
        },
        {
          has: [{ type: 'host', value: 'api.atlas.progeni.live' }],
          source: '/:path*',
          destination: `${flaskBase}/:path*`,
        },
        {
          has: [{ type: 'host', value: 'api.progeni.live' }],
          source: '/:path*',
          destination: `${flaskBase}/:path*`,
        },
      ],
      afterFiles: [],
      fallback: [
        {
          source: '/api/:path*',
          destination: `${flaskBase}/api/:path*`,
        },
      ],
    };
  },
};

export default nextConfig;