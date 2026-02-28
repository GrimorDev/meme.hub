import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import sharp from 'sharp';
import { fileTypeFromBuffer } from 'file-type';

const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// multer zapisuje tymczasowo w pamięci, potem Sharp przetwarza na dysk
const storage = multer.memoryStorage();

const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/webm',
  'video/quicktime',
];

const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];

export const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB — wideo może być duże
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Dozwolone formaty: JPG, PNG, GIF, WEBP, MP4, WEBM'));
    }
  },
});

// Middleware Sharp — kompresja + resize po multerze; wideo przepuszcza as-is
export async function processImage(req: any, _res: any, next: any) {
  if (!req.file) return next();

  // ── Magic bytes validation ─────────────────────────────────
  // Sprawdź rzeczywisty typ pliku na podstawie sygnatur binarnych (nie MIME z nagłówka)
  const detected = await fileTypeFromBuffer(req.file.buffer);
  const realMime = detected?.mime ?? null;

  // Wideo (mp4/webm/mov) może zwracać różne warianty — sprawdź prefix
  const isVideoMime = (m: string | null) =>
    m != null && (m.startsWith('video/') || m === 'application/octet-stream' && VIDEO_TYPES.includes(req.file.mimetype));

  const isAllowed =
    realMime != null &&
    (ALLOWED_TYPES.includes(realMime) || isVideoMime(realMime));

  // GIF-y i wideo mogą mieć niejednoznaczne magic bytes — jeśli file-type nie wykryje ale MIME jest ok, zezwól
  const mimeTrusted = VIDEO_TYPES.includes(req.file.mimetype) || req.file.mimetype === 'image/gif';

  if (!isAllowed && !mimeTrusted) {
    return next(new Error(`Niedozwolony typ pliku (wykryto: ${realMime ?? 'nieznany'})`));
  }

  const isVideo = VIDEO_TYPES.includes(req.file.mimetype);
  const isGif   = req.file.mimetype === 'image/gif';
  const name     = crypto.randomBytes(16).toString('hex');

  try {
    if (isVideo) {
      const extMap: Record<string, string> = {
        'video/mp4':       'mp4',
        'video/webm':      'webm',
        'video/quicktime': 'mov',
      };
      const ext      = extMap[req.file.mimetype] ?? 'mp4';
      const filename = `${name}.${ext}`;
      const dest     = path.join(UPLOADS_DIR, filename);
      fs.writeFileSync(dest, req.file.buffer);
      req.file.filename  = filename;
      req.file.mediaType = 'video';
    } else if (isGif) {
      // GIFy zapisuj bez konwersji (sharp nie animuje GIF-ów dobrze)
      const filename = `${name}.gif`;
      const dest = path.join(UPLOADS_DIR, filename);
      fs.writeFileSync(dest, req.file.buffer);
      req.file.filename  = filename;
      req.file.mediaType = 'image';
    } else {
      // Reszta → WebP, maks. 1920px szerokości, jakość 82
      const filename = `${name}.webp`;
      const dest = path.join(UPLOADS_DIR, filename);
      await sharp(req.file.buffer)
        .resize({ width: 1920, withoutEnlargement: true })
        .webp({ quality: 82 })
        .toFile(dest);
      req.file.filename  = filename;
      req.file.mediaType = 'image';
    }
    next();
  } catch (err) {
    next(err);
  }
}
