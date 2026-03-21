import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const listByProduct = query({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("productImages")
      .withIndex("by_productId", (q) => q.eq("productId", args.productId))
      .order("asc")
      .collect();
  },
});

export const getById = query({
  args: { id: v.id("productImages") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const add = mutation({
  args: {
    productId: v.id("products"),
    url: v.string(),
    isPrimary: v.optional(v.boolean()),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (args.isPrimary) {
      const existing = await ctx.db
        .query("productImages")
        .withIndex("by_productId", (q) => q.eq("productId", args.productId))
        .collect();
      for (const img of existing) {
        if (img.isPrimary) {
          await ctx.db.patch(img._id, { isPrimary: false });
        }
      }
    }

    return await ctx.db.insert("productImages", args);
  },
});

export const addMultiple = mutation({
  args: {
    productId: v.id("products"),
    urls: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("productImages")
      .withIndex("by_productId", (q) => q.eq("productId", args.productId))
      .collect();

    for (let i = 0; i < args.urls.length; i++) {
      await ctx.db.insert("productImages", {
        productId: args.productId,
        url: args.urls[i],
        isPrimary: i === 0 && existing.length === 0,
        sortOrder: i,
      });
    }
  },
});

export const update = mutation({
  args: {
    id: v.id("productImages"),
    url: v.optional(v.string()),
    isPrimary: v.optional(v.boolean()),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...data } = args;
    const image = await ctx.db.get(id);
    if (!image) throw new Error("Image not found");

    if (data.isPrimary) {
      const siblings = await ctx.db
        .query("productImages")
        .withIndex("by_productId", (q) => q.eq("productId", image.productId))
        .collect();
      for (const img of siblings) {
        if (img._id !== id && img.isPrimary) {
          await ctx.db.patch(img._id, { isPrimary: false });
        }
      }
    }

    await ctx.db.patch(id, data);
  },
});

export const remove = mutation({
  args: { id: v.id("productImages") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const removeAllForProduct = mutation({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    const images = await ctx.db
      .query("productImages")
      .withIndex("by_productId", (q) => q.eq("productId", args.productId))
      .collect();

    for (const img of images) {
      await ctx.db.delete(img._id);
    }
  },
});
