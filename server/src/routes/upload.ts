import path from 'path';
import { Router } from 'express';
import { upload, processImage } from '../middleware/upload.js';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../db.js';
import { addWatermark } from '../watermark.js';

const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads');

const router = Router();

router.post('/', requireAuth, upload.single('file'), processImage, async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'Brak pliku lub nieprawidłowy format' });
    return;
  }

  const filename  = (req.file as any).filename as string;
  const mediaType = (req.file as any).mediaType ?? 'image';
  const url       = `/uploads/${filename}`;

  // Watermark dla WSZYSTKICH mediów postów (obrazki, GIFy, video)
  // — nie dla avatarów, bannerów, komentarzy, wiadomości
  // Frontend sygnalizuje ?type=post w query
  if (req.query.type === 'post' && req.session.userId) {
    const user = await prisma.user.findUnique({
      where:  { id: req.session.userId },
      select: { username: true },
    }).catch(() => null);

    if (user) {
      await addWatermark(path.join(UPLOADS_DIR, filename), user.username);
    }
  }

  res.json({ url, mediaType });
});

export default router;
