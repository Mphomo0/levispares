import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";

export const list = query({
  args: {
    paginationOpts: paginationOptsValidator,
    categoryId: v.optional(v.id("categories")),
    brandId: v.optional(v.id("brands")),
    modelId: v.optional(v.id("models")),
    variantId: v.optional(v.id("variants")),
  },
  handler: async (ctx, args) => {
    let products;
    if (args.variantId) {
      products = await ctx.db
        .query("products")
        .withIndex("by_variantId", (q) => q.eq("variantId", args.variantId!))
        .filter((q) => q.eq(q.field("active"), true))
        .order("desc")
        .paginate(args.paginationOpts);
    } else if (args.categoryId) {
      products = await ctx.db
        .query("products")
        .withIndex("by_categoryId", (q) => q.eq("categoryId", args.categoryId!))
        .filter((q) => q.eq(q.field("active"), true))
        .order("desc")
        .paginate(args.paginationOpts);
    } else if (args.brandId) {
      products = await ctx.db
        .query("products")
        .withIndex("by_brandId", (q) => q.eq("brandId", args.brandId!))
        .filter((q) => q.eq(q.field("active"), true))
        .order("desc")
        .paginate(args.paginationOpts);
    } else if (args.modelId) {
      products = await ctx.db
        .query("products")
        .withIndex("by_modelId", (q) => q.eq("modelId", args.modelId!))
        .filter((q) => q.eq(q.field("active"), true))
        .order("desc")
        .paginate(args.paginationOpts);
    } else {
      products = await ctx.db
        .query("products")
        .filter((q) => q.eq(q.field("active"), true))
        .order("desc")
        .paginate(args.paginationOpts);
    }

    return {
      ...products,
      page: products.page.map((product) => ({
        ...product,
        image: product.image,
      })),
    };
  },
});

export const listAll = query({
  args: { brandId: v.optional(v.id("brands")) },
  handler: async (ctx, args) => {
    if (args.brandId) {
      return await ctx.db
        .query("products")
        .withIndex("by_brandId", (q) => q.eq("brandId", args.brandId!))
        .order("desc")
        .collect();
    }
    return await ctx.db.query("products").order("desc").collect();
  },
});

export const listFeatured = query({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db
      .query("products")
      .filter((q) => q.eq(q.field("active"), true))
      .order("desc")
      .take(8);

    return products.map((product) => ({
      ...product,
      image: product.image,
    }));
  },
});

export const getById = query({
  args: { id: v.id("products") },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.id);
    if (!product) return null;

    const images = await ctx.db
      .query("productImages")
      .withIndex("by_productId", (q) => q.eq("productId", args.id))
      .order("asc")
      .collect();

    const brand = await ctx.db.get(product.brandId);
    const model = await ctx.db.get(product.modelId);
    const category = await ctx.db.get(product.categoryId);
    const variant = product.variantId ? await ctx.db.get(product.variantId) : null;

    return {
      ...product,
      images,
      brand,
      model,
      category,
      variant,
    };
  },
});

export const getBySku = query({
  args: { sku: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("products")
      .withIndex("by_sku", (q) => q.eq("sku", args.sku))
      .unique();
  },
});

export const getByPartNumber = query({
  args: { partNumber: v.string() },
  handler: async (ctx, args) => {
    const allProducts = await ctx.db.query("products").collect();
    return allProducts.find((p) => p.partNumber === args.partNumber) ?? null;
  },
});

export const getWithFullHierarchy = query({
  args: { id: v.id("products") },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.id);
    if (!product) return null;

    const images = await ctx.db
      .query("productImages")
      .withIndex("by_productId", (q) => q.eq("productId", args.id))
      .order("asc")
      .collect();

    const brand = await ctx.db.get(product.brandId);
    const model = await ctx.db.get(product.modelId);
    const category = await ctx.db.get(product.categoryId);
    const variant = product.variantId ? await ctx.db.get(product.variantId) : null;

    let relatedProducts: typeof product[] = [];
    if (variant) {
      relatedProducts = await ctx.db
        .query("products")
        .withIndex("by_variantId", (q) => q.eq("variantId", variant._id))
        .filter((q) => q.eq(q.field("active"), true))
        .take(4);
    } else {
      relatedProducts = await ctx.db
        .query("products")
        .withIndex("by_modelId", (q) => q.eq("modelId", product.modelId))
        .filter((q) => q.eq(q.field("active"), true))
        .take(4);
    }

    return {
      ...product,
      images,
      brand,
      model,
      category,
      variant,
      relatedProducts: relatedProducts.filter((p) => p._id !== product._id),
    };
  },
});

