import nodemailer from "nodemailer";
import config from "../config";

const TRANSPORTER =
  config.email.host && config.email.user
    ? nodemailer.createTransport({
        host: config.email.host,
        port: config.email.port,
        secure: config.email.secure,
        auth: {
          user: config.email.user,
          pass: config.email.password,
        },
      })
    : null;

/**
 * Check if email is configured and can send
 */
export function isEmailConfigured(): boolean {
  return Boolean(TRANSPORTER);
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  to: string,
  resetLink: string
): Promise<boolean> {
  if (!TRANSPORTER) {
    return false;
  }

  try {
    await TRANSPORTER.sendMail({
      from: config.email.from,
      to,
      subject: "Reset your password",
      text: `You requested a password reset. Click the link below to reset your password:\n\n${resetLink}\n\nThis link expires in 1 hour. If you didn't request this, please ignore this email.`,
      html: `
        <p>You requested a password reset. Click the link below to reset your password:</p>
        <p><a href="${resetLink}">${resetLink}</a></p>
        <p>This link expires in 1 hour. If you didn't request this, please ignore this email.</p>
      `,
    });
    return true;
  } catch (error) {
    console.error("Failed to send password reset email:", error);
    return false;
  }
}
