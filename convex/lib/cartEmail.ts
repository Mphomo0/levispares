import { SITE_LOGO, SITE_NAME, SITE_URL, escapeHtml, formatPrice } from "./email";

export interface ReminderLine {
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

export function cartLinks(token: string) {
  const t = encodeURIComponent(token);
  return {
    recover: `${SITE_URL}/cart/recover/${t}?utm_source=email&utm_medium=email&utm_campaign=abandoned_cart`,
    unsubscribe: `${SITE_URL}/unsubscribe?token=${t}`,
  };
}

/** Subject, HTML and plain-text body of the "you left something in your cart" email. */
export function cartReminderEmail(args: { name?: string; token: string; lines: ReminderLine[] }) {
  const { recover, unsubscribe } = cartLinks(args.token);
  const firstName = args.name?.trim().split(/\s+/)[0];
  const greeting = firstName ? `Hi ${firstName},` : "Hi there,";
  const total = args.lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
  const subject = args.lines.length === 1
    ? `You left ${args.lines[0].name} in your cart`
    : `You left ${args.lines.length} items in your cart`;

  const rows = args.lines.map((line) => `
          <tr>
            <td style="padding:12px 0;border-bottom:1px solid #e5e7eb;width:64px">
              ${line.image ? `<img src="${escapeHtml(line.image)}" alt="" width="56" height="56" style="display:block;border-radius:8px;object-fit:cover">` : ""}
            </td>
            <td style="padding:12px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#111827">
              ${escapeHtml(line.name)}<br><span style="color:#6b7280">Qty ${line.quantity}</span>
            </td>
            <td style="padding:12px 0;border-bottom:1px solid #e5e7eb;font-size:14px;color:#111827;text-align:right;white-space:nowrap">
              ${formatPrice(line.price * line.quantity)}
            </td>
          </tr>`).join("");

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px">
      <tr><td>
        <img src="${SITE_LOGO}" alt="${escapeHtml(SITE_NAME)}" height="40" style="display:block;margin-bottom:24px">
        <p style="font-size:16px;color:#111827;margin:0 0 8px">${escapeHtml(greeting)}</p>
        <p style="font-size:16px;color:#374151;margin:0 0 24px">Your parts are still waiting in your cart. Pick up where you left off before they sell out.</p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">${rows}
          <tr>
            <td></td>
            <td style="padding:12px;font-size:14px;font-weight:bold;color:#111827">Subtotal</td>
            <td style="padding:12px 0;font-size:14px;font-weight:bold;color:#111827;text-align:right;white-space:nowrap">${formatPrice(total)}</td>
          </tr>
        </table>
        <p style="margin:32px 0;text-align:center">
          <a href="${escapeHtml(recover)}" style="display:inline-block;background:#dc2626;color:#ffffff;text-decoration:none;font-weight:bold;padding:14px 28px;border-radius:8px">Return to your cart</a>
        </p>
        <p style="font-size:12px;color:#9ca3af;margin:0">
          You are getting this because you left items in your cart at ${escapeHtml(SITE_NAME)}.
          <a href="${escapeHtml(unsubscribe)}" style="color:#9ca3af">Stop cart reminders</a>.
        </p>
      </td></tr>
    </table>
  </body>
</html>`;

  const text = [
    greeting,
    "",
    "Your parts are still waiting in your cart:",
    ...args.lines.map((line) => `- ${line.name} x${line.quantity}: ${formatPrice(line.price * line.quantity)}`),
    `Subtotal: ${formatPrice(total)}`,
    "",
    `Return to your cart: ${recover}`,
    "",
    `Stop cart reminders: ${unsubscribe}`,
  ].join("\n");

  return { subject, html, text, unsubscribe };
}
