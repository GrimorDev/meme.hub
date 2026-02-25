import nodemailer from 'nodemailer';

// ── Transporter SMTP ───────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'ssl0.ovh.net',
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: true, // SSL (port 465)
  auth: {
    user: process.env.SMTP_USER || 'no-reply@memster.pl',
    pass: process.env.SMTP_PASS || '',
  },
});

const FROM = process.env.SMTP_USER || 'no-reply@memster.pl';
const BRAND = 'Memster';
const BRAND_COLOR = '#9333ea';

// ── Generator kodu XXX-XX-XXX ──────────────────────────────────
export function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const rand = () => chars[Math.floor(Math.random() * chars.length)];
  const p1 = rand() + rand() + rand();
  const p2 = rand() + rand();
  const p3 = rand() + rand() + rand();
  return `${p1}-${p2}-${p3}`;
}

// ── Wspólny layout HTML emaila ─────────────────────────────────
function emailLayout(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:480px;background:#111113;border:1px solid #27272a;border-radius:20px;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#7c3aed,#9333ea);padding:32px 40px;text-align:center;">
              <div style="font-size:28px;font-weight:900;color:#fff;letter-spacing:0.15em;text-transform:uppercase;font-style:italic;">${BRAND}</div>
              <div style="font-size:11px;color:rgba(255,255,255,0.6);letter-spacing:0.2em;text-transform:uppercase;margin-top:4px;">Społeczność memów</div>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              ${bodyHtml}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px 32px;border-top:1px solid #27272a;text-align:center;">
              <p style="margin:0;font-size:11px;color:#52525b;">Jeśli to nie Ty — zignoruj tę wiadomość.</p>
              <p style="margin:8px 0 0;font-size:11px;color:#3f3f46;">© ${new Date().getFullYear()} ${BRAND}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Email weryfikacyjny po rejestracji ─────────────────────────
export async function sendVerificationEmail(email: string, code: string): Promise<void> {
  const body = `
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#fff;">Potwierdź adres email</h2>
    <p style="margin:0 0 28px;font-size:14px;color:#a1a1aa;line-height:1.6;">
      Dziękujemy za rejestrację! Wpisz poniższy kod, aby aktywować swoje konto.
    </p>

    <div style="background:#1c1c1f;border:1px solid #3f3f46;border-radius:16px;padding:28px;text-align:center;margin-bottom:28px;">
      <div style="font-size:11px;font-weight:700;color:#71717a;text-transform:uppercase;letter-spacing:0.2em;margin-bottom:12px;">Kod weryfikacyjny</div>
      <div style="font-size:36px;font-weight:900;color:#fff;letter-spacing:0.2em;font-family:monospace;">${code}</div>
      <div style="margin-top:12px;font-size:12px;color:#71717a;">Ważny przez 30 minut</div>
    </div>

    <p style="margin:0;font-size:13px;color:#52525b;text-align:center;">
      Kod wygaśnie za 30 minut. W razie problemów wyślij nowy kod z poziomu aplikacji.
    </p>
  `;

  await transporter.sendMail({
    from: `"${BRAND}" <${FROM}>`,
    to: email,
    subject: `${code} — Twój kod weryfikacyjny Memster`,
    html: emailLayout('Weryfikacja konta Memster', body),
  });
}

// ── Email resetowania hasła ────────────────────────────────────
export async function sendResetEmail(email: string, code: string): Promise<void> {
  const body = `
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#fff;">Reset hasła</h2>
    <p style="margin:0 0 28px;font-size:14px;color:#a1a1aa;line-height:1.6;">
      Otrzymaliśmy prośbę o reset hasła do Twojego konta. Użyj poniższego kodu.
    </p>

    <div style="background:#1c1c1f;border:1px solid #3f3f46;border-radius:16px;padding:28px;text-align:center;margin-bottom:28px;">
      <div style="font-size:11px;font-weight:700;color:#71717a;text-transform:uppercase;letter-spacing:0.2em;margin-bottom:12px;">Kod resetowania hasła</div>
      <div style="font-size:36px;font-weight:900;color:#fff;letter-spacing:0.2em;font-family:monospace;">${code}</div>
      <div style="margin-top:12px;font-size:12px;color:#71717a;">Ważny przez 30 minut</div>
    </div>

    <p style="margin:0;font-size:13px;color:#52525b;text-align:center;">
      Jeśli nie prosiłeś o reset hasła — zignoruj tę wiadomość. Twoje hasło pozostaje bez zmian.
    </p>
  `;

  await transporter.sendMail({
    from: `"${BRAND}" <${FROM}>`,
    to: email,
    subject: `${code} — Reset hasła Memster`,
    html: emailLayout('Reset hasła Memster', body),
  });
}
