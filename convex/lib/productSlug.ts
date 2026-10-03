import type { MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

/**
 * Gives a product a unique slug from its name if it doesn't have one yet.
 * Slugs are never changed afterwards, so renaming a product doesn't break
 * links or search rankings.
 */
export async function ensureProductSlug(ctx: MutationCtx, id: Id<"products">) {
  const product = await ctx.db.get(id);
  if (!product || product.slug) return;

  const base = slugify(product.name) || "part";
  let candidate = base;
  for (let n = 2; ; n++) {
    const existing = await ctx.db
      .query("products")
      .withIndex("by_slug", (q) => q.eq("slug", candidate))
      .first();
    if (!existing || existing._id === id) break;
    candidate = `${base}-${n}`;
  }
  await ctx.db.patch(id, { slug: candidate });
}

/** Inserts a product and gives it a slug in the same transaction. */
export async function insertProduct(
  ctx: MutationCtx,
  doc: Parameters<MutationCtx["db"]["insert"]>[1] & { name: string },
) {
  const id = (await ctx.db.insert("products", doc as never)) as Id<"products">;
  await ensureProductSlug(ctx, id);
  return id;
}
