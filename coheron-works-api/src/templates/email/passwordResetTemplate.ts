import { baseTemplate } from './baseTemplate.js';

export function passwordResetTemplate(data: {
  userName: string;
  resetUrl: string;
  expiresIn?: string;
}): string {
  const content = `
    <h2>Password Reset</h2>
    <p>Hi ${data.userName},</p>
    <p>We received a request to reset your password. Click the button below to set a new password:</p>
    <p style="text-align:center;margin:24px 0;">
      <a href="${data.resetUrl}" class="btn" style="color:#fff;">Reset Password</a>
    </p>
    <p>This link expires in ${data.expiresIn || '1 hour'}. If you did not request this, please ignore this email.</p>
  `;
  return baseTemplate(content, 'Password Reset');
}
