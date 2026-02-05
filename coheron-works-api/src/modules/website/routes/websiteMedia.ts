import express from 'express';
import { WebsiteMedia } from '../../../models/WebsiteMedia.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { getPaginationParams, paginateQuery } from '../../../shared/utils/pagination.js';
import { authenticate } from '../../../shared/middleware/permissions.js';

const router = express.Router();

// Get all media
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { site_id, mime_type, search } = req.query;
  const filter: any = {};

  if (site_id) filter.site_id = site_id;
  if (mime_type) filter.mime_type = { $regex: mime_type, $options: 'i' };
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { alt_text: { $regex: search, $options: 'i' } },
    ];
  }

  const pagination = getPaginationParams(req);
  const paginatedResult = await paginateQuery(
    WebsiteMedia.find(filter).sort({ created_at: -1 }).lean(),
    pagination, filter, WebsiteMedia
  );

  res.json(paginatedResult);
}));

// Get media by ID
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const media = await WebsiteMedia.findById(req.params.id).lean();
  if (!media) {
    return res.status(404).json({ error: 'Media not found' });
  }
  res.json(media);
}));

// Create media
router.post('/', authenticate, asyncHandler(async (req, res) => {
  const { name, file_url, file_path, mime_type, file_size, width, height, alt_text, description, site_id, uploaded_by } = req.body;

  const media = await WebsiteMedia.create({
    name, file_url, file_path, mime_type, file_size, width, height, alt_text, description, site_id, uploaded_by,
  });

  res.status(201).json(media);
}));

// Update media
router.put('/:id', authenticate, asyncHandler(async (req, res) => {
  const { name, alt_text, description } = req.body;
  const updateData: any = {};

  if (name !== undefined) updateData.name = name;
  if (alt_text !== undefined) updateData.alt_text = alt_text;
  if (description !== undefined) updateData.description = description;

  const result = await WebsiteMedia.findByIdAndUpdate(req.params.id, updateData, { new: true });
  if (!result) {
    return res.status(404).json({ error: 'Media not found' });
  }

  res.json(result);
}));

// Delete media
router.delete('/:id', authenticate, asyncHandler(async (req, res) => {
  const result = await WebsiteMedia.findByIdAndDelete(req.params.id);
  if (!result) {
    return res.status(404).json({ error: 'Media not found' });
  }
  res.json({ message: 'Media deleted successfully' });
}));

export default router;
