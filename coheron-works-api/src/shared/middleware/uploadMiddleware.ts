import multer from 'multer';
import crypto from 'crypto';
import path from 'path';
import { Request, Response, NextFunction } from 'express';
import { uploadFile } from '../../modules/crossmodule/services/storageService.js';
import { FileStorage } from '../models/FileStorage.js';
import logger from '../utils/logger.js';

const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

export function s3Upload(fieldName: string) {
  return [
    upload.single(fieldName),
    async (req: Request, _res: Response, next: NextFunction) => {
      if (!req.file) return next();

      try {
        const ext = path.extname(req.file.originalname);
        const key = `uploads/${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;

        await uploadFile(key, req.file.buffer, req.file.mimetype);

        const record = await FileStorage.create({
          original_name: req.file.originalname,
          storage_key: key,
          mime_type: req.file.mimetype,
          size: req.file.size,
          uploaded_by: (req as any).user?.id,
          tenant_id: (req as any).user?.tenant_id,
        });

        (req as any).fileRecord = record;
        (req as any).storageKey = key;
        next();
      } catch (err) {
        logger.error({ err }, 'S3 upload failed');
        next(err);
      }
    },
  ];
}

export function s3UploadMultiple(fieldName: string, maxCount: number) {
  return [
    upload.array(fieldName, maxCount),
    async (req: Request, _res: Response, next: NextFunction) => {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) return next();

      try {
        const records = [];
        for (const file of files) {
          const ext = path.extname(file.originalname);
          const key = `uploads/${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;

          await uploadFile(key, file.buffer, file.mimetype);

          const record = await FileStorage.create({
            original_name: file.originalname,
            storage_key: key,
            mime_type: file.mimetype,
            size: file.size,
            uploaded_by: (req as any).user?.id,
            tenant_id: (req as any).user?.tenant_id,
          });
          records.push(record);
        }

        (req as any).fileRecords = records;
        next();
      } catch (err) {
        logger.error({ err }, 'S3 multi-upload failed');
        next(err);
      }
    },
  ];
}
