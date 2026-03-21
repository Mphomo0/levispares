import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const list = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("promotions")
      .withIndex("by_active")
      .filter((q) => q.eq(q.field("active"), true))
      .collect();
  },
});

export const listAll = query({
  handler: async (ctx) => {
    return await ctx.db.query("promotions").order("desc").collect();
  },
});

export const getById = query({
  args: { id: v.id("promotions") },
  handler: async (ctx, args) => {
    const promotion = await ctx.db.get(args.id);
    if (!promotion) return null;

    const products = await ctx.db
      .query("promotionProducts")
      .withIndex("by_promotionId", (q) => q.eq("promotionId", args.id))
      .collect();

    return {
      ...promotion,
      products,
    };
  },
});

export const getByCode = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("promotions")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .filter((q) => q.eq(q.field("active"), true))
      .first();
  },
});

export const add = mutation({
  args: {
    code: v.optional(v.string()),
    name: v.string(),
    type: v.union(
      v.literal("percentage"),
      v.literal("fixed"),
      v.literal("bogo")
    ),
    value: v.number(),
    minOrderValue: v.optional(v.number()),
    maxUses: v.optional(v.number()),
    startsAt: v.optional(v.number()),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (args.code) {
      const existing = await ctx.db
        .query("promotions")
        .withIndex("by_code", (q) => q.eq("code", args.code))
        .unique();
      if (existing) {
        throw new Error("Promotion code already exists");
      }
    }

    return await ctx.db.insert("promotions", {
      ...args,
      usedCount: 0,
      active: true,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("promotions"),
    code: v.optional(v.string()),
    name: v.optional(v.string()),
    type: v.optional(
      v.union(
        v.literal("percentage"),
        v.literal("fixed"),
        v.literal("bogo")
      )
    ),
    value: v.optional(v.number()),
    minOrderValue: v.optional(v.number()),
    maxUses: v.optional(v.number()),
    startsAt: v.optional(v.number()),
    expiresAt: v.optional(v.number()),
    active: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...data } = args;
    await ctx.db.patch(id, data);
  },
});

export const remove = mutation({
  args: { id: v.id("promotions") },
  handler: async (ctx, args) => {
    const products = await ctx.db
      .query("promotionProducts")
      .withIndex("by_promotionId", (q) => q.eq("promotionId", args.id))
      .collect();

    for (const product of products) {
      await ctx.db.delete(product._id);
    }

    await ctx.db.delete(args.id);
  },
});

export const addProduct = mutation({
  args: {
    promotionId: v.id("promotions"),
    productId: v.optional(v.id("products")),
    categoryId: v.optional(v.id("categories")),
  },
  handler: async (ctx, args) => {
    if (!args.productId && !args.categoryId) {
      throw new Error("Either productId or categoryId must be provided");
    }

    return await ctx.db.insert("promotionProducts", args);
  },
});

export const removeProduct = mutation({
  args: { id: v.id("promotionProducts") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const incrementUsage = mutation({
  args: { id: v.id("promotions") },
  handler: async (ctx, args) => {
    const promotion = await ctx.db.get(args.id);
    if (!promotion) throw new Error("Promotion not found");

    if (promotion.maxUses && (promotion.usedCount ?? 0) >= promotion.maxUses) {
      throw new Error("Promotion usage limit reached");
    }

    await ctx.db.patch(args.id, {
      usedCount: (promotion.usedCount ?? 0) + 1,
    });
  },
});
