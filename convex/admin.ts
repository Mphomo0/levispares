import { mutation } from "./_generated/server";
import type { TableNames } from "./_generated/dataModel";
import { requireAdmin } from "./lib/auth";

// The store's trading data, plus everything that only makes sense alongside
// it, so nothing is left pointing at an order or product that is gone.
// Brands, models, variants, customers, promotions and settings are kept.
const RESET_TABLES: TableNames[] = [
  "orders",
  "orderItems",
  "returns",
  "products",
  "productImages",
  "reviews",
  "wishlistItems",
  "stockAlerts",
  "carts",
  "categories",
  "addresses",
];

export const resetAllData = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    for (const table of RESET_TABLES) {
      const rows = await ctx.db.query(table).collect();
      for (const row of rows) {
        await ctx.db.delete(row._id);
      }
    }

    // Product-only promo codes would point at products that no longer exist.
    const promotions = await ctx.db.query("promotions").collect();
    for (const promotion of promotions) {
      if (promotion.productId) await ctx.db.patch(promotion._id, { productId: undefined, active: false });
    }

    return { success: true };
  },
});
