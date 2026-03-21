import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const MAX_ADDRESSES = 5;

export const listByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("addresses")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

export const listShippingByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("addresses")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("type"), "shipping"))
      .collect();
  },
});

export const listBillingByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("addresses")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("type"), "billing"))
      .collect();
  },
});

export const add = mutation({
  args: {
    userId: v.id("users"),
    type: v.union(v.literal("shipping"), v.literal("billing")),
    label: v.optional(v.string()),
    name: v.string(),
    street: v.string(),
    city: v.string(),
    province: v.optional(v.string()),
    postalCode: v.string(),
    country: v.string(),
    phone: v.optional(v.string()),
    isDefault: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("addresses")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    const sameType = existing.filter((a) => a.type === args.type);
    if (sameType.length >= MAX_ADDRESSES) {
      throw new Error(`You can only have up to ${MAX_ADDRESSES} ${args.type} addresses.`);
    }

    let isDefault = args.isDefault ?? false;
    if (isDefault || existing.length === 0) {
      for (const addr of sameType) {
        if (addr.isDefault) {
          await ctx.db.patch(addr._id, { isDefault: false });
        }
      }
      isDefault = true;
    }

    return await ctx.db.insert("addresses", {
      ...args,
      isDefault,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("addresses"),
    type: v.optional(v.union(v.literal("shipping"), v.literal("billing"))),
    label: v.optional(v.string()),
    name: v.optional(v.string()),
    street: v.optional(v.string()),
    city: v.optional(v.string()),
    province: v.optional(v.string()),
    postalCode: v.optional(v.string()),
    country: v.optional(v.string()),
    phone: v.optional(v.string()),
    isDefault: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...data } = args;
    const address = await ctx.db.get(id);
    if (!address) throw new Error("Address not found");

    if (data.isDefault) {
      const siblings = await ctx.db
        .query("addresses")
        .withIndex("by_userId", (q) => q.eq("userId", address.userId))
        .filter((q) => q.eq(q.field("type"), address.type))
        .collect();
      for (const a of siblings) {
        if (a._id !== id && a.isDefault) {
          await ctx.db.patch(a._id, { isDefault: false });
        }
      }
    }

    await ctx.db.patch(id, data);
  },
});

export const remove = mutation({
  args: { id: v.id("addresses") },
  handler: async (ctx, args) => {
    const address = await ctx.db.get(args.id);
    if (!address) throw new Error("Address not found");

    await ctx.db.delete(args.id);

    if (address.isDefault) {
      const remaining = await ctx.db
        .query("addresses")
        .withIndex("by_userId", (q) => q.eq("userId", address.userId))
        .filter((q) => q.eq(q.field("type"), address.type))
        .collect();
      if (remaining.length > 0) {
        await ctx.db.patch(remaining[0]._id, { isDefault: true });
      }
    }
  },
});

export const setDefault = mutation({
  args: { id: v.id("addresses") },
  handler: async (ctx, args) => {
    const address = await ctx.db.get(args.id);
    if (!address) throw new Error("Address not found");

    const all = await ctx.db
      .query("addresses")
      .withIndex("by_userId", (q) => q.eq("userId", address.userId))
      .filter((q) => q.eq(q.field("type"), address.type))
      .collect();

    for (const a of all) {
      await ctx.db.patch(a._id, { isDefault: a._id === args.id });
    }
  },
});
