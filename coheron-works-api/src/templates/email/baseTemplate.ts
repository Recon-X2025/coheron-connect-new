export function baseTemplate(content: string, title?: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title || 'Coheron ERP'}</title>
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f4f4f7; color: #333; }
    .wrapper { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #4F46E5; color: #fff; padding: 24px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 22px; }
    .body { background: #fff; padding: 32px 24px; }
    .footer { background: #f9fafb; padding: 16px 24px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
    .btn { display: inline-block; padding: 12px 24px; background: #4F46E5; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 600; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header"><h1>Coheron ERP</h1></div>
    <div class="body">${content}</div>
    <div class="footer">&copy; ${new Date().getFullYear()} Coheron ERP. All rights reserved.</div>
  </div>
</body>
</html>`;
}
