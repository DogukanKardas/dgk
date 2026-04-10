import { Resend } from "resend";

/** Resend + gönderen adresi için gerekli ortam değişkenleri tanımlı mı? */
export function isCrmMailConfigured(): boolean {
  return Boolean(
    process.env.RESEND_API_KEY?.trim() && process.env.CRM_MAIL_FROM?.trim()
  );
}

/** API / sağlayıcı hata metnini kısaca açıklar. */
export function formatCrmMailErrorMessage(raw: string): string {
  if (/not authorized to send|invalid_from/i.test(raw)) {
    return `${raw} (Resend: Gönderen (CRM_MAIL_FROM) Resend’de doğrulanmış bir alan adından olmalı; @outlook.com vb. genel adreslerle gönderilemez.)`;
  }
  return raw;
}

export function getCrmMailConfigError(): string | null {
  if (!process.env.RESEND_API_KEY?.trim()) {
    return "RESEND_API_KEY tanımlı değil.";
  }
  if (!process.env.CRM_MAIL_FROM?.trim()) {
    return "CRM_MAIL_FROM tanımlı değil.";
  }
  return null;
}

export async function sendCrmOutboundMail(opts: {
  to: string;
  subject: string;
  text: string;
}): Promise<void> {
  const err = getCrmMailConfigError();
  if (err) throw new Error(err);

  const resend = new Resend(process.env.RESEND_API_KEY!.trim());
  const from = process.env.CRM_MAIL_FROM!.trim();
  const to = opts.to.trim();

  const { error } = await resend.emails.send({
    from,
    to,
    subject: opts.subject,
    text: opts.text,
  });
  if (error) throw new Error(error.message);
}
