/**
 * User Repository Implementation
 * PostgreSQL implementation using Prisma
 */

import { UserRepository, UserFilters } from '@/domain/repositories/user.repository';
import { UserEntity, CreateUserData, UpdateUserData } from '@/domain/entities/user.entity';
import { DatabaseConnection } from '@/infrastructure/database/connection';
import { logger, loggerHelpers } from '@/shared/utils/logger';

export class UserRepositoryImpl implements UserRepository {
  private get prisma() {
    return DatabaseConnection.getInstance();
  }

  async create(data: CreateUserData): Promise<UserEntity> {
    try {
      const user = await this.prisma.user.create({
        data: {
          email: data.email,
          passwordHash: data.password,
          firstName: data.firstName,
          lastName: data.lastName,
          role: data.role || 'student',
        },
      });

      loggerHelpers.logDatabase('create', 'users');
      return this.mapToEntity(user);
    } catch (error) {
      loggerHelpers.logDatabase('create', 'users', undefined, error as Error);
      throw error;
    }
  }

  async findById(id: string): Promise<UserEntity | null> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id },
      });

      loggerHelpers.logDatabase('findById', 'users');
      return user ? this.mapToEntity(user) : null;
    } catch (error) {
      loggerHelpers.logDatabase('findById', 'users', undefined, error as Error);
      throw error;
    }
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { email },
      });

      loggerHelpers.logDatabase('findByEmail', 'users');
      return user ? this.mapToEntity(user) : null;
    } catch (error) {
      loggerHelpers.logDatabase('findByEmail', 'users', undefined, error as Error);
      throw error;
    }
  }

  async update(id: string, data: UpdateUserData): Promise<UserEntity> {
    try {
      const user = await this.prisma.user.update({
        where: { id },
        data,
      });

      loggerHelpers.logDatabase('update', 'users');
      return this.mapToEntity(user);
    } catch (error) {
      loggerHelpers.logDatabase('update', 'users', undefined, error as Error);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.user.delete({
        where: { id },
      });

      loggerHelpers.logDatabase('delete', 'users');
    } catch (error) {
      loggerHelpers.logDatabase('delete', 'users', undefined, error as Error);
      throw error;
    }
  }

  async findMany(filters?: UserFilters): Promise<UserEntity[]> {
    try {
      const where: any = {};
      
      if (filters?.role) where.role = filters.role;
      if (filters?.status) where.status = filters.status;
      if (filters?.emailVerified !== undefined) where.emailVerified = filters.emailVerified;
      if (filters?.search) {
        where.OR = [
          { firstName: { contains: filters.search, mode: 'insensitive' } },
          { lastName: { contains: filters.search, mode: 'insensitive' } },
          { email: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      const users = await this.prisma.user.findMany({
        where,
        skip: filters?.page && filters?.limit ? (filters.page - 1) * filters.limit : undefined,
        take: filters?.limit,
        orderBy: filters?.sortBy ? { [filters.sortBy]: filters.sortOrder || 'asc' } : { createdAt: 'desc' },
      });

      loggerHelpers.logDatabase('findMany', 'users');
      return users.map(this.mapToEntity);
    } catch (error) {
      loggerHelpers.logDatabase('findMany', 'users', undefined, error as Error);
      throw error;
    }
  }

  async count(filters?: UserFilters): Promise<number> {
    try {
      const where: any = {};
      
      if (filters?.role) where.role = filters.role;
      if (filters?.status) where.status = filters.status;
      if (filters?.emailVerified !== undefined) where.emailVerified = filters.emailVerified;
      if (filters?.search) {
        where.OR = [
          { firstName: { contains: filters.search, mode: 'insensitive' } },
          { lastName: { contains: filters.search, mode: 'insensitive' } },
          { email: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      const count = await this.prisma.user.count({ where });
      
      loggerHelpers.logDatabase('count', 'users');
      return count;
    } catch (error) {
      loggerHelpers.logDatabase('count', 'users', undefined, error as Error);
      throw error;
    }
  }

  async updateLastLogin(id: string): Promise<void> {
    try {
      await this.prisma.user.update({
        where: { id },
        data: { lastLoginAt: new Date() },
      });

      loggerHelpers.logDatabase('updateLastLogin', 'users');
    } catch (error) {
      loggerHelpers.logDatabase('updateLastLogin', 'users', undefined, error as Error);
      throw error;
    }
  }

  async verifyEmail(id: string): Promise<void> {
    try {
      await this.prisma.user.update({
        where: { id },
        data: { 
          emailVerified: true,
          emailVerifiedAt: new Date(),
        },
      });

      loggerHelpers.logDatabase('verifyEmail', 'users');
    } catch (error) {
      loggerHelpers.logDatabase('verifyEmail', 'users', undefined, error as Error);
      throw error;
    }
  }

  async updatePassword(id: string, passwordHash: string): Promise<void> {
    try {
      await this.prisma.user.update({
        where: { id },
        data: { passwordHash },
      });

      loggerHelpers.logDatabase('updatePassword', 'users');
    } catch (error) {
      loggerHelpers.logDatabase('updatePassword', 'users', undefined, error as Error);
      throw error;
    }
  }

  private mapToEntity(user: any): UserEntity {
    return {
      id: user.id,
      email: user.email,
      passwordHash: user.passwordHash,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      role: user.role,
      status: user.status,
      emailVerified: user.emailVerified,
      emailVerifiedAt: user.emailVerifiedAt,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}