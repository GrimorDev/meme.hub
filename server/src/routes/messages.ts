import { Router } from 'express';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Pomocnik — czy user jest adminem
async function isAdmin(userId: string): Promise<boolean> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  return u?.role === 'admin';
}

function formatMessage(m: any, myId?: string) {
  return {
    id:               m.id,
    senderId:         m.senderId,
    receiverId:       m.receiverId,
    senderUsername:   m.sender.username,
    senderAvatarColor: m.sender.avatarColor,
    senderAvatarUrl:  m.sender.avatarUrl ?? undefined,
    text:             m.text,
    imageUrl:         m.imageUrl ?? undefined,
    read:             m.read,
    createdAt:        m.createdAt.toISOString(),
    reactions:        (m.reactions ?? []).map((r: any) => ({
      id:    r.id,
      emoji: r.emoji,
      userId: r.userId,
    })),
  };
}

const MSG_INCLUDE = {
  sender: { select: { id: true, username: true, avatarColor: true, avatarUrl: true } },
  reactions: { select: { id: true, emoji: true, userId: true } },
} as const;

// GET /api/messages/unread-count — do pollingu
router.get('/unread-count', requireAuth, async (req, res) => {
  try {
    const count = await prisma.message.count({
      where: { receiverId: req.session.userId!, read: false },
    });
    res.json({ count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// GET /api/messages/conversations — lista unikalnych rozmów
router.get('/conversations', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;

    const messages = await prisma.message.findMany({
      where: {
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
      include: {
        sender:   { select: { id: true, username: true, avatarColor: true, avatarUrl: true } },
        receiver: { select: { id: true, username: true, avatarColor: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const conversationMap = new Map<string, {
      userId: string; username: string; avatarColor: string; avatarUrl?: string;
      lastMessage: string; lastMessageAt: string; unreadCount: number;
    }>();

    for (const msg of messages) {
      const isFromMe = msg.senderId === userId;
      const other = isFromMe ? msg.receiver : msg.sender;

      if (!conversationMap.has(other.id)) {
        const unread = messages.filter(
          m => m.senderId === other.id && m.receiverId === userId && !m.read
        ).length;

        conversationMap.set(other.id, {
          userId:        other.id,
          username:      other.username,
          avatarColor:   other.avatarColor,
          avatarUrl:     other.avatarUrl ?? undefined,
          lastMessage:   msg.imageUrl && !msg.text ? '📷 Zdjęcie' : msg.text,
          lastMessageAt: msg.createdAt.toISOString(),
          unreadCount:   unread,
        });
      }
    }

    res.json(Array.from(conversationMap.values()));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// GET /api/messages/:userId — historia wiadomości z danym userem
router.get('/:userId', requireAuth, async (req, res) => {
  try {
    const myId    = req.session.userId!;
    const otherId = req.params.userId;

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: myId,    receiverId: otherId },
          { senderId: otherId, receiverId: myId },
        ],
      },
      include: MSG_INCLUDE,
      orderBy: { createdAt: 'asc' },
    });

    res.json(messages.map(m => formatMessage(m, myId)));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// POST /api/messages/:userId — wyślij wiadomość
router.post('/:userId', requireAuth, async (req, res) => {
  try {
    const myId       = req.session.userId!;
    const receiverId = req.params.userId;
    const { text, imageUrl } = req.body as { text?: string; imageUrl?: string };

    if (!text?.trim() && !imageUrl) {
      res.status(400).json({ error: 'Wiadomość nie może być pusta' });
      return;
    }

    const receiver = await prisma.user.findUnique({
      where: { id: receiverId },
      select: { id: true, username: true },
    });
    if (!receiver) {
      res.status(404).json({ error: 'Użytkownik nie istnieje' });
      return;
    }

    const message = await prisma.message.create({
      data: {
        senderId: myId,
        receiverId,
        text: text?.trim() ?? '',
        imageUrl: imageUrl ?? null,
      },
      include: MSG_INCLUDE,
    });

    // Powiadomienie dla odbiorcy
    const notifBody = imageUrl && !text?.trim() ? '📷 Zdjęcie' : (text?.trim() ?? '').slice(0, 120);
    await prisma.notification.create({
      data: {
        userId: receiverId,
        type:   'message',
        title:  `Wiadomość od ${(req.session as any).username ?? 'użytkownika'}`,
        body:   notifBody,
        link:   `/messages/${myId}`,
      },
    });

    res.status(201).json(formatMessage(message, myId));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// PUT /api/messages/:userId/read — oznacz wiadomości od userId jako przeczytane
router.put('/:userId/read', requireAuth, async (req, res) => {
  try {
    await prisma.message.updateMany({
      where: {
        senderId:   req.params.userId,
        receiverId: req.session.userId!,
        read:       false,
      },
      data: { read: true },
    });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// POST /api/messages/:userId/reactions/:messageId — toggle reakcji
router.post('/:userId/reactions/:messageId', requireAuth, async (req, res) => {
  try {
    const myId      = req.session.userId!;
    const messageId = req.params.messageId;
    const { emoji } = req.body as { emoji?: string };

    if (!emoji) {
      res.status(400).json({ error: 'Brak emoji' });
      return;
    }

    // Sprawdź czy wiadomość należy do tej rozmowy
    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message) {
      res.status(404).json({ error: 'Nie znaleziono wiadomości' });
      return;
    }
    const otherId = req.params.userId;
    const inConv = (message.senderId === myId && message.receiverId === otherId) ||
                   (message.senderId === otherId && message.receiverId === myId);
    if (!inConv) {
      res.status(403).json({ error: 'Brak dostępu' });
      return;
    }

    // Szukaj DOWOLNEJ istniejącej reakcji tego usera na tę wiadomość (max 1)
    const existing = await prisma.messageReaction.findFirst({
      where: { messageId, userId: myId },
    });

    if (existing) {
      if (existing.emoji === emoji) {
        // Ten sam emoji → toggle off
        await prisma.messageReaction.delete({ where: { id: existing.id } });
        res.json({ action: 'removed', emoji });
      } else {
        // Inny emoji → podmień (1 reakcja per user)
        await prisma.messageReaction.update({
          where: { id: existing.id },
          data: { emoji },
        });
        res.json({ action: 'replaced', emoji, prevEmoji: existing.emoji });
      }
    } else {
      await prisma.messageReaction.create({ data: { messageId, userId: myId, emoji } });
      res.json({ action: 'added', emoji });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

export default router;
