import { v, ConvexError } from "convex/values";
import { internalMutation, mutation, query, QueryCtx, MutationCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import type { Id } from "./_generated/dataModel";
import { isAdmin, requireAdmin } from "./lib/auth";
import { clearCartAfterPayment } from "./carts";
import { applyPromotion, countPromotionUse } from "./promotions";
import { assignInvoiceNumber } from "./invoices";
import { internal } from "./_generated/api";

// Stock is held back for an order from the moment it is paid until it is
// cancelled (or moved back to pending).
const STOCK_DEDUCTED_STATUSES = new Set(["paid", "processing", "shipped", "delivered"]);

function isStockDeducted(order: { status: string; stockDeducted?: boolean }) {
  // Orders paid before the flag existed had their stock deducted by markPaid.
  return order.stockDeducted ?? STOCK_DEDUCTED_STATUSES.has(order.status);
}

async function deleteOrderItems(ctx: MutationCtx, orderId: Id<"orders">) {
  const items = await ctx.db
    .query("orderItems")
    .withIndex("by_orderId", (q) => q.eq("orderId", orderId))
    .collect();
  for (const item of items) {
    await ctx.db.delete(item._id);
  }
}

async function adjustStock(ctx: MutationCtx, orderId: Id<"orders">, direction: "deduct" | "restore") {
  const items = await ctx.db
    .query("orderItems")
    .withIndex("by_orderId", (q) => q.eq("orderId", orderId))
    .collect();

  for (const item of items) {
    const product = await ctx.db.get(item.productId);
    if (!product) continue;

    const stock = product.stockQty ?? 0;
    const sold = product.totalSold ?? 0;
    await ctx.db.patch(item.productId, direction === "deduct"
      ? { stockQty: Math.max(0, stock - item.quantity), totalSold: sold + item.quantity }
      : { stockQty: stock + item.quantity, totalSold: Math.max(0, sold - item.quantity) });
  }
}

/** An order as its customer may see it: notes meant for staff are left out. */
function forCustomer<T extends Doc<"orders">>(order: T) {
  const { adminAlert: _alert, ...rest } = order;
  void _alert;
  return rest;
}

/** Throws when any item on the order can no longer be supplied in full. */
async function assertInStock(ctx: QueryCtx, orderId: Id<"orders">) {
  const items = await ctx.db
    .query("orderItems")
    .withIndex("by_orderId", (q) => q.eq("orderId", orderId))
    .collect();
  for (const item of items) {
    const product = await ctx.db.get(item.productId);
    const stock = product && product.active !== false ? product.stockQty ?? 0 : 0;
    if (stock < item.quantity) {
      throw new ConvexError(`Sorry, "${item.name}" has just sold out. Available: ${stock}, in your order: ${item.quantity}. Please update your cart.`);
    }
  }
}

/** Items on the order that stock cannot cover, as "name (short by n)". */
async function shortfalls(ctx: QueryCtx, orderId: Id<"orders">) {
  const items = await ctx.db
    .query("orderItems")
    .withIndex("by_orderId", (q) => q.eq("orderId", orderId))
    .collect();
  const short = [];
  for (const item of items) {
    const product = await ctx.db.get(item.productId);
    const stock = product?.stockQty ?? 0;
    if (stock < item.quantity) short.push(`${item.name} (short by ${item.quantity - stock})`);
  }
  return short;
}

async function getUserIdFromAuth(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
    .unique();
  if (user?.isActive === false) return null;
  return user?._id ?? null;
}

export const listByUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserIdFromAuth(ctx);
    if (!userId) return [];
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    return Promise.all(
      orders.map(async (order) => {
        const items = await ctx.db
          .query("orderItems")
          .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
          .collect();
        return { ...forCustomer(order), items };
      })
    );
  },
});

export const listByUserId = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    if (!(await isAdmin(ctx))) return [];
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();

    return Promise.all(
      orders.map(async (order) => {
        const items = await ctx.db
          .query("orderItems")
          .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
          .collect();
        return { ...order, items };
      })
    );
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isAdmin(ctx))) return [];
    const orders = await ctx.db.query("orders").order("desc").collect();

    return Promise.all(
      orders.map(async (order) => {
        const items = await ctx.db
          .query("orderItems")
          .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
          .collect();
        const customer = order.userId ? await ctx.db.get(order.userId) : null;
        return {
          ...order,
          items,
          customerName: customer?.name ?? order.shippingSnapshot?.name ?? null,
          customerEmail: customer?.email ?? order.guestEmail ?? null,
        };
      })
    );
  },
});

