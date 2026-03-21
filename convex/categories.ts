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
    const { id, ...data } = args;
    await ctx.db.patch(id, data);
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
    const subcategories = await ctx.db
      .query("categories")
      .withIndex("by_parentId", (q) => q.eq("parentId", args.id))
      .collect();

    for (const sub of subcategories) {
      await ctx.db.delete(sub._id);
    }

    await ctx.db.delete(args.id);
  },
});
