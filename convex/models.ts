import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const list = query({
  args: { brandId: v.optional(v.id("brands")) },
  handler: async (ctx, args) => {
    if (args.brandId) {
      return await ctx.db
        .query("models")
        .withIndex("by_brandId", (q) => q.eq("brandId", args.brandId!))
        .order("asc")
        .collect();
    }
    return await ctx.db.query("models").order("asc").collect();
  },
});

export const listActive = query({
  args: { brandId: v.optional(v.id("brands")) },
  handler: async (ctx, args) => {
    if (args.brandId) {
      return await ctx.db
        .query("models")
        .withIndex("by_brandId", (q) => q.eq("brandId", args.brandId!))
        .filter((q) => q.eq(q.field("active"), true))
        .order("asc")
        .collect();
    }
    return await ctx.db
      .query("models")
      .withIndex("by_active")
      .filter((q) => q.eq(q.field("active"), true))
      .order("asc")
      .collect();
  },
});

export const getById = query({
  args: { id: v.id("models") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("models")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
  },
});

export const getWithBrand = query({
  args: { id: v.id("models") },
  handler: async (ctx, args) => {
    const model = await ctx.db.get(args.id);
    if (!model) return null;

    const brand = await ctx.db.get(model.brandId);
    const variants = await ctx.db
      .query("variants")
      .withIndex("by_modelId", (q) => q.eq("modelId", args.id))
      .filter((q) => q.eq(q.field("active"), true))
      .order("asc")
      .collect();

    return {
      ...model,
      brand,
      variants,
    };
  },
});

export const getWithFullHierarchy = query({
  args: { id: v.id("models") },
  handler: async (ctx, args) => {
    const model = await ctx.db.get(args.id);
    if (!model) return null;

    const brand = await ctx.db.get(model.brandId);
    const variants = await ctx.db
      .query("variants")
      .withIndex("by_modelId", (q) => q.eq("modelId", args.id))
      .filter((q) => q.eq(q.field("active"), true))
      .collect();

    const products = await ctx.db
      .query("products")
      .withIndex("by_modelId", (q) => q.eq("modelId", args.id))
      .collect();

    const variantsWithProducts = await Promise.all(
      variants.map(async (variant) => {
        const variantProducts = products.filter((p) => p.variantId === variant._id);
        return { ...variant, productCount: variantProducts.length };
      })
    );

    return {
      ...model,
      brand,
      variants: variantsWithProducts,
      productCount: products.length,
    };
  },
});

export const getStats = query({
  args: { id: v.id("models") },
  handler: async (ctx, args) => {
    const products = await ctx.db
      .query("products")
      .withIndex("by_modelId", (q) => q.eq("modelId", args.id))
      .collect();

    const variants = await ctx.db
      .query("variants")
      .withIndex("by_modelId", (q) => q.eq("modelId", args.id))
      .collect();

    const totalStock = products.reduce((sum, p) => sum + (p.stockQty ?? 0), 0);
    const totalValue = products.reduce((sum, p) => sum + (p.price * (p.stockQty ?? 0)), 0);

    return {
      productCount: products.length,
      variantCount: variants.length,
      totalStock,
      totalValue: Math.round(totalValue * 100) / 100,
    };
  },
});

export const add = mutation({
  args: {
    brandId: v.id("brands"),
    name: v.string(),
    yearFrom: v.optional(v.number()),
    yearTo: v.optional(v.number()),
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("models")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (existing) {
      throw new Error("Model with this slug already exists");
    }

    return await ctx.db.insert("models", {
      ...args,
      active: true,
    });
  },
});

export const addWithVariants = mutation({
  args: {
    brandId: v.id("brands"),
    name: v.string(),
    yearFrom: v.optional(v.number()),
    yearTo: v.optional(v.number()),
    variants: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const brand = await ctx.db.get(args.brandId);
    if (!brand) throw new Error("Brand not found");

    const modelSlug = `${brand.slug}-${args.name.toLowerCase().replace(/\s+/g, "-")}`;
    
    const existing = await ctx.db
      .query("models")
      .withIndex("by_slug", (q) => q.eq("slug", modelSlug))
      .unique();
    if (existing) {
      throw new Error("Model with this slug already exists");
    }

    const modelId = await ctx.db.insert("models", {
      brandId: args.brandId,
      name: args.name,
      yearFrom: args.yearFrom,
      yearTo: args.yearTo,
      slug: modelSlug,
      active: true,
    });

    for (const variantValue of args.variants) {
      const variantSlug = `${modelSlug}-${variantValue.toLowerCase().replace(/\s+/g, "-")}`;
      await ctx.db.insert("variants", {
        modelId,
        variantType: "GVM",
        variantValue,
        slug: variantSlug,
        active: true,
      });
    }

    return modelId;
  },
});

export const update = mutation({
  args: {
    id: v.id("models"),
    brandId: v.optional(v.id("brands")),
    name: v.optional(v.string()),
    yearFrom: v.optional(v.number()),
    yearTo: v.optional(v.number()),
    slug: v.optional(v.string()),
    active: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...data } = args;
    await ctx.db.patch(id, data);
  },
});

export const toggleActive = mutation({
  args: { id: v.id("models") },
  handler: async (ctx, args) => {
    const model = await ctx.db.get(args.id);
    if (!model) throw new Error("Model not found");
    await ctx.db.patch(args.id, { active: !model.active });
  },
});

export const remove = mutation({
  args: { id: v.id("models") },
  handler: async (ctx, args) => {
    const variants = await ctx.db
      .query("variants")
      .withIndex("by_modelId", (q) => q.eq("modelId", args.id))
      .collect();

    for (const variant of variants) {
      const products = await ctx.db
        .query("products")
        .withIndex("by_variantId", (q) => q.eq("variantId", variant._id))
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
      await ctx.db.delete(variant._id);
    }

    await ctx.db.delete(args.id);
  },
});
