import nodemailer from "nodemailer";

export function isCrmSmtpConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST?.trim() && process.env.CRM_MAIL_FROM?.trim()
  );
}

export function getCrmSmtpConfigError(): string | null {
  if (!process.env.SMTP_HOST?.trim()) {
    return "SMTP_HOST tanımlı değil.";
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
  const err = getCrmSmtpConfigError();
  if (err) throw new Error(err);

  const host = process.env.SMTP_HOST!.trim();
  const port = Math.max(1, Number(process.env.SMTP_PORT) || 587);
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const from = process.env.CRM_MAIL_FROM!.trim();

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
    to: opts.to.trim(),
    subject: opts.subject,
    text: opts.text,
  });
}
