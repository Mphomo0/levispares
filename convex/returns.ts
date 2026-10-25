import { v, ConvexError } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { isAdmin, requireAdmin } from "./lib/auth";
import { canAccessOrder } from "./lib/orderAccess";

/** Customers can ask to return parts this long after delivery. */
export const RETURN_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export const REASON_LABELS = {
  wrong_part: "Wrong part / doesn't fit",
  damaged: "Damaged or faulty",
  not_needed: "No longer needed",
  other: "Other",
} as const;

const reasonValidator = v.union(
  v.literal("wrong_part"),
  v.literal("damaged"),
  v.literal("not_needed"),
  v.literal("other"),
);

/** When the order counts as delivered, for the return window. */
function deliveredAt(order: Doc<"orders">) {
  if (order.status !== "delivered") return null;
  // Orders delivered before the date was recorded count from when they were paid.
  return order.deliveredAt ?? order.invoicedAt ?? order._creationTime;
}

async function returnsFor(ctx: QueryCtx, orderId: Id<"orders">) {
  return await ctx.db
    .query("returns")
    .withIndex("by_orderId", (q) => q.eq("orderId", orderId))
    .collect();
}

/** What is left to return on an order: each product bought, less what is already being returned. */
async function returnable(ctx: QueryCtx, order: Doc<"orders">) {
  const items = await ctx.db
    .query("orderItems")
    .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
    .collect();
  const returns = await returnsFor(ctx, order._id);

  const left = new Map<Id<"products">, { productId: Id<"products">; name: string; price: number; quantity: number }>();
  for (const item of items) {
    const line = left.get(item.productId);
    if (line) line.quantity += item.quantity;
    else left.set(item.productId, { productId: item.productId, name: item.name, price: item.price, quantity: item.quantity });
  }
  for (const ret of returns) {
    if (ret.status === "rejected") continue;
    for (const item of ret.items) {
      const line = left.get(item.productId);
      if (line) line.quantity -= item.quantity;
    }
  }
  return { lines: [...left.values()].filter((line) => line.quantity > 0), returns };
}

/**
 * What a return is worth: the items' share of what was actually paid, so a
 * promo discount is taken off and VAT charged on them is added back.
 * Delivery is not refunded.
 */
export function refundValue(order: Doc<"orders">, items: Array<{ price: number; quantity: number }>) {
  const itemsTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discountShare = order.subtotal > 0 ? (order.discount ?? 0) / order.subtotal : 0;
  const taxable = itemsTotal * (1 - discountShare);
  const taxRate = order.taxRate ?? (order.tax > 0 && order.subtotal - (order.discount ?? 0) > 0
    ? order.tax / (order.subtotal - (order.discount ?? 0)) * 100
    : 0);
  return round2(taxable * (1 + taxRate / 100));
}

const refundLeft = (order: Doc<"orders">) => round2(order.total - (order.refundedTotal ?? 0));

/** For the customer's order page: whether they can start a return, and the returns so far. */
export const forOrder = query({
  args: { orderId: v.id("orders"), guestToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order || !(await canAccessOrder(ctx, order, args.guestToken))) return null;

    const { lines, returns } = await returnable(ctx, order);
    const delivered = deliveredAt(order);
    const deadline = delivered === null ? null : delivered + RETURN_WINDOW_MS;
    const open = deadline !== null && Date.now() < deadline && lines.length > 0;

    return {
      canRequest: open,
      deadline,
      why: open ? null
        : delivered === null ? "Returns can be requested once your order has been delivered."
        : lines.length === 0 ? "Every item on this order is already being returned."
        : "The 14-day return period for this order has ended.",
      items: lines.map(({ productId, name, price, quantity }) => ({ productId, name, price, maxQuantity: quantity })),
      returns: returns.map((ret) => ({
        _id: ret._id,
        _creationTime: ret._creationTime,
        status: ret.status,
        items: ret.items,
        reason: REASON_LABELS[ret.reason],
        adminNote: ret.adminNote,
        refundAmount: ret.refundAmount,
      })),
    };
  },
});

export const request = mutation({
  args: {
    orderId: v.id("orders"),
    guestToken: v.optional(v.string()),
    items: v.array(v.object({ productId: v.id("products"), quantity: v.number() })),
    reason: reasonValidator,
    details: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    // Admins don't file returns for customers through this.
    if (!order || !(await canAccessOrder(ctx, order, args.guestToken)) ||
      (args.guestToken === undefined && !order.userId)) {
      throw new ConvexError("Order not found");
    }
    const delivered = deliveredAt(order);
    if (delivered === null) throw new ConvexError("Returns can be requested once your order has been delivered");
    if (Date.now() >= delivered + RETURN_WINDOW_MS) throw new ConvexError("The 14-day return period for this order has ended");

    const details = args.details?.trim();
    if (details && details.length > 2000) throw new ConvexError("Please keep the details under 2000 characters");
    if (args.reason === "other" && !details) throw new ConvexError("Please tell us why you are returning the parts");

    const { lines } = await returnable(ctx, order);
    const items = [];
    for (const wanted of args.items) {
      if (!Number.isInteger(wanted.quantity) || wanted.quantity < 0) throw new ConvexError("Invalid quantity");
      if (wanted.quantity === 0) continue;
      const line = lines.find((l) => l.productId === wanted.productId);
      if (!line || wanted.quantity > line.quantity) throw new ConvexError("You can't return more than you bought");
      items.push({ productId: line.productId, name: line.name, price: line.price, quantity: wanted.quantity });
    }
    if (items.length === 0) throw new ConvexError("Choose at least one item to return");

    const returnId = await ctx.db.insert("returns", {
      orderId: order._id,
      items,
      reason: args.reason,
      details: details || undefined,
      status: "requested",
    });
    await ctx.scheduler.runAfter(0, internal.returnEmails.send, { returnId, kind: "requested" });
    return returnId;
  },
});