/** Latest orders that are real orders: unpaid checkouts are left out. */
export const listRecent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    if (!(await isAdmin(ctx))) return [];
    return await ctx.db
      .query("orders")
      .order("desc")
      .filter((q) => q.neq(q.field("status"), "pending"))
      .take(args.limit ?? 5);
  },
});

export const getById = query({
  args: { id: v.id("orders") },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.id);
    if (!order) return null;

    // Only the customer who placed the order (or an admin) may read it.
    const callerId = await getUserIdFromAuth(ctx);
    if ((!order.userId || order.userId !== callerId) && !(await isAdmin(ctx))) return null;

    const items = await ctx.db
      .query("orderItems")
      .withIndex("by_orderId", (q) => q.eq("orderId", args.id))
      .collect();

    const shippingAddress = order.shippingSnapshot
      ?? (order.shippingAddressId ? await ctx.db.get(order.shippingAddressId) : null);
    const billingAddress = order.billingAddressId
      ? await ctx.db.get(order.billingAddressId)
      : null;

    return {
      ...forCustomer(order),
      items,
      shippingAddress,
      billingAddress,
    };
  },
});

const MAX_LINE_QUANTITY = 999;

function assertServerSecret(secret: string) {
  const expected = process.env.PAYMENT_SERVER_SECRET;
  if (!expected || secret !== expected) {
    throw new ConvexError("Not authorized");
  }
}

/** Which email (if any) a customer gets when an admin moves their order from one status to another. */
function statusEmail(from: string, to: string) {
  if (from === to) return null;
  if (to === "paid" && from === "pending") return "confirmation" as const;
  if (to === "shipped" || to === "delivered") return to;
  if (to === "cancelled" && from !== "pending") return "cancelled" as const;
  return null;
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Everything an admin needs to fulfil an order: customer, items, delivery details. */
export const getAdminDetail = query({
  args: { id: v.id("orders") },
  handler: async (ctx, args) => {
    if (!(await isAdmin(ctx))) return null;

    const order = await ctx.db.get(args.id);
    if (!order) return null;

    const items = await ctx.db
      .query("orderItems")
      .withIndex("by_orderId", (q) => q.eq("orderId", args.id))
      .collect();
    const customer = order.userId ? await ctx.db.get(order.userId) : null;
    const shippingAddress = order.shippingSnapshot
      ?? (order.shippingAddressId ? await ctx.db.get(order.shippingAddressId) : null);

    return {
      ...order,
      items,
      customer: customer
        ? { name: customer.name, email: customer.email }
        : order.guestEmail
          ? { name: `${order.shippingSnapshot?.name ?? "Guest"} (guest)`, email: order.guestEmail }
          : null,
      shippingAddress,
    };
  },
});

const companyValidator = v.optional(v.object({
  name: v.string(),
  vatNumber: v.optional(v.string()),
}));

/** The business details a customer wants on their invoice, tidied up. */
function companyFields(company: { name: string; vatNumber?: string } | undefined) {
  const name = company?.name.trim();
  const vatNumber = company?.vatNumber?.replace(/\s/g, "");
  if (!name) return { billingCompany: undefined, billingVatNumber: undefined };
  if (name.length > 200) throw new ConvexError("The company name is too long");
  if (vatNumber && !/^4\d{9}$/.test(vatNumber)) {
    throw new ConvexError("A South African VAT number is 10 digits starting with 4");
  }
  return { billingCompany: name, billingVatNumber: vatNumber || undefined };
}

const itemsValidator = v.array(v.object({
  productId: v.id("products"),
  quantity: v.number(),
}));

/**
 * Prices an order. The browser only says what it wants (product ids,
 * quantities and a promo code); names, prices, discount, shipping, tax and
 * the total are all worked out here from the database, so they cannot be
 * tampered with. Tax is charged on the discounted subtotal.
 */
async function priceOrder(
  ctx: QueryCtx,
  items: Array<{ productId: Id<"products">; quantity: number }>,
  promoCode: string | undefined,
) {
  if (items.length === 0) throw new ConvexError("Your cart is empty");

  // Merge repeated products so stock is checked against the full quantity.
  const quantities = new Map<Id<"products">, number>();
  for (const item of items) {
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > MAX_LINE_QUANTITY) {
      throw new ConvexError("Invalid quantity");
    }
    quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
  }

  const lines = [];
  let subtotal = 0;
  for (const [productId, quantity] of quantities) {
    const product = await ctx.db.get(productId);
    if (!product || product.active === false) {
      throw new ConvexError("A product in your cart is no longer available");
    }
    const stock = product.stockQty ?? 0;
    if (stock < quantity) {
      throw new ConvexError(`Insufficient stock for "${product.name}". Available: ${stock}, requested: ${quantity}`);
    }

    const price = round2(product.price);
    const total = round2(price * quantity);
    subtotal = round2(subtotal + total);
    lines.push({
      productId,
      name: product.name,
      partNumber: product.partNumber,
      sku: product.sku,
      price,
      quantity,
      total,
    });
  }

  const promo = promoCode?.trim() ? await applyPromotion(ctx, promoCode, subtotal, lines) : null;
  const discount = promo?.discount ?? 0;

  const settings = await ctx.db
    .query("storeSettings")
    .withIndex("by_key", (q) => q.eq("key", "global"))
    .first();
  const shipping = round2(settings?.shippingRate ?? 250);
  const taxable = round2(subtotal - discount);
  const taxRate = settings?.taxEnabled ? settings.taxRate ?? 0 : 0;
  const tax = round2(taxable * (taxRate / 100));
  const total = round2(taxable + shipping + tax);

  return {
    lines,
    fields: {
      subtotal,
      shipping,
      tax,
      taxRate,
      discount,
      total,
      promotionId: promo?.promotion._id,
      promoCode: promo?.promotion.code,
    },
  };
}

