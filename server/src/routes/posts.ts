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

const PAGE_SIZE = 15;

router.get('/', async (req, res) => {
  try {
    const {
      sort = 'HOT',
      tag,
      q,
      page = '1',
    } = req.query as Record<string, string>;
    const currentUserId = req.session.userId;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const skip = (pageNum - 1) * PAGE_SIZE;

    // NOWE tab: unreviewed posts (featured = false), newest first
    // HOT/FRESH/TOP: only featured posts
    const isNowe = sort === 'NOWE';

    const whereBase: any = {
      ...(isNowe ? { featured: false } : { featured: true }),
      ...(tag
        ? { tags: { some: { tag: { name: tag.toLowerCase() } } } }
        : {}),
      ...(q
        ? {
            OR: [
              { caption: { contains: q, mode: 'insensitive' } },
              {
                tags: {
                  some: { tag: { name: { contains: q.toLowerCase() } } },
                },
              },
            ],
          }
        : {}),
    };

    const [posts, total] = await Promise.all([
      prisma.memePost.findMany({
        where: whereBase,
        include: POST_INCLUDE,
        take: PAGE_SIZE,
        skip,
      }),
      prisma.memePost.count({ where: whereBase }),
    ]);

    if (isNowe || sort === 'FRESH') {
      posts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } else if (sort === 'TOP') {
      posts.sort((a, b) => b._count.likes - a._count.likes);
    } else {
      // HOT
      posts.sort((a, b) => {
        const scoreA =
          a._count.likes * 1000 + Math.floor(a.createdAt.getTime() / 1000);
        const scoreB =
          b._count.likes * 1000 + Math.floor(b.createdAt.getTime() / 1000);
        return scoreB - scoreA;
      });
    }

    res.json({
      posts: posts.map((p) => formatPost(p, currentUserId)),
      total,
      page: pageNum,
      totalPages: Math.ceil(total / PAGE_SIZE),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const post = await prisma.memePost.findUnique({
      where: { id: req.params.id },
      include: POST_INCLUDE,
    });
    if (!post) {
      res.status(404).json({ error: 'Nie znaleziono posta' });
      return;
    }
    res.json(formatPost(post, req.session.userId));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      caption,
      url,
      tags = [],
      description,
    } = req.body as {
      caption?: string;
      url?: string;
      tags?: string[];
      description?: string;
    };

    if (!url || !caption) {
      res.status(400).json({ error: 'URL i opis są wymagane' });
      return;
    }

    const tagNames: string[] = Array.isArray(tags) ? tags : [tags];

    const tagUpserts = await Promise.all(
      tagNames.filter(Boolean).map(async (name) => {
        const tag = await prisma.tag.upsert({
          where: { name: name.toLowerCase() },
          update: {},
          create: { name: name.toLowerCase() },
        });
        return { tagId: tag.id };
      }),
    );

    const post = await prisma.memePost.create({
      data: {
        caption,
        url,
        description,
        authorId: req.session.userId!,
        featured: false,
        tags: { create: tagUpserts },
      },
      include: POST_INCLUDE,
    });

    res.status(201).json(formatPost(post, req.session.userId));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const post = await prisma.memePost.findUnique({
      where: { id: req.params.id },
    });
    if (!post) {
      res.status(404).json({ error: 'Nie znaleziono posta' });
      return;
    }
    if (post.authorId !== req.session.userId) {
      res.status(403).json({ error: 'Brak uprawnień' });
      return;
    }
    await prisma.memePost.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  try {
    const post = await prisma.memePost.findUnique({
      where: { id: req.params.id },
    });
    if (!post) {
      res.status(404).json({ error: 'Nie znaleziono posta' });
      return;
    }
    if (post.authorId !== req.session.userId) {
      res.status(403).json({ error: 'Brak uprawnień' });
      return;
    }
    const { caption, description } = req.body as {
      caption?: string;
      description?: string;
    };
    const updated = await prisma.memePost.update({
      where: { id: req.params.id },
      data: {
        ...(caption !== undefined && { caption }),
        ...(description !== undefined && { description }),
      },
      include: POST_INCLUDE,
    });
    res.json(formatPost(updated, req.session.userId));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

router.post('/:id/like', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    const postId = req.params.id;

    const existing = await prisma.postLike.findUnique({
      where: { userId_postId: { userId, postId } },
    });

    if (existing) {
      await prisma.postLike.delete({
        where: { userId_postId: { userId, postId } },
      });
      res.json({ liked: false });
    } else {
      await prisma.postLike.create({ data: { userId, postId } });
      res.json({ liked: true });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

export default router;
