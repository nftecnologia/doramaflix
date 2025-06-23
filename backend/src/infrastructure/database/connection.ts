/**
 * Database Connection
 * Manages PostgreSQL connection using Prisma
 */

import { PrismaClient } from '@prisma/client';
import { config } from '@/shared/config/environment';
import { logger } from '@/shared/utils/logger';

class DatabaseConnection {
  private static instance: PrismaClient | null = null;
  private static isConnected: boolean = false;

  static async connect(): Promise<PrismaClient> {
    if (this.instance && this.isConnected) {
      return this.instance;
    }

    try {
      this.instance = new PrismaClient({
        datasources: {
          db: {
            url: config.database.url,
          },
        },
        log: [
          { level: 'query', emit: 'event' },
          { level: 'error', emit: 'event' },
          { level: 'info', emit: 'event' },
          { level: 'warn', emit: 'event' },
        ],
        errorFormat: 'colorless',
      });

      // Add event listeners for logging
      this.instance.$on('query', (e) => {
        if (config.app.environment === 'development') {
          logger.debug('Database Query', {
            query: e.query,
            params: e.params,
            duration: `${e.duration}ms`,
          });
        }
      });

      this.instance.$on('error', (e) => {
        logger.error('Database Error', {
          message: e.message,
          target: e.target,
        });
      });

      this.instance.$on('info', (e) => {
        logger.info('Database Info', {
          message: e.message,
          target: e.target,
        });
      });

      this.instance.$on('warn', (e) => {
        logger.warn('Database Warning', {
          message: e.message,
          target: e.target,
        });
      });

      // Test the connection
      await this.instance.$connect();
      this.isConnected = true;

      logger.info('Database connected successfully', {
        host: config.database.host,
        port: config.database.port,
        database: config.database.name,
      });

      return this.instance;
    } catch (error) {
      logger.error('Failed to connect to database', {
        error: error instanceof Error ? error.message : error,
        host: config.database.host,
        port: config.database.port,
        database: config.database.name,
      });
      throw error;
    }
  }

  static async disconnect(): Promise<void> {
    if (this.instance) {
      await this.instance.$disconnect();
      this.instance = null;
      this.isConnected = false;
      logger.info('Database disconnected');
    }
  }

  static getInstance(): PrismaClient {
    if (!this.instance) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.instance;
  }

  static isConnectionHealthy(): boolean {
    return this.isConnected && this.instance !== null;
  }

  static async healthCheck(): Promise<boolean> {
    if (!this.instance || !this.isConnected) {
      return false;
    }

    try {
      await this.instance.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      logger.error('Database health check failed', { error });
      return false;
    }
  }
}

export { DatabaseConnection };