async function withOrder(ctx: QueryCtx, ret: Doc<"returns">) {
  const order = await ctx.db.get(ret.orderId);
  if (!order) throw new ConvexError("Order not found");
  return order;
}

/** All returns, newest first, with what the admin needs to decide and refund. */
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isAdmin(ctx))) return [];
    const returns = await ctx.db.query("returns").order("desc").collect();
    return Promise.all(returns.map(async (ret) => {
      const order = await ctx.db.get(ret.orderId);
      const user = order?.userId ? await ctx.db.get(order.userId) : null;
      return {
        ...ret,
        reasonLabel: REASON_LABELS[ret.reason],
        orderNumber: ret.orderId.slice(-8).toUpperCase(),
        invoiceNumber: order?.invoiceNumber,
        customerName: user?.name ?? order?.shippingSnapshot?.name ?? null,
        customerEmail: user?.email ?? order?.guestEmail ?? null,
        suggestedRefund: order ? Math.min(refundValue(order, ret.items), refundLeft(order)) : 0,
        maxRefund: order ? refundLeft(order) : 0,
        paidWithPayPal: Boolean(order?.paypalOrderId),
      };
    }));
  },
});

export const approve = mutation({
  args: { id: v.id("returns"), note: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const ret = await ctx.db.get(args.id);
    if (!ret) throw new ConvexError("Return not found");
    if (ret.status !== "requested") throw new ConvexError("This return has already been dealt with");
    await ctx.db.patch(args.id, { status: "approved", adminNote: args.note?.trim() || undefined, decidedAt: Date.now() });
    await ctx.scheduler.runAfter(0, internal.returnEmails.send, { returnId: args.id, kind: "approved" });
  },
});

export const reject = mutation({
  args: { id: v.id("returns"), note: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const ret = await ctx.db.get(args.id);
    if (!ret) throw new ConvexError("Return not found");
    if (ret.status !== "requested" && ret.status !== "approved") throw new ConvexError("This return has already been dealt with");
    if (!args.note.trim()) throw new ConvexError("Tell the customer why the return was turned down");
    await ctx.db.patch(args.id, { status: "rejected", adminNote: args.note.trim(), decidedAt: Date.now() });
    await ctx.scheduler.runAfter(0, internal.returnEmails.send, { returnId: args.id, kind: "rejected" });
  },
});

/** What the refund route needs before paying money back. */
export const refundQuote = query({
  args: { id: v.id("returns") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const ret = await ctx.db.get(args.id);
    if (!ret) return null;
    const order = await withOrder(ctx, ret);
    return {
      status: ret.status,
      orderId: order._id,
      paypalOrderId: order.paypalOrderId,
      exchangeRate: order.exchangeRate,
      maxRefund: refundLeft(order),
    };
  },
});

async function restock(ctx: MutationCtx, items: Doc<"returns">["items"]) {
  for (const item of items) {
    const product = await ctx.db.get(item.productId);
    if (!product) continue;
    await ctx.db.patch(item.productId, {
      stockQty: (product.stockQty ?? 0) + item.quantity,
      totalSold: Math.max(0, (product.totalSold ?? 0) - item.quantity),
    });
  }
}

/**
 * Records that a return's parts came back and the money was refunded:
 * puts the parts back in stock and adds the amount to the order's refunds.
 * Called by the refund route after PayPal has paid out, or directly for
 * orders that were paid some other way and refunded by hand.
 */
export const markRefunded = mutation({
  args: { id: v.id("returns"), amount: v.number(), paypalRefundId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const ret = await ctx.db.get(args.id);
    if (!ret) throw new ConvexError("Return not found");
    if (ret.status !== "approved") throw new ConvexError("Only an approved return can be refunded");
    const order = await withOrder(ctx, ret);
    const amount = round2(args.amount);
    if (!(amount > 0) || amount > refundLeft(order)) {
      throw new ConvexError(`The refund must be between R0.01 and R${refundLeft(order).toFixed(2)}`);
    }
    if (!args.paypalRefundId && order.paypalOrderId) {
      // Money paid through PayPal goes back through PayPal (the refund route).
      throw new ConvexError("This order was paid with PayPal; refund it through PayPal");
    }

    const now = Date.now();
    await restock(ctx, ret.items);
    await ctx.db.patch(args.id, { status: "refunded", refundAmount: amount, refundedAt: now, paypalRefundId: args.paypalRefundId });
    await ctx.db.patch(order._id, { refundedTotal: round2((order.refundedTotal ?? 0) + amount) });
    await ctx.scheduler.runAfter(0, internal.returnEmails.send, { returnId: args.id, kind: "refunded" });
  },
});

export const openCount = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isAdmin(ctx))) return 0;
    const requested = await ctx.db.query("returns").withIndex("by_status", (q) => q.eq("status", "requested")).collect();
    return requested.length;
  },
});
