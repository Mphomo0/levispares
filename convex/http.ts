import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { emailConfigured, sendEmail } from "./lib/email";
import { parsePartRequest, partRequestEmail } from "./lib/partRequest";
import { contactEmail, parseContactMessage } from "./lib/contactMessage";

const http = httpRouter();

// The website calls these from the browser, on a different domain.
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const FALLBACK = "We couldn't send your message. Please email info@levispares.co.za or call 012 770 3389 instead.";

/**
 * A form endpoint that emails the shop (ORDER_NOTIFY_EMAIL) with the visitor
 * as the reply-to address, so staff can answer by replying.
 */
function formToShop<T extends { email: string }>(
  kind: string,
  parse: (body: unknown) => { error: string } | T,
  build: (form: T) => { subject: string; html: string; text: string; attachments?: Array<{ filename: string; content: string }> },
) {
  return httpAction(async (_ctx, request) => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid request" }, 400);
    }
    const parsed = parse(body);
    if ("error" in parsed) return json({ error: parsed.error }, 400);

    const to = process.env.ORDER_NOTIFY_EMAIL;
    if (!emailConfigured() || !to) {
      console.error(`${kind} not sent: email is not set up (RESEND_API_KEY, EMAIL_FROM, ORDER_NOTIFY_EMAIL)`);
      return json({ error: FALLBACK }, 503);
    }

    const email = build(parsed);
    const result = await sendEmail({
      to,
      subject: email.subject,
      html: email.html,
      text: email.text,
      replyTo: parsed.email,
      attachments: email.attachments,
      idempotencyKey: `${kind}-${crypto.randomUUID()}`,
      category: kind.replace(/-/g, "_"),
    });
    if (!result.ok) {
      console.error(`${kind} email failed: ${result.error}`);
      return json({ error: FALLBACK }, 502);
    }
    return json({ ok: true });
  });
}

const preflight = httpAction(async () => new Response(null, { status: 204, headers: CORS }));

/** "Can't find your part?" requests, with any photos attached. */
http.route({
  path: "/part-request",
  method: "POST",
  handler: formToShop(
    "part-request",
    (body) => { const r = parsePartRequest(body); return "error" in r ? r : r.request; },
    partRequestEmail,
  ),
});
http.route({ path: "/part-request", method: "OPTIONS", handler: preflight });

/** The contact page's message form. */
http.route({
  path: "/contact",
  method: "POST",
  handler: formToShop(
    "contact",
    (body) => { const r = parseContactMessage(body); return "error" in r ? r : r.message; },
    contactEmail,
  ),
});
http.route({ path: "/contact", method: "OPTIONS", handler: preflight });

export default http;
