// backend/src/services/email.service.ts
import { Resend } from 'resend';
import { logger } from '../utils/logger';

// If an API key is not provided, we mock the email service
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

export class EmailService {
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

    if (!resend) {
      logger.info(`[MOCK EMAIL] To: ${email} | Subject: ${subject}`);
      return;
    }

    try {
      await resend.emails.send({
        from: 'ElecSHOP <orders@elecshop.com>', // Replace with verified domain
        to: email,
        subject,
        html,
      });
      logger.info(`Email sent to ${email} for order ${orderId}`);
    } catch (error) {
      logger.error({ err: error }, 'Failed to send confirmation email');
    }
  }
}
