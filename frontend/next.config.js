const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Vercel optimizations
  experimental: {
    serverComponentsExternalPackages: [],
    serverMinification: true,
    webVitalsAttribution: ['CLS', 'LCP'],
  },
  
  // Image optimizations for static export
  images: {
    unoptimized: true
  },
  
  // Environment variables
  env: {
    NEXT_TELEMETRY_DISABLED: '1',
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  
  // API rewrites for Vercel
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'https://doramaflix-backend.railway.app/api/v1'}/:path*`,
      },
    ];
  },
  
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
      {
        source: '/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  
  // Performance optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // Build optimizations
  swcMinify: true,
  output: 'export',
  trailingSlash: true,
  poweredByHeader: false,
  reactStrictMode: true,
  compress: true,
  generateEtags: false,
  
  // Advanced performance optimizations
  optimizeFonts: true,
  modularizeImports: {
    'swiper/react': {
      transform: 'swiper/react/{{member}}',
    },
    'swiper': {
      transform: 'swiper/{{member}}',
    },
  },
  
  // Webpack optimizations
  webpack: (config, { buildId, dev, isServer, defaultLoaders, nextRuntime, webpack }) => {
    // Optimize bundle splitting for better performance
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        minSize: 20000,
        maxSize: 244000,
        cacheGroups: {
          // React and core libraries
          react: {
            test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
            name: 'react',
            priority: 20,
            reuseExistingChunk: true,
          },
          // Swiper and heavy UI components
          swiper: {
            test: /[\\/]node_modules[\\/]swiper[\\/]/,
            name: 'swiper',
            priority: 15,
            reuseExistingChunk: true,
          },
          // Framer Motion
          motion: {
            test: /[\\/]node_modules[\\/]framer-motion[\\/]/,
            name: 'motion',
            priority: 15,
            reuseExistingChunk: true,
          },
          // TanStack Query
          query: {
            test: /[\\/]node_modules[\\/]@tanstack[\\/]/,
            name: 'query',
            priority: 15,
            reuseExistingChunk: true,
          },
          // Other vendor libraries
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: 10,
            reuseExistingChunk: true,
            enforce: true,
          },
          // Common chunks
          common: {
            minChunks: 2,
            priority: 5,
            reuseExistingChunk: true,
          },
        },
      };
    }
    
    // Reduce bundle size
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
    };
    
    return config;
  },
};

// Bundle analyzer
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer(nextConfig);