export const search = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const products = await ctx.db
      .query("products")
      .withSearchIndex("search_name_description", (q) =>
        q.search("name", args.query)
      )
      .take(20);

    return products.map((product) => ({
      ...product,
      image: product.image,
    }));
  },
});

export const searchAdvanced = query({
  args: {
    query: v.optional(v.string()),
    brandId: v.optional(v.id("brands")),
    modelId: v.optional(v.id("models")),
    categoryId: v.optional(v.id("categories")),
    variantId: v.optional(v.id("variants")),
    minPrice: v.optional(v.number()),
    maxPrice: v.optional(v.number()),
    inStock: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let products = await ctx.db
      .query("products")
      .filter((q) => q.eq(q.field("active"), true))
      .collect();

    if (args.query) {
      const queryLower = args.query.toLowerCase();
      products = products.filter((p) =>
        p.name.toLowerCase().includes(queryLower) ||
        p.partNumber?.toLowerCase().includes(queryLower) ||
        p.sku.toLowerCase().includes(queryLower) ||
        p.description?.toLowerCase().includes(queryLower)
      );
    }

    if (args.brandId) {
      products = products.filter((p) => p.brandId === args.brandId);
    }
    if (args.modelId) {
      products = products.filter((p) => p.modelId === args.modelId);
    }
    if (args.categoryId) {
      products = products.filter((p) => p.categoryId === args.categoryId);
    }
    if (args.variantId) {
      products = products.filter((p) => p.variantId === args.variantId);
    }
    if (args.minPrice !== undefined) {
      products = products.filter((p) => p.price >= args.minPrice!);
    }
    if (args.maxPrice !== undefined) {
      products = products.filter((p) => p.price <= args.maxPrice!);
    }
    if (args.inStock) {
      products = products.filter((p) => (p.stockQty ?? 0) > 0);
    }

    return products.slice(0, 50).map((product) => ({
      ...product,
      image: product.image,
    }));
  },
});

export const listByBrandModelVariant = query({
  args: {
    brandId: v.id("brands"),
    modelId: v.optional(v.id("models")),
    variantId: v.optional(v.id("variants")),
  },
  handler: async (ctx, args) => {
    let products = await ctx.db
      .query("products")
      .withIndex("by_brandId", (q) => q.eq("brandId", args.brandId))
      .filter((q) => q.eq(q.field("active"), true))
      .collect();

    if (args.modelId) {
      products = products.filter((p) => p.modelId === args.modelId);
    }
    if (args.variantId) {
      products = products.filter((p) => p.variantId === args.variantId);
    }

    const enriched = await Promise.all(
      products.map(async (product) => {
        const category = await ctx.db.get(product.categoryId);
        const variant = product.variantId ? await ctx.db.get(product.variantId) : null;
        return { ...product, category, variant };
      })
    );

    return enriched;
  },
});

export const listBestSellers = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 5;
    const allProducts = await ctx.db.query("products").collect();

    const sorted = allProducts
      .filter((p) => (p.totalSold ?? 0) > 0)
      .sort((a, b) => (b.totalSold ?? 0) - (a.totalSold ?? 0))
      .slice(0, limit);

    return sorted.map((product) => ({
      ...product,
      image: product.image,
    }));
  },
});

export const listLowStock = query({
  args: { threshold: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const threshold = args.threshold ?? 10;
    const allProducts = await ctx.db.query("products").collect();

    return allProducts
      .filter((p) => (p.stockQty ?? 0) <= threshold && (p.stockQty ?? 0) > 0)
      .map((product) => ({
        ...product,
        image: product.image,
      }));
  },
});

export const listOutOfStock = query({
  handler: async (ctx) => {
    const allProducts = await ctx.db.query("products").collect();

    return allProducts
      .filter((p) => (p.stockQty ?? 0) <= 0)
      .map((product) => ({
        ...product,
        image: product.image,
      }));
  },
});

