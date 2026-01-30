import { baseTemplate } from './baseTemplate.js';

export function invoiceEmailTemplate(data: {
  customerName: string;
  invoiceNumber: string;
  amount: number;
  dueDate?: string;
  currency?: string;
}): string {
  const content = `
    <h2>Invoice ${data.invoiceNumber}</h2>
    <p>Dear ${data.customerName},</p>
    <p>Please find your invoice details below:</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:600;">Invoice Number</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;">${data.invoiceNumber}</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:600;">Amount</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;">${data.currency || 'INR'} ${data.amount.toFixed(2)}</td></tr>
      ${data.dueDate ? `<tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:600;">Due Date</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;">${data.dueDate}</td></tr>` : ''}
    </table>
    <p>Please ensure timely payment. If you have any questions, feel free to reach out.</p>
  `;
  return baseTemplate(content, `Invoice ${data.invoiceNumber}`);
}
