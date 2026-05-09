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
      statsYearsBusiness: "15+",
      statsPartsStock: "300+",
      statsHappyCustomers: "500+",
      statsSatisfactionRate: "99%",
    };
  },
});

export const update = mutation({
  args: {
    taxEnabled: v.boolean(),
    taxRate: v.number(),
    shippingRate: v.number(),
    statsYearsBusiness: v.optional(v.string()),
    statsPartsStock: v.optional(v.string()),
    statsHappyCustomers: v.optional(v.string()),
    statsSatisfactionRate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("storeSettings")
      .withIndex("by_key", (q) => q.eq("key", "global"))
      .first();

    const updateData = {
      taxEnabled: args.taxEnabled,
      taxRate: args.taxRate,
      shippingRate: args.shippingRate,
    };

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...updateData,
        statsYearsBusiness: args.statsYearsBusiness ?? existing.statsYearsBusiness,
        statsPartsStock: args.statsPartsStock ?? existing.statsPartsStock,
        statsHappyCustomers: args.statsHappyCustomers ?? existing.statsHappyCustomers,
        statsSatisfactionRate: args.statsSatisfactionRate ?? existing.statsSatisfactionRate,
      });
    } else {
      await ctx.db.insert("storeSettings", {
        key: "global",
        ...updateData,
        statsYearsBusiness: args.statsYearsBusiness ?? "15+",
        statsPartsStock: args.statsPartsStock ?? "300+",
        statsHappyCustomers: args.statsHappyCustomers ?? "500+",
        statsSatisfactionRate: args.statsSatisfactionRate ?? "99%",
      });
    }
  },
});