export const listNewArrivals = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;
    return await ctx.db
      .query("products")
      .filter((q) => q.eq(q.field("active"), true))
      .order("desc")
      .take(limit);
  },
});

export const getStats = query({
  args: { id: v.id("products") },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.id);
    if (!product) return null;

    const reviews = await ctx.db
      .query("reviews")
      .withIndex("by_productId", (q) => q.eq("productId", args.id))
      .collect();

    const averageRating = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

    return {
      stockQty: product.stockQty ?? 0,
      totalSold: product.totalSold ?? 0,
      reviewCount: reviews.length,
      averageRating: Math.round(averageRating * 10) / 10,
      stockValue: (product.stockQty ?? 0) * product.price,
    };
  },
});

export const add = mutation({
  args: {
    brandId: v.id("brands"),
    modelId: v.id("models"),
    categoryId: v.id("categories"),
    variantId: v.optional(v.id("variants")),
    sku: v.string(),
    name: v.string(),
    partNumber: v.optional(v.string()),
    description: v.optional(v.string()),
    price: v.number(),
    stockQty: v.optional(v.number()),
    image: v.optional(v.string()),
    specs: v.optional(v.array(v.object({
      label: v.string(),
      value: v.string(),
    }))),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("products")
      .withIndex("by_sku", (q) => q.eq("sku", args.sku))
      .unique();
    if (existing) {
      throw new Error("Product with this SKU already exists");
    }

    return await ctx.db.insert("products", {
      ...args,
      active: true,
      stockQty: args.stockQty ?? 0,
      totalSold: 0,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("products"),
    brandId: v.optional(v.id("brands")),
    modelId: v.optional(v.id("models")),
    categoryId: v.optional(v.id("categories")),
    variantId: v.optional(v.id("variants")),
    sku: v.optional(v.string()),
    name: v.optional(v.string()),
    partNumber: v.optional(v.string()),
    description: v.optional(v.string()),
    price: v.optional(v.number()),
    stockQty: v.optional(v.number()),
    image: v.optional(v.string()),
    specs: v.optional(v.array(v.object({
      label: v.string(),
      value: v.string(),
    }))),
    active: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...data } = args;
    await ctx.db.patch(id, data);
  },
});

export const toggleActive = mutation({
  args: { id: v.id("products") },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.id);
    if (!product) throw new Error("Product not found");
    await ctx.db.patch(args.id, { active: !product.active });
  },
});

export const remove = mutation({
  args: { id: v.id("products") },
  handler: async (ctx, args) => {
    const images = await ctx.db
      .query("productImages")
      .withIndex("by_productId", (q) => q.eq("productId", args.id))
      .collect();

    const imageUrls = images.map(img => img.url);

    for (const img of images) {
      await ctx.db.delete(img._id);
    }

    await ctx.db.delete(args.id);
    
    return { imageUrls };
  },
});

export const updateStock = mutation({
  args: {
    id: v.id("products"),
    quantity: v.number(),
  },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.id);
    if (!product) throw new Error("Product not found");

    await ctx.db.patch(args.id, {
      stockQty: Math.max(0, (product.stockQty ?? 0) + args.quantity),
    });
  },
});

export const setStock = mutation({
  args: {
    id: v.id("products"),
    stockQty: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      stockQty: Math.max(0, args.stockQty),
    });
  },
});

export const decrementStock = mutation({
  args: {
    id: v.id("products"),
    quantity: v.number(),
  },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.id);
    if (!product) throw new Error("Product not found");

    if ((product.stockQty ?? 0) < args.quantity) {
      throw new Error(`Insufficient stock for "${product.name}"`);
    }

    await ctx.db.patch(args.id, {
      stockQty: Math.max(0, (product.stockQty ?? 0) - args.quantity),
      totalSold: (product.totalSold ?? 0) + args.quantity,
    });
  },
});

export const bulkUpdateStock = mutation({
  args: {
    updates: v.array(v.object({
      productId: v.id("products"),
      stockQty: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    for (const update of args.updates) {
      await ctx.db.patch(update.productId, {
        stockQty: Math.max(0, update.stockQty),
      });
    }
  },
});
