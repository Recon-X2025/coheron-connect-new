import { baseTemplate } from './baseTemplate.js';

export function ticketReplyTemplate(data: {
  ticketNumber: string;
  subject: string;
  replyContent: string;
  agentName?: string;
}): string {
  const content = `
    <h2>Re: [${data.ticketNumber}] ${data.subject}</h2>
    <p>${data.agentName ? `${data.agentName} replied:` : 'New reply on your support ticket:'}</p>
    <div style="background:#f9fafb;padding:16px;border-radius:6px;border-left:4px solid #4F46E5;margin:16px 0;">
      ${data.replyContent}
    </div>
    <p>You can reply to this email or log in to view the full conversation.</p>
  `;
  return baseTemplate(content, `Ticket ${data.ticketNumber}`);
}
