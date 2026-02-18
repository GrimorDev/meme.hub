import { Router } from 'express';
import { prisma } from '../db.js';
import { formatPost } from '../utils.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { q } = req.query as { q?: string };
    if (!q || q.length < 2) {
      res.json({ posts: [], users: [], tags: [] });
      return;
    }

    const currentUserId = req.session.userId;

    const [posts, users, tags] = await Promise.all([
      prisma.memePost.findMany({
        where: {
          OR: [
            { caption: { contains: q, mode: 'insensitive' } },
            {
              tags: {
                some: { tag: { name: { contains: q.toLowerCase() } } },
              },
            },
          ],
        },
        take: 5,
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
      }),
      prisma.user.findMany({
        where: { username: { contains: q, mode: 'insensitive' } },
        take: 5,
        select: {
          id: true,
          username: true,
          avatarColor: true,
          avatarUrl: true,
        },
      }),
      prisma.tag.findMany({
        where: { name: { contains: q.toLowerCase() } },
        take: 8,
        select: { name: true },
      }),
    ]);

    res.json({
      posts: posts.map((p) => formatPost(p, currentUserId)),
      users,
      tags: tags.map((t) => t.name),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

export default router;
