import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { cartReminderEmail } from "./lib/cartEmail";
import { emailConfigured, sendEmail } from "./lib/email";

/** Emails customers about carts they left behind (see lib/email for the settings it needs). */
export const sendDue = internalAction({
  args: {},
  handler: async (ctx) => {
    if (!emailConfigured()) {
      console.warn("Cart reminders skipped: RESEND_API_KEY or EMAIL_FROM is not set");
      return { sent: 0, failed: 0 };
    }

    const now = Date.now();
    const due = await ctx.runQuery(internal.carts.dueForReminder, { now });
    let sent = 0;
    let failed = 0;

    for (const cart of due) {
      const email = cartReminderEmail({ name: cart.name, token: cart.token, lines: cart.lines });
      const result = await sendEmail({
        to: cart.email,
        subject: email.subject,
        html: email.html,
        text: email.text,
        idempotencyKey: `cart-reminder-${cart.cartId}-${cart.updatedAt}`,
        headers: { "List-Unsubscribe": `<${email.unsubscribe}>` },
        category: "abandoned_cart",
      });

      if (result.ok) {
        await ctx.runMutation(internal.carts.markReminded, { cartId: cart.cartId, at: now });
        sent++;
      } else {
        console.error(`Cart reminder to cart ${cart.cartId} failed: ${result.error}`);
        failed++;
      }
    }

    return { sent, failed };
  },
});
