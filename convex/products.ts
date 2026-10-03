import { v, ConvexError } from "convex/values";
import { query, mutation, internalMutation, type MutationCtx, type QueryCtx } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
import type { Doc, Id } from "./_generated/dataModel";

import { requireAdmin } from "./lib/auth";
import { ensureProductSlug, insertProduct } from "./lib/productSlug";
import { tidyProductName } from "./lib/names";

/** A category plus all of its active subcategories, at any depth. */
async function categoryWithDescendants(ctx: QueryCtx, rootId: Id<"categories">) {
  const ids: Id<"categories">[] = [rootId];
  const seen = new Set<string>(ids);
  for (let i = 0; i < ids.length; i++) {
    const children = await ctx.db
      .query("categories")
      .withIndex("by_parentId", (q) => q.eq("parentId", ids[i]))
      .collect();
    for (const child of children) {
      if (child.active === false || seen.has(child._id)) continue;
      seen.add(child._id);
      ids.push(child._id);
    }
  }
  return ids;
}

/** Adds each product's category name, reading each distinct category once. */
async function withCategoryNames(ctx: QueryCtx, products: Doc<"products">[]) {
  const ids = [...new Set(products.map((p) => p.categoryId))];
  const categories = await Promise.all(ids.map((id) => ctx.db.get(id)));
  const names = new Map(ids.map((id, i) => [id, categories[i]?.name]));
  return products.map((p) => ({ ...p, category: names.get(p.categoryId) }));
}
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

