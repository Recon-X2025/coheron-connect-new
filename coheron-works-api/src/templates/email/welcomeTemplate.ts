import { baseTemplate } from './baseTemplate.js';

export function welcomeTemplate(data: {
  userName: string;
  loginUrl?: string;
}): string {
  const content = `
    <h2>Welcome to Coheron ERP!</h2>
    <p>Hi ${data.userName},</p>
    <p>Your account has been created successfully. You can now log in and start using the platform.</p>
    <p style="text-align:center;margin:24px 0;">
      <a href="${data.loginUrl || process.env.FRONTEND_URL || 'http://localhost:5173'}" class="btn" style="color:#fff;">Go to Dashboard</a>
    </p>
    <p>If you have any questions, our support team is happy to help.</p>
  `;
  return baseTemplate(content, 'Welcome');
}
