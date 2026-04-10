import nodemailer from "nodemailer";
import { Resend } from "resend";

function usesResend(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

/** Resend veya SMTP ile gönderim için gerekli ortam değişkenleri tanımlı mı? */
export function isCrmSmtpConfigured(): boolean {
  const from = process.env.CRM_MAIL_FROM?.trim();
  if (!from) return false;
  if (usesResend()) return true;
  return Boolean(process.env.SMTP_HOST?.trim());
}

/** Nodemailer / sunucu hata metnini kullanıcıya daha anlaşılır hale getirir. */
export function formatCrmSmtpErrorMessage(raw: string): string {
  if (
    /535.*5\.7\.139|SmtpClientAuthentication is disabled/i.test(raw)
  ) {
    return `${raw} (Microsoft 365: Bu posta kutusu için SMTP kimlik doğrulaması kapalı. Kiracı yöneticisi SMTP AUTH’u açmalı veya başka bir SMTP sağlayıcısı kullanılmalı. https://aka.ms/smtp_auth_disabled )`;
  }
  return raw;
}

export function getCrmSmtpConfigError(): string | null {
  if (!process.env.CRM_MAIL_FROM?.trim()) {
    return "CRM_MAIL_FROM tanımlı değil.";
  }
  if (usesResend()) return null;
  if (!process.env.SMTP_HOST?.trim()) {
    return "SMTP_HOST tanımlı değil (veya Resend için RESEND_API_KEY kullanın).";
  }
  return null;
}

export async function sendCrmOutboundMail(opts: {
  to: string;
  subject: string;
  text: string;
}): Promise<void> {
  const err = getCrmSmtpConfigError();
  if (err) throw new Error(err);

  const from = process.env.CRM_MAIL_FROM!.trim();
  const to = opts.to.trim();

  if (usesResend()) {
    const resend = new Resend(process.env.RESEND_API_KEY!.trim());
    const { error } = await resend.emails.send({
      from,
      to,
      subject: opts.subject,
      text: opts.text,
    });
    if (error) throw new Error(error.message);
    return;
  }

  const host = process.env.SMTP_HOST!.trim();
  const port = Math.max(1, Number(process.env.SMTP_PORT) || 587);
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth:
      user && pass
        ? { user, pass }
        : undefined,
  });

  await transporter.sendMail({
    from,
    to,
    subject: opts.subject,
    text: opts.text,
  });
}
