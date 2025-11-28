# Email to Ticket Creation Workflow

This document describes the email-to-ticket workflow implementation for the Support Tickets module.

## Overview

The email-to-ticket workflow automatically creates support tickets from incoming emails. It supports multiple email service providers and handles both new ticket creation and replies to existing tickets.

## Features

- ✅ Automatic ticket creation from incoming emails
- ✅ Support for multiple email providers (SendGrid, Mailgun, generic)
- ✅ Automatic partner/contact lookup and creation
- ✅ Reply detection and thread management
- ✅ Attachment handling
- ✅ Email channel assignment
- ✅ SLA policy assignment
- ✅ Ticket number extraction from email subjects

## API Endpoints

### SendGrid Webhook
```
POST /api/email-webhook/sendgrid
Content-Type: application/json
```

SendGrid sends emails as an array. The endpoint processes all emails in the array.

### Mailgun Webhook
```
POST /api/email-webhook/mailgun
Content-Type: application/x-www-form-urlencoded
```

Mailgun sends emails as form-encoded data.

### Generic Webhook
```
POST /api/email-webhook/generic
Content-Type: application/json
```

For custom email integrations or other email service providers.

### Health Check
```
GET /api/email-webhook/health
```

Returns the health status of the email webhook service.

## Setup Instructions

### 1. SendGrid Setup

1. Log in to your SendGrid account
2. Go to Settings → Mail Settings → Inbound Parse
3. Add a new inbound parse webhook:
   - **Destination URL**: `https://your-domain.com/api/email-webhook/sendgrid`
   - **Subdomain**: Choose a subdomain (e.g., `support`)
   - **Check "POST the raw, full MIME message"** if you need full email parsing
4. Save the configuration
5. Update your DNS to point the subdomain to SendGrid's servers

### 2. Mailgun Setup

1. Log in to your Mailgun account
2. Go to Sending → Domains → [Your Domain] → Receiving
3. Add a new route:
   - **Expression**: `match_recipient("support@your-domain.com")`
   - **Action**: `forward("https://your-domain.com/api/email-webhook/mailgun")`
4. Save the route

### 3. Generic Email Service Setup

For other email services, use the generic endpoint and format the request body as follows:

```json
{
  "from": {
    "email": "customer@example.com",
    "name": "John Doe"
  },
  "to": ["support@your-domain.com"],
  "subject": "Support Request",
  "text": "Plain text email body",
  "html": "<p>HTML email body</p>",
  "messageId": "<message-id@example.com>",
  "attachments": [
    {
      "filename": "document.pdf",
      "contentType": "application/pdf",
      "content": "base64-encoded-content",
      "size": 12345
    }
  ]
}
```

## How It Works

### 1. Email Reception
- Email service provider receives the email
- Provider sends webhook to the configured endpoint
- The webhook handler receives and parses the email

### 2. Email Parsing
- Extracts sender information (email, name)
- Extracts subject and body (plain text and HTML)
- Extracts attachments
- Extracts message IDs for reply detection

### 3. Partner Lookup/Creation
- Searches for existing partner by email address
- If not found, creates a new partner with the sender's email and name
- Associates the ticket with the partner

### 4. Reply Detection
The system checks for replies in the following order:
1. **Message ID matching**: Checks if the email's `In-Reply-To` or `References` headers match a stored message ID
2. **Ticket number extraction**: Extracts ticket number from subject (e.g., "Re: [TKT-123456] Original Subject")

If a reply is detected:
- Adds a note to the existing ticket instead of creating a new one
- Reopens the ticket if it was closed/resolved
- Logs the reply in ticket history

### 5. Ticket Creation
If it's a new email (not a reply):
- Generates a unique ticket number
- Creates a new support ticket with:
  - Subject from email
  - Description from email body
  - Partner from sender
  - Email channel
  - Default priority (medium)
  - SLA policy based on priority
- Stores email metadata in custom_fields:
  - `email_message_id`: Original message ID
  - `email_in_reply_to`: In-Reply-To header
  - `email_references`: References header
  - `email_from`: Sender email
  - `email_from_name`: Sender name
  - `email_to`: Recipient emails
  - `email_date`: Email date

### 6. Attachment Handling
- Extracts attachments from the email
- Creates ticket_attachments records
- Note: File storage path should be configured in production

## Email Channel

The system automatically creates an "Email" channel in the `ticket_channels` table if it doesn't exist. All tickets created from emails are assigned to this channel.

## Customization

### Priority Detection
Currently, all emails create tickets with "medium" priority. You can enhance this by:
- Parsing priority from email headers
- Using keywords in subject/body
- Implementing ML-based priority detection

### Category Assignment
You can add logic to automatically assign categories based on:
- Email subject keywords
- Sender domain
- Email content analysis

### Team Assignment
Add logic to automatically assign tickets to teams based on:
- Sender email domain
- Ticket category
- Round-robin assignment

## Security Considerations

1. **Webhook Authentication**: Consider adding authentication tokens to webhook endpoints
2. **Rate Limiting**: Implement rate limiting to prevent abuse
3. **Email Validation**: Validate email addresses before processing
4. **Spam Filtering**: Integrate spam detection before creating tickets
5. **File Upload Security**: Validate and sanitize file attachments

## Example Webhook Payloads

### SendGrid
```json
[
  {
    "from": "customer@example.com",
    "to": "support@your-domain.com",
    "subject": "Need Help",
    "text": "I need assistance with my account.",
    "html": "<p>I need assistance with my account.</p>",
    "headers": {
      "message-id": "<abc123@example.com>"
    }
  }
]
```

### Mailgun
```
sender=customer@example.com
recipients=support@your-domain.com
subject=Need Help
body-plain=I need assistance with my account.
body-html=<p>I need assistance with my account.</p>
Message-Id=<abc123@example.com>
```

## Testing

### Test with cURL

**SendGrid format:**
```bash
curl -X POST https://your-domain.com/api/email-webhook/sendgrid \
  -H "Content-Type: application/json" \
  -d '[
    {
      "from": "test@example.com",
      "to": "support@your-domain.com",
      "subject": "Test Ticket",
      "text": "This is a test email",
      "html": "<p>This is a test email</p>"
    }
  ]'
```

**Mailgun format:**
```bash
curl -X POST https://your-domain.com/api/email-webhook/mailgun \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "sender=test@example.com&recipients=support@your-domain.com&subject=Test Ticket&body-plain=This is a test email"
```

**Generic format:**
```bash
curl -X POST https://your-domain.com/api/email-webhook/generic \
  -H "Content-Type: application/json" \
  -d '{
    "from": {
      "email": "test@example.com",
      "name": "Test User"
    },
    "to": ["support@your-domain.com"],
    "subject": "Test Ticket",
    "text": "This is a test email"
  }'
```

## Troubleshooting

### Emails not creating tickets
1. Check webhook endpoint is accessible
2. Verify email service provider is sending webhooks
3. Check server logs for errors
4. Verify database connection
5. Check if email channel exists

### Replies not being detected
1. Ensure message IDs are being stored in custom_fields
2. Check if ticket numbers are included in email subjects
3. Verify In-Reply-To and References headers are present

### Attachments not working
1. Verify attachment parsing in email parser
2. Check file storage configuration
3. Ensure proper base64 encoding for attachments

## Future Enhancements

- [ ] Email signature detection and removal
- [ ] Automatic priority detection from email content
- [ ] Category assignment based on keywords
- [ ] Team assignment rules
- [ ] Email template responses
- [ ] Spam detection integration
- [ ] Email threading improvements
- [ ] Support for email forwarding
- [ ] Multi-language support
- [ ] Email bounce handling

