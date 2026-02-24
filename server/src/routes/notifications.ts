import { Router } from 'express';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/notifications — ostatnie 50 powiadomień zalogowanego usera
router.get('/', requireAuth, async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.session.userId! },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json(notifications);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// GET /api/notifications/unread-count — lekki endpoint do pollingu
router.get('/unread-count', requireAuth, async (req, res) => {
  try {
    const count = await prisma.notification.count({
      where: { userId: req.session.userId!, read: false },
    });
    res.json({ count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// PUT /api/notifications/read-all — oznacz wszystkie jako przeczytane
router.put('/read-all', requireAuth, async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.session.userId!, read: false },
      data: { read: true },
    });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// PUT /api/notifications/:id/read — oznacz jedno jako przeczytane
router.put('/:id/read', requireAuth, async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { id: req.params.id, userId: req.session.userId! },
      data: { read: true },
    });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

export default router;
