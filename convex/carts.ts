import { v, ConvexError } from "convex/values";
import { internalMutation, internalQuery, mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

// A cart is "left behind" once it has gone this long without a change.
export const REMIND_AFTER_MS = 2 * 60 * 60 * 1000;
// Carts older than this are too stale to email about.
export const REMIND_WITHIN_MS = 7 * 24 * 60 * 60 * 1000;
// Most reminders sent in one run of the cron job.
const BATCH_SIZE = 50;
const MAX_LINES = 100;

const itemsValidator = v.array(v.object({
  productId: v.id("products"),
  quantity: v.number(),
}));

async function currentUser(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
    .unique();
}

async function cartFor(ctx: QueryCtx, userId: Id<"users">) {
  return await ctx.db
    .query("carts")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .unique();
}

async function primaryImage(ctx: QueryCtx, product: Doc<"products">) {
  if (product.image) return product.image;
  const images = await ctx.db
    .query("productImages")
    .withIndex("by_productId", (q) => q.eq("productId", product._id))
    .collect();
  return (images.find((i) => i.isPrimary) ?? images[0])?.url;
}

/** Cart lines with current product details, in the shape the browser cart uses. Unavailable products are dropped. */
async function cartLines(ctx: QueryCtx, items: Doc<"carts">["items"]) {
  const lines = [];
  for (const item of items) {
    const product = await ctx.db.get(item.productId);
    if (!product || product.active === false) continue;
    const stockQty = product.stockQty;
    if (stockQty !== undefined && stockQty <= 0) continue;
    lines.push({
      _id: product._id as string,
      name: product.name,
      price: product.price,
      originalPrice: product.originalPrice,
      image: await primaryImage(ctx, product),
      sku: product.sku,
      stockQty,
      quantity: Math.min(item.quantity, stockQty ?? Infinity),
    });
  }
  return lines;
}

function sameItems(a: Doc<"carts">["items"], b: Doc<"carts">["items"]) {
  return a.length === b.length &&
    a.every((item, i) => item.productId === b[i].productId && item.quantity === b[i].quantity);
}

/**
 * The signed-in customer's saved cart. Null until their user record exists,
 * so the browser knows not to sync yet.
 */
export const mine = query({
  args: {},
  handler: async (ctx) => {
    const user = await currentUser(ctx);
    if (!user || user.isActive === false) return null;
    const cart = await cartFor(ctx, user._id);
    return cart ? await cartLines(ctx, cart.items) : [];
  },
});

/** Replaces the signed-in customer's saved cart with what is in their browser. */
export const save = mutation({
  args: { items: itemsValidator },
  handler: async (ctx, args) => {
    const user = await currentUser(ctx);
    if (!user) throw new ConvexError("Not authenticated");
    if (user.isActive === false) throw new ConvexError("This account is deactivated");
    if (args.items.length > MAX_LINES) throw new ConvexError("Too many items in cart");

    const items = args.items
      .filter((item) => Number.isInteger(item.quantity) && item.quantity > 0);

    const cart = await cartFor(ctx, user._id);
    if (!cart) {
      if (items.length === 0) return;
      await ctx.db.insert("carts", {
        userId: user._id,
        items,
        updatedAt: Date.now(),
        token: crypto.randomUUID(),
      });
      return;
    }
    if (sameItems(cart.items, items)) return;
    await ctx.db.patch(cart._id, { items, updatedAt: Date.now() });
  },
});

/** The cart behind a reminder email's "return to your cart" link. */
export const byToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const cart = await ctx.db
      .query("carts")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    return cart ? await cartLines(ctx, cart.items) : null;
  },
});

/** Turns off cart reminders for the customer a reminder email was sent to. */
export const unsubscribe = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const cart = await ctx.db
      .query("carts")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!cart) throw new ConvexError("This link is no longer valid");
    await ctx.db.patch(cart.userId, { cartRemindersOff: true });
  },
});

/** Signed-in customer's own reminder setting. */
export const setReminders = mutation({
  args: { enabled: v.boolean() },
  handler: async (ctx, args) => {
    const user = await currentUser(ctx);
    if (!user) throw new ConvexError("Not authenticated");
    await ctx.db.patch(user._id, { cartRemindersOff: !args.enabled });
  },
});

/** Empties a customer's saved cart once they have paid, noting a recovery if a reminder went out. */
export async function clearCartAfterPayment(ctx: MutationCtx, userId: Id<"users">) {
  const cart = await cartFor(ctx, userId);
  if (!cart) return;
  const now = Date.now();
  await ctx.db.patch(cart._id, {
    items: [],
    updatedAt: now,
    ...(cart.remindedAt !== undefined && cart.recoveredAt === undefined ? { recoveredAt: now } : {}),
  });
}

export async function deleteCart(ctx: MutationCtx, userId: Id<"users">) {
  const cart = await cartFor(ctx, userId);
  if (cart) await ctx.db.delete(cart._id);
}

/**
 * Carts left untouched for a while that have not been emailed about since
 * they last changed, with what the email needs.
 */
export const dueForReminder = internalQuery({
  args: { now: v.number() },
  handler: async (ctx, args) => {
    const carts = await ctx.db
      .query("carts")
      .withIndex("by_updatedAt", (q) =>
        q.gt("updatedAt", args.now - REMIND_WITHIN_MS).lte("updatedAt", args.now - REMIND_AFTER_MS))
      .collect();

    const due = [];
    for (const cart of carts) {
      if (due.length >= BATCH_SIZE) break;
      if (cart.items.length === 0) continue;
      if (cart.remindedAt !== undefined && cart.remindedAt >= cart.updatedAt) continue;

      const user = await ctx.db.get(cart.userId);
      if (!user || user.isActive === false || user.cartRemindersOff) continue;
      if (!user.email.includes("@") || user.email.endsWith(".invalid")) continue;

      const lines = await cartLines(ctx, cart.items);
      if (lines.length === 0) continue;

      due.push({
        cartId: cart._id,
        token: cart.token,
        updatedAt: cart.updatedAt,
        email: user.email,
        name: user.name,
        lines: lines.map(({ name, price, quantity, image }) => ({ name, price, quantity, image })),
      });
    }
    return due;
  },
});

export const markReminded = internalMutation({
  args: { cartId: v.id("carts"), at: v.number() },
  handler: async (ctx, args) => {
    const cart = await ctx.db.get(args.cartId);
    if (cart) await ctx.db.patch(args.cartId, { remindedAt: args.at });
  },
});

