import { Router } from 'express';
import { prisma } from '../db.js';

const router = Router();

// GET /og/meme/:id — zwraca HTML z OG meta tagami dla konkretnego mema
// Używane przez crawlery social media (FB, Twitter, Discord, itp.)
router.get('/meme/:id', async (req, res) => {
  try {
    const post = await prisma.memePost.findUnique({
      where: { id: req.params.id },
      include: { author: { select: { username: true } } },
    });

    if (!post) {
      res.status(404).send('Nie znaleziono mema');
      return;
    }

    const siteUrl = process.env.SITE_URL || 'https://memster.pl';
    const imageUrl = post.url.startsWith('http') ? post.url : `${siteUrl}${post.url}`;
    const pageUrl  = `${siteUrl}/meme/${post.id}`;
    const title    = post.caption.length > 70 ? post.caption.slice(0, 67) + '...' : post.caption;
    const desc     = post.description
      ? (post.description.length > 160 ? post.description.slice(0, 157) + '...' : post.description)
      : `Mem od @${post.author.username} na Memster`;

    // Zwróć minimalny HTML z meta tagami + redirect do SPA
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — Memster</title>
  <meta name="description" content="${desc}">

  <!-- Open Graph -->
  <meta property="og:type"        content="article">
  <meta property="og:url"         content="${pageUrl}">
  <meta property="og:title"       content="${title}">
  <meta property="og:description" content="${desc}">
  <meta property="og:image"       content="${imageUrl}">
  <meta property="og:image:width"  content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:site_name"   content="Memster">
  <meta property="og:locale"      content="pl_PL">

  <!-- Twitter Card -->
  <meta name="twitter:card"        content="summary_large_image">
  <meta name="twitter:title"       content="${title}">
  <meta name="twitter:description" content="${desc}">
  <meta name="twitter:image"       content="${imageUrl}">

  <!-- Redirect do SPA po krótkim opóźnieniu (crawlery ignorują JS) -->
  <script>window.location.replace("${pageUrl}");</script>
</head>
<body>
  <p><a href="${pageUrl}">Przejdź do mema</a></p>
</body>
</html>`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Błąd serwera');
  }
});

// GET /og/preview?url=... — link preview dla DM
// Pobiera tytuł + opis + og:image dla podanego URL
router.get('/preview', async (req, res) => {
  const { url } = req.query as { url?: string };
  if (!url) { res.status(400).json({ error: 'Brak URL' }); return; }

  // Tylko http/https
  if (!/^https?:\/\//.test(url)) { res.status(400).json({ error: 'Nieprawidłowy URL' }); return; }

  // Nie pozwól na wewnętrzne adresy
  try {
    const parsed = new URL(url);
    const blocked = ['localhost', '127.0.0.1', '0.0.0.0', '::1'];
    if (blocked.some(b => parsed.hostname.includes(b))) {
      res.status(400).json({ error: 'Niedozwolony host' }); return;
    }
  } catch { res.status(400).json({ error: 'Nieprawidłowy URL' }); return; }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Memster/1.0 LinkPreview (+https://memster.pl)' },
    });
    clearTimeout(timeout);

    if (!response.ok) { res.json({ url, title: null, description: null, image: null }); return; }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) { res.json({ url, title: null, description: null, image: null }); return; }

    // Czytaj max 100 KB żeby nie pobierać całej strony
    const reader   = response.body?.getReader();
    let   html     = '';
    let   received = 0;
    const LIMIT    = 100 * 1024;
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done || received >= LIMIT) { reader.cancel(); break; }
        html     += new TextDecoder().decode(value);
        received += value?.length ?? 0;
      }
    }

    const getMeta = (prop: string): string | null => {
      const m =
        html.match(new RegExp(`<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']+)["']`, 'i')) ||
        html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${prop}["']`, 'i')) ||
        html.match(new RegExp(`<meta[^>]+name=["']${prop}["'][^>]+content=["']([^"']+)["']`, 'i'));
      return m ? m[1] : null;
    };

    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);

    const title       = getMeta('og:title')       || (titleMatch ? titleMatch[1].trim() : null);
    const description = getMeta('og:description') || getMeta('description');
    const image       = getMeta('og:image');

    res.json({ url, title, description, image });
  } catch (err: any) {
    if (err.name === 'AbortError') {
      res.json({ url, title: null, description: null, image: null });
    } else {
      res.json({ url, title: null, description: null, image: null });
    }
  }
});

export default router;
