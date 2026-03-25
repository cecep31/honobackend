import { Resend } from 'resend';
import config from '../config';

const resend = config.email.resendApiKey ? new Resend(config.email.resendApiKey) : null;

/**
 * Check if email is configured and can send
 */
export function isEmailConfigured(): boolean {
  return Boolean(resend);
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(to: string, resetLink: string): Promise<boolean> {
  if (!resend) {
    return false;
  }

  try {
    const { error } = await resend.emails.send({
      from: config.email.from,
      to,
      subject: 'Reset your password',
      text: `You requested a password reset. Click the link below to reset your password:\n\n${resetLink}\n\nThis link expires in 1 hour. If you didn't request this, please ignore this email.`,
      html: `
        <p>You requested a password reset. Click the link below to reset your password:</p>
        <p><a href="${resetLink}">${resetLink}</a></p>
        <p>This link expires in 1 hour. If you didn't request this, please ignore this email.</p>
      `,
    });

    if (error) {
      console.error('Failed to send password reset email:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    return false;
  }
}
