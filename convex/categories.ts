import { v, ConvexError } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

import { requireAdmin } from "./lib/auth";
import { tidyProductName } from "./lib/names";

/**
 * Ops-only bulk rename, run with `npx convex run categories:renameMany`.
 * Only the display name changes (slugs and product links are untouched), so
 * it is safe even for categories that already have products.
 */
export const renameMany = internalMutation({
  args: { renames: v.array(v.object({ id: v.id("categories"), name: v.string() })) },
  handler: async (ctx, { renames }) => {
    for (const { id, name } of renames) {
      const trimmed = name.trim();
      if (!trimmed) throw new ConvexError("Category name cannot be empty");
      if (!(await ctx.db.get(id))) throw new ConvexError(`Category ${id} not found`);
      await ctx.db.patch(id, { name: trimmed });
    }
  },
});

/**
 * Ops-only: fix category name casing ("CORNER PANEL" -> "Corner Panel"),
 * and descriptions written entirely in capitals. Slugs are not changed, so
 * links keep working. Preview with dryRun first:
 *   npx convex run --prod categories:tidyNames '{"dryRun": true}'
 *   npx convex run --prod categories:tidyNames '{"dryRun": false}'
 */
export const tidyNames = internalMutation({
  args: { dryRun: v.boolean() },
  handler: async (ctx, { dryRun }) => {
    const categories = await ctx.db.query("categories").collect();
    const changes: { field: "name" | "description"; from: string; to: string }[] = [];
    for (const category of categories) {
      const patch: { name?: string; description?: string } = {};
      const name = tidyProductName(category.name);
      if (name !== category.name) {
        patch.name = name;
        changes.push({ field: "name", from: category.name, to: name });
      }
      const description = category.description?.trim();
      if (description && description === description.toUpperCase() && /[A-Z]{3,}/.test(description)) {
        const tidied = tidyProductName(description);
        if (tidied !== category.description) {
          patch.description = tidied;
          changes.push({ field: "description", from: category.description!, to: tidied });
        }
      }
      if (!dryRun && Object.keys(patch).length) await ctx.db.patch(category._id, patch);
    }
    return { dryRun, changed: changes.length, total: categories.length, changes };
  },
});

/**
 * Ops-only slug change, run with `npx convex run categories:changeSlug`.
 * The admin editor locks slugs on categories with products because shared
 * links would break; use this deliberately when that's acceptable.
 */
export const changeSlug = internalMutation({
  args: { id: v.id("categories"), slug: v.string() },
  handler: async (ctx, { id, slug }) => {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      throw new ConvexError("Slug must be lowercase letters, numbers and single hyphens.");
    }
    if (!(await ctx.db.get(id))) throw new ConvexError(`Category ${id} not found`);
    const existing = await ctx.db
      .query("categories")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (existing && existing._id !== id) {
      throw new ConvexError("A category with this slug already exists.");
    }
    await ctx.db.patch(id, { slug });
  },
});
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
    await requireAdmin(ctx);
    const name = args.name.trim();
    if (!name) throw new ConvexError("Category name cannot be empty.");
    const existing = await ctx.db
      .query("categories")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (existing) {
      throw new ConvexError("Category with this slug already exists");
    }

    return await ctx.db.insert("categories", {
      ...args,
      name,
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
    await requireAdmin(ctx);
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
    await requireAdmin(ctx);
    const { id, ...updates } = args;
    const category = await ctx.db.get(id);
    if (!category) throw new ConvexError("Category not found");

    if (updates.name !== undefined) {
      updates.name = updates.name.trim();
      if (!updates.name) throw new ConvexError("Category name cannot be empty.");
    }

    // Renaming or re-describing is always safe. Changing the slug breaks links
    // already shared for its products, and moving it re-files those products,
    // so both stay locked while the category has products.
    const changesSlug = updates.slug !== undefined && updates.slug !== category.slug;
    const changesParent = updates.parentId !== undefined && updates.parentId !== category.parentId;
    if (changesSlug || changesParent) {
      const products = await ctx.db
        .query("products")
        .withIndex("by_categoryId", (q) => q.eq("categoryId", id))
        .take(1);
      if (products.length > 0) {
        throw new ConvexError(
          "This category has products, so its URL slug and parent can't be changed. You can still rename it or edit its description and icon.",
        );
      }
    }

    if (updates.slug !== undefined && updates.slug !== category.slug) {
      const existing = await ctx.db
        .query("categories")
        .withIndex("by_slug", (q) => q.eq("slug", updates.slug as string))
        .unique();
      if (existing && existing._id !== id) {
        throw new ConvexError("A category with this slug already exists.");
      }
    }

    if (updates.parentId !== undefined) {
      if (updates.parentId === id) {
        throw new ConvexError("A category cannot be its own parent.");
      }
      if (updates.parentId !== null) {
        let current = await ctx.db.get(updates.parentId);
        while (current) {
          if (current.parentId === id) {
            throw new ConvexError("Circular parent reference detected. This would create an infinite category hierarchy.");
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
    await requireAdmin(ctx);
    const category = await ctx.db.get(args.id);
    if (!category) throw new ConvexError("Category not found");
    await ctx.db.patch(args.id, { active: !category.active });
  },
});

export const remove = mutation({
  args: { id: v.id("categories") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const category = await ctx.db.get(args.id);
    if (!category) throw new ConvexError("Category not found");

    const products = await ctx.db
      .query("products")
      .withIndex("by_categoryId", (q) => q.eq("categoryId", args.id))
      .take(1);
    if (products.length > 0) {
      throw new ConvexError("Cannot delete: this category has associated products. Remove or reassign the products first.");
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
        throw new ConvexError(`Cannot delete: subcategory "${sub.name}" has associated products. Remove or reassign the products first.`);
      }
      await ctx.db.delete(sub._id);
    }

    const imageUrl = category.image || null;

    await ctx.db.delete(args.id);
    
    return { imageUrl };
  },
});
