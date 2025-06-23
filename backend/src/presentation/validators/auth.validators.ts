/**
 * Authentication Validation Schemas
 * Zod schemas for auth endpoint validation
 */

import { z } from 'zod';

// Password validation
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .regex(/(?=.*[a-z])/, 'Password must contain at least one lowercase letter')
  .regex(/(?=.*[A-Z])/, 'Password must contain at least one uppercase letter')
  .regex(/(?=.*\d)/, 'Password must contain at least one number')
  .regex(/(?=.*[@$!%*?&])/, 'Password must contain at least one special character');

// Email validation
const emailSchema = z
  .string()
  .email('Invalid email format')
  .max(255, 'Email must not exceed 255 characters');

// Name validation
const nameSchema = z
  .string()
  .min(2, 'Name must be at least 2 characters long')
  .max(100, 'Name must not exceed 100 characters')
  .regex(/^[a-zA-ZÀ-ÿ\s]*$/, 'Name can only contain letters and spaces');

export const authValidationSchemas = {
  // POST /auth/register
  register: z.object({
    email: emailSchema,
    password: passwordSchema,
    firstName: nameSchema,
    lastName: nameSchema,
  }),

  // POST /auth/login
  login: z.object({
    email: emailSchema,
    password: z.string().min(1, 'Password is required'),
  }),

  // POST /auth/refresh
  refreshToken: z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
  }),

  // POST /auth/change-password
  changePassword: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordSchema,
  }),

  // POST /auth/forgot-password
  forgotPassword: z.object({
    email: emailSchema,
  }),

  // POST /auth/reset-password
  resetPassword: z.object({
    token: z.string().min(1, 'Reset token is required'),
    newPassword: passwordSchema,
  }),

  // POST /auth/verify-email
  verifyEmail: z.object({
    token: z.string().min(1, 'Verification token is required'),
  }),
};