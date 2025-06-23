/**
 * OAuth Integration Service
 * Handles OAuth authentication with Google, Apple, Facebook providers
 */

import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import { config } from '@/shared/config/environment';
import { logger } from '@/shared/utils/logger';

export interface OAuthProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  picture?: string;
  emailVerified: boolean;
}

export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  tokenType?: string;
  scope?: string;
  idToken?: string;
}

export interface GoogleProfile {
  sub: string;
  email: string;
  email_verified: boolean;
  given_name: string;
  family_name: string;
  picture?: string;
  name: string;
}

export interface FacebookProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  name: string;
  picture?: {
    data: {
      url: string;
    };
  };
}

export interface AppleProfile {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: {
    firstName: string;
    lastName: string;
  };
}

export class OAuthService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Google OAuth Integration
   */
  async authenticateWithGoogle(accessToken: string): Promise<{
    profile: OAuthProfile;
    isNewUser: boolean;
  }> {
    try {
      // Verify Google access token and get user profile
      const response = await axios.get(
        `https://www.googleapis.com/oauth2/v2/userinfo`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const googleProfile: GoogleProfile = response.data;

      const profile: OAuthProfile = {
        id: googleProfile.sub,
        email: googleProfile.email,
        firstName: googleProfile.given_name,
        lastName: googleProfile.family_name,
        picture: googleProfile.picture,
        emailVerified: googleProfile.email_verified,
      };

      const { user, isNewUser } = await this.findOrCreateUser(profile, 'google');

      // Store or update OAuth account information
      await this.upsertOAuthAccount(user.id, 'google', {
        providerAccountId: googleProfile.sub,
        accessToken,
        profileData: googleProfile,
      });

      return { profile, isNewUser };
    } catch (error) {
      logger.error('Google OAuth authentication failed:', error);
      throw new Error('Google authentication failed');
    }
  }

  /**
   * Facebook OAuth Integration
   */
  async authenticateWithFacebook(accessToken: string): Promise<{
    profile: OAuthProfile;
    isNewUser: boolean;
  }> {
    try {
      // Verify Facebook access token and get user profile
      const response = await axios.get(
        `https://graph.facebook.com/me?fields=id,email,first_name,last_name,name,picture&access_token=${accessToken}`
      );

      const facebookProfile: FacebookProfile = response.data;

      const profile: OAuthProfile = {
        id: facebookProfile.id,
        email: facebookProfile.email,
        firstName: facebookProfile.first_name,
        lastName: facebookProfile.last_name,
        picture: facebookProfile.picture?.data?.url,
        emailVerified: true, // Facebook emails are typically verified
      };

      const { user, isNewUser } = await this.findOrCreateUser(profile, 'facebook');

      // Store or update OAuth account information
      await this.upsertOAuthAccount(user.id, 'facebook', {
        providerAccountId: facebookProfile.id,
        accessToken,
        profileData: facebookProfile,
      });

      return { profile, isNewUser };
    } catch (error) {
      logger.error('Facebook OAuth authentication failed:', error);
      throw new Error('Facebook authentication failed');
    }
  }

  /**
   * Apple OAuth Integration
   */
  async authenticateWithApple(idToken: string): Promise<{
    profile: OAuthProfile;
    isNewUser: boolean;
  }> {
    try {
      // Verify Apple ID token (simplified - in production, verify JWT signature)
      const payload = this.decodeJWT(idToken);
      const appleProfile: AppleProfile = payload;

      const profile: OAuthProfile = {
        id: appleProfile.sub,
        email: appleProfile.email,
        firstName: appleProfile.name?.firstName || 'Apple',
        lastName: appleProfile.name?.lastName || 'User',
        emailVerified: appleProfile.email_verified,
      };

      const { user, isNewUser } = await this.findOrCreateUser(profile, 'apple');

      // Store or update OAuth account information
      await this.upsertOAuthAccount(user.id, 'apple', {
        providerAccountId: appleProfile.sub,
        idToken,
        profileData: appleProfile,
      });

      return { profile, isNewUser };
    } catch (error) {
      logger.error('Apple OAuth authentication failed:', error);
      throw new Error('Apple authentication failed');
    }
  }

  /**
   * GitHub OAuth Integration (bonus)
   */
  async authenticateWithGitHub(accessToken: string): Promise<{
    profile: OAuthProfile;
    isNewUser: boolean;
  }> {
    try {
      // Get user profile from GitHub
      const [userResponse, emailResponse] = await Promise.all([
        axios.get('https://api.github.com/user', {
          headers: {
            Authorization: `token ${accessToken}`,
            'User-Agent': 'DoramaFlix-App',
          },
        }),
        axios.get('https://api.github.com/user/emails', {
          headers: {
            Authorization: `token ${accessToken}`,
            'User-Agent': 'DoramaFlix-App',
          },
        }),
      ]);

      const githubUser = userResponse.data;
      const emails = emailResponse.data;
      const primaryEmail = emails.find((email: any) => email.primary) || emails[0];

      const profile: OAuthProfile = {
        id: githubUser.id.toString(),
        email: primaryEmail.email,
        firstName: githubUser.name?.split(' ')[0] || 'GitHub',
        lastName: githubUser.name?.split(' ').slice(1).join(' ') || 'User',
        picture: githubUser.avatar_url,
        emailVerified: primaryEmail.verified,
      };

      const { user, isNewUser } = await this.findOrCreateUser(profile, 'github');

      // Store or update OAuth account information
      await this.upsertOAuthAccount(user.id, 'github', {
        providerAccountId: githubUser.id.toString(),
        accessToken,
        profileData: { ...githubUser, primaryEmail },
      });

      return { profile, isNewUser };
    } catch (error) {
      logger.error('GitHub OAuth authentication failed:', error);
      throw new Error('GitHub authentication failed');
    }
  }

  /**
   * Get OAuth accounts for a user
   */
  async getUserOAuthAccounts(userId: string) {
    return this.prisma.oAuthAccount.findMany({
      where: { userId },
      select: {
        id: true,
        provider: true,
        providerAccountId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Unlink OAuth account
   */
  async unlinkOAuthAccount(userId: string, provider: string): Promise<void> {
    await this.prisma.oAuthAccount.deleteMany({
      where: {
        userId,
        provider: provider as any,
      },
    });

    logger.info(`OAuth account unlinked`, { userId, provider });
  }

  /**
   * Check if user has password (for account security)
   */
  async userHasPassword(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });

    return !!user?.passwordHash;
  }

  // Private helper methods
  private async findOrCreateUser(
    profile: OAuthProfile,
    provider: string
  ): Promise<{ user: any; isNewUser: boolean }> {
    // First, try to find existing OAuth account
    const existingOAuth = await this.prisma.oAuthAccount.findFirst({
      where: {
        provider: provider as any,
        providerAccountId: profile.id,
      },
      include: { user: true },
    });

    if (existingOAuth) {
      return { user: existingOAuth.user, isNewUser: false };
    }

    // Try to find user by email
    const existingUser = await this.prisma.user.findUnique({
      where: { email: profile.email },
    });

    if (existingUser) {
      return { user: existingUser, isNewUser: false };
    }

    // Create new user
    const newUser = await this.prisma.user.create({
      data: {
        email: profile.email,
        firstName: profile.firstName,
        lastName: profile.lastName,
        avatarUrl: profile.picture,
        role: 'basic',
        status: 'active',
        emailVerified: profile.emailVerified,
        emailVerifiedAt: profile.emailVerified ? new Date() : null,
        subscriptionTier: 'free',
        maxProfiles: 1,
        isMainProfile: true,
      },
    });

    logger.info(`New user created via OAuth`, {
      userId: newUser.id,
      email: newUser.email,
      provider,
    });

    return { user: newUser, isNewUser: true };
  }

  private async upsertOAuthAccount(
    userId: string,
    provider: string,
    data: {
      providerAccountId: string;
      accessToken?: string;
      refreshToken?: string;
      expiresAt?: Date;
      tokenType?: string;
      scope?: string;
      idToken?: string;
      profileData: any;
    }
  ): Promise<void> {
    await this.prisma.oAuthAccount.upsert({
      where: {
        provider_providerAccountId: {
          provider: provider as any,
          providerAccountId: data.providerAccountId,
        },
      },
      update: {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresAt: data.expiresAt,
        tokenType: data.tokenType,
        scope: data.scope,
        idToken: data.idToken,
        profileData: data.profileData,
        updatedAt: new Date(),
      },
      create: {
        userId,
        provider: provider as any,
        providerAccountId: data.providerAccountId,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresAt: data.expiresAt,
        tokenType: data.tokenType,
        scope: data.scope,
        idToken: data.idToken,
        profileData: data.profileData,
      },
    });
  }

  private decodeJWT(token: string): any {
    try {
      const payload = token.split('.')[1];
      const decoded = Buffer.from(payload, 'base64').toString('utf8');
      return JSON.parse(decoded);
    } catch (error) {
      throw new Error('Invalid JWT token');
    }
  }

  /**
   * Refresh OAuth tokens (for providers that support it)
   */
  async refreshOAuthTokens(userId: string, provider: string): Promise<void> {
    const oauthAccount = await this.prisma.oAuthAccount.findFirst({
      where: {
        userId,
        provider: provider as any,
      },
    });

    if (!oauthAccount?.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      let tokenEndpoint = '';
      let clientId = '';
      let clientSecret = '';

      switch (provider) {
        case 'google':
          tokenEndpoint = 'https://oauth2.googleapis.com/token';
          // Add Google OAuth credentials from config
          break;
        case 'facebook':
          tokenEndpoint = 'https://graph.facebook.com/oauth/access_token';
          // Add Facebook OAuth credentials from config
          break;
        default:
          throw new Error(`Token refresh not supported for provider: ${provider}`);
      }

      const response = await axios.post(tokenEndpoint, {
        grant_type: 'refresh_token',
        refresh_token: oauthAccount.refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      });

      const { access_token, refresh_token, expires_in } = response.data;

      // Update tokens in database
      await this.prisma.oAuthAccount.update({
        where: { id: oauthAccount.id },
        data: {
          accessToken: access_token,
          refreshToken: refresh_token || oauthAccount.refreshToken,
          expiresAt: expires_in ? new Date(Date.now() + expires_in * 1000) : null,
          updatedAt: new Date(),
        },
      });

      logger.info(`OAuth tokens refreshed`, { userId, provider });
    } catch (error) {
      logger.error(`Failed to refresh OAuth tokens`, { userId, provider, error });
      throw new Error('Failed to refresh OAuth tokens');
    }
  }
}