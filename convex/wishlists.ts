import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

export const listByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const wishlists = await ctx.db
      .query("wishlists")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();

    const enriched = await Promise.all(
      wishlists.map(async (wishlist) => {
        const items = await ctx.db
          .query("wishlistItems")
          .withIndex("by_wishlistId", (q) => q.eq("wishlistId", wishlist._id))
          .collect();
        return { ...wishlist, itemCount: items.length };
      })
    );

    return enriched;
  },
});

export const getById = query({
  args: { id: v.id("wishlists") },
  handler: async (ctx, args) => {
    const wishlist = await ctx.db.get(args.id);
    if (!wishlist) return null;

    const items = await ctx.db
      .query("wishlistItems")
      .withIndex("by_wishlistId", (q) => q.eq("wishlistId", args.id))
      .collect();

    const products = await Promise.all(
      items.map((item) => ctx.db.get(item.productId))
    );

    return {
      ...wishlist,
      items: items.map((item, i) => ({
        ...item,
        product: products[i],
      })),
    };
  },
});

export const getDefault = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const wishlist = await ctx.db
      .query("wishlists")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (!wishlist) return null;

    return await ctx.db.get(wishlist._id);
  },
});

export const getDefaultWithItems = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const wishlist = await ctx.db
      .query("wishlists")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (!wishlist) return null;

    const items = await ctx.db
      .query("wishlistItems")
      .withIndex("by_wishlistId", (q) => q.eq("wishlistId", wishlist._id))
      .collect();

    const products = await Promise.all(
      items.map((item) => ctx.db.get(item.productId))
    );

    return {
      ...wishlist,
      items: items.map((item, i) => ({
        ...item,
        product: products[i],
      })),
    };
  },
});

export const checkProductInWishlists = query({
  args: {
    userId: v.id("users"),
    productId: v.id("products"),
  },
  handler: async (ctx, args) => {
    const wishlists = await ctx.db
      .query("wishlists")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    const results: { wishlistId: Id<"wishlists">; wishlistName: string; inWishlist: boolean }[] = [];

    for (const wishlist of wishlists) {
      const item = await ctx.db
        .query("wishlistItems")
        .withIndex("by_wishlistId", (q) => q.eq("wishlistId", wishlist._id))
        .filter((q) => q.eq(q.field("productId"), args.productId))
        .first();

      results.push({
        wishlistId: wishlist._id,
        wishlistName: wishlist.name,
        inWishlist: item !== null,
      });
    }

    return results;
  },
});

export const create = mutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    isPublic: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("wishlists", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("wishlists"),
    name: v.optional(v.string()),
    isPublic: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...data } = args;
    await ctx.db.patch(id, data);
  },
});

export const remove = mutation({
  args: { id: v.id("wishlists") },
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("wishlistItems")
      .withIndex("by_wishlistId", (q) => q.eq("wishlistId", args.id))
      .collect();

    for (const item of items) {
      await ctx.db.delete(item._id);
    }

    await ctx.db.delete(args.id);
  },
});

export const addItem = mutation({
  args: {
    wishlistId: v.id("wishlists"),
    productId: v.id("products"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("wishlistItems")
      .withIndex("by_wishlistId", (q) => q.eq("wishlistId", args.wishlistId))
      .filter((q) => q.eq(q.field("productId"), args.productId))
      .first();

    if (existing) {
      throw new Error("Product already in wishlist");
    }

    return await ctx.db.insert("wishlistItems", args);
  },
});

export const addToDefault = mutation({
  args: {
    userId: v.id("users"),
    productId: v.id("products"),
  },
  handler: async (ctx, args) => {
    let wishlist = await ctx.db
      .query("wishlists")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (!wishlist) {
      const wishlistId = await ctx.db.insert("wishlists", {
        userId: args.userId,
        name: "My Wishlist",
        isPublic: false,
      });
      wishlist = await ctx.db.get(wishlistId);
    }

    if (!wishlist) throw new Error("Failed to create wishlist");

    const existing = await ctx.db
      .query("wishlistItems")
      .withIndex("by_wishlistId", (q) => q.eq("wishlistId", wishlist._id))
      .filter((q) => q.eq(q.field("productId"), args.productId))
      .first();

    if (existing) {
      throw new Error("Product already in wishlist");
    }

    return await ctx.db.insert("wishlistItems", {
      wishlistId: wishlist._id,
      productId: args.productId,
    });
  },
});

export const removeItem = mutation({
  args: {
    wishlistId: v.id("wishlists"),
    productId: v.id("products"),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db
      .query("wishlistItems")
      .withIndex("by_wishlistId", (q) => q.eq("wishlistId", args.wishlistId))
      .filter((q) => q.eq(q.field("productId"), args.productId))
      .first();

    if (item) {
      await ctx.db.delete(item._id);
    }
  },
});

export const removeFromAllWishlists = mutation({
  args: {
    userId: v.id("users"),
    productId: v.id("products"),
  },
  handler: async (ctx, args) => {
    const wishlists = await ctx.db
      .query("wishlists")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    for (const wishlist of wishlists) {
      const item = await ctx.db
        .query("wishlistItems")
        .withIndex("by_wishlistId", (q) => q.eq("wishlistId", wishlist._id))
        .filter((q) => q.eq(q.field("productId"), args.productId))
        .first();

      if (item) {
        await ctx.db.delete(item._id);
      }
    }
  },
});

export const moveItem = mutation({
  args: {
    productId: v.id("products"),
    fromWishlistId: v.id("wishlists"),
    toWishlistId: v.id("wishlists"),
  },
  handler: async (ctx, args) => {
    if (args.fromWishlistId === args.toWishlistId) {
      throw new Error("Source and destination wishlists are the same");
    }

    const item = await ctx.db
      .query("wishlistItems")
      .withIndex("by_wishlistId", (q) => q.eq("wishlistId", args.fromWishlistId))
      .filter((q) => q.eq(q.field("productId"), args.productId))
      .first();

    if (!item) {
      throw new Error("Product not found in source wishlist");
    }

    const existingInDest = await ctx.db
      .query("wishlistItems")
      .withIndex("by_wishlistId", (q) => q.eq("wishlistId", args.toWishlistId))
      .filter((q) => q.eq(q.field("productId"), args.productId))
      .first();

    if (existingInDest) {
      await ctx.db.delete(item._id);
      return;
    }

    await ctx.db.patch(item._id, { wishlistId: args.toWishlistId });
  },
});

export const clearWishlist = mutation({
  args: { id: v.id("wishlists") },
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("wishlistItems")
      .withIndex("by_wishlistId", (q) => q.eq("wishlistId", args.id))
      .collect();

    for (const item of items) {
      await ctx.db.delete(item._id);
    }
  },
});
