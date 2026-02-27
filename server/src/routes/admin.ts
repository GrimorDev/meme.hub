import { Router } from 'express';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { formatPost } from '../utils.js';

const router = Router();

// Middleware — tylko admin (superadmin)
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
  (req as any).currentUser = user;
  next();
};

// Middleware — admin lub moderator
const requireStaff = async (req: any, res: any, next: any) => {
  if (!req.session.userId) {
    res.status(401).json({ error: 'Nie zalogowano' });
    return;
  }
  const user = await prisma.user.findUnique({ where: { id: req.session.userId } });
  if (!user || (user.role !== 'admin' && user.role !== 'moderator')) {
    res.status(403).json({ error: 'Brak uprawnień' });
    return;
  }
  (req as any).currentUser = user;
  next();
};

const POST_INCLUDE = {
  author: { select: { id: true, username: true, role: true, avatarColor: true, avatarUrl: true } },
  tags: { include: { tag: true } },
  likes: { select: { userId: true } },
  _count: { select: { comments: true, likes: true } },
} as const;

// GET /api/admin/posts — wszystkie posty z raportami
router.get('/posts', requireStaff, async (req, res) => {
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
      featured: (p as any).featured,
      reports: p.reports,
      reportCount: p.reports.length,
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// GET /api/admin/reports — posty ze zgłoszeniami
router.get('/reports', requireStaff, async (req, res) => {
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
router.delete('/posts/:id', requireStaff, async (req, res) => {
  try {
    await prisma.memePost.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// DELETE /api/admin/reports/:id — usuń zgłoszenie
router.delete('/reports/:id', requireStaff, async (req, res) => {
  try {
    await prisma.report.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// GET /api/admin/users — lista użytkowników
router.get('/users', requireStaff, async (req, res) => {
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
router.post('/users/:id/ban', requireStaff, async (req, res) => {
  try {
    const executor = (req as any).currentUser;
    const target = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!target) { res.status(404).json({ error: 'Nie znaleziono użytkownika' }); return; }
    // Admin nie może być zbanowany przez nikogo; moderator nie może banować adminów ani moderatorów
    if (target.role === 'admin') { res.status(403).json({ error: 'Nie można zbanować admina' }); return; }
    if (executor.role === 'moderator' && target.role === 'moderator') {
      res.status(403).json({ error: 'Moderator nie może banować innego moderatora' }); return;
    }
    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { banned: !target.banned },
    });

    // Zapisz historię bana
    const { reason } = req.body as { reason?: string };
    prisma.banHistory.create({
      data: {
        userId:  req.params.id,
        adminId: req.session.userId!,
        action:  updated.banned ? 'ban' : 'unban',
        reason:  reason ?? null,
      },
    }).catch(console.error);

    res.json({ banned: updated.banned });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// POST /api/admin/reports — utwórz zgłoszenie posta (dostępne dla zalogowanych)
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

// POST /api/admin/user-reports — zgłoś użytkownika (zalogowani)
router.post('/user-reports', requireAuth, async (req, res) => {
  try {
    const { targetUserId, reason } = req.body as { targetUserId?: string; reason?: string };
    if (!targetUserId || !reason) { res.status(400).json({ error: 'Brak danych' }); return; }
    if (targetUserId === req.session.userId) { res.status(400).json({ error: 'Nie możesz zgłosić siebie' }); return; }
    const existing = await prisma.userReport.findUnique({
      where: { targetUserId_reporterId: { targetUserId, reporterId: req.session.userId! } },
    });
    if (existing) { res.status(409).json({ error: 'Już zgłosiłeś tego użytkownika' }); return; }
    const report = await prisma.userReport.create({
      data: { targetUserId, reporterId: req.session.userId!, reason },
    });
    res.status(201).json(report);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// GET /api/admin/user-reports — lista zgłoszeń profili
router.get('/user-reports', requireStaff, async (req, res) => {
  try {
    const reports = await prisma.userReport.findMany({
      include: {
        targetUser: { select: { id: true, username: true, avatarColor: true, avatarUrl: true, role: true, banned: true } },
        reporter: { select: { id: true, username: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(reports.map(r => ({
      id: r.id,
      reason: r.reason,
      createdAt: r.createdAt,
      reporter: r.reporter.username,
      targetUser: r.targetUser,
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// DELETE /api/admin/user-reports/:id — odrzuć zgłoszenie profilu
router.delete('/user-reports/:id', requireStaff, async (req, res) => {
  try {
    await prisma.userReport.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// POST /api/admin/posts/:id/feature — promuj / cofnij post z kolejki
router.post('/posts/:id/feature', requireStaff, async (req, res) => {
  try {
    const post = await prisma.memePost.findUnique({ where: { id: req.params.id } });
    if (!post) { res.status(404).json({ error: 'Nie znaleziono posta' }); return; }
    const updated = await prisma.memePost.update({
      where: { id: req.params.id },
      data: { featured: !post.featured },
    });

    // Powiadom autora gdy mem trafia na główny feed (false → true)
    if (!post.featured) {
      prisma.notification.create({
        data: {
          userId: post.authorId,
          type:   'featured',
          title:  'Twój mem na głównym feedzie! 🎉',
          body:   'Twój mem trafił na główny feed! Gratulacje',
          link:   `/meme/${post.id}`,
        },
      }).catch((err) => console.error('Featured notification error:', err));
    }

    res.json({ featured: updated.featured });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// POST /api/admin/users/:id/role — zmień rolę użytkownika (tylko admin)
router.post('/users/:id/role', requireAdmin, async (req, res) => {
  try {
    const { role } = req.body as { role?: string };
    if (!role || !['user', 'moderator', 'admin'].includes(role)) {
      res.status(400).json({ error: 'Nieprawidłowa rola' });
      return;
    }
    // Nie można odebrać sobie roli admina
    if (req.params.id === req.session.userId && role !== 'admin') {
      res.status(403).json({ error: 'Nie możesz odebrać sobie roli admina' });
      return;
    }
    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { role },
    });
    res.json({ role: updated.role });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// GET /api/admin/config — pobierz konfigurację TOP
router.get('/config', requireAdmin, async (_req, res) => {
  try {
    const config = await prisma.siteConfig.upsert({
      where: { id: 'singleton' },
      update: {},
      create: { id: 'singleton', topMetric: 'likes', topPeriod: 7 },
    });
    res.json({ topMetric: config.topMetric, topPeriod: config.topPeriod });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// PUT /api/admin/config — zaktualizuj konfigurację TOP
router.put('/config', requireAdmin, async (req, res) => {
  try {
    const { topMetric, topPeriod } = req.body as { topMetric?: string; topPeriod?: number };
    const validMetrics = ['likes', 'comments', 'combined'];
    const validPeriods = [0, 7, 14, 30, 90];
    if (topMetric && !validMetrics.includes(topMetric)) {
      res.status(400).json({ error: 'Nieprawidłowa metryka' }); return;
    }
    if (topPeriod !== undefined && !validPeriods.includes(topPeriod)) {
      res.status(400).json({ error: 'Nieprawidłowy przedział czasu' }); return;
    }
    const config = await prisma.siteConfig.upsert({
      where: { id: 'singleton' },
      update: {
        ...(topMetric !== undefined && { topMetric }),
        ...(topPeriod !== undefined && { topPeriod }),
      },
      create: {
        id: 'singleton',
        topMetric: topMetric || 'likes',
        topPeriod: topPeriod ?? 7,
      },
    });
    res.json({ topMetric: config.topMetric, topPeriod: config.topPeriod });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// GET /api/admin/stats — statystyki platformy
router.get('/stats', requireAdmin, async (_req, res) => {
  try {
    const now = new Date();
    const d1  = new Date(now.getTime() - 1  * 86400000);
    const d7  = new Date(now.getTime() - 7  * 86400000);
    const d30 = new Date(now.getTime() - 30 * 86400000);

    const [
      totalUsers, newUsers7d, newUsers30d,
      totalPosts, newPosts7d, newPosts1d,
      totalComments, newComments7d,
      totalLikes,
      pendingPosts,
      bannedUsers,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: d7 } } }),
      prisma.user.count({ where: { createdAt: { gte: d30 } } }),
      prisma.memePost.count(),
      prisma.memePost.count({ where: { createdAt: { gte: d7 } } }),
      prisma.memePost.count({ where: { createdAt: { gte: d1 } } }),
      prisma.comment.count(),
      prisma.comment.count({ where: { createdAt: { gte: d7 } } }),
      prisma.postLike.count(),
      prisma.memePost.count({ where: { featured: false } }),
      prisma.user.count({ where: { banned: true } }),
    ]);

    // Rejestracje per dzień (ostatnie 14 dni)
    const regRaw = await prisma.$queryRaw<{ day: Date; count: bigint }[]>`
      SELECT DATE_TRUNC('day', "createdAt") AS day, COUNT(*) AS count
      FROM users
      WHERE "createdAt" >= NOW() - INTERVAL '14 days'
      GROUP BY day ORDER BY day ASC
    `;
    const registrationsChart = regRaw.map(r => ({
      day: r.day.toISOString().slice(0, 10),
      count: Number(r.count),
    }));

    // Posty per dzień (ostatnie 14 dni)
    const postRaw = await prisma.$queryRaw<{ day: Date; count: bigint }[]>`
      SELECT DATE_TRUNC('day', "createdAt") AS day, COUNT(*) AS count
      FROM meme_posts
      WHERE "createdAt" >= NOW() - INTERVAL '14 days'
      GROUP BY day ORDER BY day ASC
    `;
    const postsChart = postRaw.map(r => ({
      day: r.day.toISOString().slice(0, 10),
      count: Number(r.count),
    }));

    res.json({
      totalUsers, newUsers7d, newUsers30d,
      totalPosts, newPosts7d, newPosts1d,
      totalComments, newComments7d,
      totalLikes,
      pendingPosts,
      bannedUsers,
      registrationsChart,
      postsChart,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// GET /api/admin/ban-history/:userId — historia banów konkretnego usera
router.get('/ban-history/:userId', requireAdmin, async (req, res) => {
  try {
    const history = await prisma.banHistory.findMany({
      where: { userId: req.params.userId },
      include: {
        admin: { select: { username: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(history.map(h => ({
      id: h.id,
      action: h.action,
      reason: h.reason,
      createdAt: h.createdAt,
      adminUsername: h.admin.username,
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// GET /api/admin/chat-search — historia czatu 2 użytkowników (tylko admin)
// ?user1=username&user2=username
router.get('/chat-search', requireAdmin, async (req, res) => {
  try {
    const { user1, user2 } = req.query as { user1?: string; user2?: string };
    if (!user1 || !user2) {
      res.status(400).json({ error: 'Podaj obu użytkowników (user1, user2)' }); return;
    }

    const [u1, u2] = await Promise.all([
      prisma.user.findUnique({ where: { username: user1 }, select: { id: true, username: true, avatarColor: true, avatarUrl: true } }),
      prisma.user.findUnique({ where: { username: user2 }, select: { id: true, username: true, avatarColor: true, avatarUrl: true } }),
    ]);

    if (!u1) { res.status(404).json({ error: `Nie znaleziono użytkownika "${user1}"` }); return; }
    if (!u2) { res.status(404).json({ error: `Nie znaleziono użytkownika "${user2}"` }); return; }

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: u1.id, receiverId: u2.id },
          { senderId: u2.id, receiverId: u1.id },
        ],
      },
      include: {
        sender: { select: { id: true, username: true, avatarColor: true, avatarUrl: true } },
        reactions: { select: { id: true, emoji: true, userId: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json({
      user1: u1,
      user2: u2,
      messages: messages.map(m => ({
        id:               m.id,
        senderId:         m.senderId,
        receiverId:       m.receiverId,
        senderUsername:   m.sender.username,
        senderAvatarColor: m.sender.avatarColor,
        senderAvatarUrl:  m.sender.avatarUrl ?? undefined,
        text:             m.text,
        imageUrl:         (m as any).imageUrl ?? undefined,
        read:             m.read,
        createdAt:        m.createdAt.toISOString(),
        reactions:        m.reactions.map(r => ({ id: r.id, emoji: r.emoji, userId: r.userId })),
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// GET /api/admin/me — rola zalogowanego staffu
router.get('/me', requireStaff, async (req, res) => {
  res.json({ role: (req as any).currentUser.role });
});

export default router;
