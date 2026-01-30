import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import logger from '../utils/logger.js';

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: parseInt(process.env.SMTP_PORT || '587', 10) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
  attachments?: Array<{ filename: string; content: Buffer | string; contentType?: string }>;
}

export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  if (process.env.EMAIL_ENABLED !== 'true') {
    logger.info({ to: options.to, subject: options.subject }, 'Email sending disabled, skipping');
    return false;
  }

  try {
    const transport = getTransporter();
    await transport.sendMail({
      from: options.from || process.env.EMAIL_FROM || 'noreply@coheron.app',
      to: options.to,
      subject: options.subject,
      html: options.html,
      replyTo: options.replyTo,
      attachments: options.attachments,
    });
    logger.info({ to: options.to, subject: options.subject }, 'Email sent successfully');
    return true;
  } catch (err) {
    logger.error({ err, to: options.to, subject: options.subject }, 'Failed to send email');
    throw err;
  }
}
