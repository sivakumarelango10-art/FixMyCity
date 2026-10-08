import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';

let transporter: Transporter | null = null;

function getTransport(): Transporter | null {
  if (!env.smtpEnabled) return null;
  transporter ??= nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  });
  return transporter;
}

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
}

/**
 * Sends email through SMTP when configured. Without SMTP, development builds
 * log the message so flows like password reset can still be exercised locally.
 * Production without SMTP logs a warning and drops the message.
 */
export async function sendMail(message: MailMessage): Promise<{ delivered: boolean }> {
  const transport = getTransport();
  if (!transport) {
    if (!env.isProduction) {
      logger.info({ to: message.to, subject: message.subject }, `[dev mail] ${message.text}`);
    } else {
      logger.warn({ subject: message.subject }, 'SMTP is not configured; email was not sent.');
    }
    return { delivered: false };
  }
  await transport.sendMail({ from: env.MAIL_FROM, ...message });
  return { delivered: true };
}
