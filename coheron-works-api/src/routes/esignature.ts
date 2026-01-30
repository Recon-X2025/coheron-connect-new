import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import EsignDocument from '../models/EsignDocument.js';
import EsignSigner from '../models/EsignSigner.js';
import EsignField from '../models/EsignField.js';
import EsignAuditTrail from '../models/EsignAuditTrail.js';
import EsignTemplate from '../models/EsignTemplate.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { getPaginationParams, paginateQuery } from '../utils/pagination.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

const upload = multer({
  dest: 'uploads/esignature/',
  limits: { fileSize: 10 * 1024 * 1024 },
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
router.get('/documents', asyncHandler(async (req, res) => {
  const { status, document_type, related_record_type, related_record_id } = req.query;
  const filter: any = {};

  if (status) filter.status = status;
  if (document_type) filter.document_type = document_type;
  if (related_record_type) filter.related_record_type = related_record_type;
  if (related_record_id) filter.related_record_id = related_record_id;

  const pagination = getPaginationParams(req);
  const paginatedResult = await paginateQuery(
    EsignDocument.find(filter)
      .populate('created_by', 'name')
      .sort({ created_at: -1 })
      .lean(),
    pagination, filter, EsignDocument
  );

  // Get signer counts
  const data = await Promise.all(paginatedResult.data.map(async (doc: any) => {
    const signers = await EsignSigner.find({ document_id: doc._id });
    return {
      ...doc,
      created_by_name: doc.created_by?.name,
      total_signers: signers.length,
      signed_count: signers.filter((s: any) => s.status === 'signed').length,
    };
  }));

  res.json({ data, pagination: paginatedResult.pagination });
}));

// Get document by ID with full details
router.get('/documents/:id', asyncHandler(async (req, res) => {
  const document = await EsignDocument.findById(req.params.id).lean();
  if (!document) {
    return res.status(404).json({ error: 'Document not found' });
  }

  const [signers, fields, auditTrail] = await Promise.all([
    EsignSigner.find({ document_id: req.params.id }).sort({ signer_order: 1 }).lean(),
    EsignField.find({ document_id: req.params.id }).sort({ page_number: 1, y_position: 1 }).lean(),
    EsignAuditTrail.find({ document_id: req.params.id })
      .populate('signer_id', 'signer_name signer_email')
      .sort({ created_at: -1 })
      .lean(),
  ]);

  const auditResult = auditTrail.map((a: any) => ({
    ...a,
    signer_name: a.signer_id?.signer_name,
    signer_email: a.signer_id?.signer_email,
  }));

  res.json({
    ...document,
    signers,
    fields,
    audit_trail: auditResult,
  });
}));

// Create document (with file upload)
router.post('/documents', upload.single('file'), asyncHandler(async (req, res) => {
  const {
    document_name, document_type, related_record_type, related_record_id,
    created_by, expires_at, message, reminder_enabled, reminder_frequency,
    signers, fields,
  } = req.body;

  if (!req.file) {
    return res.status(400).json({ error: 'File is required' });
  }

  const document = await EsignDocument.create({
    document_name,
    document_type: document_type || 'other',
    file_path: req.file.path,
    file_url: `/api/esignature/files/${req.file.filename}`,
    file_size: req.file.size,
    mime_type: req.file.mimetype,
    related_record_type, related_record_id, created_by, expires_at, message,
    reminder_enabled: reminder_enabled !== 'false',
    reminder_frequency: reminder_frequency || 3,
    status: 'draft',
  });

  // Add signers
  const signersArray = typeof signers === 'string' ? JSON.parse(signers) : signers || [];
  for (let i = 0; i < signersArray.length; i++) {
    const signer = signersArray[i];
    await EsignSigner.create({
      document_id: document._id,
      signer_order: i + 1,
      signer_name: signer.name,
      signer_email: signer.email,
      signer_role: signer.role || 'signer',
      authentication_method: signer.authentication_method || 'email',
      access_code: signer.access_code || null,
    });
  }

  // Add fields
  const fieldsArray = typeof fields === 'string' ? JSON.parse(fields) : fields || [];
  for (const field of fieldsArray) {
    await EsignField.create({
      document_id: document._id,
      signer_id: field.signer_id || null,
      field_type: field.field_type,
      field_name: field.field_name,
      page_number: field.page_number,
      x_position: field.x_position,
      y_position: field.y_position,
      width: field.width || 200,
      height: field.height || 50,
      required: field.required !== false,
    });
  }

  // Add audit trail
  await EsignAuditTrail.create({
    document_id: document._id,
    action: 'document_created',
    description: 'Document created',
    metadata: { created_by, file_name: req.file.originalname },
  });

  res.status(201).json(document);
}));

// Send document for signing
router.post('/documents/:id/send', asyncHandler(async (req, res) => {
  const document = await EsignDocument.findById(req.params.id);
  if (!document) {
    return res.status(404).json({ error: 'Document not found' });
  }

  const signers = await EsignSigner.find({ document_id: req.params.id }).sort({ signer_order: 1 });
  if (signers.length === 0) {
    return res.status(400).json({ error: 'No signers found for this document' });
  }

  await EsignDocument.findByIdAndUpdate(req.params.id, { status: 'sent' });

  const firstSigner = signers[0];
  await EsignSigner.findByIdAndUpdate(firstSigner._id, { status: 'sent', sent_at: new Date() });

  await EsignAuditTrail.create({
    document_id: req.params.id,
    action: 'document_sent',
    description: 'Document sent for signing',
  });

  await sendSigningEmail(firstSigner, document);

  res.json({ message: 'Document sent successfully', next_signer: firstSigner });
}));

// Sign document
router.post('/documents/:id/sign/:signerId', asyncHandler(async (req, res) => {
  const { signature_data, signature_type, access_code, fields } = req.body;

  const signer = await EsignSigner.findOne({ _id: req.params.signerId, document_id: req.params.id });
  if (!signer) {
    return res.status(404).json({ error: 'Signer not found' });
  }

  if (signer.access_code && access_code !== signer.access_code) {
    return res.status(401).json({ error: 'Invalid access code' });
  }

  if (signer.status === 'signed') {
    return res.status(400).json({ error: 'Document already signed by this signer' });
  }

  await EsignSigner.findByIdAndUpdate(req.params.signerId, {
    status: 'signed',
    signed_at: new Date(),
    signature_data,
    signature_type: signature_type || 'draw',
    ip_address: req.ip,
    user_agent: req.get('user-agent'),
  });

  if (fields && Array.isArray(fields)) {
    for (const field of fields) {
      await EsignField.findOneAndUpdate(
        { _id: field.field_id, document_id: req.params.id },
        { value: field.value, filled_at: new Date() }
      );
    }
  }

  const allSigners = await EsignSigner.find({ document_id: req.params.id });
  const signedCount = allSigners.filter(s => s.status === 'signed').length + 1;

  if (signedCount >= allSigners.length) {
    await EsignDocument.findByIdAndUpdate(req.params.id, { status: 'completed', completed_at: new Date() });

    const doc = await EsignDocument.findById(req.params.id);
    if (doc?.related_record_type === 'contract' && doc?.related_record_id) {
      try {
        const mongoose = await import('mongoose');
        const Contract = mongoose.default.model('Contract');
        await Contract.findByIdAndUpdate(doc.related_record_id, {
          signed_at: new Date(),
          signed_by: signer.signer_email,
          esign_document_id: req.params.id,
          status: 'active',
        });
      } catch (e) { /* Contract model may not exist */ }
    }

    const docForEmail = await EsignDocument.findById(req.params.id);
    if (docForEmail) await sendCompletionEmails(docForEmail);
  } else {
    const nextSigner = await EsignSigner.findOne({
      document_id: req.params.id,
      signer_order: signer.signer_order + 1,
    });

    if (nextSigner) {
      await EsignSigner.findByIdAndUpdate(nextSigner._id, { status: 'sent', sent_at: new Date() });
      const doc = await EsignDocument.findById(req.params.id);
      if (doc) await sendSigningEmail(nextSigner, doc);
    } else {
      const doc = await EsignDocument.findById(req.params.id);
      if (doc) await sendCompletionEmails(doc);
    }
  }

  await EsignAuditTrail.create({
    document_id: req.params.id,
    signer_id: req.params.signerId,
    action: 'signed',
    description: 'Document signed',
    ip_address: req.ip,
    user_agent: req.get('user-agent'),
  });

  res.json({ message: 'Document signed successfully' });
}));

// Decline document
router.post('/documents/:id/decline/:signerId', asyncHandler(async (req, res) => {
  const { decline_reason } = req.body;

  await EsignSigner.findByIdAndUpdate(req.params.signerId, {
    status: 'declined', declined_at: new Date(), decline_reason,
  });

  await EsignDocument.findByIdAndUpdate(req.params.id, { status: 'declined' });

  await EsignAuditTrail.create({
    document_id: req.params.id,
    signer_id: req.params.signerId,
    action: 'declined',
    description: decline_reason || 'Document declined',
  });

  res.json({ message: 'Document declined' });
}));

// Get document file
router.get('/files/:filename', asyncHandler(async (req, res) => {
  const filePath = path.join(__dirname, '../../uploads/esignature', req.params.filename);
  res.sendFile(filePath);
}));

// ============================================
// E-SIGNATURE TEMPLATES
// ============================================

router.get('/templates', asyncHandler(async (req, res) => {
  const templates = await EsignTemplate.find({ is_active: true }).sort({ created_at: -1 }).lean();
  res.json(templates);
}));

router.post('/templates', upload.single('file'), asyncHandler(async (req, res) => {
  const { template_name, description, document_type, default_signers, default_fields, created_by } = req.body;

  if (!req.file) {
    return res.status(400).json({ error: 'File is required' });
  }

  const template = await EsignTemplate.create({
    template_name, description, document_type,
    file_path: req.file.path,
    file_url: `/api/esignature/files/${req.file.filename}`,
    default_signers: default_signers ? (typeof default_signers === 'string' ? JSON.parse(default_signers) : default_signers) : null,
    default_fields: default_fields ? (typeof default_fields === 'string' ? JSON.parse(default_fields) : default_fields) : null,
    created_by,
  });

  res.status(201).json(template);
}));

// ============================================
// EMAIL NOTIFICATION FUNCTIONS
// ============================================

async function sendSigningEmail(signer: any, document: any) {
  try {
    const signingUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/esignature/sign/${document._id || document.id}/${signer._id || signer.id}`;
    console.log('Email would be sent:', { to: signer.signer_email, subject: `Action Required: Please Sign ${document.document_name}` });
    return true;
  } catch (error) {
    console.error('Error sending signing email:', error);
    return false;
  }
}

async function sendCompletionEmails(document: any) {
  try {
    const signers = await EsignSigner.find({ document_id: document._id || document.id });
    for (const signer of signers) {
      console.log('Completion email would be sent to:', signer.signer_email);
    }
    return true;
  } catch (error) {
    console.error('Error sending completion emails:', error);
    return false;
  }
}

export default router;
