import type { EmailTemplate } from '../types';

export interface PasswordResetData {
  resetLink: string;
  expiresIn?: string;
}

export function passwordResetTemplate(data: PasswordResetData): EmailTemplate {
  const { resetLink, expiresIn = '1 hour' } = data;

  return {
    subject: 'Reset your password',
    text: `You requested a password reset. Click the link below to reset your password:\n\n${resetLink}\n\nThis link expires in ${expiresIn}. If you didn't request this, please ignore this email.`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .container { background: #f9f9f9; border-radius: 8px; padding: 30px; }
    h1 { color: #2563eb; font-size: 24px; margin-bottom: 20px; }
    .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .link { word-break: break-all; color: #2563eb; }
    .footer { margin-top: 30px; font-size: 14px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Reset Your Password</h1>
    <p>You requested a password reset. Click the button below to reset your password:</p>
    <a href="${resetLink}" class="button">Reset Password</a>
    <p>Or copy and paste this link into your browser:</p>
    <p class="link">${resetLink}</p>
    <div class="footer">
      <p>This link expires in <strong>${expiresIn}</strong>.</p>
      <p>If you didn't request this, please ignore this email.</p>
    </div>
  </div>
</body>
</html>
    `.trim(),
  };
}
