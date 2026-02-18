import { Router } from 'express';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { formatTimeAgo } from '../utils.js';

const router = Router();

router.get('/posts/:id/comments', async (req, res) => {
  try {
    const comments = await prisma.comment.findMany({
      where: { postId: req.params.id },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatarColor: true,
            avatarUrl: true,
          },
        },
        likes: { select: { userId: true } },
        _count: { select: { likes: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json(
      comments.map((c) => ({
        id: c.id,
        postId: c.postId,
        author: c.author.username,
        authorAvatarColor: c.author.avatarColor,
        authorAvatarUrl: c.author.avatarUrl ?? undefined,
        text: c.text,
        timeAgo: formatTimeAgo(c.createdAt),
        timestamp: c.createdAt.getTime(),
        likes: c._count.likes,
        likedBy: c.likes.map((l) => l.userId),
        parentId: c.parentId ?? undefined,
      })),
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

router.post('/posts/:id/comments', requireAuth, async (req, res) => {
  try {
    const { text, parentId } = req.body as {
      text?: string;
      parentId?: string;
    };
    if (!text?.trim()) {
      res.status(400).json({ error: 'Treść komentarza jest wymagana' });
      return;
    }

    const comment = await prisma.comment.create({
      data: {
        text: text.trim(),
        postId: req.params.id,
        authorId: req.session.userId!,
        parentId: parentId ?? null,
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatarColor: true,
            avatarUrl: true,
          },
        },
        _count: { select: { likes: true } },
      },
    });

    res.status(201).json({
      id: comment.id,
      postId: comment.postId,
      author: comment.author.username,
      authorAvatarColor: comment.author.avatarColor,
      authorAvatarUrl: comment.author.avatarUrl ?? undefined,
      text: comment.text,
      timeAgo: 'Teraz',
      timestamp: comment.createdAt.getTime(),
      likes: 0,
      likedBy: [],
      parentId: comment.parentId ?? undefined,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

router.post('/comments/:id/like', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    const commentId = req.params.id;

    const existing = await prisma.commentLike.findUnique({
      where: { userId_commentId: { userId, commentId } },
    });

    if (existing) {
      await prisma.commentLike.delete({
        where: { userId_commentId: { userId, commentId } },
      });
      res.json({ liked: false });
    } else {
      await prisma.commentLike.create({ data: { userId, commentId } });
      res.json({ liked: true });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

export default router;
