import express from 'express';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { s3Upload, s3UploadMultiple } from '../../../shared/middleware/uploadMiddleware.js';
import { getPresignedDownloadUrl, deleteFile } from '../services/storageService.js';
import { FileStorage } from '../../../shared/models/FileStorage.js';

const router = express.Router();

// Upload single file
router.post('/upload', ...s3Upload('file'), asyncHandler(async (req, res) => {
  const record = (req as any).fileRecord;
  if (!record) {
    return res.status(400).json({ error: 'No file provided' });
  }
  res.status(201).json(record);
}));

// Upload multiple files
router.post('/upload-multiple', ...s3UploadMultiple('files', 10), asyncHandler(async (req, res) => {
  const records = (req as any).fileRecords;
  if (!records || records.length === 0) {
    return res.status(400).json({ error: 'No files provided' });
  }
  res.status(201).json(records);
}));

// Get presigned download URL
router.get('/download/:id', asyncHandler(async (req, res) => {
  const file = await FileStorage.findById(req.params.id);
  if (!file) {
    return res.status(404).json({ error: 'File not found' });
  }
  const url = await getPresignedDownloadUrl(file.storage_key);
  res.json({ url, original_name: file.original_name, mime_type: file.mime_type });
}));

// Delete file
router.delete('/:id', asyncHandler(async (req, res) => {
  const file = await FileStorage.findById(req.params.id);
  if (!file) {
    return res.status(404).json({ error: 'File not found' });
  }
  await deleteFile(file.storage_key);
  await FileStorage.findByIdAndDelete(req.params.id);
  res.json({ message: 'File deleted successfully' });
}));

export default router;
