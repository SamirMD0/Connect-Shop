// backend/src/services/email.service.ts
import { Resend } from 'resend';
import { logger } from '../utils/logger';

// If an API key is not provided, we mock the email service
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

export class EmailService {
  private static async sendEmail(email: string, subject: string, html: string): Promise<void> {
    if (!resend) {
      logger.info(`[MOCK EMAIL] To: ${email} | Subject: ${subject} | ${html.replace(/\s+/g, ' ').slice(0, 240)}`);
      return;
    }

    try {
      await resend.emails.send({
        from: 'ElecSHOP <accounts@elecshop.com>',
        to: email,
        subject,
        html,
      });
      logger.info(`Email sent to ${email}: ${subject}`);
    } catch (error) {
      logger.error({ err: error }, 'Failed to send email');
    }
  }

  static async sendOrderConfirmation(email: string, orderId: string, total: number) {
    const subject = `Order Confirmation #${orderId}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #4f46e5;">Thank you for your order!</h1>
        <p>We've received your order and it's currently processing.</p>
        <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Order ID:</strong> ${orderId}</p>
          <p style="margin: 10px 0 0 0;"><strong>Total:</strong> $${total.toFixed(2)}</p>
        </div>
        <p>We will notify you once your order ships.</p>
        <p style="color: #64748b; font-size: 14px;">- The ElecSHOP Team</p>
      </div>
    `;

    await this.sendEmail(email, subject, html);
  }

  static async sendEmailVerification(email: string, verificationUrl: string): Promise<void> {
    await this.sendEmail(
      email,
      'Verify your ElecSHOP account',
      `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2563eb;">Verify your email</h1>
          <p>Confirm your email address to finish setting up your ElecSHOP account.</p>
          <p><a href="${verificationUrl}" style="display:inline-block;background:#2563eb;color:white;padding:12px 18px;border-radius:8px;text-decoration:none;">Verify email</a></p>
          <p style="color:#64748b;font-size:14px;">This link expires soon. If you did not create an account, ignore this email.</p>
        </div>
      `
    );
  }

  static async sendPasswordReset(email: string, resetUrl: string): Promise<void> {
    await this.sendEmail(
      email,
      'Reset your ElecSHOP password',
      `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2563eb;">Reset your password</h1>
          <p>Use this secure link to choose a new password.</p>
          <p><a href="${resetUrl}" style="display:inline-block;background:#2563eb;color:white;padding:12px 18px;border-radius:8px;text-decoration:none;">Reset password</a></p>
          <p style="color:#64748b;font-size:14px;">This link can only be used once. If you did not request it, ignore this email.</p>
        </div>
      `
    );
  }
}
