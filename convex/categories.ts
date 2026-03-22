import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

export const list = query({
  args: { parentId: v.optional(v.id("categories")) },
  handler: async (ctx, args) => {
    if (args.parentId) {
      return await ctx.db
        .query("categories")
        .withIndex("by_parentId", (q) => q.eq("parentId", args.parentId!))
        .order("asc")
        .collect();
    }
    return await ctx.db.query("categories").order("asc").collect();
  },
});

export const listActive = query({
  args: { parentId: v.optional(v.id("categories")) },
  handler: async (ctx, args) => {
    if (args.parentId) {
      return await ctx.db
        .query("categories")
        .withIndex("by_parentId", (q) => q.eq("parentId", args.parentId!))
        .filter((q) => q.eq(q.field("active"), true))
        .order("asc")
        .collect();
    }
    return await ctx.db
      .query("categories")
      .withIndex("by_active")
      .filter((q) => q.eq(q.field("active"), true))
      .order("asc")
      .collect();
  },
});

export const listTopLevel = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("categories")
      .filter((q) => q.eq(q.field("parentId"), undefined))
      .filter((q) => q.eq(q.field("active"), true))
      .order("asc")
      .collect();
  },
});

export const getById = query({
  args: { id: v.id("categories") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("categories")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
  },
});

export const getWithSubcategories = query({
  args: { id: v.id("categories") },
  handler: async (ctx, args) => {
    const category = await ctx.db.get(args.id);
    if (!category) return null;

    const subcategories = await ctx.db
      .query("categories")
      .withIndex("by_parentId", (q) => q.eq("parentId", args.id))
      .filter((q) => q.eq(q.field("active"), true))
      .order("asc")
      .collect();

    const products = await ctx.db
      .query("products")
      .withIndex("by_categoryId", (q) => q.eq("categoryId", args.id))
      .collect();

    return {
      ...category,
      subcategories,
      productCount: products.length,
    };
  },
});

export const getTree = query({
  handler: async (ctx) => {
    const allCategories = await ctx.db
      .query("categories")
      .filter((q) => q.eq(q.field("active"), true))
      .order("asc")
      .collect();

    type CategoryWithChildren = typeof allCategories[number] & { children: CategoryWithChildren[] };

    const buildTree = (parentId?: Id<"categories">): CategoryWithChildren[] => {
      return allCategories
        .filter((c) => {
          if (parentId === undefined) {
            return c.parentId === undefined;
          }
          return c.parentId === parentId;
        })
        .map((category) => ({
          ...category,
          children: buildTree(category._id),
        }));
    };

    return buildTree();
  },
});

export const getBreadcrumb = query({
  args: { id: v.id("categories") },
  handler: async (ctx, args) => {
    const category = await ctx.db.get(args.id);
    if (!category) return [];

    const breadcrumb: typeof category[] = [category];
    let current = category;

    while (current.parentId) {
      const parent = await ctx.db.get(current.parentId);
      if (!parent) break;
      breadcrumb.unshift(parent);
      current = parent;
    }

    return breadcrumb;
  },
});

export const getStats = query({
  args: { id: v.id("categories") },
  handler: async (ctx, args) => {
    const products = await ctx.db
      .query("products")
      .withIndex("by_categoryId", (q) => q.eq("categoryId", args.id))
      .collect();

    const subcategories = await ctx.db
      .query("categories")
      .withIndex("by_parentId", (q) => q.eq("parentId", args.id))
      .collect();

    let totalSubProducts = 0;
    for (const sub of subcategories) {
      const subProducts = await ctx.db
        .query("products")
        .withIndex("by_categoryId", (q) => q.eq("categoryId", sub._id))
        .collect();
      totalSubProducts += subProducts.length;
    }

    const totalStock = products.reduce((sum, p) => sum + (p.stockQty ?? 0), 0);
    const totalValue = products.reduce((sum, p) => sum + (p.price * (p.stockQty ?? 0)), 0);

    return {
      productCount: products.length,
      subcategoryCount: subcategories.length,
      totalSubProducts,
      totalStock,
      totalValue: Math.round(totalValue * 100) / 100,
    };
  },
});

export const hasProducts = query({
  args: { id: v.id("categories") },
  handler: async (ctx, args) => {
    const products = await ctx.db
      .query("products")
      .withIndex("by_categoryId", (q) => q.eq("categoryId", args.id))
      .take(1);
    if (products.length > 0) return true;

    const subcategories = await ctx.db
      .query("categories")
      .withIndex("by_parentId", (q) => q.eq("parentId", args.id))
      .collect();

    for (const sub of subcategories) {
      const subProducts = await ctx.db
        .query("products")
        .withIndex("by_categoryId", (q) => q.eq("categoryId", sub._id))
        .take(1);
      if (subProducts.length > 0) return true;
    }

    return false;
  },
});

