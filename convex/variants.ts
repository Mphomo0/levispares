import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

export const list = query({
  args: { modelId: v.optional(v.id("models")) },
  handler: async (ctx, args) => {
    if (args.modelId) {
      return await ctx.db
        .query("variants")
        .withIndex("by_modelId", (q) => q.eq("modelId", args.modelId!))
        .order("asc")
        .collect();
    }
    return await ctx.db.query("variants").order("asc").collect();
  },
});

export const listActive = query({
  args: { modelId: v.optional(v.id("models")) },
  handler: async (ctx, args) => {
    if (args.modelId) {
      return await ctx.db
        .query("variants")
        .withIndex("by_modelId", (q) => q.eq("modelId", args.modelId!))
        .filter((q) => q.eq(q.field("active"), true))
        .order("asc")
        .collect();
    }
    return await ctx.db
      .query("variants")
      .withIndex("by_active")
      .filter((q) => q.eq(q.field("active"), true))
      .order("asc")
      .collect();
  },
});

export const listByType = query({
  args: {
    modelId: v.id("models"),
    variantType: v.union(
      v.literal("GVM"),
      v.literal("Engine"),
      v.literal("Chassis")
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("variants")
      .withIndex("by_modelId", (q) => q.eq("modelId", args.modelId))
      .filter((q) =>
        q.and(
          q.eq(q.field("variantType"), args.variantType),
          q.eq(q.field("active"), true)
        )
      )
      .order("asc")
      .collect();
  },
});

export const listGVM = query({
  args: { modelId: v.optional(v.id("models")) },
  handler: async (ctx, args) => {
    if (args.modelId) {
      return await ctx.db
        .query("variants")
        .withIndex("by_modelId", (q) => q.eq("modelId", args.modelId!))
        .filter((q) => q.eq(q.field("variantType"), "GVM"))
        .order("asc")
        .collect();
    }
    return await ctx.db
      .query("variants")
      .filter((q) => q.eq(q.field("variantType"), "GVM"))
      .order("asc")
      .collect();
  },
});

export const listEngine = query({
  args: { modelId: v.optional(v.id("models")) },
  handler: async (ctx, args) => {
    if (args.modelId) {
      return await ctx.db
        .query("variants")
        .withIndex("by_modelId", (q) => q.eq("modelId", args.modelId!))
        .filter((q) => q.eq(q.field("variantType"), "Engine"))
        .order("asc")
        .collect();
    }
    return await ctx.db
      .query("variants")
      .filter((q) => q.eq(q.field("variantType"), "Engine"))
      .order("asc")
      .collect();
  },
});

export const listChassis = query({
  args: { modelId: v.optional(v.id("models")) },
  handler: async (ctx, args) => {
    if (args.modelId) {
      return await ctx.db
        .query("variants")
        .withIndex("by_modelId", (q) => q.eq("modelId", args.modelId!))
        .filter((q) => q.eq(q.field("variantType"), "Chassis"))
        .order("asc")
        .collect();
    }
    return await ctx.db
      .query("variants")
      .filter((q) => q.eq(q.field("variantType"), "Chassis"))
      .order("asc")
      .collect();
  },
});

export const getById = query({
  args: { id: v.id("variants") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("variants")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
  },
});

export const getWithModel = query({
  args: { id: v.id("variants") },
  handler: async (ctx, args) => {
    const variant = await ctx.db.get(args.id);
    if (!variant) return null;

    const model = await ctx.db.get(variant.modelId);
    if (!model) return variant;

    const brand = await ctx.db.get(model.brandId);
    const products = await ctx.db
      .query("products")
      .withIndex("by_variantId", (q) => q.eq("variantId", args.id))
      .collect();

    return {
      ...variant,
      model: { ...model, brand },
      productCount: products.length,
    };
  },
});

export const getStats = query({
  args: { id: v.id("variants") },
  handler: async (ctx, args) => {
    const products = await ctx.db
      .query("products")
      .withIndex("by_variantId", (q) => q.eq("variantId", args.id))
      .collect();

    const totalStock = products.reduce((sum, p) => sum + (p.stockQty ?? 0), 0);
    const totalValue = products.reduce((sum, p) => sum + (p.price * (p.stockQty ?? 0)), 0);

    return {
      productCount: products.length,
      totalStock,
      totalValue: Math.round(totalValue * 100) / 100,
    };
  },
});

export const add = mutation({
  args: {
    modelId: v.id("models"),
    variantValue: v.string(),
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("variants")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (existing) {
      throw new Error("Variant with this slug already exists");
    }

    return await ctx.db.insert("variants", {
      modelId: args.modelId,
      variantType: "GVM",
      variantValue: args.variantValue,
      slug: args.slug,
      active: true,
    });
  },
});

export const addBulk = mutation({
  args: {
    modelId: v.id("models"),
    variants: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const model = await ctx.db.get(args.modelId);
    if (!model) throw new Error("Model not found");

    const insertedIds: Id<"variants">[] = [];

    for (const variantValue of args.variants) {
      const variantSlug = `${model.slug}-${variantValue.toLowerCase().replace(/\s+/g, "-")}`;
      
      const existing = await ctx.db
        .query("variants")
        .withIndex("by_slug", (q) => q.eq("slug", variantSlug))
        .unique();
      
      if (existing) continue;

      const id = await ctx.db.insert("variants", {
        modelId: args.modelId,
        variantType: "GVM",
        variantValue,
        slug: variantSlug,
        active: true,
      });
      insertedIds.push(id);
    }

    return insertedIds;
  },
});

export const update = mutation({
  args: {
    id: v.id("variants"),
    modelId: v.optional(v.id("models")),
    variantType: v.optional(
      v.union(
        v.literal("GVM"),
        v.literal("Engine"),
        v.literal("Chassis")
      )
    ),
    variantValue: v.optional(v.string()),
    slug: v.optional(v.string()),
    active: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...data } = args;
    await ctx.db.patch(id, data);
  },
});

export const toggleActive = mutation({
  args: { id: v.id("variants") },
  handler: async (ctx, args) => {
    const variant = await ctx.db.get(args.id);
    if (!variant) throw new Error("Variant not found");
    await ctx.db.patch(args.id, { active: !variant.active });
  },
});

export const remove = mutation({
  args: { id: v.id("variants") },
  handler: async (ctx, args) => {
    const products = await ctx.db
      .query("products")
      .withIndex("by_variantId", (q) => q.eq("variantId", args.id))
      .collect();

    for (const product of products) {
      const images = await ctx.db
        .query("productImages")
        .withIndex("by_productId", (q) => q.eq("productId", product._id))
        .collect();

      for (const image of images) {
        await ctx.db.delete(image._id);
      }
      await ctx.db.delete(product._id);
    }

    await ctx.db.delete(args.id);
  },
});
