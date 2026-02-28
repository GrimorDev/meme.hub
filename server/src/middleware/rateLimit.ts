import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

// userId zalogowanego lub IP (poprawnie obsługuje IPv6)
const userOrIp = (req: any) => req.session?.userId || ipKeyGenerator(req);

// Ogólny limit dla wszystkich API
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minut
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Za dużo zapytań, spróbuj ponownie za chwilę' },
  skip: (req: any) => req.session?.userId !== undefined, // zalogowani mają wyższy limit
});

// Surowy limit dla akcji zapisu (dodawanie postów, komentarzy)
export const writeLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuta
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Zbyt wiele operacji, odczekaj chwilę' },
  keyGenerator: userOrIp,
});

// Limit dla uploadu plików
export const uploadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuta
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Limit uploadu: maks. 5 plików na minutę' },
  keyGenerator: userOrIp,
});

// Limit dla auth (login/register/reset)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minut
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Za dużo prób, odczekaj 15 minut' },
});
