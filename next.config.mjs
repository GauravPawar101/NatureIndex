/** @type {import('next').NextConfig} */
import createNextIntlPlugin from 'next-intl/plugin';
import withPWAInit from 'next-pwa';
import runtimeCaching from 'next-pwa/cache.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let supabaseHostname;
try {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (supabaseUrl) supabaseHostname = new URL(supabaseUrl).hostname;
} catch {
  supabaseHostname = undefined;
}

const withNextIntl = createNextIntlPlugin('./src/i18n/request.js');

const withPWA = withPWAInit({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  fallbacks: {
    document: '/offline',
  },
  runtimeCaching: [
    // Cache the blog listing for offline reading.
    {
      urlPattern: ({ request, url }) => {
        if (request.destination !== 'document') return false;
        return url.pathname === '/blog' || url.pathname === '/blog/';
      },
      handler: 'NetworkFirst',
      options: {
        cacheName: 'blog-listing',
        expiration: {
          maxEntries: 5,
          maxAgeSeconds: 24 * 60 * 60, // 1 day
        },
        cacheableResponse: { statuses: [0, 200] },
      },
    },

    // Cache recently viewed post pages (offline reading).
    {
      urlPattern: ({ request, url }) => {
        if (request.destination !== 'document') return false;
        // Matches /blog/<slug>
        return /^\/blog\/[^/]+\/?$/.test(url.pathname);
      },
      handler: 'NetworkFirst',
      options: {
        cacheName: 'blog-posts',
        expiration: {
          maxEntries: 30,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
        },
        cacheableResponse: { statuses: [0, 200] },
      },
    },

    // Keep default next-pwa caching for static assets, images, etc.
    ...runtimeCaching,
  ],
});

const nextConfig = {
  outputFileTracingRoot: __dirname,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      // ADD THIS NEW ENTRY for Brave Search images
      {
        protocol: 'https',
        hostname: 'imgs.search.brave.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'img.clerk.com',
        port: '',
        pathname: '/**',
      },
      ...(supabaseHostname
        ? [
            {
              protocol: 'https',
              hostname: supabaseHostname,
              port: '',
              pathname: '/storage/v1/object/public/**',
            },
          ]
        : []),
    ],
  },
};

export default withNextIntl(withPWA(nextConfig));