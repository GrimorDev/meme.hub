import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import { sessionMiddleware } from './session.js';
import { prisma } from './db.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import postRoutes from './routes/posts.js';
import commentRoutes from './routes/comments.js';
import searchRoutes from './routes/search.js';
import uploadRoutes from './routes/upload.js';
import adminRoutes from './routes/admin.js';
import templateRoutes from './routes/templates.js';
import notificationsRoutes from './routes/notifications.js';
import messagesRoutes from './routes/messages.js';
import savedRoutes from './routes/saved.js';
import ogRoutes from './routes/og.js';
import { apiLimiter, writeLimiter, uploadLimiter, authLimiter } from './middleware/rateLimit.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 4000;

// Ufaj proxy nginx — wymagane dla X-Forwarded-For i rate limiting za reverse-proxy
app.set('trust proxy', 1);

// Utwórz tabelę sesji jeśli nie istnieje (connect-pg-simple nie robi tego natychmiast)
async function ensureSessionTable() {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "session" (
        "sid" varchar NOT NULL COLLATE "default",
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL,
        CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE
      ) WITH (OIDS=FALSE);
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
    `);
    console.log('Session table ready');
  } catch (err) {
    console.error('Session table init error:', err);
  }
}

// ── Security headers (Helmet) ──────────────────────────────────
app.use(
  helmet({
    // API server — CSP wyłączone (obsługuje frontend przez nginx)
    contentSecurityPolicy: false,
    // Wyłączone aby nie blokować wideo/obrazków cross-origin przez COEP
    crossOriginEmbedderPolicy: false,
    // Reszta domyślnie włączona:
    // X-Content-Type-Options: nosniff
    // X-Frame-Options: SAMEORIGIN
    // X-DNS-Prefetch-Control: off
    // Strict-Transport-Security (HSTS)
    // Referrer-Policy: no-referrer
  }),
);

// ── CORS — tylko zaufane originy ───────────────────────────────
// Fallback: FRONTEND_URL z .env (już ustawione na produkcji) + localhost dev
const frontendUrl = process.env.FRONTEND_URL?.trim();
const defaultOrigins = ['http://localhost:5173', 'http://localhost', frontendUrl].filter(Boolean).join(',');
const rawOrigins = process.env.ALLOWED_ORIGINS || defaultOrigins;
const allowedOrigins = rawOrigins.split(',').map((o) => o.trim()).filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Brak origin = same-origin / curl / mobilne native — przepuść
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin "${origin}" not allowed`));
      }
    },
    credentials: true,
  }),
);

app.use(express.json({ limit: '10mb' }));
app.use(sessionMiddleware);

// ── Rate limiting ─────────────────────────────────────────────
app.use('/api', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/posts', writeLimiter);
app.use('/api/upload', uploadLimiter);

const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads');
app.use('/uploads', express.static(UPLOADS_DIR));

// Blokuj zbanowanych użytkowników
app.use('/api', async (req: any, _res: any, next: any) => {
  if (req.session?.userId) {
    const user = await prisma.user.findUnique({
      where: { id: req.session.userId },
      select: { banned: true },
    });
    if (user?.banned) {
      req.session.destroy(() => {});
      _res.status(403).json({ error: 'Twoje konto zostało zablokowane przez administratora.' });
      return;
    }
  }
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api', commentRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/saved', savedRoutes);
app.use('/og', ogRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

ensureSessionTable().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
