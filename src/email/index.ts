import { Resend } from 'resend';
import config from '../config';
import { passwordResetTemplate } from './templates';
import type { EmailSendResult } from './types';

/**
 * Email Service - centralized email functionality
 * Similar pattern to database/drizzle.ts
 */

let resend: Resend | null = null;

/**
 * Initialize email service with Resend
 */
export function initEmail(): void {
  if (config.email.resendApiKey) {
    resend = new Resend(config.email.resendApiKey);
  }
}

/**
 * Check if email service is configured and ready
 */
export function isEmailConfigured(): boolean {
  return Boolean(resend);
}

/**
 * Get Resend client instance
 */
export function getEmailClient(): Resend | null {
  return resend;
}

/**
 * Send email with raw configuration
 */
export async function sendEmail(
  to: string,
  subject: string,
  text: string,
  html: string,
  from?: string
): Promise<EmailSendResult> {
  if (!resend) {
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const { error } = await resend.emails.send({
      from: from || config.email.from,
      to,
      subject,
      text,
      html,
    });

    if (error) {
      console.error('Failed to send email:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Failed to send email:', err);
    return { success: false, error: message };
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  to: string,
  resetLink: string,
  from?: string
): Promise<boolean> {
  if (!resend) {
    return false;
  }

  const template = passwordResetTemplate({ resetLink });
  const result = await sendEmail(to, template.subject, template.text, template.html, from);

  return result.success;
}

// Auto-initialize on module load
initEmail();
