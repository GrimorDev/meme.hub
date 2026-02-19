import { Router } from 'express';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { formatPost } from '../utils.js';

const router = Router();

// Middleware — tylko admin
const requireAdmin = async (req: any, res: any, next: any) => {
  if (!req.session.userId) {
    res.status(401).json({ error: 'Nie zalogowano' });
    return;
  }
  const user = await prisma.user.findUnique({ where: { id: req.session.userId } });
  if (!user || user.role !== 'admin') {
    res.status(403).json({ error: 'Brak uprawnień administratora' });
    return;
  }
  next();
};

const POST_INCLUDE = {
  author: { select: { id: true, username: true, avatarColor: true, avatarUrl: true } },
  tags: { include: { tag: true } },
  likes: { select: { userId: true } },
  _count: { select: { comments: true, likes: true } },
} as const;

// GET /api/admin/posts — wszystkie posty z raportami
router.get('/posts', requireAdmin, async (req, res) => {
  try {
    const posts = await prisma.memePost.findMany({
      include: {
        ...POST_INCLUDE,
        reports: { select: { id: true, reason: true, createdAt: true, user: { select: { username: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(posts.map(p => ({
      ...formatPost(p, req.session.userId),
      reports: p.reports,
      reportCount: p.reports.length,
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// GET /api/admin/reports — posty ze zgłoszeniami
router.get('/reports', requireAdmin, async (req, res) => {
  try {
    const reports = await prisma.report.findMany({
      include: {
        post: {
          include: {
            ...POST_INCLUDE,
          },
        },
        user: { select: { id: true, username: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(reports.map(r => ({
      id: r.id,
      reason: r.reason,
      createdAt: r.createdAt,
      reporter: r.user.username,
      post: formatPost(r.post, req.session.userId),
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// DELETE /api/admin/posts/:id — usuń post
router.delete('/posts/:id', requireAdmin, async (req, res) => {
  try {
    await prisma.memePost.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// DELETE /api/admin/reports/:id — usuń zgłoszenie
router.delete('/reports/:id', requireAdmin, async (req, res) => {
  try {
    await prisma.report.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// GET /api/admin/users — lista użytkowników
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true, username: true, email: true, role: true, banned: true,
        avatarColor: true, avatarUrl: true, createdAt: true,
        _count: { select: { posts: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// POST /api/admin/users/:id/ban — zbanuj / odbanuj
router.post('/users/:id/ban', requireAdmin, async (req, res) => {
  try {
    const target = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!target) { res.status(404).json({ error: 'Nie znaleziono użytkownika' }); return; }
    if (target.role === 'admin') { res.status(403).json({ error: 'Nie można zbanować admina' }); return; }
    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { banned: !target.banned },
    });
    res.json({ banned: updated.banned });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// POST /api/admin/reports — utwórz zgłoszenie (dostępne dla zalogowanych)
router.post('/reports', requireAuth, async (req, res) => {
  try {
    const { postId, reason } = req.body as { postId?: string; reason?: string };
    if (!postId || !reason) { res.status(400).json({ error: 'Brak danych' }); return; }
    const existing = await prisma.report.findFirst({
      where: { postId, userId: req.session.userId },
    });
    if (existing) { res.status(409).json({ error: 'Już zgłosiłeś ten post' }); return; }
    const report = await prisma.report.create({
      data: { postId, userId: req.session.userId!, reason },
    });
    res.status(201).json(report);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

export default router;
