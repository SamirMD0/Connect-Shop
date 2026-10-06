import { Resend } from 'resend';
import { createHash } from 'crypto';
import { env } from '../config/env';
import { businessRules } from '../config/business';
import { logger } from '../utils/logger';
import { withDeadline, DeadlineError } from '../utils/deadline';

export type EmailDeliveryStatus = 'accepted' | 'mock' | 'disabled';
type EmailKind = 'order_confirmation' | 'email_verification' | 'password_reset';
export class EmailDeliveryError extends Error {
  constructor(public readonly category: 'unconfigured' | 'timeout' | 'network' | 'provider_transient' | 'provider_rejected') {
    super('Email delivery could not be confirmed.'); this.name = 'EmailDeliveryError';
  }
}
const resend = env.EMAIL_MODE === 'resend' && env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));
const wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

export class EmailService {
  private static async sendEmail(kind: EmailKind, email: string, subject: string, html: string): Promise<EmailDeliveryStatus> {
    const enabled = kind === 'order_confirmation' ? env.EMAIL_ORDER_CONFIRMATIONS_ENABLED : env.EMAIL_AUTH_ENABLED;
    if (enabled === false) return 'disabled';
    if (env.EMAIL_MODE === 'mock' && ['development', 'test'].includes(env.NODE_ENV)) {
      logger.info({ kind, mode: 'mock' }, 'Mock email recorded; no message was sent'); return 'mock';
    }
    if (env.EMAIL_MODE !== 'resend' || !resend || !env.EMAIL_FROM || (env.NODE_ENV === 'production' && !env.EMAIL_SENDER_VERIFIED)) {
      logger.error({ kind, category: 'unconfigured' }, 'Email delivery failed'); throw new EmailDeliveryError('unconfigured');
    }
    const fromName = businessRules.name.replace(/["\\]/g, char => '\\' + char);
    const payload = { from: '"' + fromName + '" <' + env.EMAIL_FROM + '>', to: email, subject, html,
      ...(env.EMAIL_REPLY_TO ? { replyTo: env.EMAIL_REPLY_TO } : {}) };
    // Retries reuse the identical payload/key within the provider's 24-hour window.
    // Never log the key, content, recipient, reset URL, or provider error object.
    const idempotencyKey = createHash('sha256').update(JSON.stringify({ kind, ...payload })).digest('hex');
    let failure = new EmailDeliveryError('network');
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const result = await withDeadline(() => resend.emails.send(payload, { idempotencyKey }), env.EMAIL_TIMEOUT_MS ?? 5000);
        if (result.error) {
          const retryable = ['rate_limit_exceeded', 'application_error', 'service_unavailable', 'concurrent_idempotent_requests'].includes(result.error.name);
          throw new EmailDeliveryError(retryable ? 'provider_transient' : 'provider_rejected');
        }
        if (!result.data?.id) throw new EmailDeliveryError('provider_rejected');
        logger.info({ kind }, 'Email accepted by provider'); return 'accepted';
      } catch (error) {
        failure = error instanceof EmailDeliveryError ? error : new EmailDeliveryError(error instanceof DeadlineError ? 'timeout' : 'network');
        if (failure.category === 'provider_rejected' || attempt === 3) break;
        await wait(attempt * 250);
      }
    }
    logger.error({ kind, category: failure.category }, 'Email delivery failed after bounded attempts');
    throw failure;
  }

  static async sendOrderConfirmation(email: string, orderId: string, total: number, currency = businessRules.currency): Promise<EmailDeliveryStatus> {
    const formatted = new Intl.NumberFormat(businessRules.locale, { style: 'currency', currency }).format(total);
    return this.sendEmail('order_confirmation', email, 'Order Confirmation #' + orderId,
      '<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px"><h1>Thank you for your order!</h1>' +
      '<p>We received your cash-on-delivery order and it is processing.</p><p><strong>Order ID:</strong> ' + escapeHtml(orderId) + '</p>' +
      '<p><strong>Total:</strong> ' + escapeHtml(formatted) + '</p><p>No online payment was collected.</p><p>' + escapeHtml(businessRules.name) + '</p></div>');
  }
  static async sendEmailVerification(email: string, verificationUrl: string): Promise<EmailDeliveryStatus> {
    return this.sendEmail('email_verification', email, 'Verify your ' + businessRules.name + ' account',
      '<div style="font-family:Arial,sans-serif;padding:20px"><h1>Verify your email</h1><p>Confirm your email address for ' + escapeHtml(businessRules.name) + '.</p>' +
      '<p><a href="' + escapeHtml(verificationUrl) + '">Verify email</a></p><p>If you did not create an account, ignore this email.</p></div>');
  }
  static async sendPasswordReset(email: string, resetUrl: string): Promise<EmailDeliveryStatus> {
    return this.sendEmail('password_reset', email, 'Reset your ' + businessRules.name + ' password',
      '<div style="font-family:Arial,sans-serif;padding:20px"><h1>Reset your password</h1><p>Use this link to choose a new password.</p>' +
      '<p><a href="' + escapeHtml(resetUrl) + '">Reset password</a></p><p>This link is single use. If you did not request it, ignore this email.</p></div>');
  }
}
