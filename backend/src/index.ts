/**
 * DoramaFlix Backend API
 * Main application entry point
 */

import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { config } from '@/shared/config/environment';
import { logger } from '@/shared/utils/logger';
import { errorHandler } from '@/application/middlewares/error-handler';
import { notFoundHandler } from '@/application/middlewares/not-found-handler';
import { rateLimiter } from '@/application/middlewares/rate-limiter';
import { requestLogger } from '@/application/middlewares/request-logger';
import { apiRoutes } from '@/presentation/routes';
import { DatabaseConnection } from '@/infrastructure/database/connection';
import { RedisConnection } from '@/infrastructure/cache/redis-connection';

class Application {
  public app: express.Application;
  private readonly port: number;

  constructor() {
    this.app = express();
    this.port = config.server.port;
    this.initializeDatabase();
    this.initializeRedis();
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private async initializeDatabase(): Promise<void> {
    try {
      await DatabaseConnection.connect();
      logger.info('Database connected successfully');
    } catch (error) {
      logger.error('Failed to connect to database:', error);
      process.exit(1);
    }
  }

  private async initializeRedis(): Promise<void> {
    try {
      await RedisConnection.connect();
      logger.info('Redis connected successfully');
    } catch (error) {
      logger.warn('Redis connection failed (optional service):', error);
    }
  }

  private initializeMiddlewares(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          mediaSrc: ["'self'", "https:"],
        },
      },
      crossOriginEmbedderPolicy: false,
    }));

    // CORS configuration
    this.app.use(cors({
      origin: config.cors.origins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    }));

    // Compression
    this.app.use(compression());

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    this.app.use(cookieParser());

    // Logging
    if (config.app.environment !== 'test') {
      this.app.use(morgan('combined', {
        stream: {
          write: (message: string) => logger.info(message.trim())
        }
      }));
    }

    // Rate limiting
    this.app.use('/api', rateLimiter);

    // Request logging middleware
    this.app.use(requestLogger);

    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
        environment: config.app.environment,
      });
    });

    // API documentation redirect
    if (config.app.enableApiDocs) {
      this.app.get('/docs', (req, res) => {
        res.redirect('/api/v1/docs');
      });
    }
  }

  private initializeRoutes(): void {
    // API routes
    this.app.use('/api', apiRoutes);

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        message: 'DoramaFlix API Server',
        version: '1.0.0',
        documentation: config.app.enableApiDocs ? '/docs' : 'Contact administrator',
        health: '/health',
      });
    });
  }

  private initializeErrorHandling(): void {
    // 404 handler
    this.app.use(notFoundHandler);

    // Global error handler
    this.app.use(errorHandler);
  }

  public async start(): Promise<void> {
    return new Promise((resolve) => {
      const server = this.app.listen(this.port, () => {
        logger.info(`🚀 DoramaFlix API Server started on port ${this.port}`);
        logger.info(`🌍 Environment: ${config.app.environment}`);
        logger.info(`📖 API Documentation: ${config.app.enableApiDocs ? `http://localhost:${this.port}/docs` : 'Disabled'}`);
        logger.info(`💚 Health Check: http://localhost:${this.port}/health`);
        resolve();
      });

      // Graceful shutdown
      const gracefulShutdown = async (signal: string) => {
        logger.info(`Received ${signal}. Shutting down gracefully...`);
        
        server.close(async () => {
          try {
            await DatabaseConnection.disconnect();
            await RedisConnection.disconnect();
            logger.info('Server shut down gracefully');
            process.exit(0);
          } catch (error) {
            logger.error('Error during shutdown:', error);
            process.exit(1);
          }
        });

        // Force shutdown after 30 seconds
        setTimeout(() => {
          logger.error('Could not close connections in time, forcefully shutting down');
          process.exit(1);
        }, 30000);
      };

      process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
      process.on('SIGINT', () => gracefulShutdown('SIGINT'));

      // Handle unhandled promise rejections
      process.on('unhandledRejection', (reason, promise) => {
        logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      });

      // Handle uncaught exceptions
      process.on('uncaughtException', (error) => {
        logger.error('Uncaught Exception:', error);
        process.exit(1);
      });
    });
  }
}

// Start the application
if (require.main === module) {
  const app = new Application();
  app.start().catch((error) => {
    logger.error('Failed to start server:', error);
    process.exit(1);
  });
}

export { Application };