import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { sendEmail } from '../../crossmodule/services/emailService.js';
import logger from '../../../shared/utils/logger.js';

export function generateTOTPSecret(email: string) {
  const secret = speakeasy.generateSecret({
    name: `CoheronERP (${email})`,
    issuer: 'CoheronERP',
    length: 20,
  });
  return { secret: secret.base32, otpauth_url: secret.otpauth_url! };
}

export async function generateQRCode(otpauthUrl: string): Promise<string> {
  return QRCode.toDataURL(otpauthUrl);
}

export function verifyTOTP(secret: string, token: string): boolean {
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 1,
  });
}

export function generateOTP(): { code: string; expiresAt: Date } {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
  return { code, expiresAt };
}

export async function sendEmailOTP(email: string, code: string): Promise<boolean> {
  return sendEmail({
    to: email,
    subject: 'Your CoheronERP Verification Code',
    html: `<p>Your verification code is: <strong>${code}</strong></p><p>This code expires in 5 minutes.</p>`,
  });
}

export async function sendSmsOTP(phone: string, code: string): Promise<boolean> {
  // SMS stub — integrate with provider (Twilio, etc.) as needed
  logger.info({ phone, code }, 'SMS OTP stub: code generated (not sent)');
  return true;
}

export async function generateBackupCodes(): Promise<{ plain: string[]; hashed: { code: string; used: boolean }[] }> {
  const plain: string[] = [];
  const hashed: { code: string; used: boolean }[] = [];

  for (let i = 0; i < 10; i++) {
    const code = crypto.randomBytes(4).toString('hex'); // 8-char hex
    plain.push(code);
    const hash = await bcrypt.hash(code, 10);
    hashed.push({ code: hash, used: false });
  }

  return { plain, hashed };
}

export async function verifyBackupCode(
  inputCode: string,
  storedCodes: { code: string; used: boolean; used_at?: Date }[]
): Promise<number> {
  for (let i = 0; i < storedCodes.length; i++) {
    if (storedCodes[i].used) continue;
    const match = await bcrypt.compare(inputCode, storedCodes[i].code);
    if (match) return i;
  }
  return -1;
}
