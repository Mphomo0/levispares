import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
import type { Id } from "./_generated/dataModel";

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
    paginationOpts: paginationOptsValidator,
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const query = ctx.db.query("products").order("desc");
    
    if (args.search) {
      const searchLower = args.search.toLowerCase();
      const allProducts = await ctx.db.query("products").collect();
      const filteredProducts = allProducts.filter((p) =>
        p.name.toLowerCase().includes(searchLower) ||
        p.sku?.toLowerCase().includes(searchLower) ||
        p.partNumber?.toLowerCase().includes(searchLower) ||
        p.description?.toLowerCase().includes(searchLower)
      );
      
      const enriched = await Promise.all(
        filteredProducts.map(async (product) => {
          const category = await ctx.db.get(product.categoryId);
          return {
            ...product,
            inventory: product.stockQty ?? 0,
            category: category?.name ?? 'Uncategorized',
          };
        })
      );
      
      const start = (args.paginationOpts.numItems * (args.paginationOpts.cursor ? 1 : 0));
      const paginated = enriched.slice(start, start + args.paginationOpts.numItems);
      
      return {
        page: paginated,
        continueCursor: enriched.length > start + args.paginationOpts.numItems ? `cursor-${start + args.paginationOpts.numItems}` : undefined,
        count: enriched.length,
      };
    }
    
    const products = await query.paginate(args.paginationOpts);

    const enriched = await Promise.all(
      products.page.map(async (product) => {
        const category = await ctx.db.get(product.categoryId);
        return {
          ...product,
          inventory: product.stockQty ?? 0,
          category: category?.name ?? 'Uncategorized',
        };
      })
    );

    return {
      ...products,
      page: enriched,
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
      .take(9);

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
  },
  handler: async (ctx, args) => {
    const category = await ctx.db.get(args.categoryId);
    if (!category) throw new Error("Category not found");

    const brand = await ctx.db.get(args.brandId);
    if (!brand) throw new Error("Brand not found");

    if (args.modelId) {
      const model = await ctx.db.get(args.modelId);
      if (!model) throw new Error("Model not found");
    }

    if (args.variantId) {
      const variant = await ctx.db.get(args.variantId);
      if (!variant) throw new Error("Variant not found");
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
    if (existingSku) {
      const altSku = `${sku}-${Date.now().toString(36).toUpperCase()}`;
      return await ctx.db.insert("products", {
        brandId: args.brandId,
        modelId: args.modelId,
        variantId: args.variantId,
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

    return await ctx.db.insert("products", {
      brandId: args.brandId,
      modelId: args.modelId,
      variantId: args.variantId,
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
    active: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.id);
    if (!product) throw new Error("Product not found");

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
    if (args.active !== undefined) patchData.active = args.active;

    await ctx.db.patch(args.id, patchData);
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
    const category = await ctx.db.get(args.categoryId);
    if (!category) throw new Error("Category not found");

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
      return await ctx.db.insert("products", {
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

    return await ctx.db.insert("products", {
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
    const { id, ...updates } = args;
    const product = await ctx.db.get(id);
    if (!product) throw new Error("Product not found");

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
    const product = await ctx.db.get(args.id);
    if (!product) throw new Error("Product not found");

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