async function replaceItems(ctx: MutationCtx, orderId: Id<"orders">, lines: Awaited<ReturnType<typeof priceOrder>>["lines"]) {
  await deleteOrderItems(ctx, orderId);
  for (const line of lines) {
    await ctx.db.insert("orderItems", { orderId, ...line });
  }
}

function priced(orderId: Id<"orders">, { lines, fields }: Awaited<ReturnType<typeof priceOrder>>) {
  return {
    orderId,
    subtotal: fields.subtotal,
    discount: fields.discount,
    promoCode: fields.promoCode,
    shipping: fields.shipping,
    tax: fields.tax,
    total: fields.total,
    items: lines.map((line) => ({ name: line.name, price: line.price, quantity: line.quantity })),
  };
}

/** Creates (or refreshes) the signed-in customer's pending order. */
export const create = mutation({
  args: {
    items: itemsValidator,
    shippingAddressId: v.optional(v.id("addresses")),
    billingAddressId: v.optional(v.id("addresses")),
    notes: v.optional(v.string()),
    promoCode: v.optional(v.string()),
    company: companyValidator,
  },
  handler: async (ctx, args) => {
    const userId = await getUserIdFromAuth(ctx);
    if (!userId) throw new ConvexError("Not authenticated");
    if (args.items.length === 0) throw new ConvexError("Your cart is empty");

    let shippingSnapshot;
    for (const addressId of [args.shippingAddressId, args.billingAddressId]) {
      if (!addressId) continue;
      const address = await ctx.db.get(addressId);
      if (!address || address.userId !== userId) throw new ConvexError("Invalid address");
      if (addressId === args.shippingAddressId) {
        shippingSnapshot = {
          name: address.name,
          street: address.street,
          city: address.city,
          province: address.province,
          postalCode: address.postalCode,
          country: address.country,
          phone: address.phone,
        };
      }
    }

    const pricing = await priceOrder(ctx, args.items, args.promoCode);

    // One open checkout per customer: reuse their unpaid order (and clear any
    // older unpaid duplicates) instead of adding another each time they
    // return to the payment step. An order that already has a payment attempt
    // is left alone.
    const openOrders = (
      await ctx.db
        .query("orders")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .order("desc")
        .collect()
    ).filter((o) => o.status === "pending" && !o.paymentStartedAt);
    const [reusable, ...duplicates] = openOrders;

    for (const duplicate of duplicates) {
      await deleteOrderItems(ctx, duplicate._id);
      await ctx.db.delete(duplicate._id);
    }

    const fields = {
      ...pricing.fields,
      ...companyFields(args.company),
      shippingSnapshot,
      shippingAddressId: args.shippingAddressId,
      billingAddressId: args.billingAddressId,
      notes: args.notes,
    };

    let orderId: Id<"orders">;
    if (reusable) {
      orderId = reusable._id;
      await ctx.db.patch(orderId, fields);
    } else {
      orderId = await ctx.db.insert("orders", { userId, status: "pending", ...fields });
    }
    await replaceItems(ctx, orderId, pricing.lines);

    return priced(orderId, pricing);
  },
});

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Creates a pending order for a customer without an account. The returned
 * guestToken is what lets them pay for it and see it afterwards. Passing the
 * previous order and token back refreshes that order instead of adding another.
 */
