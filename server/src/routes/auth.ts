import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { formatUser } from '../utils.js';
import { generateCode, sendVerificationEmail, sendResetEmail } from '../email.js';

const router = Router();

const AVATAR_COLORS = [
  'from-purple-500 to-indigo-500',
  'from-orange-500 to-red-500',
  'from-green-500 to-teal-500',
  'from-blue-500 to-cyan-500',
];

// ── Walidacja hasła ───────────────────────────────────────────
function validatePassword(p: string): string | null {
  if (p.length < 8)              return 'Hasło musi mieć co najmniej 8 znaków';
  if (!/[A-Z]/.test(p))         return 'Hasło musi zawierać co najmniej jedną dużą literę';
  if (!/[0-9]/.test(p))         return 'Hasło musi zawierać co najmniej jedną cyfrę';
  if (!/[^A-Za-z0-9]/.test(p))  return 'Hasło musi zawierać co najmniej jeden znak specjalny (!@#$...)';
  return null;
}

// ── Rejestracja ───────────────────────────────────────────────
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

    const pwError = validatePassword(password);
    if (pwError) {
      res.status(400).json({ error: pwError });
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
    const code = generateCode();
    const expiry = new Date(Date.now() + 30 * 60 * 1000); // 30 minut

    await prisma.user.create({
      data: {
        username,
        email,
        password: hash,
        avatarColor: color,
        emailVerified: false,
        verificationCode: code,
        verificationCodeExpiry: expiry,
      },
    });

    // Wyślij email z kodem — fire-and-forget, ale loguj błąd
    sendVerificationEmail(email, code).catch(err =>
      console.error('Błąd wysyłki emaila weryfikacyjnego:', err)
    );

    res.status(201).json({ pending: true, email, message: 'Sprawdź swoją skrzynkę email — wysłaliśmy Ci kod weryfikacyjny.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// ── Weryfikacja emaila ────────────────────────────────────────
router.post('/verify-email', async (req, res) => {
  try {
    const { email, code } = req.body as { email?: string; code?: string };

    if (!email || !code) {
      res.status(400).json({ error: 'Podaj email i kod' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(404).json({ error: 'Nie znaleziono konta z tym adresem email' });
      return;
    }
    if (user.emailVerified) {
      res.status(400).json({ error: 'Email już zweryfikowany. Możesz się zalogować.' });
      return;
    }
    if (!user.verificationCode || !user.verificationCodeExpiry) {
      res.status(400).json({ error: 'Kod weryfikacyjny nie istnieje. Wyślij ponownie.' });
      return;
    }
    if (new Date() > user.verificationCodeExpiry) {
      res.status(400).json({ error: 'Kod wygasł. Wyślij nowy kod.' });
      return;
    }
    if (user.verificationCode !== code.trim()) {
      res.status(400).json({ error: 'Nieprawidłowy kod weryfikacyjny' });
      return;
    }

    const verified = await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationCode: null,
        verificationCodeExpiry: null,
      },
    });

    req.session.userId = verified.id;
    req.session.username = verified.username;

    res.json(formatUser(verified));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// ── Ponowne wysłanie kodu weryfikacyjnego ─────────────────────
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body as { email?: string };

    if (!email) {
      res.status(400).json({ error: 'Podaj adres email' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Nie ujawniamy czy email istnieje
      res.json({ ok: true });
      return;
    }
    if (user.emailVerified) {
      res.status(400).json({ error: 'Email już zweryfikowany' });
      return;
    }

    // Ogranicznik: 1 minuta między wysłaniami
    if (user.verificationCodeExpiry) {
      const minLeft = 30 * 60 * 1000 - (Date.now() - (user.verificationCodeExpiry.getTime() - 30 * 60 * 1000));
      if (minLeft > 29 * 60 * 1000) {
        res.status(429).json({ error: 'Poczekaj chwilę przed wysłaniem kolejnego kodu' });
        return;
      }
    }

    const code = generateCode();
    const expiry = new Date(Date.now() + 30 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: { verificationCode: code, verificationCodeExpiry: expiry },
    });

    sendVerificationEmail(email, code).catch(err =>
      console.error('Błąd wysyłki emaila:', err)
    );

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// ── Zapomniane hasło — wyślij kod ────────────────────────────
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body as { email?: string };

    if (!email) {
      res.status(400).json({ error: 'Podaj adres email' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });

    // Zawsze odpowiadamy OK — nie ujawniamy czy email istnieje
    if (!user || !user.emailVerified) {
      res.json({ ok: true });
      return;
    }

    const code = generateCode();
    const expiry = new Date(Date.now() + 30 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: { resetCode: code, resetCodeExpiry: expiry },
    });

    sendResetEmail(email, code).catch(err =>
      console.error('Błąd wysyłki emaila reset:', err)
    );

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// ── Weryfikacja kodu resetowania ──────────────────────────────
router.post('/verify-reset-code', async (req, res) => {
  try {
    const { email, code } = req.body as { email?: string; code?: string };

    if (!email || !code) {
      res.status(400).json({ error: 'Podaj email i kod' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.resetCode || !user.resetCodeExpiry) {
      res.status(400).json({ error: 'Nieprawidłowy kod lub email' });
      return;
    }
    if (new Date() > user.resetCodeExpiry) {
      res.status(400).json({ error: 'Kod wygasł. Wyślij nowy.' });
      return;
    }
    if (user.resetCode !== code.trim()) {
      res.status(400).json({ error: 'Nieprawidłowy kod' });
      return;
    }

    res.json({ valid: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// ── Reset hasła ───────────────────────────────────────────────
router.post('/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body as {
      email?: string;
      code?: string;
      newPassword?: string;
    };

    if (!email || !code || !newPassword) {
      res.status(400).json({ error: 'Brakujące dane' });
      return;
    }

    const pwError = validatePassword(newPassword);
    if (pwError) {
      res.status(400).json({ error: pwError });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.resetCode || !user.resetCodeExpiry) {
      res.status(400).json({ error: 'Nieprawidłowy kod lub email' });
      return;
    }
    if (new Date() > user.resetCodeExpiry) {
      res.status(400).json({ error: 'Kod wygasł. Wyślij nowy.' });
      return;
    }
    if (user.resetCode !== code.trim()) {
      res.status(400).json({ error: 'Nieprawidłowy kod' });
      return;
    }

    const hash = await bcrypt.hash(newPassword, 12);

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hash,
        resetCode: null,
        resetCodeExpiry: null,
      },
    });

    req.session.userId = updated.id;
    req.session.username = updated.username;

    res.json(formatUser(updated));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// ── Logowanie ─────────────────────────────────────────────────
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
    if (user.banned) {
      res.status(403).json({ error: 'Twoje konto zostało zablokowane przez administratora.' });
      return;
    }
    if (!user.emailVerified) {
      res.status(403).json({
        error: 'Potwierdź adres email przed zalogowaniem',
        needsVerification: true,
        email: user.email,
      });
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

// ── Wylogowanie ───────────────────────────────────────────────
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ ok: true });
  });
});

// ── Aktualny użytkownik ───────────────────────────────────────
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
