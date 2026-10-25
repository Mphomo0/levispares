/**
 * Sends one email through Resend. Needs RESEND_API_KEY and EMAIL_FROM
 * (e.g. "Levi's Spares <shop@levispares.co.za>", on a domain verified in
 * Resend) set on the Convex deployment; without them nothing is sent.
 * EMAIL_REPLY_TO (e.g. info@levispares.co.za) is where customer replies go,
 * when the sending address has no inbox of its own.
 */
export function emailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export async function sendEmail(email: {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Stops a retried send from delivering the same email twice. */
  idempotencyKey: string;
  headers?: Record<string, string>;
  category: string;
  /** Overrides EMAIL_REPLY_TO, e.g. so the shop can reply straight to a customer. */
  replyTo?: string;
  /** Files to attach, as base64. */
  attachments?: Array<{ filename: string; content: string }>;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  const replyTo = email.replyTo ?? process.env.EMAIL_REPLY_TO;
  if (!apiKey || !from) return { ok: false as const, error: "RESEND_API_KEY or EMAIL_FROM is not set" };

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": email.idempotencyKey,
    },
    body: JSON.stringify({
      from,
      to: [email.to],
      ...(replyTo && { reply_to: replyTo }),
      subject: email.subject,
      html: email.html,
      text: email.text,
      headers: email.headers,
      tags: [{ name: "category", value: email.category }],
      ...(email.attachments?.length && { attachments: email.attachments }),
    }),
  });

  if (response.ok) return { ok: true as const };
  return { ok: false as const, error: `${response.status} ${await response.text()}` };
}

export function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const amountFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
export const formatPrice = (value: number) => `R${amountFormatter.format(value)}`;

// Kept in step with SITE_URL / SITE_NAME / SITE_LOGO in lib/site.ts.
export const SITE_URL = "https://www.levispares.co.za";
export const SITE_NAME = "Levi's Spares";
export const SITE_LOGO = "https://ik.imagekit.io/qvmqqewsu/logo.webp";

/** The shared frame every store email sits in. */
export function emailLayout(body: string, footer: string) {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px">
      <tr><td>
        <img src="${SITE_LOGO}" alt="${escapeHtml(SITE_NAME)}" height="40" style="display:block;margin-bottom:24px">
${body}
        <p style="font-size:12px;color:#9ca3af;margin:32px 0 0">${footer}</p>
      </td></tr>
    </table>
  </body>
</html>`;
}

export function emailButton(href: string, label: string) {
  return `<p style="margin:32px 0;text-align:center">
          <a href="${escapeHtml(href)}" style="display:inline-block;background:#dc2626;color:#ffffff;text-decoration:none;font-weight:bold;padding:14px 28px;border-radius:8px">${escapeHtml(label)}</a>
        </p>`;
}
