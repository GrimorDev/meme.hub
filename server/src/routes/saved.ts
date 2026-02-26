import { Router } from 'express';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { formatPost } from '../utils.js';

const router = Router();

const POST_INCLUDE = {
  author: { select: { id: true, username: true, role: true, avatarColor: true, avatarUrl: true } },
  tags: { include: { tag: true } },
  likes: { select: { userId: true } },
  _count: { select: { comments: true, likes: true } },
} as const;

// GET /api/saved — lista zapisanych memów bieżącego użytkownika
router.get('/', requireAuth, async (req, res) => {
  try {
    const saved = await prisma.savedPost.findMany({
      where: { userId: req.session.userId! },
      include: { post: { include: POST_INCLUDE } },
      orderBy: { savedAt: 'desc' },
    });
    res.json(saved.map(s => ({
      ...formatPost(s.post, req.session.userId),
      savedAt: s.savedAt,
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// POST /api/saved/:postId — zapisz / odznacz mema
router.post('/:postId', requireAuth, async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.session.userId!;
    const existing = await prisma.savedPost.findUnique({
      where: { userId_postId: { userId, postId } },
    });
    if (existing) {
      await prisma.savedPost.delete({ where: { userId_postId: { userId, postId } } });
      res.json({ saved: false });
    } else {
      await prisma.savedPost.create({ data: { userId, postId } });
      res.json({ saved: true });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

export default router;
