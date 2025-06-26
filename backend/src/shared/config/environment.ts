/**
 * Environment Configuration
 * Centralized configuration management for the application
 */

import { config as dotenvConfig } from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenvConfig();

// Environment schema validation
const envSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).pipe(z.number().min(1).max(65535)).default('3000'),
  API_VERSION: z.string().default('v1'),
  APP_NAME: z.string().default('DoramaFlix'),
  APP_URL: z.string().url().default('http://localhost:3000'),

  // Database
  DATABASE_URL: z.string().min(1),
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.string().transform(Number).pipe(z.number()).default('5432'),
  DB_NAME: z.string().default('doramaflix'),
  DB_USER: z.string().default('postgres'),
  DB_PASSWORD: z.string().min(1),

  // Redis
  REDIS_URL: z.string().optional(),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().transform(Number).pipe(z.number()).default('6379'),
  REDIS_PASSWORD: z.string().optional(),

  // RabbitMQ
  RABBITMQ_URL: z.string().default('amqp://localhost:5672'),
  RABBITMQ_USER: z.string().default('guest'),
  RABBITMQ_PASSWORD: z.string().default('guest'),

  // JWT & Security
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),
  BCRYPT_SALT_ROUNDS: z.string().transform(Number).pipe(z.number().min(10).max(15)).default('12'),

  // File Storage
  STORAGE_PROVIDER: z.enum(['vercel-blob', 'cloudflare-r2', 'aws-s3', 'digitalocean-spaces']).default('vercel-blob'),
  BLOB_READ_WRITE_TOKEN: z.string().optional(),
  CLOUDFLARE_R2_ENDPOINT: z.string().url().optional(),
  CLOUDFLARE_R2_ACCESS_KEY: z.string().optional(),
  CLOUDFLARE_R2_SECRET_KEY: z.string().optional(),
  CLOUDFLARE_R2_BUCKET: z.string().optional(),
  CLOUDFLARE_R2_PUBLIC_URL: z.string().url().optional(),
  AWS_S3_REGION: z.string().optional(),
  AWS_S3_ACCESS_KEY: z.string().optional(),
  AWS_S3_SECRET_KEY: z.string().optional(),
  AWS_S3_BUCKET: z.string().optional(),
  DO_SPACES_ENDPOINT: z.string().optional(),
  DO_SPACES_REGION: z.string().optional(),
  DO_SPACES_BUCKET: z.string().optional(),
  DO_SPACES_ACCESS_KEY: z.string().optional(),
  DO_SPACES_SECRET_KEY: z.string().optional(),
  DO_SPACES_CDN_URL: z.string().optional(),

  // Payment Gateways
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  MERCADOPAGO_ACCESS_TOKEN: z.string().optional(),
  MERCADOPAGO_PUBLIC_KEY: z.string().optional(),

  // Email Service
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().transform(Number).pipe(z.number()).optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  EMAIL_FROM: z.string().email().optional(),

  // Development & Testing
  DEVELOPMENT_MODE: z.string().transform(Boolean).default('true'),
  ENABLE_API_DOCS: z.string().transform(Boolean).default('true'),
  ENABLE_CORS: z.string().transform(Boolean).default('true'),
  ALLOWED_ORIGINS: z.string().default('http://localhost:3000,http://localhost:3001'),

  // Monitoring
  DATADOG_API_KEY: z.string().optional(),
  LOGTAIL_TOKEN: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  SENTRY_RELEASE: z.string().optional(),
  SERVER_NAME: z.string().optional(),
});

// Validate environment variables
const env = envSchema.parse(process.env);

