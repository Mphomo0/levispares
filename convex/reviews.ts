import { v, ConvexError } from "convex/values";
import { query, mutation, QueryCtx, MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { requireAdmin } from "./lib/auth";

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

/** True when the customer has a paid order that includes this product. */
async function hasPurchased(ctx: QueryCtx, userId: Id<"users">, productId: Id<"products">) {
  const orders = await ctx.db
    .query("orders")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .collect();

  for (const order of orders) {
    if (!["paid", "processing", "shipped", "delivered"].includes(order.status)) continue;
    const item = await ctx.db
      .query("orderItems")
      .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
      .filter((q) => q.eq(q.field("productId"), productId))
      .first();
    if (item) return true;
  }
  return false;
}

async function requireOwnerOrAdmin(ctx: MutationCtx, reviewId: Id<"reviews">) {
  const review = await ctx.db.get(reviewId);
  if (!review) throw new ConvexError("Review not found");
  const userId = await getUserIdFromAuth(ctx);
  if (review.userId !== userId) await requireAdmin(ctx);
}

export const listByProduct = query({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    const reviews = await ctx.db
      .query("reviews")
      .withIndex("by_productId", (q) => q.eq("productId", args.productId))
      .order("desc")
      .collect();

    const users = await Promise.all(
      reviews.map((review) => ctx.db.get(review.userId))
    );

    return reviews.map((review, i) => ({
      ...review,
      // Only the reviewer's display name is public.
      user: users[i] ? { name: users[i]!.name } : null,
    }));
  },
});

export const listVerifiedByProduct = query({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    const reviews = await ctx.db
      .query("reviews")
      .withIndex("by_productId", (q) => q.eq("productId", args.productId))
      .filter((q) => q.eq(q.field("verifiedPurchase"), true))
      .order("desc")
      .collect();

    const users = await Promise.all(
      reviews.map((review) => ctx.db.get(review.userId))
    );

    return reviews.map((review, i) => ({
      ...review,
      // Only the reviewer's display name is public.
      user: users[i] ? { name: users[i]!.name } : null,
    }));
  },
});

export const listByUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserIdFromAuth(ctx);
    if (!userId) return [];
    const reviews = await ctx.db
      .query("reviews")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    const products = await Promise.all(
      reviews.map((review) => ctx.db.get(review.productId))
    );

    return reviews.map((review, i) => ({
      ...review,
      product: products[i],
    }));
  },
});

export const getById = query({
  args: { id: v.id("reviews") },
  handler: async (ctx, args) => {
    const review = await ctx.db.get(args.id);
    if (!review) return null;

    const user = await ctx.db.get(review.userId);
    const product = await ctx.db.get(review.productId);

    return {
      ...review,
      user,
      product,
    };
  },
});

export const getStats = query({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    const reviews = await ctx.db
      .query("reviews")
      .withIndex("by_productId", (q) => q.eq("productId", args.productId))
      .collect();

    const total = reviews.length;
    const average = total > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / total
      : 0;

    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const review of reviews) {
      distribution[review.rating as keyof typeof distribution]++;
    }

    return {
      total,
      average: Math.round(average * 10) / 10,
      distribution,
    };
  },
});

export const add = mutation({
  args: {
    productId: v.id("products"),
    rating: v.number(),
    title: v.optional(v.string()),
    comment: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getUserIdFromAuth(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    if (!Number.isInteger(args.rating) || args.rating < 1 || args.rating > 5) {
      throw new ConvexError("Rating must be between 1 and 5");
    }
    if ((args.title ?? "").length > 100) throw new ConvexError("The title is too long (100 characters max)");
    if ((args.comment ?? "").length > 2000) throw new ConvexError("The review is too long (2000 characters max)");

    const existing = await ctx.db
      .query("reviews")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("productId"), args.productId))
      .first();

    if (existing) {
      throw new ConvexError("You have already reviewed this product");
    }

    return await ctx.db.insert("reviews", {
      productId: args.productId,
      userId,
      rating: args.rating,
      title: args.title,
      comment: args.comment,
      verifiedPurchase: await hasPurchased(ctx, userId, args.productId),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("reviews"),
    rating: v.optional(v.number()),
    title: v.optional(v.string()),
    comment: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...data } = args;
    await requireOwnerOrAdmin(ctx, id);
    if ((data.title ?? "").length > 100) throw new ConvexError("The title is too long (100 characters max)");
    if ((data.comment ?? "").length > 2000) throw new ConvexError("The review is too long (2000 characters max)");
    if (data.rating !== undefined && (data.rating < 1 || data.rating > 5)) {
      throw new ConvexError("Rating must be between 1 and 5");
    }
    await ctx.db.patch(id, data);
  },
});

export const markVerified = mutation({
  args: { id: v.id("reviews") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.id, { verifiedPurchase: true });
  },
});

export const remove = mutation({
  args: { id: v.id("reviews") },
  handler: async (ctx, args) => {
    await requireOwnerOrAdmin(ctx, args.id);
    await ctx.db.delete(args.id);
  },
});