export const createGuest = mutation({
  args: {
    items: itemsValidator,
    email: v.string(),
    address: v.object({
      name: v.string(),
      street: v.string(),
      city: v.string(),
      province: v.optional(v.string()),
      postalCode: v.string(),
      country: v.string(),
      phone: v.optional(v.string()),
    }),
    notes: v.optional(v.string()),
    promoCode: v.optional(v.string()),
    company: companyValidator,
    previous: v.optional(v.object({ id: v.id("orders"), token: v.string() })),
  },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(email) || email.length > 254) throw new ConvexError("Please enter a valid email address");
    const address = Object.fromEntries(
      Object.entries(args.address).map(([key, value]) => [key, value?.trim()]),
    ) as typeof args.address;
    if (!address.name || !address.street || !address.city || !address.postalCode || !address.country) {
      throw new ConvexError("Please fill in your delivery address");
    }
    if (Object.values(address).some((value) => (value?.length ?? 0) > 200)) {
      throw new ConvexError("Your delivery address is too long");
    }

    const pricing = await priceOrder(ctx, args.items, args.promoCode);
    const fields = {
      ...pricing.fields,
      ...companyFields(args.company),
      guestEmail: email,
      shippingSnapshot: address,
      notes: args.notes,
    };

    const previous = args.previous ? await ctx.db.get(args.previous.id) : null;
    const reusable = previous && !previous.userId && previous.guestToken === args.previous!.token &&
      previous.status === "pending" && !previous.paymentStartedAt;

    let orderId: Id<"orders">;
    let guestToken: string;
    if (reusable) {
      orderId = previous._id;
      guestToken = previous.guestToken!;
      await ctx.db.patch(orderId, fields);
    } else {
      guestToken = crypto.randomUUID();
      orderId = await ctx.db.insert("orders", { status: "pending", guestToken, ...fields });
    }
    await replaceItems(ctx, orderId, pricing.lines);

    return { ...priced(orderId, pricing), guestToken };
  },
});

/** A guest's own order, found by the token they were given at checkout. */
export const getGuest = query({
  args: { id: v.id("orders"), token: v.string() },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.id);
    if (!order || !order.guestToken || order.guestToken !== args.token) return null;

    const items = await ctx.db
      .query("orderItems")
      .withIndex("by_orderId", (q) => q.eq("orderId", args.id))
      .collect();
    const { guestToken: _token, ...rest } = forCustomer(order);
    void _token;
    return { ...rest, items, shippingAddress: order.shippingSnapshot ?? null };
  },
});

/**
 * Moves guest orders placed with a customer's email into their account, so
 * they show under My Orders. Called by the website's server once Clerk has
 * confirmed the customer owns those email addresses.
 */
export const linkGuestOrders = mutation({
  args: { clerkId: v.string(), verifiedEmails: v.array(v.string()), serverSecret: v.string() },
  handler: async (ctx, args) => {
    assertServerSecret(args.serverSecret);
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    if (!user || user.isActive === false) return { linked: 0 };

    let linked = 0;
    for (const email of new Set(args.verifiedEmails.map((e) => e.trim().toLowerCase()))) {
      const orders = await ctx.db
        .query("orders")
        .withIndex("by_guestEmail", (q) => q.eq("guestEmail", email))
        .collect();
      for (const order of orders) {
        if (order.userId) continue;
        await ctx.db.patch(order._id, { userId: user._id });
        // Only paid orders are worth telling the customer about.
        if (order.status !== "pending") linked++;
      }
    }
    return { linked };
  },
});

