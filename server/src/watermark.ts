import fs   from 'fs';
import path from 'path';
import sharp from 'sharp';
import { spawnSync } from 'child_process';

// ── helpers ────────────────────────────────────────────────────

function escapeXml(s: string): string {
  return s
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&apos;');
}

/** Ucieczka znaków specjalnych ffmpeg drawtext */
function escapeFfmpeg(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/'/g,  "\\'")
    .replace(/:/g,  '\\:')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]');
}

/** Buduje SVG overlay o wymiarach jednej klatki */
function buildSvg(w: number, h: number, username: string): Buffer {
  const sz  = Math.max(13, Math.min(22, Math.floor(Math.min(w, h) * 0.038)));
  const pad = Math.max(8,  Math.floor(h * 0.018));
  const u   = escapeXml(`@${username}`);
  const s   = 'memster.pl';
  const ff  = 'FreeSans,Arial,Helvetica,sans-serif';

  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
      <!-- @username — lewy-dolny -->
      <text x="${pad+1}" y="${h-pad+1}" font-family="${ff}" font-size="${sz}" font-weight="bold" fill="rgba(0,0,0,0.55)">${u}</text>
      <text x="${pad}"   y="${h-pad}"   font-family="${ff}" font-size="${sz}" font-weight="bold" fill="rgba(255,255,255,0.70)">${u}</text>
      <!-- memster.pl — prawy-górny -->
      <text x="${w-pad+1}" y="${sz+pad+1}" text-anchor="end" font-family="${ff}" font-size="${sz}" font-weight="bold" fill="rgba(0,0,0,0.55)">${s}</text>
      <text x="${w-pad}"   y="${sz+pad}"   text-anchor="end" font-family="${ff}" font-size="${sz}" font-weight="bold" fill="rgba(255,255,255,0.70)">${s}</text>
    </svg>`,
  );
}

// ── obrazki + GIFy (Sharp) ─────────────────────────────────────

async function watermarkImage(filePath: string, username: string, isGif: boolean): Promise<void> {
  const sharpOpts = { animated: isGif };

  const meta = await sharp(filePath, sharpOpts).metadata();
  const w    = meta.width ?? 400;
  // pageHeight = wysokość jednej klatki; height = suma wszystkich klatek
  const h    = isGif ? (meta.pageHeight ?? meta.height ?? 400) : (meta.height ?? 400);

  const overlay = buildSvg(w, h, username);
  const tmp     = `${filePath}.wm.tmp`;

  const pipeline = sharp(filePath, sharpOpts).composite([{
    input: overlay,
    tile:  isGif,   // tile:true → nakłada overlay na KAŻDĄ klatkę animacji
    blend: 'over',
  }]);

  if (isGif) {
    await pipeline.gif({ loop: 0 }).toFile(tmp); // loop:0 = nieskończona pętla
  } else {
    await pipeline.webp({ quality: 82 }).toFile(tmp);
  }

  fs.renameSync(tmp, filePath);
}

// ── video (FFmpeg) ─────────────────────────────────────────────

function watermarkVideo(filePath: string, username: string): void {
  const u   = escapeFfmpeg(`@${username}`);
  const s   = escapeFfmpeg('memster.pl');
  const fsz = 20; // font size px

  // drawtext nie wymaga fontfile — użyje domyślnego fontu ffmpeg
  const vf = [
    `drawtext=text='${u}':x=10:y=h-th-10:fontcolor=white@0.70:fontsize=${fsz}:shadowcolor=black@0.60:shadowx=1:shadowy=1`,
    `drawtext=text='${s}':x=w-tw-10:y=10:fontcolor=white@0.70:fontsize=${fsz}:shadowcolor=black@0.60:shadowx=1:shadowy=1`,
  ].join(',');

  const ext = path.extname(filePath) || '.mp4';
  const tmp = `${filePath}.wm.tmp${ext}`;

  const r = spawnSync(
    'ffmpeg',
    ['-i', filePath, '-vf', vf, '-codec:a', 'copy', '-y', tmp],
    { stdio: 'ignore', timeout: 90_000 }, // max 90 s
  );

  if (r.status === 0 && fs.existsSync(tmp)) {
    fs.renameSync(tmp, filePath);
  } else {
    if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
    console.error('[watermark] ffmpeg failed, status:', r.status, r.error?.message ?? '');
  }
}

// ── public API ─────────────────────────────────────────────────

export async function addWatermark(filePath: string, username: string): Promise<void> {
  try {
    if (/\.(mp4|webm|mov)$/i.test(filePath)) {
      watermarkVideo(filePath, username);
    } else {
      const isGif = filePath.toLowerCase().endsWith('.gif');
      await watermarkImage(filePath, username, isGif);
    }
  } catch (err) {
    // Nie blokujemy uploadu — watermark opcjonalny
    console.error('[watermark] failed:', err);
  }
}
