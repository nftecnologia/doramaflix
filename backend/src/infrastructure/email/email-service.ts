/**
 * Email Service
 * Handles email sending with templating for authentication flows
 */

import nodemailer, { Transporter } from 'nodemailer';
import { readFileSync } from 'fs';
import { join } from 'path';
import handlebars from 'handlebars';
import { config } from '@/shared/config/environment';
import { logger } from '@/shared/utils/logger';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface WelcomeEmailData {
  firstName: string;
  lastName: string;
  email: string;
  verificationUrl: string;
  appName: string;
  appUrl: string;
}

export interface PasswordResetEmailData {
  firstName: string;
  lastName: string;
  resetUrl: string;
  expiresIn: string;
  appName: string;
  appUrl: string;
}

export interface EmailVerificationData {
  firstName: string;
  lastName: string;
  verificationUrl: string;
  appName: string;
  appUrl: string;
}

export interface TwoFactorEmailData {
  firstName: string;
  lastName: string;
  code: string;
  expiresIn: string;
  appName: string;
}

export interface SecurityAlertEmailData {
  firstName: string;
  lastName: string;
  action: string;
  location: string;
  device: string;
  timestamp: string;
  appName: string;
  appUrl: string;
}

export interface LoginAlertEmailData {
  firstName: string;
  lastName: string;
  location: string;
  device: string;
  timestamp: string;
  ipAddress: string;
  appName: string;
  appUrl: string;
}

export class EmailService {
  private transporter: Transporter;
  private templates: Map<string, HandlebarsTemplateDelegate> = new Map();

  constructor() {
    this.transporter = nodemailer.createTransporter({
      host: config.email.smtp.host,
      port: config.email.smtp.port || 587,
      secure: config.email.smtp.port === 465,
      auth: {
        user: config.email.smtp.user,
        pass: config.email.smtp.password,
      },
    });

    this.loadTemplates();
  }

  private loadTemplates(): void {
    const templateDir = join(__dirname, 'templates');
    const templateNames = [
      'welcome',
      'password-reset',
      'email-verification',
      'two-factor-code',
      'security-alert',
      'login-alert',
      'account-locked',
      'password-changed',
      'device-registered',
    ];

    for (const templateName of templateNames) {
      try {
        const templatePath = join(templateDir, `${templateName}.hbs`);
        const templateSource = readFileSync(templatePath, 'utf8');
        const template = handlebars.compile(templateSource);
        this.templates.set(templateName, template);
      } catch (error) {
        logger.warn(`Failed to load email template: ${templateName}`, error);
      }
    }
  }

  private async sendEmail(options: EmailOptions): Promise<void> {
    try {
      const info = await this.transporter.sendMail({
        from: config.email.from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      logger.info('Email sent successfully', { messageId: info.messageId, to: options.to });
    } catch (error) {
      logger.error('Failed to send email', { error, to: options.to });
      throw new Error('Failed to send email');
    }
  }

  async sendWelcomeEmail(data: WelcomeEmailData): Promise<void> {
    const template = this.templates.get('welcome');
    if (!template) {
      throw new Error('Welcome email template not found');
    }

    const html = template(data);
    
    await this.sendEmail({
      to: data.email,
      subject: `Welcome to ${data.appName}!`,
      html,
    });
  }

  async sendPasswordResetEmail(data: PasswordResetEmailData): Promise<void> {
    const template = this.templates.get('password-reset');
    if (!template) {
      throw new Error('Password reset email template not found');
    }

    const html = template(data);
    
    await this.sendEmail({
      to: data.email,
      subject: 'Reset Your Password',
      html,
    });
  }

  async sendEmailVerification(data: EmailVerificationData): Promise<void> {
    const template = this.templates.get('email-verification');
    if (!template) {
      throw new Error('Email verification template not found');
    }

    const html = template(data);
    
    await this.sendEmail({
      to: data.email,
      subject: 'Verify Your Email Address',
      html,
    });
  }

  async sendTwoFactorCode(data: TwoFactorEmailData): Promise<void> {
    const template = this.templates.get('two-factor-code');
    if (!template) {
      throw new Error('Two-factor code email template not found');
    }

    const html = template(data);
    
    await this.sendEmail({
      to: data.email,
      subject: 'Your Two-Factor Authentication Code',
      html,
    });
  }

  async sendSecurityAlert(email: string, data: SecurityAlertEmailData): Promise<void> {
    const template = this.templates.get('security-alert');
    if (!template) {
      throw new Error('Security alert email template not found');
    }

    const html = template(data);
    
    await this.sendEmail({
      to: email,
      subject: 'Security Alert: Account Activity',
      html,
    });
  }

  async sendLoginAlert(email: string, data: LoginAlertEmailData): Promise<void> {
    const template = this.templates.get('login-alert');
    if (!template) {
      throw new Error('Login alert email template not found');
    }

    const html = template(data);
    
    await this.sendEmail({
      to: email,
      subject: 'New Login to Your Account',
      html,
    });
  }

  async sendAccountLocked(email: string, data: { firstName: string; lastName: string; appName: string; appUrl: string }): Promise<void> {
    const template = this.templates.get('account-locked');
    if (!template) {
      throw new Error('Account locked email template not found');
    }

    const html = template(data);
    
    await this.sendEmail({
      to: email,
      subject: 'Account Security Alert: Account Locked',
      html,
    });
  }

  async sendPasswordChanged(email: string, data: { firstName: string; lastName: string; appName: string; appUrl: string }): Promise<void> {
    const template = this.templates.get('password-changed');
    if (!template) {
      throw new Error('Password changed email template not found');
    }

    const html = template(data);
    
    await this.sendEmail({
      to: email,
      subject: 'Password Changed Successfully',
      html,
    });
  }

  async sendDeviceRegistered(email: string, data: { firstName: string; lastName: string; deviceName: string; location: string; appName: string }): Promise<void> {
    const template = this.templates.get('device-registered');
    if (!template) {
      throw new Error('Device registered email template not found');
    }

    const html = template(data);
    
    await this.sendEmail({
      to: email,
      subject: 'New Device Registered',
      html,
    });
  }

  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      logger.info('Email service connection verified');
      return true;
    } catch (error) {
      logger.error('Email service connection failed', error);
      return false;
    }
  }
}

// Singleton instance
export const emailService = new EmailService();