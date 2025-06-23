/**
 * User Repository Interface
 * Contract for user data access
 */

import { UserEntity, CreateUserData, UpdateUserData, UserRole, UserStatus } from '../entities/user.entity';

export interface UserRepository {
  create(data: CreateUserData): Promise<UserEntity>;
  findById(id: string): Promise<UserEntity | null>;
  findByEmail(email: string): Promise<UserEntity | null>;
  update(id: string, data: UpdateUserData): Promise<UserEntity>;
  delete(id: string): Promise<void>;
  findMany(filters?: UserFilters): Promise<UserEntity[]>;
  count(filters?: UserFilters): Promise<number>;
  updateLastLogin(id: string): Promise<void>;
  verifyEmail(id: string): Promise<void>;
  updatePassword(id: string, passwordHash: string): Promise<void>;
}

export interface UserFilters {
  role?: UserRole;
  status?: UserStatus;
  emailVerified?: boolean;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}