export const listAdmin = query({
  args: {
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let products = await ctx.db.query("products").order("desc").collect();

    if (args.search) {
      const searchLower = args.search.toLowerCase();
      products = products.filter((p) =>
        p.name.toLowerCase().includes(searchLower) ||
        p.sku?.toLowerCase().includes(searchLower) ||
        p.partNumber?.toLowerCase().includes(searchLower) ||
        p.description?.toLowerCase().includes(searchLower)
      );
    }

    const categoryNames = new Map<string, string>();
    for (const categoryId of new Set(products.map((p) => p.categoryId))) {
      const category = await ctx.db.get(categoryId);
      categoryNames.set(categoryId, category?.name ?? 'Uncategorized');
    }

    return products.map((product) => ({
      ...product,
      inventory: product.stockQty ?? 0,
      category: categoryNames.get(product.categoryId) ?? 'Uncategorized',
    }));
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
      .take(9);

    return await withCategoryNames(ctx, products);
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
    const model = product.modelId ? await ctx.db.get(product.modelId) : null;
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
  // A string, so a mistyped or malformed link is "not found" rather than an error.
  args: { id: v.string() },
  handler: async (ctx, rawArgs) => {
    const id = ctx.db.normalizeId("products", rawArgs.id);
    const product = id ? await ctx.db.get(id) : null;
    // Deactivated products are not shown to customers.
    if (!product || product.active === false) return null;
    const args = { id: product._id };

    const images = await ctx.db
      .query("productImages")
      .withIndex("by_productId", (q) => q.eq("productId", args.id))
      .order("asc")
      .collect();

    const brand = await ctx.db.get(product.brandId);
    const model = product.modelId ? await ctx.db.get(product.modelId) : null;
    const category = await ctx.db.get(product.categoryId);
    const variant = product.variantId ? await ctx.db.get(product.variantId) : null;

    let relatedProducts: typeof product[] = [];
    if (variant) {
      relatedProducts = await ctx.db
        .query("products")
        .withIndex("by_variantId", (q) => q.eq("variantId", variant._id))
        .filter((q) => q.eq(q.field("active"), true))
        .take(4);
    } else if (product.modelId) {
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

export const listShopPaginated = query({
  args: {
    paginationOpts: paginationOptsValidator,
    categoryId: v.optional(v.id("categories")),
    brandId: v.optional(v.id("brands")),
    modelId: v.optional(v.id("models")),
    variantId: v.optional(v.id("variants")),
    minPrice: v.optional(v.number()),
    maxPrice: v.optional(v.number()),
    inStock: v.optional(v.boolean()),
    searchQuery: v.optional(v.string()),
    sort: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let query;

    // Use search index if searchQuery is provided
    if (args.searchQuery) {
      query = ctx.db
        .query("products")
        .withSearchIndex("search_name_description", (q) =>
          q.search("name", args.searchQuery!)
        );
    } else if (args.variantId) {
      query = ctx.db
        .query("products")
        .withIndex("by_variantId", (q) => q.eq("variantId", args.variantId!));
    } else if (args.modelId) {
      query = ctx.db
        .query("products")
        .withIndex("by_modelId", (q) => q.eq("modelId", args.modelId!));
    } else if (args.categoryId) {
      query = ctx.db
        .query("products")
        .withIndex("by_categoryId", (q) => q.eq("categoryId", args.categoryId!));
    } else if (args.brandId) {
      query = ctx.db
        .query("products")
        .withIndex("by_brandId", (q) => q.eq("brandId", args.brandId!));
    } else {
      query = ctx.db
        .query("products")
        .withIndex("by_active", (q) => q.eq("active", true));
    }

    // Apply other filters using .filter()
    let resultsQuery = query.filter((q) => q.eq(q.field("active"), true));

    if (args.categoryId && args.searchQuery) {
      resultsQuery = resultsQuery.filter((q) =>
        q.eq(q.field("categoryId"), args.categoryId!)
      );
    }
    if (args.brandId && (args.searchQuery || args.categoryId || args.modelId || args.variantId)) {
      resultsQuery = resultsQuery.filter((q) =>
        q.eq(q.field("brandId"), args.brandId!)
      );
    }
    if (args.modelId && (args.searchQuery || args.categoryId || args.variantId)) {
        resultsQuery = resultsQuery.filter((q) =>
          q.eq(q.field("modelId"), args.modelId!)
        );
      }
    if (args.variantId && (args.searchQuery || args.categoryId || args.modelId)) {
      resultsQuery = resultsQuery.filter((q) =>
        q.eq(q.field("variantId"), args.variantId!)
      );
    }
    if (args.minPrice !== undefined) {
      resultsQuery = resultsQuery.filter((q) =>
        q.gte(q.field("price"), args.minPrice!)
      );
    }
    if (args.maxPrice !== undefined) {
      resultsQuery = resultsQuery.filter((q) =>
        q.lte(q.field("price"), args.maxPrice!)
      );
    }
    if (args.inStock) {
      resultsQuery = resultsQuery.filter((q) => q.gt(q.field("stockQty"), 0));
    }

    // Initial pagination
    const paginatedResults = await resultsQuery.paginate(args.paginationOpts);

    // Transform and map images
    paginatedResults.page = paginatedResults.page.map((product) => ({
      ...product,
      image: product.image,
    }));

    // Sort the current page if requested
    if (args.sort && args.sort !== "newest") {
      paginatedResults.page.sort((a, b) => {
        if (args.sort === "price-asc") return a.price - b.price;
        if (args.sort === "price-desc") return b.price - a.price;
        if (args.sort === "name") return a.name.localeCompare(b.name);
        return 0;
      });
    }

    return paginatedResults;
  },
});

export const listShopNumbered = query({
  args: {
    page: v.number(),
    pageSize: v.number(),
    categoryId: v.optional(v.id("categories")),
    brandId: v.optional(v.id("brands")),
    modelId: v.optional(v.id("models")),
    variantId: v.optional(v.id("variants")),
    minPrice: v.optional(v.number()),
    maxPrice: v.optional(v.number()),
    inStock: v.optional(v.boolean()),
    searchQuery: v.optional(v.string()),
    sort: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let query;
    let indexedField: "search" | "modelId" | "variantId" | "categoryId" | "brandId" | "active" = "active";

    // Choosing a parent category also shows its subcategories' products.
    const categoryIds = args.categoryId
      ? await categoryWithDescendants(ctx, args.categoryId)
      : null;

    // Use search index if searchQuery is provided
    if (args.searchQuery) {
      indexedField = "search";
      query = ctx.db
        .query("products")
        .withSearchIndex("search_name_description", (q) =>
          q.search("name", args.searchQuery!)
        );
    } else if (args.modelId) {
      // Index by model (not variant) so that products deliberately left
      // without a variant ("fits every variant of this model") are still
      // included below when filtering by a specific variant.
      indexedField = "modelId";
      query = ctx.db
        .query("products")
        .withIndex("by_modelId", (q) => q.eq("modelId", args.modelId!));
    } else if (args.variantId) {
      indexedField = "variantId";
      query = ctx.db
        .query("products")
        .withIndex("by_variantId", (q) => q.eq("variantId", args.variantId!));
    } else if (categoryIds?.length === 1) {
      indexedField = "categoryId";
      query = ctx.db
        .query("products")
        .withIndex("by_categoryId", (q) => q.eq("categoryId", categoryIds[0]));
    } else if (args.brandId) {
      indexedField = "brandId";
      query = ctx.db
        .query("products")
        .withIndex("by_brandId", (q) => q.eq("brandId", args.brandId!));
    } else {
      query = ctx.db
        .query("products")
        .withIndex("by_active", (q) => q.eq("active", true));
    }

    // Apply other filters using .filter()
    let resultsQuery = query.filter((q) => q.eq(q.field("active"), true));

    if (categoryIds && indexedField !== "categoryId") {
      resultsQuery = resultsQuery.filter((q) =>
        q.or(...categoryIds.map((id) => q.eq(q.field("categoryId"), id)))
      );
    }
    if (args.brandId && indexedField !== "brandId") {
      resultsQuery = resultsQuery.filter((q) =>
        q.eq(q.field("brandId"), args.brandId!)
      );
    }
    if (args.modelId && indexedField !== "modelId") {
      resultsQuery = resultsQuery.filter((q) =>
        q.eq(q.field("modelId"), args.modelId!)
      );
    }
    if (args.variantId) {
      if (args.modelId) {
        // Include products scoped to this exact variant, plus products
        // deliberately left variant-less (they fit every variant of the model).
        resultsQuery = resultsQuery.filter((q) =>
          q.or(
            q.eq(q.field("variantId"), args.variantId!),
            q.eq(q.field("variantId"), undefined)
          )
        );
      } else if (indexedField !== "variantId") {
        resultsQuery = resultsQuery.filter((q) =>
          q.eq(q.field("variantId"), args.variantId!)
        );
      }
    }
    if (args.minPrice !== undefined) {
      resultsQuery = resultsQuery.filter((q) =>
        q.gte(q.field("price"), args.minPrice!)
      );
    }
    if (args.maxPrice !== undefined) {
      resultsQuery = resultsQuery.filter((q) =>
        q.lte(q.field("price"), args.maxPrice!)
      );
    }
    if (args.inStock) {
      resultsQuery = resultsQuery.filter((q) => q.gt(q.field("stockQty"), 0));
    }

    // Since we need "Numbered Pagination" with page jumps, and Convex paginate is cursor-based:
    // We fetch all matching items for now to calculate totalCount and slice.
    // For extreme performance, we would need to maintain cursors per page or use a search index.
    const allMatching = await resultsQuery.collect();

    // Map images
    const productsWithImages = allMatching.map((product) => ({
      ...product,
      image: product.image,
    }));

    // Global Sorting
    if (args.sort && args.sort !== "newest") {
      productsWithImages.sort((a, b) => {
        if (args.sort === "price-asc") return a.price - b.price;
        if (args.sort === "price-desc") return b.price - a.price;
        if (args.sort === "name") return a.name.localeCompare(b.name);
        return 0;
      });
    }

    const totalCount = productsWithImages.length;
    const totalPages = Math.ceil(totalCount / args.pageSize);
    const start = (args.page - 1) * args.pageSize;
    const end = start + args.pageSize;
    const pageResults = productsWithImages.slice(start, end);

    return {
      products: await withCategoryNames(ctx, pageResults),
      totalCount,
      totalPages,
    };
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
      // Include products scoped to this exact variant, plus products
      // deliberately left variant-less (they fit every variant of the model).
      products = products.filter(
        (p) => p.variantId === args.variantId || p.variantId === undefined
      );
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

/** Replaces a product's extra pictures (everything after the main image). */
async function setGalleryImages(ctx: MutationCtx, productId: Id<"products">, urls: string[]) {
  if (urls.length > 9) throw new ConvexError("A product can have at most 10 pictures.");
  const existing = await ctx.db
    .query("productImages")
    .withIndex("by_productId", (q) => q.eq("productId", productId))
    .collect();
  for (const image of existing) await ctx.db.delete(image._id);
  for (const [index, url] of urls.entries()) {
    await ctx.db.insert("productImages", { productId, url, isPrimary: false, sortOrder: index });
  }
}

export const addWithRelations = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    price: v.number(),
    stockQty: v.optional(v.number()),
    image: v.optional(v.string()),
    specs: v.optional(v.array(v.object({
      label: v.string(),
      value: v.string(),
    }))),
    categoryId: v.id("categories"),
    brandId: v.id("brands"),
    modelId: v.optional(v.id("models")),
    variantId: v.optional(v.id("variants")),
    partNumber: v.optional(v.string()),
    originalPrice: v.optional(v.number()),
    /** Extra pictures after the main one, in display order. */
    images: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const category = await ctx.db.get(args.categoryId);
    if (!category) throw new ConvexError("Category not found");

    const brand = await ctx.db.get(args.brandId);
    if (!brand) throw new ConvexError("Brand not found");

    if (args.modelId) {
      const model = await ctx.db.get(args.modelId);
      if (!model) throw new ConvexError("Model not found");
    }

    if (args.variantId) {
      const variant = await ctx.db.get(args.variantId);
      if (!variant) throw new ConvexError("Variant not found");
    }

    const uuidPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    const brandCode = brand.name.substring(0, 3).toUpperCase();
    const modelCode = args.modelId ? (await ctx.db.get(args.modelId))?.name.substring(0, 4).toUpperCase() || "MODL" : "MODL";
    const catCode = category.name.substring(0, 4).toUpperCase();
    const sku = `${brandCode}-${modelCode}-${catCode}-${uuidPart}`;

    const existingSku = await ctx.db
      .query("products")
      .withIndex("by_sku", (q) => q.eq("sku", sku))
      .unique();

    const id = await insertProduct(ctx, {
      brandId: args.brandId,
      modelId: args.modelId,
      variantId: args.variantId,
      categoryId: args.categoryId,
      sku: existingSku ? `${sku}-${Date.now().toString(36).toUpperCase()}` : sku,
      name: args.name,
      partNumber: args.partNumber,
      description: args.description,
      price: args.price,
      originalPrice: args.originalPrice,
      stockQty: args.stockQty ?? 0,
      image: args.image,
      specs: args.specs,
      active: true,
      totalSold: 0,
    });
    if (args.images?.length) await setGalleryImages(ctx, id, args.images);
    return id;
  },
});

export const updateWithRelations = mutation({
  args: {
    id: v.id("products"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    price: v.optional(v.number()),
    stockQty: v.optional(v.number()),
    image: v.optional(v.string()),
    specs: v.optional(v.array(v.object({
      label: v.string(),
      value: v.string(),
    }))),
    categoryId: v.optional(v.id("categories")),
    brandId: v.optional(v.id("brands")),
    modelId: v.optional(v.id("models")),
    variantId: v.optional(v.id("variants")),
    partNumber: v.optional(v.string()),
    originalPrice: v.optional(v.number()),
    active: v.optional(v.boolean()),
    /** Extra pictures after the main one, in display order. Replaces the gallery. */
    images: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const product = await ctx.db.get(args.id);
    if (!product) throw new ConvexError("Product not found");

    const patchData: Record<string, unknown> = {};
    if (args.name !== undefined) patchData.name = args.name;
    if (args.description !== undefined) patchData.description = args.description;
    if (args.price !== undefined) patchData.price = args.price;
    if (args.stockQty !== undefined) patchData.stockQty = args.stockQty;
    if (args.image !== undefined) patchData.image = args.image;
    if (args.specs !== undefined) patchData.specs = args.specs;
    if (args.categoryId !== undefined) patchData.categoryId = args.categoryId;
    if (args.brandId !== undefined) patchData.brandId = args.brandId;
    if (args.modelId !== undefined) patchData.modelId = args.modelId;
    if (args.variantId !== undefined) patchData.variantId = args.variantId;
    if (args.partNumber !== undefined) patchData.partNumber = args.partNumber;
    if (args.originalPrice !== undefined) patchData.originalPrice = args.originalPrice;
    if (args.active !== undefined) patchData.active = args.active;

    await ctx.db.patch(args.id, patchData);
    if (args.images !== undefined) await setGalleryImages(ctx, args.id, args.images);
  },
});

export const addSimple = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    price: v.number(),
    stockQty: v.optional(v.number()),
    image: v.optional(v.string()),
    specs: v.optional(v.array(v.object({
      label: v.string(),
      value: v.string(),
    }))),
    categoryId: v.id("categories"),
    brandName: v.string(),
    modelName: v.string(),
    variantName: v.optional(v.string()),
    partNumber: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const category = await ctx.db.get(args.categoryId);
    if (!category) throw new ConvexError("Category not found");

    const brandSlug = args.brandName.toLowerCase().replace(/\s+/g, "-");
    let brand = await ctx.db
      .query("brands")
      .withIndex("by_slug", (q) => q.eq("slug", brandSlug))
      .unique();
    if (!brand) {
      const brandId = await ctx.db.insert("brands", {
        name: args.brandName,
        slug: brandSlug,
        active: true,
      });
      brand = await ctx.db.get(brandId);
    }

    const modelSlug = args.modelName.toLowerCase().replace(/\s+/g, "-");
    let model = await ctx.db
      .query("models")
      .withIndex("by_brandId", (q) => q.eq("brandId", brand!._id))
      .collect()
      .then(models => models.find(m => m.name.toLowerCase() === args.modelName.toLowerCase()) ?? null);
    if (!model) {
      const modelId = await ctx.db.insert("models", {
        brandId: brand!._id,
        name: args.modelName,
        slug: modelSlug,
        active: true,
      });
      model = await ctx.db.get(modelId);
    }

    let variantId: Id<"variants"> | undefined;
    if (args.variantName) {
      const variantSlug = args.variantName.toLowerCase().replace(/\s+/g, "-");
      const existingVariants = await ctx.db
        .query("variants")
        .withIndex("by_modelId", (q) => q.eq("modelId", model!._id))
        .collect();
      const variant = existingVariants.find(v => v.variantValue.toLowerCase() === args.variantName!.toLowerCase());
      if (!variant) {
        const vId = await ctx.db.insert("variants", {
          modelId: model!._id,
          variantType: "Engine",
          variantValue: args.variantName,
          slug: variantSlug,
          active: true,
        });
        variantId = vId;
      } else {
        variantId = variant._id;
      }
    }

    const uuidPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    const brandCode = args.brandName.substring(0, 3).toUpperCase();
    const modelCode = args.modelName.substring(0, 4).toUpperCase();
    const catCode = category.name.substring(0, 4).toUpperCase();
    const sku = `${brandCode}-${modelCode}-${catCode}-${uuidPart}`;

    const existingSku = await ctx.db
      .query("products")
      .withIndex("by_sku", (q) => q.eq("sku", sku))
      .unique();
    if (existingSku) {
      const altSku = `${sku}-${Date.now().toString(36).toUpperCase()}`;
      return await insertProduct(ctx, {
        brandId: brand!._id,
        modelId: model!._id,
        variantId,
        categoryId: args.categoryId,
        sku: altSku,
        name: args.name,
        partNumber: args.partNumber,
        description: args.description,
        price: args.price,
        stockQty: args.stockQty ?? 0,
        image: args.image,
        specs: args.specs,
        active: true,
        totalSold: 0,
      });
    }

    return await insertProduct(ctx, {
      brandId: brand!._id,
      modelId: model!._id,
      variantId,
      categoryId: args.categoryId,
      sku,
      name: args.name,
      partNumber: args.partNumber,
      description: args.description,
      price: args.price,
      stockQty: args.stockQty ?? 0,
      image: args.image,
      specs: args.specs,
      active: true,
      totalSold: 0,
    });
  },
});

export const updateSimple = mutation({
  args: {
    id: v.id("products"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    price: v.optional(v.number()),
    stockQty: v.optional(v.number()),
    image: v.optional(v.string()),
    specs: v.optional(v.array(v.object({
      label: v.string(),
      value: v.string(),
    }))),
    categoryId: v.optional(v.id("categories")),
    brandName: v.optional(v.string()),
    modelName: v.optional(v.string()),
    variantName: v.optional(v.string()),
    partNumber: v.optional(v.string()),
    active: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const { id, ...updates } = args;
    const product = await ctx.db.get(id);
    if (!product) throw new ConvexError("Product not found");

    let brandId = product.brandId;
    let modelId = product.modelId;
    let variantId = product.variantId;

    if (updates.brandName) {
      const brandSlug = updates.brandName.toLowerCase().replace(/\s+/g, "-");
      let brand = await ctx.db
        .query("brands")
        .withIndex("by_slug", (q) => q.eq("slug", brandSlug))
        .unique();
      if (!brand) {
        const bId = await ctx.db.insert("brands", {
          name: updates.brandName,
          slug: brandSlug,
          active: true,
        });
        brand = await ctx.db.get(bId);
      }
      brandId = brand!._id;
    }

    if (updates.modelName) {
      const modelSlug = updates.modelName.toLowerCase().replace(/\s+/g, "-");
      const existingModels = await ctx.db
        .query("models")
        .withIndex("by_brandId", (q) => q.eq("brandId", brandId))
        .collect();
      let model = existingModels.find(m => m.name.toLowerCase() === updates.modelName!.toLowerCase()) ?? null;
      if (!model) {
        const mId = await ctx.db.insert("models", {
          brandId,
          name: updates.modelName,
          slug: modelSlug,
          active: true,
        });
        model = await ctx.db.get(mId);
      }
      modelId = model!._id;
    }

    if (updates.variantName !== undefined) {
      if (updates.variantName === "") {
        variantId = undefined;
      } else if (modelId) {
        const variantSlug = updates.variantName.toLowerCase().replace(/\s+/g, "-");
        const existingVariants = await ctx.db
          .query("variants")
          .withIndex("by_modelId", (q) => q.eq("modelId", modelId))
          .collect();
        const variant = existingVariants.find(v => v.variantValue.toLowerCase() === updates.variantName!.toLowerCase());
        if (!variant) {
          const vId = await ctx.db.insert("variants", {
            modelId,
            variantType: "Engine",
            variantValue: updates.variantName,
            slug: variantSlug,
            active: true,
          });
          variantId = vId;
        } else {
          variantId = variant._id;
        }
      }
    }

    const patchData: Record<string, unknown> = {};
    if (updates.name !== undefined) patchData.name = updates.name;
    if (updates.description !== undefined) patchData.description = updates.description;
    if (updates.price !== undefined) patchData.price = updates.price;
    if (updates.stockQty !== undefined) patchData.stockQty = updates.stockQty;
    if (updates.image !== undefined) patchData.image = updates.image;
    if (updates.specs !== undefined) patchData.specs = updates.specs;
    if (updates.categoryId !== undefined) patchData.categoryId = updates.categoryId;
    if (updates.brandName !== undefined) patchData.brandId = brandId;
    if (updates.modelName !== undefined) patchData.modelId = modelId;
    if (updates.variantName !== undefined) patchData.variantId = variantId;
    if (updates.partNumber !== undefined) patchData.partNumber = updates.partNumber;
    if (updates.active !== undefined) patchData.active = updates.active;

    await ctx.db.patch(id, patchData);
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
    originalPrice: v.optional(v.number()),
    stockQty: v.optional(v.number()),
    image: v.optional(v.string()),
    specs: v.optional(v.array(v.object({
      label: v.string(),
      value: v.string(),
    }))),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const existing = await ctx.db
      .query("products")
      .withIndex("by_sku", (q) => q.eq("sku", args.sku))
      .unique();
    if (existing) {
      throw new ConvexError("Product with this SKU already exists");
    }

    return await insertProduct(ctx, {
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
    originalPrice: v.optional(v.number()),
    stockQty: v.optional(v.number()),
    image: v.optional(v.string()),
    specs: v.optional(v.array(v.object({
      label: v.string(),
      value: v.string(),
    }))),
    active: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const { id, ...data } = args;
    await ctx.db.patch(id, data);
  },
});

export const toggleActive = mutation({
  args: { id: v.id("products") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const product = await ctx.db.get(args.id);
    if (!product) throw new ConvexError("Product not found");
    await ctx.db.patch(args.id, { active: !product.active });
  },
});

export const remove = mutation({
  args: { id: v.id("products") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const product = await ctx.db.get(args.id);
    if (!product) throw new ConvexError("Product not found");

    const images = await ctx.db
      .query("productImages")
      .withIndex("by_productId", (q) => q.eq("productId", args.id))
      .collect();

    const imageUrls = images.map(img => img.url);
    
    if (product.image) {
      imageUrls.unshift(product.image);
    }

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
    await requireAdmin(ctx);
    const product = await ctx.db.get(args.id);
    if (!product) throw new ConvexError("Product not found");

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
    await requireAdmin(ctx);
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
    await requireAdmin(ctx);
    const product = await ctx.db.get(args.id);
    if (!product) throw new ConvexError("Product not found");

    if ((product.stockQty ?? 0) < args.quantity) {
      throw new ConvexError(`Insufficient stock for "${product.name}"`);
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
    await requireAdmin(ctx);
    for (const update of args.updates) {
      await ctx.db.patch(update.productId, {
        stockQty: Math.max(0, update.stockQty),
      });
    }
  },
});

/**
 * Resolves a product link, which may be the readable slug or (for older
 * links) the database id. Returns null for unknown or deactivated products.
 */
export const getByRef = query({
  args: { ref: v.string() },
  handler: async (ctx, { ref }) => {
    const id = ctx.db.normalizeId("products", ref);
    const product = id
      ? await ctx.db.get(id)
      : await ctx.db
          .query("products")
          .withIndex("by_slug", (q) => q.eq("slug", ref))
          .first();
    if (!product || product.active === false) return null;
    return { _id: product._id, slug: product.slug ?? null, matchedBy: id ? ("id" as const) : ("slug" as const) };
  },
});

/** Ops-only: give every existing product a slug. `npx convex run products:backfillSlugs` */
export const backfillSlugs = internalMutation({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db.query("products").collect();
    let updated = 0;
    for (const product of products) {
      if (product.slug) continue;
      await ensureProductSlug(ctx, product._id);
      updated++;
    }
    return { updated, total: products.length };
  },
});

/**
 * Ops-only: fix product name casing ("FRONT BUMPER CHROME" -> "Front Bumper
 * Chrome"; LH/RH and sizes are kept). Slugs are not changed, so links keep
 * working. Preview first with dryRun, then run without it:
 *   npx convex run --prod products:tidyNames '{"dryRun": true}'
 *   npx convex run --prod products:tidyNames '{"dryRun": false}'
 */
export const tidyNames = internalMutation({
  args: { dryRun: v.boolean() },
  handler: async (ctx, { dryRun }) => {
    const products = await ctx.db.query("products").collect();
    const changes: { from: string; to: string }[] = [];
    for (const product of products) {
      const name = tidyProductName(product.name);
      if (name === product.name) continue;
      changes.push({ from: product.name, to: name });
      if (!dryRun) await ctx.db.patch(product._id, { name });
    }
    return { dryRun, changed: changes.length, total: products.length, changes };
  },
});
