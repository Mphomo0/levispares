import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

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
      user: users[i],
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
      user: users[i],
    }));
  },
});

export const listByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const reviews = await ctx.db
      .query("reviews")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
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
    userId: v.id("users"),
    rating: v.number(),
    title: v.optional(v.string()),
    comment: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.rating < 1 || args.rating > 5) {
      throw new Error("Rating must be between 1 and 5");
    }

    const existing = await ctx.db
      .query("reviews")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("productId"), args.productId))
      .first();

    if (existing) {
      throw new Error("You have already reviewed this product");
    }

    return await ctx.db.insert("reviews", {
      productId: args.productId,
      userId: args.userId,
      rating: args.rating,
      title: args.title,
      comment: args.comment,
      verifiedPurchase: false,
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
    if (data.rating !== undefined && (data.rating < 1 || data.rating > 5)) {
      throw new Error("Rating must be between 1 and 5");
    }
    await ctx.db.patch(id, data);
  },
});

export const markVerified = mutation({
  args: { id: v.id("reviews") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { verifiedPurchase: true });
  },
});

export const remove = mutation({
  args: { id: v.id("reviews") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