export const getProductCounts = query({
  handler: async (ctx) => {
    const categories = await ctx.db.query("categories").collect();
    const counts: Record<string, number> = {};

    for (const cat of categories) {
      const products = await ctx.db
        .query("products")
        .withIndex("by_categoryId", (q) => q.eq("categoryId", cat._id))
        .collect();
      counts[cat._id] = products.length;
    }

    return counts;
  },
});

export const add = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    parentId: v.optional(v.id("categories")),
    image: v.optional(v.string()),
    icon: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("categories")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (existing) {
      throw new Error("Category with this slug already exists");
    }

    return await ctx.db.insert("categories", {
      ...args,
      active: true,
    });
  },
});

export const addBulk = mutation({
  args: {
    categories: v.array(v.object({
      name: v.string(),
      slug: v.string(),
      parentSlug: v.optional(v.string()),
      image: v.optional(v.string()),
      icon: v.optional(v.string()),
      description: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const insertedIds: Id<"categories">[] = [];

    for (const cat of args.categories) {
      const existing = await ctx.db
        .query("categories")
        .withIndex("by_slug", (q) => q.eq("slug", cat.slug))
        .unique();
      if (existing) continue;

      let parentId: Id<"categories"> | undefined;
      if (cat.parentSlug !== undefined) {
        const parent = await ctx.db
          .query("categories")
          .withIndex("by_slug", (q) => q.eq("slug", cat.parentSlug!))
          .unique();
        parentId = parent?._id;
      }

      const id = await ctx.db.insert("categories", {
        name: cat.name,
        slug: cat.slug,
        parentId,
        image: cat.image,
        icon: cat.icon,
        description: cat.description,
        active: true,
      });
      insertedIds.push(id);
    }

    return insertedIds;
  },
});

export const update = mutation({
  args: {
    id: v.id("categories"),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
    parentId: v.optional(v.id("categories")),
    image: v.optional(v.string()),
    icon: v.optional(v.string()),
    description: v.optional(v.string()),
    active: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const category = await ctx.db.get(id);
    if (!category) throw new Error("Category not found");

    const products = await ctx.db
      .query("products")
      .withIndex("by_categoryId", (q) => q.eq("categoryId", id))
      .take(1);
    if (products.length > 0) {
      throw new Error("Cannot edit: this category has associated products. Remove or reassign the products first.");
    }

    if (updates.slug !== undefined && updates.slug !== category.slug) {
      const existing = await ctx.db
        .query("categories")
        .withIndex("by_slug", (q) => q.eq("slug", updates.slug as string))
        .unique();
      if (existing && existing._id !== id) {
        throw new Error("A category with this slug already exists.");
      }
    }

    if (updates.parentId !== undefined) {
      if (updates.parentId === id) {
        throw new Error("A category cannot be its own parent.");
      }
      if (updates.parentId !== null) {
        let current = await ctx.db.get(updates.parentId);
        while (current) {
          if (current.parentId === id) {
            throw new Error("Circular parent reference detected. This would create an infinite category hierarchy.");
          }
          if (!current.parentId) break;
          current = await ctx.db.get(current.parentId);
        }
      }
    }

    const patchData: Record<string, unknown> = {};
    if (updates.name !== undefined) patchData.name = updates.name;
    if (updates.slug !== undefined) patchData.slug = updates.slug;
    if (updates.parentId !== undefined) patchData.parentId = updates.parentId === null ? undefined : updates.parentId;
    if (updates.image !== undefined) patchData.image = updates.image;
    if (updates.icon !== undefined) patchData.icon = updates.icon;
    if (updates.description !== undefined) patchData.description = updates.description;
    if (updates.active !== undefined) patchData.active = updates.active;

    await ctx.db.patch(id, patchData);
  },
});

export const toggleActive = mutation({
  args: { id: v.id("categories") },
  handler: async (ctx, args) => {
    const category = await ctx.db.get(args.id);
    if (!category) throw new Error("Category not found");
    await ctx.db.patch(args.id, { active: !category.active });
  },
});

export const remove = mutation({
  args: { id: v.id("categories") },
  handler: async (ctx, args) => {
    const category = await ctx.db.get(args.id);
    if (!category) throw new Error("Category not found");

    const products = await ctx.db
      .query("products")
      .withIndex("by_categoryId", (q) => q.eq("categoryId", args.id))
      .take(1);
    if (products.length > 0) {
      throw new Error("Cannot delete: this category has associated products. Remove or reassign the products first.");
    }

    const subcategories = await ctx.db
      .query("categories")
      .withIndex("by_parentId", (q) => q.eq("parentId", args.id))
      .collect();

    for (const sub of subcategories) {
      const subProducts = await ctx.db
        .query("products")
        .withIndex("by_categoryId", (q) => q.eq("categoryId", sub._id))
        .take(1);
      if (subProducts.length > 0) {
        throw new Error(`Cannot delete: subcategory "${sub.name}" has associated products. Remove or reassign the products first.`);
      }
      await ctx.db.delete(sub._id);
    }

    const imageUrl = category.image || null;

    await ctx.db.delete(args.id);
    
    return { imageUrl };
  },
});
