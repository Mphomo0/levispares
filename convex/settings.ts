import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const get = query({
  args: {},
  handler: async (ctx) => {
    const settings = await ctx.db
      .query("storeSettings")
      .withIndex("by_key", (q) => q.eq("key", "global"))
      .first();

    return settings ?? {
      taxEnabled: false,
      taxRate: 0,
      shippingRate: 250,
      freeShippingThreshold: 750,
    };
  },
});

export const update = mutation({
  args: {
    taxEnabled: v.boolean(),
    taxRate: v.number(),
    shippingRate: v.number(),
    freeShippingThreshold: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("storeSettings")
      .withIndex("by_key", (q) => q.eq("key", "global"))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        taxEnabled: args.taxEnabled,
        taxRate: args.taxRate,
        shippingRate: args.shippingRate,
        freeShippingThreshold: args.freeShippingThreshold,
      });
    } else {
      await ctx.db.insert("storeSettings", {
        key: "global",
        taxEnabled: args.taxEnabled,
        taxRate: args.taxRate,
        shippingRate: args.shippingRate,
        freeShippingThreshold: args.freeShippingThreshold,
      });
    }
  },
});
