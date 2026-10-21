import { v } from "convex/values";
import { internalAction, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { emailConfigured, sendEmail } from "./lib/email";
import { orderEmail, type OrderEmailData } from "./lib/orderEmail";

const kindValidator = v.union(
  v.literal("confirmation"),
  v.literal("newOrder"),
  v.literal("shipped"),
  v.literal("delivered"),
  v.literal("cancelled"),
);

/** What an order email needs, or null when there is no one to send it to. */
export const emailData = internalQuery({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args): Promise<OrderEmailData | null> => {
    const order = await ctx.db.get(args.orderId);
    if (!order) return null;

    const user = order.userId ? await ctx.db.get(order.userId) : null;
    const email = user?.email ?? order.guestEmail;
    if (!email || !email.includes("@") || email.endsWith(".invalid")) return null;

    const items = await ctx.db
      .query("orderItems")
      .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
      .collect();

    return {
      orderId: order._id,
      guestToken: order.userId ? undefined : order.guestToken,
      customerName: user?.name ?? order.shippingSnapshot?.name,
      customerEmail: email,
      items: items.map(({ name, quantity, price, partNumber }) => ({ name, quantity, price, partNumber })),
      subtotal: order.subtotal,
      discount: order.discount ?? 0,
      promoCode: order.promoCode,
      shipping: order.shipping,
      tax: order.tax,
      total: order.total,
      address: order.shippingSnapshot,
      notes: order.notes,
    };
  },
});

/**
 * Sends one email about an order: to the customer, or for "newOrder" to the
 * shop at ORDER_NOTIFY_EMAIL. Scheduled by the order mutations.
 */
export const send = internalAction({
  args: { orderId: v.id("orders"), kind: kindValidator },
  handler: async (ctx, args) => {
    if (!emailConfigured()) {
      console.warn(`Order email "${args.kind}" skipped: RESEND_API_KEY or EMAIL_FROM is not set`);
      return { sent: false };
    }
    const to = args.kind === "newOrder" ? process.env.ORDER_NOTIFY_EMAIL : undefined;
    if (args.kind === "newOrder" && !to) return { sent: false };

    const data = await ctx.runQuery(internal.orderEmails.emailData, { orderId: args.orderId });
    if (!data) return { sent: false };

    const email = orderEmail(args.kind, data);
    const result = await sendEmail({
      to: to ?? data.customerEmail,
      subject: email.subject,
      html: email.html,
      text: email.text,
      idempotencyKey: `order-${args.orderId}-${args.kind}`,
      category: `order_${args.kind}`,
    });
    if (!result.ok) {
      // Thrown so the failure shows in the Convex logs for this run.
      throw new Error(`Order email "${args.kind}" for ${args.orderId} failed: ${result.error}`);
    }
    return { sent: true };
  },
});
