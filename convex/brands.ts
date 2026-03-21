import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const list = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("brands")
      .withIndex("by_active")
      .filter((q) => q.eq(q.field("active"), true))
      .order("asc")
      .collect();
  },
});

export const listAll = query({
  handler: async (ctx) => {
    return await ctx.db.query("brands").order("asc").collect();
  },
});

export const getById = query({
  args: { id: v.id("brands") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("brands")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
  },
});

export const getWithModels = query({
  args: { id: v.id("brands") },
  handler: async (ctx, args) => {
    const brand = await ctx.db.get(args.id);
    if (!brand) return null;

    const models = await ctx.db
      .query("models")
      .withIndex("by_brandId", (q) => q.eq("brandId", args.id))
      .filter((q) => q.eq(q.field("active"), true))
      .order("asc")
      .collect();

    const modelsWithVariants = await Promise.all(
      models.map(async (model) => {
        const variants = await ctx.db
          .query("variants")
          .withIndex("by_modelId", (q) => q.eq("modelId", model._id))
          .filter((q) => q.eq(q.field("active"), true))
          .collect();
        return { ...model, variants };
      })
    );

    return {
      ...brand,
      models: modelsWithVariants,
    };
  },
});

export const getAllWithHierarchy = query({
  handler: async (ctx) => {
    const brands = await ctx.db
      .query("brands")
      .withIndex("by_active")
      .filter((q) => q.eq(q.field("active"), true))
      .order("asc")
      .collect();

    const brandsWithFullHierarchy = await Promise.all(
      brands.map(async (brand) => {
        const models = await ctx.db
          .query("models")
          .withIndex("by_brandId", (q) => q.eq("brandId", brand._id))
          .filter((q) => q.eq(q.field("active"), true))
          .order("asc")
          .collect();

        const modelsWithVariants = await Promise.all(
          models.map(async (model) => {
            const variants = await ctx.db
              .query("variants")
              .withIndex("by_modelId", (q) => q.eq("modelId", model._id))
              .filter((q) => q.eq(q.field("active"), true))
              .collect();
            return { ...model, variants };
          })
        );

        return { ...brand, models: modelsWithVariants };
      })
    );

    return brandsWithFullHierarchy;
  },
});

export const getStats = query({
  args: { id: v.id("brands") },
  handler: async (ctx, args) => {
    const products = await ctx.db
      .query("products")
      .withIndex("by_brandId", (q) => q.eq("brandId", args.id))
      .collect();

    const models = await ctx.db
      .query("models")
      .withIndex("by_brandId", (q) => q.eq("brandId", args.id))
      .collect();

    const totalStock = products.reduce((sum, p) => sum + (p.stockQty ?? 0), 0);
    const totalValue = products.reduce((sum, p) => sum + (p.price * (p.stockQty ?? 0)), 0);

    return {
      productCount: products.length,
      modelCount: models.length,
      totalStock,
      totalValue: Math.round(totalValue * 100) / 100,
    };
  },
});

export const add = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    logo: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("brands")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (existing) {
      throw new Error("Brand with this slug already exists");
    }

    return await ctx.db.insert("brands", {
      ...args,
      active: true,
    });
  },
});

export const addWithModels = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    logo: v.optional(v.string()),
    description: v.optional(v.string()),
    models: v.array(v.object({
      name: v.string(),
      yearFrom: v.optional(v.number()),
      yearTo: v.optional(v.number()),
      variants: v.array(v.object({
        variantType: v.union(v.literal("GVM"), v.literal("Engine"), v.literal("Chassis")),
        variantValue: v.string(),
      })),
    })),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("brands")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (existing) {
      throw new Error("Brand with this slug already exists");
    }

    const brandId = await ctx.db.insert("brands", {
      name: args.name,
      slug: args.slug,
      logo: args.logo,
      description: args.description,
      active: true,
    });

    for (const model of args.models) {
      const modelSlug = `${args.slug}-${model.name.toLowerCase().replace(/\s+/g, "-")}`;
      const modelId = await ctx.db.insert("models", {
        brandId,
        name: model.name,
        yearFrom: model.yearFrom,
        yearTo: model.yearTo,
        slug: modelSlug,
        active: true,
      });

      for (const variant of model.variants) {
        const variantSlug = `${modelSlug}-${variant.variantValue.toLowerCase().replace(/\s+/g, "-")}`;
        await ctx.db.insert("variants", {
          modelId,
          variantType: variant.variantType,
          variantValue: variant.variantValue,
          slug: variantSlug,
          active: true,
        });
      }
    }

    return brandId;
  },
});

export const update = mutation({
  args: {
    id: v.id("brands"),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
    logo: v.optional(v.string()),
    description: v.optional(v.string()),
    active: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...data } = args;
    await ctx.db.patch(id, data);
  },
});

export const toggleActive = mutation({
  args: { id: v.id("brands") },
  handler: async (ctx, args) => {
    const brand = await ctx.db.get(args.id);
    if (!brand) throw new Error("Brand not found");
    await ctx.db.patch(args.id, { active: !brand.active });
  },
});

export const remove = mutation({
  args: { id: v.id("brands") },
  handler: async (ctx, args) => {
    const brand = await ctx.db.get(args.id);
    if (!brand) throw new Error("Brand not found");

    const imageUrl = brand.logo || null;

    const models = await ctx.db
      .query("models")
      .withIndex("by_brandId", (q) => q.eq("brandId", args.id))
      .collect();

    for (const model of models) {
      const variants = await ctx.db
        .query("variants")
        .withIndex("by_modelId", (q) => q.eq("modelId", model._id))
        .collect();

      for (const variant of variants) {
        await ctx.db.delete(variant._id);
      }
      await ctx.db.delete(model._id);
    }

    await ctx.db.delete(args.id);

    return { imageUrl };
  },
});