/** The caller's own order with its items (admins use the admin queries instead). */
export const getOwned = query({
  args: { id: v.id("orders") },
  handler: async (ctx, args) => {
    const userId = await getUserIdFromAuth(ctx);
    const order = await ctx.db.get(args.id);
    if (!userId || !order || order.userId !== userId) return null;

    const items = await ctx.db
      .query("orderItems")
      .withIndex("by_orderId", (q) => q.eq("orderId", args.id))
      .collect();
    return { ...forCustomer(order), items };
  },
});

/**
 * Called by the payment route just before it sends the customer to Ozow, so
 * the order is never reused or cleared once money may have moved.
 */
export const attachPayment = mutation({
  args: {
    id: v.id("orders"),
    serverSecret: v.string(),
  },
  handler: async (ctx, args) => {
    assertServerSecret(args.serverSecret);

    const order = await ctx.db.get(args.id);
    if (!order) throw new ConvexError("Order not found");
    if (order.status !== "pending") throw new ConvexError("Order is not awaiting payment");

    // Hold the parts while the customer pays, so two people cannot both pay
    // for the last one. The hold is dropped if the payment fails or is left.
    if (!isStockDeducted(order)) {
      await assertInStock(ctx, args.id);
      await adjustStock(ctx, args.id, "deduct");
    }
    await ctx.db.patch(args.id, { paymentStartedAt: Date.now(), stockDeducted: true });
  },
});

/**
 * Called by the payment notification when a payment was cancelled, failed or
 * abandoned: puts the held parts back on sale. The order stays, so the
 * customer can try again.
 */
export const releasePayment = mutation({
  args: { id: v.id("orders"), serverSecret: v.string() },
  handler: async (ctx, args) => {
    assertServerSecret(args.serverSecret);
    const order = await ctx.db.get(args.id);
    if (!order || order.status !== "pending" || !isStockDeducted(order)) return;
    await adjustStock(ctx, args.id, "restore");
    await ctx.db.patch(args.id, { stockDeducted: false });
  },
});

/**
 * Called by the payment notification when something needs a person: money
 * arrived for a cancelled order, the bank could not confirm a payment, or
 * the amount did not match. Shown to admins on the order.
 */
export const flagPayment = mutation({
  args: { id: v.id("orders"), note: v.string(), serverSecret: v.string() },
  handler: async (ctx, args) => {
    assertServerSecret(args.serverSecret);
    const order = await ctx.db.get(args.id);
    if (!order) return;
    await ctx.db.patch(args.id, { adminAlert: args.note.slice(0, 500) });
  },
});

/** An admin has dealt with the alert on an order. */
export const clearAlert = mutation({
  args: { id: v.id("orders") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.id, { adminAlert: undefined });
  },
});

// How long parts are held for a payment that never finishes.
const HOLD_MS = 2 * 60 * 60 * 1000;
// Checkouts that never reached payment are cleared after a day.
const UNSTARTED_TTL_MS = 24 * 60 * 60 * 1000;
// Unpaid orders with a payment attempt are kept a week, in case the money turns up late.
const STARTED_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Hourly: drops stale stock holds and clears out abandoned checkouts. */
export const cleanUpUnpaid = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const pending = await ctx.db
      .query("orders")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .take(500);
    let released = 0;
    let deleted = 0;
    for (const order of pending) {
      // An order waiting on a person (e.g. the bank could not confirm) is left alone.
      if (order.adminAlert) continue;
      const started = order.paymentStartedAt;
      if (started !== undefined && order.stockDeducted && now - started > HOLD_MS) {
        await adjustStock(ctx, order._id, "restore");
        await ctx.db.patch(order._id, { stockDeducted: false });
        released++;
      }
      const expired = started === undefined
        ? now - order._creationTime > UNSTARTED_TTL_MS
        : now - started > STARTED_TTL_MS;
      if (expired) {
        await deleteOrderItems(ctx, order._id);
        await ctx.db.delete(order._id);
        deleted++;
      }
    }
    return { released, deleted };
  },
});

/** What the payment notification is checked against. Server-only. */
export const getForPayment = query({
  args: { id: v.id("orders"), serverSecret: v.string() },
  handler: async (ctx, args) => {
    assertServerSecret(args.serverSecret);
    const order = await ctx.db.get(args.id);
    return order ? { _id: order._id, status: order.status, total: order.total, paymentReference: order.paymentReference } : null;
  },
});

