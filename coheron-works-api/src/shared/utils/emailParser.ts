/**
 * Email Parser Utility
 * Parses incoming emails from various email service providers (SendGrid, Mailgun, etc.)
 */

export interface ParsedEmail {
  from: {
    email: string;
    name?: string;
  };
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  textBody?: string;
  htmlBody?: string;
  attachments?: EmailAttachment[];
  messageId?: string;
  inReplyTo?: string;
  references?: string[];
  date?: Date;
  headers?: Record<string, string>;
}

export interface EmailAttachment {
  filename: string;
  contentType: string;
  content: string | Buffer; // Base64 encoded or Buffer
  size?: number;
}

/**
 * Parse email from SendGrid webhook format
 */
export function parseSendGridEmail(body: any): ParsedEmail {
  const email: ParsedEmail = {
    from: {
      email: body.from || body.envelope?.from || '',
      name: extractNameFromEmailHeader(body.from || ''),
    },
    to: parseEmailList(body.to || []),
    cc: body.cc ? parseEmailList(body.cc) : undefined,
    bcc: body.bcc ? parseEmailList(body.bcc) : undefined,
    subject: body.subject || '',
    textBody: body.text || body.plain || '',
    htmlBody: body.html || '',
    messageId: body.headers?.['message-id'] || body.messageId,
    inReplyTo: body.headers?.['in-reply-to'],
    references: body.headers?.references
      ? body.headers.references.split(/\s+/).filter(Boolean)
      : undefined,
    date: body.date ? new Date(body.date) : new Date(),
    headers: body.headers || {},
  };

  // Parse attachments
  if (body.attachments && Array.isArray(body.attachments)) {
    email.attachments = body.attachments.map((att: any) => ({
      filename: att.filename || att.name || 'attachment',
      contentType: att.type || att.contentType || 'application/octet-stream',
      content: att.content || att.data || '',
      size: att.size || att.length,
    }));
  }

  return email;
}

/**
 * Parse email from Mailgun webhook format
 */
export function parseMailgunEmail(body: any): ParsedEmail {
  const email: ParsedEmail = {
    from: {
      email: body.sender || body['sender'] || '',
      name: extractNameFromEmailHeader(body.sender || ''),
    },
    to: parseEmailList(body.recipients || []),
    cc: body.cc ? parseEmailList(body.cc) : undefined,
    bcc: body.bcc ? parseEmailList(body.bcc) : undefined,
    subject: body.subject || '',
    textBody: body['body-plain'] || body['body-plain'] || '',
    htmlBody: body['body-html'] || body['body-html'] || '',
    messageId: body['Message-Id'] || body.messageId,
    inReplyTo: body['In-Reply-To'],
    references: body.References
      ? body.References.split(/\s+/).filter(Boolean)
      : undefined,
    date: body['Date'] ? new Date(body['Date']) : new Date(),
    headers: parseMailgunHeaders(body),
  };

  // Parse attachments from Mailgun
  if (body.attachment_count && parseInt(body.attachment_count) > 0) {
    email.attachments = [];
    // Mailgun sends attachments as separate fields, we'd need to handle them separately
    // This is a simplified version - in production, you'd need to handle multipart/form-data
  }

  return email;
}

/**
 * Parse email from generic webhook format (standard email format)
 */
export function parseGenericEmail(body: any): ParsedEmail {
  const email: ParsedEmail = {
    from: {
      email: body.from?.email || body.from || '',
      name: body.from?.name || extractNameFromEmailHeader(body.from || ''),
    },
    to: parseEmailList(body.to || []),
    cc: body.cc ? parseEmailList(body.cc) : undefined,
    bcc: body.bcc ? parseEmailList(body.bcc) : undefined,
    subject: body.subject || '',
    textBody: body.text || body.textBody || body.plain || '',
    htmlBody: body.html || body.htmlBody || '',
    messageId: body.messageId || body['message-id'],
    inReplyTo: body.inReplyTo || body['in-reply-to'],
    references: body.references
      ? (Array.isArray(body.references) ? body.references : body.references.split(/\s+/))
      : undefined,
    date: body.date ? new Date(body.date) : new Date(),
    headers: body.headers || {},
  };

  if (body.attachments && Array.isArray(body.attachments)) {
    email.attachments = body.attachments;
  }

  return email;
}

/**
 * Extract name from email header (e.g., "John Doe <john@example.com>")
 */
function extractNameFromEmailHeader(emailHeader: string): string | undefined {
  const match = emailHeader.match(/^(.+?)\s*<(.+?)>$/);
  if (match) {
    const name = match[1].trim().replace(/^["']|["']$/g, '');
    return name || undefined;
  }
  return undefined;
}

/**
 * Parse email list (can be string or array)
 */
function parseEmailList(emails: string | string[]): string[] {
  if (Array.isArray(emails)) {
    return emails.map((e) => extractEmailAddress(e));
  }
  if (typeof emails === 'string') {
    return emails.split(',').map((e) => extractEmailAddress(e.trim()));
  }
  return [];
}

/**
 * Extract email address from header (e.g., "John Doe <john@example.com>" -> "john@example.com")
 */
function extractEmailAddress(emailHeader: string): string {
  const match = emailHeader.match(/<(.+?)>$/);
  if (match) {
    return match[1].trim();
  }
  return emailHeader.trim();
}

/**
 * Parse Mailgun headers (they come as individual fields)
 */
function parseMailgunHeaders(body: any): Record<string, string> {
  const headers: Record<string, string> = {};
  Object.keys(body).forEach((key) => {
    if (key.startsWith('X-') || key.includes('-')) {
      headers[key] = body[key];
    }
  });
  return headers;
}

/**
 * Extract plain text from HTML email body
 */
export function extractTextFromHtml(html: string): string {
  if (!html) return '';
  
  // Remove script and style tags
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  
  // Remove HTML tags
  text = text.replace(/<[^>]+>/g, ' ');
  
  // Decode HTML entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  
  // Clean up whitespace
  text = text.replace(/\s+/g, ' ').trim();
  
  return text;
}

/**
 * Get the best text representation of email body (prefer plain text, fallback to HTML)
 */
export function getEmailBody(parsedEmail: ParsedEmail): string {
  if (parsedEmail.textBody) {
    return parsedEmail.textBody;
  }
  if (parsedEmail.htmlBody) {
    return extractTextFromHtml(parsedEmail.htmlBody);
  }
  return '';
}

