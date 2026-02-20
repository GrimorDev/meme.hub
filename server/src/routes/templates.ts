import { Router } from 'express';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/templates?scope=public|mine — lista szablonów
router.get('/', requireAuth, async (req, res) => {
  try {
    const scope = req.query.scope as string | undefined;
    const userId = req.session.userId!;

    const where = scope === 'mine'
      ? { uploaderId: userId }
      : { isPublic: true };

    const templates = await prisma.template.findMany({
      where,
      include: { uploader: { select: { username: true, avatarColor: true, avatarUrl: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(templates);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// POST /api/templates — dodaj szablon
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, url, isPublic } = req.body as { name?: string; url?: string; isPublic?: boolean };
    if (!name || !url) { res.status(400).json({ error: 'Brak nazwy lub URL' }); return; }
    const template = await prisma.template.create({
      data: {
        name: name.trim(),
        url,
        uploaderId: req.session.userId!,
        isPublic: isPublic === true,
      },
      include: { uploader: { select: { username: true, avatarColor: true, avatarUrl: true } } },
    });
    res.status(201).json(template);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// DELETE /api/templates/:id — usuń szablon (tylko właściciel lub admin)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const template = await prisma.template.findUnique({ where: { id: req.params.id } });
    if (!template) { res.status(404).json({ error: 'Nie znaleziono' }); return; }

    const user = await prisma.user.findUnique({ where: { id: req.session.userId! } });
    if (template.uploaderId !== req.session.userId && user?.role !== 'admin') {
      res.status(403).json({ error: 'Brak uprawnień' }); return;
    }
    await prisma.template.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// PATCH /api/templates/:id/publish — udostępnij publicznie (właściciel)
router.patch('/:id/publish', requireAuth, async (req, res) => {
  try {
    const template = await prisma.template.findUnique({ where: { id: req.params.id } });
    if (!template) { res.status(404).json({ error: 'Nie znaleziono' }); return; }
    if (template.uploaderId !== req.session.userId) { res.status(403).json({ error: 'Brak uprawnień' }); return; }

    const updated = await prisma.template.update({
      where: { id: req.params.id },
      data: { isPublic: !template.isPublic },
    });
    res.json({ isPublic: updated.isPublic });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

export default router;
