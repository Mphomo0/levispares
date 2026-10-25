import { v, ConvexError } from "convex/values";
import { internalMutation, mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { isAdmin, requireAdmin } from "./lib/auth";
import { canAccessOrder } from "./lib/orderAccess";

// Statuses of orders that have been paid for, and so carry an invoice.
const INVOICED_STATUSES = new Set(["paid", "processing", "shipped", "delivered", "cancelled"]);

export const formatInvoiceNumber = (n: number) => `INV-${String(n).padStart(5, "0")}`;

async function globalSettings(ctx: QueryCtx) {
  return await ctx.db
    .query("storeSettings")
    .withIndex("by_key", (q) => q.eq("key", "global"))
    .first();
}

/**
 * Gives a paid order the next invoice number. Numbers run in sequence
 * without gaps, as SARS requires, and an order keeps its number for good.
 */
export async function assignInvoiceNumber(ctx: MutationCtx, orderId: Id<"orders">) {
  const order = await ctx.db.get(orderId);
  if (!order || order.invoiceNumber) return;

  const settings = await globalSettings(ctx);
  const next = (settings?.invoiceCounter ?? 0) + 1;
  if (settings) {
    await ctx.db.patch(settings._id, { invoiceCounter: next });
  } else {
    await ctx.db.insert("storeSettings", { key: "global", invoiceCounter: next });
  }
  await ctx.db.patch(orderId, { invoiceNumber: formatInvoiceNumber(next), invoicedAt: Date.now() });
}

/** One-off: numbers orders that were paid before invoices existed, oldest first. */
export const backfill = internalMutation({
  args: {},
  handler: async (ctx) => {
    const orders = await ctx.db.query("orders").order("asc").collect();
    let numbered = 0;
    for (const order of orders) {
      if (order.invoiceNumber || !INVOICED_STATUSES.has(order.status)) continue;
      // Cancelled orders that were never paid get no number.
      if (order.status === "cancelled" && !order.paypalOrderId) continue;
      await assignInvoiceNumber(ctx, order._id);
      numbered++;
    }
    return { numbered };
  },
});

/** Everything printed on an order's invoice, for its customer (or a guest with the token) and admins. */
export const get = query({
  args: { orderId: v.id("orders"), guestToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order || !order.invoiceNumber || !(await canAccessOrder(ctx, order, args.guestToken))) return null;

    const settings = await globalSettings(ctx);
    const user = order.userId ? await ctx.db.get(order.userId) : null;
    const items = await ctx.db
      .query("orderItems")
      .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
      .collect();

    // Whether VAT was charged is decided by the order itself, so switching
    // VAT on or off later never changes an invoice already issued.
    const discount = order.discount ?? 0;
    const vatCharged = order.tax > 0;
    const taxable = order.subtotal - discount;
    const vatRate = order.taxRate ?? (vatCharged && taxable > 0 ? Math.round((order.tax / taxable) * 1000) / 10 : 0);

    return {
      title: vatCharged ? "Tax Invoice" : "Invoice",
      invoiceNumber: order.invoiceNumber,
      invoiceDate: order.invoicedAt ?? order._creationTime,
      orderNumber: order._id.slice(-8).toUpperCase(),
      status: order.status,
      seller: {
        name: settings?.businessName || "Levi's Spares",
        address: settings?.businessAddress,
        phone: settings?.businessPhone,
        email: settings?.businessEmail,
        vatNumber: vatCharged ? settings?.vatNumber : undefined,
        registrationNumber: settings?.registrationNumber,
      },
      buyer: {
        name: order.shippingSnapshot?.name ?? user?.name,
        email: user?.email ?? order.guestEmail,
        company: order.billingCompany,
        vatNumber: order.billingVatNumber,
        address: order.shippingSnapshot,
      },
      items: items.map(({ name, sku, partNumber, price, quantity, total }) => ({ name, sku, partNumber, price, quantity, total })),
      subtotal: order.subtotal,
      discount,
      promoCode: order.promoCode,
      shipping: order.shipping,
      vatCharged,
      vatRate,
      tax: order.tax,
      total: order.total,
    };
  },
});

export const businessDetails = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isAdmin(ctx))) return null;
    const settings = await globalSettings(ctx);
    return {
      businessName: settings?.businessName ?? "",
      businessAddress: settings?.businessAddress ?? "",
      businessPhone: settings?.businessPhone ?? "",
      businessEmail: settings?.businessEmail ?? "",
      vatNumber: settings?.vatNumber ?? "",
      registrationNumber: settings?.registrationNumber ?? "",
      lastInvoiceNumber: settings?.invoiceCounter ? formatInvoiceNumber(settings.invoiceCounter) : null,
    };
  },
});

export const updateBusinessDetails = mutation({
  args: {
    businessName: v.string(),
    businessAddress: v.string(),
    businessPhone: v.string(),
    businessEmail: v.string(),
    vatNumber: v.string(),
    registrationNumber: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const fields = Object.fromEntries(Object.entries(args).map(([key, value]) => [key, value.trim()]));
    if (Object.values(fields).some((value) => value.length > 500)) throw new ConvexError("One of the details is too long");
    if (fields.vatNumber && !/^4\d{9}$/.test(fields.vatNumber.replace(/\s/g, ""))) {
      throw new ConvexError("A South African VAT number is 10 digits starting with 4");
    }

    const settings = await globalSettings(ctx);
    if (settings) {
      await ctx.db.patch(settings._id, fields);
    } else {
      await ctx.db.insert("storeSettings", { key: "global", ...fields });
    }
  },
});
