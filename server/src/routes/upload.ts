import { Router } from 'express';
import { upload, processImage } from '../middleware/upload.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/', requireAuth, upload.single('file'), processImage, (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'Brak pliku lub nieprawidłowy format' });
    return;
  }
  const url       = `/uploads/${(req.file as any).filename}`;
  const mediaType = (req.file as any).mediaType ?? 'image';
  res.json({ url, mediaType });
});

export default router;