export const markPaid = mutation({
  args: {
    id: v.id("orders"),
    // Ozow's TransactionId for the payment.
    paymentReference: v.string(),
    // Shared with the payment API route so only the server can confirm payment.
    serverSecret: v.string(),
  },
  handler: async (ctx, args) => {
    assertServerSecret(args.serverSecret);

    const order = await ctx.db.get(args.id);
    if (!order) throw new ConvexError("Order not found");
    if (order.status !== "pending") throw new ConvexError("Order is not awaiting payment");

    // Normally the parts were held when payment started. If the hold had
    // lapsed and they have since sold, the money is still the customer's:
    // take the order and tell the shop it is short.
    let adminAlert: string | undefined;
    if (!isStockDeducted(order)) {
      const short = await shortfalls(ctx, args.id);
      if (short.length > 0) adminAlert = `Paid, but stock is short: ${short.join(", ")}. Source the parts or refund the customer.`;
      await adjustStock(ctx, args.id, "deduct");
    }

    await ctx.db.patch(args.id, {
      status: "paid",
      adminAlert,
      paymentReference: args.paymentReference,
      stockDeducted: true,
    });
    await assignInvoiceNumber(ctx, args.id);
    if (order.userId) await clearCartAfterPayment(ctx, order.userId);
    if (order.promotionId) await countPromotionUse(ctx, order.promotionId);
    await ctx.scheduler.runAfter(0, internal.orderEmails.send, { orderId: args.id, kind: "confirmation" });
    await ctx.scheduler.runAfter(0, internal.orderEmails.send, { orderId: args.id, kind: "newOrder" });
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("orders"),
    status: v.union(
      v.literal("pending"),
      v.literal("paid"),
      v.literal("processing"),
      v.literal("shipped"),
      v.literal("delivered"),
      v.literal("cancelled")
    ),
    // Given when marking an order shipped; passed on to the customer.
    courier: v.optional(v.string()),
    trackingNumber: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const order = await ctx.db.get(args.id);
    if (!order) throw new ConvexError("Order not found");
    const courier = args.courier?.trim() || undefined;
    const trackingNumber = args.trackingNumber?.trim() || undefined;
    if ((courier?.length ?? 0) > 60 || (trackingNumber?.length ?? 0) > 80) {
      throw new ConvexError("The courier or tracking number is too long");
    }

    // Keep stock in step with the status: cancelling (or moving back to
    // pending) returns the items, and moving a cancelled order forward again
    // takes them out of stock once more.
    const shouldBeDeducted = STOCK_DEDUCTED_STATUSES.has(args.status);
    const deducted = isStockDeducted(order);
    if (shouldBeDeducted && !deducted) {
      await adjustStock(ctx, args.id, "deduct");
    } else if (!shouldBeDeducted && deducted) {
      await adjustStock(ctx, args.id, "restore");
    }

    await ctx.db.patch(args.id, {
      status: args.status,
      stockDeducted: shouldBeDeducted,
      ...(courier && { courier }),
      ...(trackingNumber && { trackingNumber }),
      ...(args.status === "delivered" && order.status !== "delivered" && { deliveredAt: Date.now() }),
    });
    // An order marked paid by hand (e.g. an EFT) gets its invoice then.
    if (shouldBeDeducted) await assignInvoiceNumber(ctx, args.id);

    // Let the customer know when their order moves on. Cancelling a checkout
    // that was never paid for is not worth an email.
    const kind = statusEmail(order.status, args.status);
    if (kind) await ctx.scheduler.runAfter(0, internal.orderEmails.send, { orderId: args.id, kind });
  },
});

/** Adds or corrects the courier details on an order already sent. */
export const setTracking = mutation({
  args: { id: v.id("orders"), courier: v.optional(v.string()), trackingNumber: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const order = await ctx.db.get(args.id);
    if (!order) throw new ConvexError("Order not found");
    const courier = args.courier?.trim() || undefined;
    const trackingNumber = args.trackingNumber?.trim() || undefined;
    if ((courier?.length ?? 0) > 60 || (trackingNumber?.length ?? 0) > 80) {
      throw new ConvexError("The courier or tracking number is too long");
    }
    await ctx.db.patch(args.id, { courier, trackingNumber });
  },
});
