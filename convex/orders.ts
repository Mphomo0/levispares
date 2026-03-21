import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const listByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();

    return Promise.all(
      orders.map(async (order) => {
        const items = await ctx.db
          .query("orderItems")
          .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
          .collect();
        return { ...order, items };
      })
    );
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const orders = await ctx.db.query("orders").order("desc").collect();

    return Promise.all(
      orders.map(async (order) => {
        const items = await ctx.db
          .query("orderItems")
          .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
          .collect();
        return { ...order, items };
      })
    );
  },
});

export const listRecent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 5;
    return await ctx.db
      .query("orders")
      .order("desc")
      .take(limit);
  },
});

export const getById = query({
  args: { id: v.id("orders") },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.id);
    if (!order) return null;

    const items = await ctx.db
      .query("orderItems")
      .withIndex("by_orderId", (q) => q.eq("orderId", args.id))
      .collect();

    const shippingAddress = order.shippingAddressId
      ? await ctx.db.get(order.shippingAddressId)
      : null;
    const billingAddress = order.billingAddressId
      ? await ctx.db.get(order.billingAddressId)
      : null;

    return {
      ...order,
      items,
      shippingAddress,
      billingAddress,
    };
  },
});

export const create = mutation({
  args: {
    userId: v.id("users"),
    items: v.array(v.object({
      productId: v.id("products"),
      name: v.string(),
      partNumber: v.optional(v.string()),
      sku: v.string(),
      price: v.number(),
      quantity: v.number(),
    })),
    shippingAddressId: v.optional(v.id("addresses")),
    billingAddressId: v.optional(v.id("addresses")),
    subtotal: v.number(),
    shipping: v.number(),
    tax: v.number(),
    discount: v.optional(v.number()),
    total: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    for (const item of args.items) {
      const product = await ctx.db.get(item.productId);
      if (!product) {
        throw new Error(`Product not found: ${item.productId}`);
      }
      if ((product.stockQty ?? 0) < item.quantity) {
        throw new Error(`Insufficient stock for "${product.name}". Available: ${product.stockQty ?? 0}, requested: ${item.quantity}`);
      }
    }

    const orderId = await ctx.db.insert("orders", {
      userId: args.userId,
      status: "pending",
      subtotal: args.subtotal,
      shipping: args.shipping,
      tax: args.tax,
      discount: args.discount ?? 0,
      total: args.total,
      shippingAddressId: args.shippingAddressId,
      billingAddressId: args.billingAddressId,
      notes: args.notes,
    });

    for (const item of args.items) {
      await ctx.db.insert("orderItems", {
        orderId,
        productId: item.productId,
        name: item.name,
        partNumber: item.partNumber,
        sku: item.sku,
        price: item.price,
        quantity: item.quantity,
        total: item.price * item.quantity,
      });
    }

    return orderId;
  },
});

export const markPaid = mutation({
  args: {
    id: v.id("orders"),
    paypalOrderId: v.string(),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.id);
    if (!order) throw new Error("Order not found");
    if (order.status === "paid") throw new Error("Order already paid");

    const items = await ctx.db
      .query("orderItems")
      .withIndex("by_orderId", (q) => q.eq("orderId", args.id))
      .collect();

    for (const item of items) {
      const product = await ctx.db.get(item.productId);
      if (!product) continue;

      await ctx.db.patch(item.productId, {
        stockQty: Math.max(0, (product.stockQty ?? 0) - item.quantity),
        totalSold: (product.totalSold ?? 0) + item.quantity,
      });
    }

    await ctx.db.patch(args.id, {
      status: "paid",
      paypalOrderId: args.paypalOrderId,
    });
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("orders"),
    status: v.union(
      v.literal("pending"),
      v.literal("paid"),
      v.literal("processing"),
      v.literal("shipped"),
      v.literal("delivered"),
      v.literal("cancelled")
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: args.status });
  },
});
