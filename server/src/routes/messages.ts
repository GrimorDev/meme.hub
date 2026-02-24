import { Router } from 'express';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

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

    // Pobierz wszystkie wiadomości gdzie user jest nadawcą lub odbiorcą
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

    // Grupuj po partnerze rozmowy
    const conversationMap = new Map<string, {
      userId: string; username: string; avatarColor: string; avatarUrl?: string;
      lastMessage: string; lastMessageAt: string; unreadCount: number;
    }>();

    for (const msg of messages) {
      const isFromMe = msg.senderId === userId;
      const other = isFromMe ? msg.receiver : msg.sender;

      if (!conversationMap.has(other.id)) {
        // Policz nieprzeczytane od tej osoby
        const unread = messages.filter(
          m => m.senderId === other.id && m.receiverId === userId && !m.read
        ).length;

        conversationMap.set(other.id, {
          userId:         other.id,
          username:       other.username,
          avatarColor:    other.avatarColor,
          avatarUrl:      other.avatarUrl ?? undefined,
          lastMessage:    msg.text,
          lastMessageAt:  msg.createdAt.toISOString(),
          unreadCount:    unread,
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
    const myId = req.session.userId!;
    const otherId = req.params.userId;

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: myId,    receiverId: otherId },
          { senderId: otherId, receiverId: myId },
        ],
      },
      include: {
        sender: { select: { id: true, username: true, avatarColor: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json(messages.map(m => ({
      id:               m.id,
      senderId:         m.senderId,
      receiverId:       m.receiverId,
      senderUsername:   m.sender.username,
      senderAvatarColor: m.sender.avatarColor,
      senderAvatarUrl:  m.sender.avatarUrl ?? undefined,
      text:             m.text,
      read:             m.read,
      createdAt:        m.createdAt.toISOString(),
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// POST /api/messages/:userId — wyślij wiadomość
router.post('/:userId', requireAuth, async (req, res) => {
  try {
    const myId     = req.session.userId!;
    const receiverId = req.params.userId;
    const { text } = req.body as { text?: string };

    if (!text?.trim()) {
      res.status(400).json({ error: 'Wiadomość nie może być pusta' });
      return;
    }

    // Sprawdź czy odbiorca istnieje
    const receiver = await prisma.user.findUnique({
      where: { id: receiverId },
      select: { id: true, username: true },
    });
    if (!receiver) {
      res.status(404).json({ error: 'Użytkownik nie istnieje' });
      return;
    }

    const message = await prisma.message.create({
      data: { senderId: myId, receiverId, text: text.trim() },
      include: {
        sender: { select: { id: true, username: true, avatarColor: true, avatarUrl: true } },
      },
    });

    // Utwórz powiadomienie dla odbiorcy
    await prisma.notification.create({
      data: {
        userId: receiverId,
        type:   'message',
        title:  `Wiadomość od ${req.session.username}`,
        body:   text.trim().slice(0, 120),
        link:   `/messages/${myId}`,
      },
    });

    res.status(201).json({
      id:               message.id,
      senderId:         message.senderId,
      receiverId:       message.receiverId,
      senderUsername:   message.sender.username,
      senderAvatarColor: message.sender.avatarColor,
      senderAvatarUrl:  message.sender.avatarUrl ?? undefined,
      text:             message.text,
      read:             message.read,
      createdAt:        message.createdAt.toISOString(),
    });
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

export default router;
