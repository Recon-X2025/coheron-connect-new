import express from 'express';
import pool from '../database/connection.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/esignature/',
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF and Word documents are allowed.'));
    }
  },
});

// ============================================
// E-SIGNATURE DOCUMENTS
// ============================================

// Get all documents
router.get('/documents', async (req, res) => {
  try {
    const { status, document_type, related_record_type, related_record_id } = req.query;
    let query = `
      SELECT d.*, 
             COUNT(DISTINCT s.id) as total_signers,
             COUNT(DISTINCT CASE WHEN s.status = 'signed' THEN s.id END) as signed_count,
             u.name as created_by_name
      FROM esign_documents d
      LEFT JOIN esign_signers s ON d.id = s.document_id
      LEFT JOIN users u ON d.created_by = u.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (status) {
      query += ` AND d.status = $${paramCount++}`;
      params.push(status);
    }
    if (document_type) {
      query += ` AND d.document_type = $${paramCount++}`;
      params.push(document_type);
    }
    if (related_record_type) {
      query += ` AND d.related_record_type = $${paramCount++}`;
      params.push(related_record_type);
    }
    if (related_record_id) {
      query += ` AND d.related_record_id = $${paramCount++}`;
      params.push(related_record_id);
    }

    query += ' GROUP BY d.id, u.name ORDER BY d.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get document by ID with full details
router.get('/documents/:id', async (req, res) => {
  try {
    const documentResult = await pool.query('SELECT * FROM esign_documents WHERE id = $1', [req.params.id]);
    
    if (documentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const document = documentResult.rows[0];

    // Get signers
    const signersResult = await pool.query(
      'SELECT * FROM esign_signers WHERE document_id = $1 ORDER BY signer_order ASC',
      [req.params.id]
    );

    // Get fields
    const fieldsResult = await pool.query(
      'SELECT * FROM esign_fields WHERE document_id = $1 ORDER BY page_number, y_position',
      [req.params.id]
    );

    // Get audit trail
    const auditResult = await pool.query(
      `SELECT a.*, s.signer_name, s.signer_email 
       FROM esign_audit_trail a
       LEFT JOIN esign_signers s ON a.signer_id = s.id
       WHERE a.document_id = $1 
       ORDER BY a.created_at DESC`,
      [req.params.id]
    );

    res.json({
      ...document,
      signers: signersResult.rows,
      fields: fieldsResult.rows,
      audit_trail: auditResult.rows,
    });
  } catch (error) {
    console.error('Error fetching document:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create document (with file upload)
router.post('/documents', upload.single('file'), async (req, res) => {
  try {
    const {
      document_name,
      document_type,
      related_record_type,
      related_record_id,
      created_by,
      expires_at,
      message,
      reminder_enabled,
      reminder_frequency,
      signers, // JSON array of signers
      fields, // JSON array of fields
    } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'File is required' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Create document record
      const documentResult = await client.query(
        `INSERT INTO esign_documents (
          document_name, document_type, file_path, file_url, file_size, mime_type,
          related_record_type, related_record_id, created_by, expires_at, message,
          reminder_enabled, reminder_frequency, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'draft')
        RETURNING *`,
        [
          document_name,
          document_type || 'other',
          req.file.path,
          `/api/esignature/files/${req.file.filename}`,
          req.file.size,
          req.file.mimetype,
          related_record_type,
          related_record_id,
          created_by,
          expires_at,
          message,
          reminder_enabled !== 'false',
          reminder_frequency || 3,
        ]
      );

      const document = documentResult.rows[0];

      // Add signers
      const signersArray = typeof signers === 'string' ? JSON.parse(signers) : signers || [];
      for (let i = 0; i < signersArray.length; i++) {
        const signer = signersArray[i];
        await client.query(
          `INSERT INTO esign_signers (
            document_id, signer_order, signer_name, signer_email, signer_role,
            authentication_method, access_code
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            document.id,
            i + 1,
            signer.name,
            signer.email,
            signer.role || 'signer',
            signer.authentication_method || 'email',
            signer.access_code || null,
          ]
        );
      }

      // Add fields
      const fieldsArray = typeof fields === 'string' ? JSON.parse(fields) : fields || [];
      for (const field of fieldsArray) {
        await client.query(
          `INSERT INTO esign_fields (
            document_id, signer_id, field_type, field_name, page_number,
            x_position, y_position, width, height, required
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            document.id,
            field.signer_id || null,
            field.field_type,
            field.field_name,
            field.page_number,
            field.x_position,
            field.y_position,
            field.width || 200,
            field.height || 50,
            field.required !== false,
          ]
        );
      }

      // Add audit trail entry
      await client.query(
        `INSERT INTO esign_audit_trail (document_id, action, description, metadata)
         VALUES ($1, 'document_created', 'Document created', $2)`,
        [document.id, JSON.stringify({ created_by, file_name: req.file.originalname })]
      );

      await client.query('COMMIT');
      res.status(201).json(document);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error creating document:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send document for signing
router.post('/documents/:id/send', async (req, res) => {
  try {
    const document = await pool.query('SELECT * FROM esign_documents WHERE id = $1', [req.params.id]);
    
    if (document.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const signers = await pool.query(
      'SELECT * FROM esign_signers WHERE document_id = $1 ORDER BY signer_order ASC',
      [req.params.id]
    );

    if (signers.rows.length === 0) {
      return res.status(400).json({ error: 'No signers found for this document' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update document status
      await client.query(
        `UPDATE esign_documents SET status = 'sent', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [req.params.id]
      );

      // Update first signer status and send email (in real implementation, send actual email)
      const firstSigner = signers.rows[0];
      await client.query(
        `UPDATE esign_signers 
         SET status = 'sent', sent_at = CURRENT_TIMESTAMP 
         WHERE id = $1`,
        [firstSigner.id]
      );

      // Add audit trail
      await client.query(
        `INSERT INTO esign_audit_trail (document_id, action, description)
         VALUES ($1, 'document_sent', 'Document sent for signing')`,
        [req.params.id]
      );

      await client.query('COMMIT');

      // Send email notification to first signer
      await sendSigningEmail(firstSigner, document.rows[0]);

      res.json({ message: 'Document sent successfully', next_signer: firstSigner });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error sending document:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Sign document (for a specific signer)
router.post('/documents/:id/sign/:signerId', async (req, res) => {
  try {
    const { signature_data, signature_type, access_code, fields } = req.body;

    const signer = await pool.query(
      'SELECT * FROM esign_signers WHERE id = $1 AND document_id = $2',
      [req.params.signerId, req.params.id]
    );

    if (signer.rows.length === 0) {
      return res.status(404).json({ error: 'Signer not found' });
    }

    const signerData = signer.rows[0];

    // Verify access code if required
    if (signerData.access_code && access_code !== signerData.access_code) {
      return res.status(401).json({ error: 'Invalid access code' });
    }

    if (signerData.status === 'signed') {
      return res.status(400).json({ error: 'Document already signed by this signer' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update signer
      await client.query(
        `UPDATE esign_signers 
         SET status = 'signed', signed_at = CURRENT_TIMESTAMP, 
             signature_data = $1, signature_type = $2,
             ip_address = $3, user_agent = $4, updated_at = CURRENT_TIMESTAMP
         WHERE id = $5`,
        [
          signature_data,
          signature_type || 'draw',
          req.ip,
          req.get('user-agent'),
          req.params.signerId,
        ]
      );

      // Update fields if provided
      if (fields && Array.isArray(fields)) {
        for (const field of fields) {
          await client.query(
            `UPDATE esign_fields 
             SET value = $1, filled_at = CURRENT_TIMESTAMP 
             WHERE id = $2 AND document_id = $3`,
            [field.value, field.field_id, req.params.id]
          );
        }
      }

      // Check if all signers have signed
      const allSigners = await client.query(
        'SELECT COUNT(*) as total, COUNT(CASE WHEN status = \'signed\' THEN 1 END) as signed_count FROM esign_signers WHERE document_id = $1',
        [req.params.id]
      );

      const { total, signed_count } = allSigners.rows[0];

      if (parseInt(signed_count) === parseInt(total)) {
        // All signers have signed - mark document as completed
        await client.query(
          `UPDATE esign_documents 
           SET status = 'completed', completed_at = CURRENT_TIMESTAMP 
           WHERE id = $1`,
          [req.params.id]
        );

        // Update related record if applicable
        const doc = await client.query('SELECT * FROM esign_documents WHERE id = $1', [req.params.id]);
        if (doc.rows[0].related_record_type === 'contract' && doc.rows[0].related_record_id) {
          await client.query(
            `UPDATE contracts 
             SET signed_at = CURRENT_TIMESTAMP, 
                 signed_by = $1,
                 esign_document_id = $2,
                 status = 'active'
             WHERE id = $3`,
            [signerData.signer_email, req.params.id, doc.rows[0].related_record_id]
          );
        }
      } else {
        // Move to next signer
        const nextSignerOrder = signerData.signer_order + 1;
        const nextSigner = await client.query(
          'SELECT * FROM esign_signers WHERE document_id = $1 AND signer_order = $2',
          [req.params.id, nextSignerOrder]
        );

        if (nextSigner.rows.length > 0) {
          await client.query(
            `UPDATE esign_signers 
             SET status = 'sent', sent_at = CURRENT_TIMESTAMP 
             WHERE id = $1`,
            [nextSigner.rows[0].id]
          );
          // Send email to next signer
          const doc = await client.query('SELECT * FROM esign_documents WHERE id = $1', [req.params.id]);
          await sendSigningEmail(nextSigner.rows[0], doc.rows[0]);
        } else {
          // All signers completed - send completion emails
          const doc = await client.query('SELECT * FROM esign_documents WHERE id = $1', [req.params.id]);
          await sendCompletionEmails(doc.rows[0]);
        }
      }

      // Add audit trail
      await client.query(
        `INSERT INTO esign_audit_trail (document_id, signer_id, action, description, ip_address, user_agent)
         VALUES ($1, $2, 'signed', 'Document signed', $3, $4)`,
        [req.params.id, req.params.signerId, req.ip, req.get('user-agent')]
      );

      await client.query('COMMIT');
      res.json({ message: 'Document signed successfully' });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error signing document:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Decline document
router.post('/documents/:id/decline/:signerId', async (req, res) => {
  try {
    const { decline_reason } = req.body;

    await pool.query(
      `UPDATE esign_signers 
       SET status = 'declined', declined_at = CURRENT_TIMESTAMP, decline_reason = $1 
       WHERE id = $2`,
      [decline_reason, req.params.signerId]
    );

    await pool.query(
      `UPDATE esign_documents SET status = 'declined' WHERE id = $1`,
      [req.params.id]
    );

    await pool.query(
      `INSERT INTO esign_audit_trail (document_id, signer_id, action, description)
       VALUES ($1, $2, 'declined', $3)`,
      [req.params.id, req.params.signerId, decline_reason || 'Document declined']
    );

    res.json({ message: 'Document declined' });
  } catch (error) {
    console.error('Error declining document:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get document file
router.get('/files/:filename', async (req, res) => {
  try {
    const filePath = path.join(__dirname, '../../uploads/esignature', req.params.filename);
    res.sendFile(filePath);
  } catch (error) {
    console.error('Error serving file:', error);
    res.status(404).json({ error: 'File not found' });
  }
});

// ============================================
// E-SIGNATURE TEMPLATES
// ============================================

// Get all templates
router.get('/templates', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM esign_templates WHERE is_active = true ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create template
router.post('/templates', upload.single('file'), async (req, res) => {
  try {
    const { template_name, description, document_type, default_signers, default_fields, created_by } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'File is required' });
    }

    const result = await pool.query(
      `INSERT INTO esign_templates (
        template_name, description, document_type, file_path, file_url,
        default_signers, default_fields, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        template_name,
        description,
        document_type,
        req.file.path,
        `/api/esignature/files/${req.file.filename}`,
        default_signers ? JSON.stringify(default_signers) : null,
        default_fields ? JSON.stringify(default_fields) : null,
        created_by,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// EMAIL NOTIFICATION FUNCTIONS
// ============================================

async function sendSigningEmail(signer: any, document: any) {
  try {
    // In production, integrate with email service (SendGrid, AWS SES, Nodemailer, etc.)
    // This is a placeholder implementation
    
    const signingUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/esignature/sign/${document.id}/${signer.id}`;
    const accessCodeNote = signer.access_code ? `\n\nAccess Code: ${signer.access_code}` : '';
    
    const emailContent = {
      to: signer.signer_email,
      subject: `Action Required: Please Sign ${document.document_name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563EB;">Document Signature Required</h2>
          <p>Hello ${signer.signer_name},</p>
          <p>You have been requested to sign the following document:</p>
          <div style="background: #F6F8FA; padding: 1rem; border-radius: 8px; margin: 1rem 0;">
            <p style="margin: 0;"><strong>Document:</strong> ${document.document_name}</p>
            <p style="margin: 0.5rem 0 0 0;"><strong>Type:</strong> ${document.document_type}</p>
          </div>
          ${document.message ? `<p><strong>Message:</strong> ${document.message}</p>` : ''}
          <p>Please click the button below to review and sign the document:</p>
          <a href="${signingUrl}" 
             style="display: inline-block; padding: 12px 24px; background: #2563EB; color: white; 
                    text-decoration: none; border-radius: 6px; margin: 1rem 0; font-weight: 600;">
            Sign Document
          </a>
          ${accessCodeNote}
          ${document.expires_at ? `<p style="color: #D97706; margin-top: 1rem;"><strong>Note:</strong> This document expires on ${new Date(document.expires_at).toLocaleDateString()}</p>` : ''}
          <p style="color: #64748B; font-size: 0.875rem; margin-top: 2rem;">
            If you did not expect this email, please ignore it.
          </p>
        </div>
      `,
      text: `
        Document Signature Required
        
        Hello ${signer.signer_name},
        
        You have been requested to sign: ${document.document_name}
        Type: ${document.document_type}
        
        ${document.message ? `Message: ${document.message}\n` : ''}
        
        Sign here: ${signingUrl}
        ${accessCodeNote}
        ${document.expires_at ? `\nNote: This document expires on ${new Date(document.expires_at).toLocaleDateString()}` : ''}
      `,
    };

    // TODO: Replace with actual email service integration
    console.log('📧 Email would be sent:', {
      to: emailContent.to,
      subject: emailContent.subject,
    });

    // Example with Nodemailer (uncomment and configure):
    /*
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    
    await transporter.sendMail(emailContent);
    */

    return true;
  } catch (error) {
    console.error('Error sending signing email:', error);
    // Don't throw - email failure shouldn't block the signing process
    return false;
  }
}

async function sendCompletionEmails(document: any) {
  try {
    // Get all signers
    const signers = await pool.query(
      'SELECT * FROM esign_signers WHERE document_id = $1',
      [document.id]
    );

    const downloadUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/esignature/documents/${document.id}/download`;

    for (const signer of signers.rows) {
      const emailContent = {
        to: signer.signer_email,
        subject: `Document Signed: ${document.document_name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #059669;">Document Successfully Signed</h2>
            <p>Hello ${signer.signer_name},</p>
            <p>The document <strong>${document.document_name}</strong> has been fully signed by all parties.</p>
            <p>You can download a copy of the signed document using the link below:</p>
            <a href="${downloadUrl}" 
               style="display: inline-block; padding: 12px 24px; background: #059669; color: white; 
                      text-decoration: none; border-radius: 6px; margin: 1rem 0; font-weight: 600;">
              Download Signed Document
            </a>
          </div>
        `,
      };

      // TODO: Replace with actual email service
      console.log('📧 Completion email would be sent to:', signer.signer_email);
    }

    return true;
  } catch (error) {
    console.error('Error sending completion emails:', error);
    return false;
  }
}

export default router;

