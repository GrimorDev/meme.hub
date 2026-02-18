import { Router } from 'express';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { formatUser, formatPost } from '../utils.js';

const router = Router();

router.get('/id/:id', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) {
      res.status(404).json({ error: 'Nie znaleziono użytkownika' });
      return;
    }
    res.json(formatUser(user));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

router.get('/:username/stats', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { username: req.params.username },
    });
    if (!user) {
      res.status(404).json({ error: 'Nie znaleziono użytkownika' });
      return;
    }

    const posts = await prisma.memePost.findMany({
      where: { authorId: user.id },
      include: { _count: { select: { likes: true } } },
    });
    const totalLikes = posts.reduce((acc, p) => acc + p._count.likes, 0);
    res.json({ postCount: posts.length, totalLikes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

router.get('/:username/posts', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { username: req.params.username },
    });
    if (!user) {
      res.status(404).json({ error: 'Nie znaleziono użytkownika' });
      return;
    }

    const posts = await prisma.memePost.findMany({
      where: { authorId: user.id },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatarColor: true,
            avatarUrl: true,
          },
        },
        tags: { include: { tag: true } },
        likes: { select: { userId: true } },
        _count: { select: { comments: true, likes: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(posts.map((p) => formatPost(p, req.session.userId)));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

router.get('/:username', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { username: req.params.username },
    });
    if (!user) {
      res.status(404).json({ error: 'Nie znaleziono użytkownika' });
      return;
    }
    res.json(formatUser(user));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  try {
    if (req.params.id !== req.session.userId) {
      res.status(403).json({ error: 'Brak uprawnień' });
      return;
    }
    const { description, avatarUrl, bannerUrl, settings } = req.body as {
      description?: string;
      avatarUrl?: string;
      bannerUrl?: string;
      settings?: object;
    };
    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        ...(description !== undefined && { description }),
        ...(avatarUrl !== undefined && { avatarUrl }),
        ...(bannerUrl !== undefined && { bannerUrl }),
        ...(settings !== undefined && { settings }),
      },
    });
    res.json(formatUser(updated));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

export default router;
