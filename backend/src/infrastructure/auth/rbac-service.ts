/**
 * Role-Based Access Control (RBAC) Service
 * Handles permissions, roles, and access control for the application
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '@/shared/utils/logger';

export interface Permission {
  id: string;
  name: string;
  description?: string;
  resource: string;
  action: string;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  isSystem: boolean;
  permissions: Permission[];
}

export interface UserPermissions {
  userId: string;
  role: string;
  subscriptionTier: string;
  directPermissions: Permission[];
  rolePermissions: Permission[];
  allPermissions: Permission[];
}

export class RBACService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Initialize default permissions and roles
   */
  async initializeDefaultPermissions(): Promise<void> {
    const defaultPermissions = [
      // Content Management
      { name: 'content.view', resource: 'content', action: 'view', description: 'View content' },
      { name: 'content.create', resource: 'content', action: 'create', description: 'Create content' },
      { name: 'content.edit', resource: 'content', action: 'edit', description: 'Edit content' },
      { name: 'content.delete', resource: 'content', action: 'delete', description: 'Delete content' },
      { name: 'content.publish', resource: 'content', action: 'publish', description: 'Publish content' },

      // User Management
      { name: 'users.view', resource: 'users', action: 'view', description: 'View users' },
      { name: 'users.create', resource: 'users', action: 'create', description: 'Create users' },
      { name: 'users.edit', resource: 'users', action: 'edit', description: 'Edit users' },
      { name: 'users.delete', resource: 'users', action: 'delete', description: 'Delete users' },
      { name: 'users.manage_roles', resource: 'users', action: 'manage_roles', description: 'Manage user roles' },

      // Profile Management
      { name: 'profiles.view', resource: 'profiles', action: 'view', description: 'View profiles' },
      { name: 'profiles.create', resource: 'profiles', action: 'create', description: 'Create profiles' },
      { name: 'profiles.edit', resource: 'profiles', action: 'edit', description: 'Edit profiles' },
      { name: 'profiles.delete', resource: 'profiles', action: 'delete', description: 'Delete profiles' },

      // Subscription Management
      { name: 'subscriptions.view', resource: 'subscriptions', action: 'view', description: 'View subscriptions' },
      { name: 'subscriptions.manage', resource: 'subscriptions', action: 'manage', description: 'Manage subscriptions' },
      { name: 'subscriptions.cancel', resource: 'subscriptions', action: 'cancel', description: 'Cancel subscriptions' },

      // Analytics & Reports
      { name: 'analytics.view', resource: 'analytics', action: 'view', description: 'View analytics' },
      { name: 'reports.generate', resource: 'reports', action: 'generate', description: 'Generate reports' },

      // System Administration
      { name: 'system.configure', resource: 'system', action: 'configure', description: 'Configure system settings' },
      { name: 'system.backup', resource: 'system', action: 'backup', description: 'Backup system data' },
      { name: 'system.logs', resource: 'system', action: 'logs', description: 'View system logs' },

      // File Upload
      { name: 'files.upload', resource: 'files', action: 'upload', description: 'Upload files' },
      { name: 'files.manage', resource: 'files', action: 'manage', description: 'Manage files' },

      // Comments & Reviews
      { name: 'comments.view', resource: 'comments', action: 'view', description: 'View comments' },
      { name: 'comments.create', resource: 'comments', action: 'create', description: 'Create comments' },
      { name: 'comments.moderate', resource: 'comments', action: 'moderate', description: 'Moderate comments' },

      // Premium Content
      { name: 'premium.access', resource: 'premium', action: 'access', description: 'Access premium content' },
      { name: 'premium.download', resource: 'premium', action: 'download', description: 'Download premium content' },
    ];

    // Create permissions
    for (const permData of defaultPermissions) {
      await this.prisma.permission.upsert({
        where: { resource_action: { resource: permData.resource, action: permData.action } },
        update: {},
        create: permData,
      });
    }

    // Define default roles
    const defaultRoles = [
      {
        name: 'admin',
        description: 'System administrator with full access',
        isSystem: true,
        permissions: defaultPermissions.map(p => `${p.resource}.${p.action}`),
      },
      {
        name: 'manager',
        description: 'Content manager with content and user management access',
        isSystem: true,
        permissions: [
          'content.view', 'content.create', 'content.edit', 'content.publish',
          'users.view', 'users.edit',
          'profiles.view', 'profiles.create', 'profiles.edit',
          'analytics.view', 'reports.generate',
          'files.upload', 'files.manage',
          'comments.view', 'comments.moderate',
        ],
      },
      {
        name: 'premium_user',
        description: 'Premium user with advanced features',
        isSystem: true,
        permissions: [
          'content.view',
          'profiles.view', 'profiles.create', 'profiles.edit', 'profiles.delete',
          'comments.view', 'comments.create',
          'premium.access', 'premium.download',
          'files.upload',
        ],
      },
      {
        name: 'basic_user',
        description: 'Basic user with standard access',
        isSystem: true,
        permissions: [
          'content.view',
          'profiles.view', 'profiles.create', 'profiles.edit',
          'comments.view', 'comments.create',
        ],
      },
    ];

    // Create roles and assign permissions
    for (const roleData of defaultRoles) {
      const role = await this.prisma.role.upsert({
        where: { name: roleData.name },
        update: {},
        create: {
          name: roleData.name,
          description: roleData.description,
          isSystem: roleData.isSystem,
        },
      });

      // Get permissions and create role-permission relationships
      for (const permissionName of roleData.permissions) {
        const [resource, action] = permissionName.split('.');
        const permission = await this.prisma.permission.findUnique({
          where: { resource_action: { resource, action } },
        });

        if (permission) {
          await this.prisma.rolePermission.upsert({
            where: {
              roleId_permissionId: {
                roleId: role.id,
                permissionId: permission.id,
              },
            },
            update: {},
            create: {
              roleId: role.id,
              permissionId: permission.id,
            },
          });
        }
      }
    }

    logger.info('Default permissions and roles initialized');
  }

  /**
   * Check if user has specific permission
   */
  async hasPermission(
    userId: string,
    resource: string,
    action: string
  ): Promise<boolean> {
    const userPermissions = await this.getUserPermissions(userId);
    
    return userPermissions.allPermissions.some(
      permission => permission.resource === resource && permission.action === action
    );
  }

  /**
   * Check if user has any of the specified permissions
   */
  async hasAnyPermission(
    userId: string,
    permissions: Array<{ resource: string; action: string }>
  ): Promise<boolean> {
    for (const { resource, action } of permissions) {
      if (await this.hasPermission(userId, resource, action)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if user has all specified permissions
   */
  async hasAllPermissions(
    userId: string,
    permissions: Array<{ resource: string; action: string }>
  ): Promise<boolean> {
    for (const { resource, action } of permissions) {
      if (!(await this.hasPermission(userId, resource, action))) {
        return false;
      }
    }
    return true;
  }

  /**
   * Get all permissions for a user
   */
  async getUserPermissions(userId: string): Promise<UserPermissions> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        subscriptionTier: true,
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Get direct permissions
    const directPermissions = user.permissions.map(up => up.permission);

    // Get role-based permissions
    const rolePermissions = await this.getRolePermissions(user.role);

    // Combine all permissions and remove duplicates
    const allPermissions = this.deduplicatePermissions([
      ...directPermissions,
      ...rolePermissions,
    ]);

    return {
      userId,
      role: user.role,
      subscriptionTier: user.subscriptionTier,
      directPermissions,
      rolePermissions,
      allPermissions,
    };
  }

  /**
   * Get permissions for a role
   */
  async getRolePermissions(roleName: string): Promise<Permission[]> {
    const role = await this.prisma.role.findUnique({
      where: { name: roleName },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!role) {
      return [];
    }

    return role.permissions.map(rp => rp.permission);
  }

  /**
   * Grant permission to user
   */
  async grantPermissionToUser(
    userId: string,
    resource: string,
    action: string
  ): Promise<void> {
    const permission = await this.prisma.permission.findUnique({
      where: { resource_action: { resource, action } },
    });

    if (!permission) {
      throw new Error('Permission not found');
    }

    await this.prisma.userPermission.upsert({
      where: {
        userId_permissionId: {
          userId,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        userId,
        permissionId: permission.id,
      },
    });

    logger.info('Permission granted to user', { userId, resource, action });
  }

  /**
   * Revoke permission from user
   */
  async revokePermissionFromUser(
    userId: string,
    resource: string,
    action: string
  ): Promise<void> {
    const permission = await this.prisma.permission.findUnique({
      where: { resource_action: { resource, action } },
    });

    if (!permission) {
      throw new Error('Permission not found');
    }

    await this.prisma.userPermission.deleteMany({
      where: {
        userId,
        permissionId: permission.id,
      },
    });

    logger.info('Permission revoked from user', { userId, resource, action });
  }

  /**
   * Create custom role
   */
  async createRole(
    name: string,
    description: string,
    permissionNames: string[]
  ): Promise<Role> {
    const role = await this.prisma.role.create({
      data: {
        name,
        description,
        isSystem: false,
      },
    });

    // Assign permissions to role
    for (const permissionName of permissionNames) {
      const [resource, action] = permissionName.split('.');
      const permission = await this.prisma.permission.findUnique({
        where: { resource_action: { resource, action } },
      });

      if (permission) {
        await this.prisma.rolePermission.create({
          data: {
            roleId: role.id,
            permissionId: permission.id,
          },
        });
      }
    }

    logger.info('Custom role created', { roleName: name, permissions: permissionNames });

    return this.getRoleById(role.id);
  }

  /**
   * Update role permissions
   */
  async updateRolePermissions(
    roleId: string,
    permissionNames: string[]
  ): Promise<void> {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new Error('Role not found');
    }

    if (role.isSystem) {
      throw new Error('Cannot modify system roles');
    }

    // Remove all existing permissions
    await this.prisma.rolePermission.deleteMany({
      where: { roleId },
    });

    // Add new permissions
    for (const permissionName of permissionNames) {
      const [resource, action] = permissionName.split('.');
      const permission = await this.prisma.permission.findUnique({
        where: { resource_action: { resource, action } },
      });

      if (permission) {
        await this.prisma.rolePermission.create({
          data: {
            roleId,
            permissionId: permission.id,
          },
        });
      }
    }

    logger.info('Role permissions updated', { roleId, permissions: permissionNames });
  }

  /**
   * Delete custom role
   */
  async deleteRole(roleId: string): Promise<void> {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new Error('Role not found');
    }

    if (role.isSystem) {
      throw new Error('Cannot delete system roles');
    }

    // Check if any users have this role
    const usersWithRole = await this.prisma.user.count({
      where: { role: role.name },
    });

    if (usersWithRole > 0) {
      throw new Error('Cannot delete role that is assigned to users');
    }

    await this.prisma.role.delete({
      where: { id: roleId },
    });

    logger.info('Custom role deleted', { roleId, roleName: role.name });
  }

  /**
   * Get role by ID
   */
  async getRoleById(roleId: string): Promise<Role> {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!role) {
      throw new Error('Role not found');
    }

    return {
      id: role.id,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      permissions: role.permissions.map(rp => rp.permission),
    };
  }

  /**
   * Get all roles
   */
  async getAllRoles(): Promise<Role[]> {
    const roles = await this.prisma.role.findMany({
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    return roles.map(role => ({
      id: role.id,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      permissions: role.permissions.map(rp => rp.permission),
    }));
  }

  /**
   * Get all permissions
   */
  async getAllPermissions(): Promise<Permission[]> {
    return this.prisma.permission.findMany();
  }

  /**
   * Check subscription tier access
   */
  async hasSubscriptionAccess(
    userId: string,
    requiredTier: 'free' | 'premium' | 'ultra'
  ): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionTier: true },
    });

    if (!user) {
      return false;
    }

    const tierHierarchy = { free: 0, premium: 1, ultra: 2 };
    const userTierLevel = tierHierarchy[user.subscriptionTier as keyof typeof tierHierarchy];
    const requiredTierLevel = tierHierarchy[requiredTier];

    return userTierLevel >= requiredTierLevel;
  }

  // Private helper methods
  private deduplicatePermissions(permissions: Permission[]): Permission[] {
    const seen = new Set<string>();
    return permissions.filter(permission => {
      const key = `${permission.resource}.${permission.action}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Get RBAC statistics
   */
  async getRBACStats(): Promise<{
    totalRoles: number;
    customRoles: number;
    totalPermissions: number;
    usersWithDirectPermissions: number;
  }> {
    const [totalRoles, customRoles, totalPermissions, usersWithDirectPermissions] = await Promise.all([
      this.prisma.role.count(),
      this.prisma.role.count({ where: { isSystem: false } }),
      this.prisma.permission.count(),
      this.prisma.userPermission.groupBy({
        by: ['userId'],
        _count: { userId: true },
      }).then(result => result.length),
    ]);

    return {
      totalRoles,
      customRoles,
      totalPermissions,
      usersWithDirectPermissions,
    };
  }
}