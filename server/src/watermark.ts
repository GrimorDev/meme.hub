import fs from 'fs';
import sharp from 'sharp';

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Nakłada znaki wodne na obraz (Sharp + SVG composite):
 *  - lewy-dolny:  @username
 *  - prawy-górny: memster.pl
 */
export async function addWatermark(filePath: string, username: string): Promise<void> {
  try {
    const meta = await sharp(filePath).metadata();
    const w = meta.width  ?? 400;
    const h = meta.height ?? 400;

    const fontSize = Math.max(13, Math.min(22, Math.floor(Math.min(w, h) * 0.038)));
    const pad      = Math.max(8,  Math.floor(h * 0.018));

    const user = escapeXml(`@${username}`);
    const site = 'memster.pl';

    // Podwójny tekst (cień + główny) — bez filtrów SVG, żeby działać na Alpine/librsvg
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
      <text x="${pad + 1}" y="${h - pad + 1}"
        font-family="FreeSans,Arial,Helvetica,sans-serif"
        font-size="${fontSize}" font-weight="bold"
        fill="rgba(0,0,0,0.55)">${user}</text>
      <text x="${pad}" y="${h - pad}"
        font-family="FreeSans,Arial,Helvetica,sans-serif"
        font-size="${fontSize}" font-weight="bold"
        fill="rgba(255,255,255,0.68)">${user}</text>

      <text x="${w - pad + 1}" y="${fontSize + pad + 1}"
        font-family="FreeSans,Arial,Helvetica,sans-serif"
        font-size="${fontSize}" font-weight="bold"
        text-anchor="end" fill="rgba(0,0,0,0.55)">${site}</text>
      <text x="${w - pad}" y="${fontSize + pad}"
        font-family="FreeSans,Arial,Helvetica,sans-serif"
        font-size="${fontSize}" font-weight="bold"
        text-anchor="end" fill="rgba(255,255,255,0.68)">${site}</text>
    </svg>`;

    const tmp = `${filePath}.wm.tmp`;
    await sharp(filePath)
      .composite([{ input: Buffer.from(svg), blend: 'over' }])
      .toFile(tmp);

    fs.renameSync(tmp, filePath);
  } catch (err) {
    // Nie blokujemy uploadu jeśli watermark się nie uda
    console.error('[watermark] failed:', err);
  }
}
