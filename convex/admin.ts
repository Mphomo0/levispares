import { mutation } from "./_generated/server";

export const resetAllData = mutation({
  args: {},
  handler: async (ctx) => {
    // Delete all orders
    const orders = await ctx.db.query("orders").collect();
    for (const order of orders) {
      await ctx.db.delete(order._id);
    }

    // Delete all products
    const products = await ctx.db.query("products").collect();
    for (const product of products) {
      await ctx.db.delete(product._id);
    }

    // Delete all categories
    const categories = await ctx.db.query("categories").collect();
    for (const cat of categories) {
      await ctx.db.delete(cat._id);
    }

    // Delete all addresses
    const addresses = await ctx.db.query("addresses").collect();
    for (const addr of addresses) {
      await ctx.db.delete(addr._id);
    }

    return { success: true };
  },
});
