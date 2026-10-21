import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { cartReminderEmail } from "./lib/cartEmail";

/**
 * Emails customers about carts they left behind, through Resend. Needs
 * RESEND_API_KEY and CART_EMAIL_FROM (e.g. "Levi's Spares <shop@levispares.co.za>",
 * on a domain verified in Resend) set on the Convex deployment.
 */
export const sendDue = internalAction({
  args: {},
  handler: async (ctx) => {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.CART_EMAIL_FROM;
    if (!apiKey || !from) {
      console.warn("Cart reminders skipped: RESEND_API_KEY or CART_EMAIL_FROM is not set");
      return { sent: 0, failed: 0 };
    }

    const now = Date.now();
    const due = await ctx.runQuery(internal.carts.dueForReminder, { now });
    let sent = 0;
    let failed = 0;

    for (const cart of due) {
      const email = cartReminderEmail({ name: cart.name, token: cart.token, lines: cart.lines });
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          // Stops a retried run from sending the same reminder twice.
          "Idempotency-Key": `cart-reminder-${cart.cartId}-${cart.updatedAt}`,
        },
        body: JSON.stringify({
          from,
          to: [cart.email],
          subject: email.subject,
          html: email.html,
          text: email.text,
          headers: { "List-Unsubscribe": `<${email.unsubscribe}>` },
          tags: [{ name: "category", value: "abandoned_cart" }],
        }),
      });

      if (response.ok) {
        await ctx.runMutation(internal.carts.markReminded, { cartId: cart.cartId, at: now });
        sent++;
      } else {
        console.error(`Cart reminder to cart ${cart.cartId} failed: ${response.status} ${await response.text()}`);
        failed++;
      }
    }

    return { sent, failed };
  },
});
