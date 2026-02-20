import express from 'express';
import cors from 'cors';
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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 4000;

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);

app.use(express.json({ limit: '10mb' }));
app.use(sessionMiddleware);

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

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
