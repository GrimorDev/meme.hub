import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { formatUser } from '../utils.js';

const router = Router();

const AVATAR_COLORS = [
  'from-purple-500 to-indigo-500',
  'from-orange-500 to-red-500',
  'from-green-500 to-teal-500',
  'from-blue-500 to-cyan-500',
];

router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body as {
      username?: string;
      email?: string;
      password?: string;
    };

    if (!username || !email || !password) {
      res.status(400).json({ error: 'Wszystkie pola są wymagane' });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: 'Hasło musi mieć co najmniej 6 znaków' });
      return;
    }

    const existing = await prisma.user.findFirst({
      where: { OR: [{ username }, { email }] },
    });
    if (existing) {
      res.status(409).json({ error: 'Użytkownik o tej nazwie lub emailu już istnieje!' });
      return;
    }

    const hash = await bcrypt.hash(password, 12);
    const color = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

    const user = await prisma.user.create({
      data: { username, email, password: hash, avatarColor: color },
    });

    req.session.userId = user.id;
    req.session.username = user.username;

    res.status(201).json(formatUser(user));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body as {
      username?: string;
      password?: string;
    };

    if (!username || !password) {
      res.status(400).json({ error: 'Podaj nazwę użytkownika i hasło' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      res.status(401).json({ error: 'Nieprawidłowe dane logowania' });
      return;
    }

    req.session.userId = user.id;
    req.session.username = user.username;

    res.json(formatUser(user));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ ok: true });
  });
});

router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.session.userId },
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

export default router;
