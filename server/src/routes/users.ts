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
            role: true,
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

const USERNAME_CHANGE_DAYS = 60;

router.put('/:id', requireAuth, async (req, res) => {
  try {
    if (req.params.id !== req.session.userId) {
      res.status(403).json({ error: 'Brak uprawnień' });
      return;
    }
    const { username, description, avatarUrl, bannerUrl, settings } = req.body as {
      username?: string;
      description?: string;
      avatarUrl?: string;
      bannerUrl?: string;
      settings?: object;
    };

    // ── Zmiana nazwy użytkownika z limitem 60 dni ──────────────
    let usernameUpdate: { username?: string; usernameChangedAt?: Date } = {};
    if (username !== undefined) {
      // Walidacja formatu
      const val = username.trim();
      if (val.length < 3)                       { res.status(400).json({ error: 'Min. 3 znaki' }); return; }
      if (val.length > 20)                      { res.status(400).json({ error: 'Maks. 20 znaków' }); return; }
      if (!/^[A-Za-z0-9_-]+$/.test(val))        { res.status(400).json({ error: 'Tylko litery, cyfry, _ i -' }); return; }

      // Sprawdź czy nie za wcześnie
      const current = await prisma.user.findUnique({ where: { id: req.params.id }, select: { username: true, usernameChangedAt: true } });
      if (!current) { res.status(404).json({ error: 'Nie znaleziono użytkownika' }); return; }

      if (val !== current.username) {
        if (current.usernameChangedAt) {
          const daysSince = (Date.now() - current.usernameChangedAt.getTime()) / 86_400_000;
          if (daysSince < USERNAME_CHANGE_DAYS) {
            const remaining = Math.ceil(USERNAME_CHANGE_DAYS - daysSince);
            res.status(429).json({ error: `Możesz zmienić nazwę za ${remaining} ${remaining === 1 ? 'dzień' : remaining < 5 ? 'dni' : 'dni'}` });
            return;
          }
        }
        usernameUpdate = { username: val, usernameChangedAt: new Date() };
      }
    }

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        ...usernameUpdate,
        ...(description !== undefined && { description }),
        ...(avatarUrl !== undefined && { avatarUrl }),
        ...(bannerUrl !== undefined && { bannerUrl }),
        ...(settings !== undefined && { settings }),
      },
    });
    res.json(formatUser(updated));
  } catch (err: any) {
    if (err.code === 'P2002') {
      res.status(409).json({ error: 'Ta nazwa użytkownika jest już zajęta' });
      return;
    }
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

export default router;
