import { v, ConvexError } from "convex/values";
import { internalAction, internalMutation, internalQuery, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { SITE_NAME, SITE_URL, emailButton, emailConfigured, emailLayout, escapeHtml, formatPrice, sendEmail } from "./lib/email";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Most alerts sent in one run of the cron job.
const BATCH_SIZE = 100;

/** Signs an email address up to hear when an out-of-stock product is back. */
export const subscribe = mutation({
  args: { productId: v.id("products"), email: v.string() },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(email) || email.length > 254) throw new ConvexError("Please enter a valid email address");
    const product = await ctx.db.get(args.productId);
    if (!product || product.active === false) throw new ConvexError("This product is no longer available");
    if ((product.stockQty ?? 0) > 0) throw new ConvexError("Good news: this part is in stock now");

    const waiting = await ctx.db
      .query("stockAlerts")
      .withIndex("by_productId", (q) => q.eq("productId", args.productId))
      .collect();
    if (waiting.some((alert) => alert.email === email && alert.notifiedAt === undefined)) return;
    await ctx.db.insert("stockAlerts", { productId: args.productId, email });
  },
});

/** Waiting alerts whose product is back in stock. */
export const due = internalQuery({
  args: {},
  handler: async (ctx) => {
    const waiting = await ctx.db
      .query("stockAlerts")
      .withIndex("by_notifiedAt", (q) => q.eq("notifiedAt", undefined))
      .collect();
    const products = new Map<Id<"products">, { name: string; price: number; slug?: string; image?: string } | null>();
    const ready = [];
    for (const alert of waiting) {
      if (ready.length >= BATCH_SIZE) break;
      if (!products.has(alert.productId)) {
        const product = await ctx.db.get(alert.productId);
        const available = product && product.active !== false && (product.stockQty ?? 0) > 0;
        products.set(alert.productId, available
          ? { name: product.name, price: product.price, slug: product.slug, image: product.image }
          : null);
      }
      const product = products.get(alert.productId);
      if (product) ready.push({ alertId: alert._id, email: alert.email, productId: alert.productId, product });
    }
    return ready;
  },
});

export const markNotified = internalMutation({
  args: { alertId: v.id("stockAlerts"), at: v.number() },
  handler: async (ctx, args) => {
    if (await ctx.db.get(args.alertId)) await ctx.db.patch(args.alertId, { notifiedAt: args.at });
  },
});

export function backInStockEmail(product: { name: string; price: number; slug?: string; image?: string }, productId: string) {
  const url = `${SITE_URL}/products/${encodeURIComponent(product.slug || productId)}?utm_source=email&utm_medium=email&utm_campaign=back_in_stock`;
  const body = `
        <p style="font-size:20px;font-weight:bold;color:#111827;margin:0 0 16px">It's back in stock</p>
        ${product.image ? `<img src="${escapeHtml(product.image)}" alt="" width="160" style="display:block;border-radius:8px;margin:0 0 16px">` : ""}
        <p style="font-size:16px;color:#374151;margin:0 0 8px">${escapeHtml(product.name)} is available again at ${formatPrice(product.price)}.</p>
        <p style="font-size:14px;color:#6b7280;margin:0">Stock is limited, so order soon if you still need it.</p>
        ${emailButton(url, "View the part")}`;
  return {
    subject: `Back in stock: ${product.name}`,
    html: emailLayout(body, `You asked ${escapeHtml(SITE_NAME)} to tell you when this part was back. This is the only email we'll send about it.`),
    text: [`${product.name} is back in stock at ${formatPrice(product.price)}.`, "", url].join("\n"),
  };
}

/** Run by the cron job: emails everyone whose part has come back into stock, once. */
export const sendDue = internalAction({
  args: {},
  handler: async (ctx) => {
    if (!emailConfigured()) return { sent: 0, failed: 0 };
    const ready = await ctx.runQuery(internal.stockAlerts.due, {});
    let sent = 0;
    let failed = 0;
    for (const alert of ready) {
      const email = backInStockEmail(alert.product, alert.productId);
      const result = await sendEmail({
        to: alert.email,
        subject: email.subject,
        html: email.html,
        text: email.text,
        idempotencyKey: `stock-alert-${alert.alertId}`,
        category: "back_in_stock",
      });
      if (result.ok) {
        await ctx.runMutation(internal.stockAlerts.markNotified, { alertId: alert.alertId, at: Date.now() });
        sent++;
      } else {
        console.error(`Back-in-stock email for alert ${alert.alertId} failed: ${result.error}`);
        failed++;
      }
    }
    return { sent, failed };
  },
});