// Configuration object
export const config = {
  app: {
    name: env.APP_NAME,
    environment: env.NODE_ENV,
    url: env.APP_URL,
    developmentMode: env.DEVELOPMENT_MODE,
    enableApiDocs: env.ENABLE_API_DOCS,
  },

  server: {
    port: env.PORT,
    apiVersion: env.API_VERSION,
  },

  database: {
    url: env.DATABASE_URL,
    host: env.DB_HOST,
    port: env.DB_PORT,
    name: env.DB_NAME,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
  },

  redis: {
    url: env.REDIS_URL || `redis://${env.REDIS_HOST}:${env.REDIS_PORT}`,
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD,
  },

  rabbitmq: {
    url: env.RABBITMQ_URL,
    user: env.RABBITMQ_USER,
    password: env.RABBITMQ_PASSWORD,
  },

  security: {
    jwt: {
      secret: env.JWT_SECRET,
      expiresIn: env.JWT_EXPIRES_IN,
      refreshSecret: env.JWT_REFRESH_SECRET,
      refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
    },
    bcrypt: {
      saltRounds: env.BCRYPT_SALT_ROUNDS,
    },
  },

  storage: {
    provider: env.STORAGE_PROVIDER,
    vercelBlob: {
      token: env.BLOB_READ_WRITE_TOKEN,
    },
    cloudflareR2: {
      endpoint: env.CLOUDFLARE_R2_ENDPOINT,
      accessKey: env.CLOUDFLARE_R2_ACCESS_KEY,
      secretKey: env.CLOUDFLARE_R2_SECRET_KEY,
      bucket: env.CLOUDFLARE_R2_BUCKET,
      publicUrl: env.CLOUDFLARE_R2_PUBLIC_URL,
    },
    awsS3: {
      region: env.AWS_S3_REGION,
      accessKey: env.AWS_S3_ACCESS_KEY,
      secretKey: env.AWS_S3_SECRET_KEY,
      bucket: env.AWS_S3_BUCKET,
    },
    digitalOcean: {
      endpoint: env.DO_SPACES_ENDPOINT || 'nyc3.digitaloceanspaces.com',
      region: env.DO_SPACES_REGION || 'nyc3',
      bucket: env.DO_SPACES_BUCKET || 'doramaflix-storage',
      accessKey: env.DO_SPACES_ACCESS_KEY || '',
      secretKey: env.DO_SPACES_SECRET_KEY || '',
      cdnUrl: env.DO_SPACES_CDN_URL || '',
    },
  },

  payments: {
    stripe: {
      publishableKey: env.STRIPE_PUBLISHABLE_KEY,
      secretKey: env.STRIPE_SECRET_KEY,
      webhookSecret: env.STRIPE_WEBHOOK_SECRET,
    },
    mercadoPago: {
      accessToken: env.MERCADOPAGO_ACCESS_TOKEN,
      publicKey: env.MERCADOPAGO_PUBLIC_KEY,
    },
  },

  email: {
    smtp: {
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      user: env.SMTP_USER,
      password: env.SMTP_PASSWORD,
    },
    from: env.EMAIL_FROM,
  },

  cors: {
    enabled: env.ENABLE_CORS,
    origins: env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim()),
  },

  monitoring: {
    datadog: {
      apiKey: env.DATADOG_API_KEY,
    },
    logtail: {
      token: env.LOGTAIL_TOKEN,
    },
    sentry: {
      dsn: env.SENTRY_DSN,
      release: env.SENTRY_RELEASE,
      serverName: env.SERVER_NAME,
    },
  },

  // Rate limiting configuration
  rateLimiting: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: env.NODE_ENV === 'production' ? 100 : 1000, // requests per window
    standardHeaders: true,
    legacyHeaders: false,
  },

  // File upload configuration
  fileUpload: {
    maxFileSize: 100 * 1024 * 1024, // 100MB
    allowedVideoTypes: [
      'video/mp4',
      'video/webm',
      'video/ogg',
      'video/avi',
      'video/mov',
      'video/wmv',
      'video/flv',
      'video/mkv',
    ],
    allowedImageTypes: [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
    ],
    allowedDocumentTypes: [
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
  },

  // Video processing configuration
  video: {
    qualities: ['480p', '720p', '1080p', '1440p', '2160p'],
    defaultQuality: '1080p',
    thumbnailTimestamp: '00:00:10',
    chunkSize: 1024 * 1024, // 1MB chunks for streaming
  },

  // Cache configuration
  cache: {
    ttl: {
      short: 5 * 60, // 5 minutes
      medium: 30 * 60, // 30 minutes
      long: 60 * 60, // 1 hour
      veryLong: 24 * 60 * 60, // 24 hours
    },
    keys: {
      user: (id: string) => `user:${id}`,
      course: (id: string) => `course:${id}`,
      episode: (id: string) => `episode:${id}`,
      category: (id: string) => `category:${id}`,
      popularCourses: 'popular_courses',
      featuredCourses: 'featured_courses',
    },
  },

  // Pagination defaults
  pagination: {
    defaultPage: 1,
    defaultLimit: 20,
    maxLimit: 100,
  },
} as const;

export type Config = typeof config;

// Export environment configuration for easy access
export const environment = {
  NODE_ENV: env.NODE_ENV,
  SENTRY_DSN: env.SENTRY_DSN,
  SERVER_NAME: env.SERVER_NAME,
};