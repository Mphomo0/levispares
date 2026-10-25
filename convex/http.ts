import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { emailConfigured, sendEmail } from "./lib/email";
import { parsePartRequest, partRequestEmail } from "./lib/partRequest";

const http = httpRouter();

// The website calls this from the browser, on a different domain.
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

/**
 * "Can't find your part?" requests: emailed to the shop (ORDER_NOTIFY_EMAIL)
 * with any photos attached, with the customer as the reply-to address.
 */
http.route({
  path: "/part-request",
  method: "POST",
  handler: httpAction(async (_ctx, request) => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid request" }, 400);
    }
    const parsed = parsePartRequest(body);
    if ("error" in parsed) return json({ error: parsed.error }, 400);

    const to = process.env.ORDER_NOTIFY_EMAIL;
    if (!emailConfigured() || !to) {
      console.error("Part request not sent: email is not set up (RESEND_API_KEY, EMAIL_FROM, ORDER_NOTIFY_EMAIL)");
      return json({ error: "We couldn't send your request. Please email info@levispares.co.za instead." }, 503);
    }

    const email = partRequestEmail(parsed.request);
    const result = await sendEmail({
      to,
      subject: email.subject,
      html: email.html,
      text: email.text,
      replyTo: parsed.request.email,
      attachments: email.attachments,
      idempotencyKey: `part-request-${crypto.randomUUID()}`,
      category: "part_request",
    });
    if (!result.ok) {
      console.error(`Part request email failed: ${result.error}`);
      return json({ error: "We couldn't send your request. Please email info@levispares.co.za instead." }, 502);
    }
    return json({ ok: true });
  }),
});

http.route({
  path: "/part-request",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: CORS })),
});

export default http;
