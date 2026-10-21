import { v, ConvexError } from "convex/values";
import { query, mutation, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

import { isAdmin, requireAdmin } from "./lib/auth";

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Codes are matched without regard to case or surrounding spaces. */
export const normalizeCode = (code: string) => code.trim().toUpperCase();

/**
 * Why a code cannot be used on an order with this subtotal, or null when it can.
 * Codes take a percentage or a fixed amount off the item subtotal.
 */
function whyNotUsable(promotion: Doc<"promotions">, subtotal: number, now: number) {
  if (promotion.active === false) return "This code is no longer active";
  if (promotion.type !== "percentage" && promotion.type !== "fixed") return "This code cannot be used online";
  if (promotion.startsAt !== undefined && now < promotion.startsAt) return "This code is not active yet";
  if (promotion.expiresAt !== undefined && now >= promotion.expiresAt) return "This code has expired";
  if (promotion.maxUses !== undefined && (promotion.usedCount ?? 0) >= promotion.maxUses) {
    return "This code has been fully used";
  }
  if (promotion.minOrderValue !== undefined && subtotal < promotion.minOrderValue) {
    return `This code needs an order of at least R${promotion.minOrderValue.toFixed(2)}`;
  }
  return null;
}

function discountFor(promotion: Doc<"promotions">, subtotal: number) {
  const amount = promotion.type === "percentage"
    ? subtotal * (promotion.value / 100)
    : promotion.value;
  return round2(Math.min(Math.max(amount, 0), subtotal));
}

async function findByCode(ctx: QueryCtx, code: string) {
  const normalized = normalizeCode(code);
  if (!normalized) return null;
  return await ctx.db
    .query("promotions")
    .withIndex("by_code", (q) => q.eq("code", normalized))
    .first();
}

/** Looks up a code for an order, throwing a customer-facing error when it cannot be used. */
export async function applyPromotion(ctx: QueryCtx, code: string, subtotal: number) {
  const promotion = await findByCode(ctx, code);
  if (!promotion) throw new ConvexError("That promo code is not valid");
  const problem = whyNotUsable(promotion, subtotal, Date.now());
  if (problem) throw new ConvexError(problem);
  return { promotion, discount: discountFor(promotion, subtotal) };
}

/** Counts one use of a code, once its order is paid. */
export async function countPromotionUse(ctx: MutationCtx, promotionId: Id<"promotions">) {
  const promotion = await ctx.db.get(promotionId);
  if (promotion) await ctx.db.patch(promotionId, { usedCount: (promotion.usedCount ?? 0) + 1 });
}

/** Checkout preview: what a code would take off this subtotal. The order itself is priced on the server. */
export const check = query({
  args: { code: v.string(), subtotal: v.number() },
  handler: async (ctx, args) => {
    const promotion = await findByCode(ctx, args.code);
    if (!promotion) return { ok: false as const, message: "That promo code is not valid" };
    const problem = whyNotUsable(promotion, args.subtotal, Date.now());
    if (problem) return { ok: false as const, message: problem };
    return {
      ok: true as const,
      code: promotion.code!,
      name: promotion.name,
      discount: discountFor(promotion, args.subtotal),
    };
  },
});

export const listAll = query({
  handler: async (ctx) => {
    if (!(await isAdmin(ctx))) return [];
    return await ctx.db.query("promotions").order("desc").collect();
  },
});

const promotionFields = {
  name: v.string(),
  type: v.union(v.literal("percentage"), v.literal("fixed")),
  value: v.number(),
  minOrderValue: v.optional(v.number()),
  maxUses: v.optional(v.number()),
  startsAt: v.optional(v.number()),
  expiresAt: v.optional(v.number()),
};

function validate(args: {
  name: string;
  type: "percentage" | "fixed";
  value: number;
  minOrderValue?: number;
  maxUses?: number;
  startsAt?: number;
  expiresAt?: number;
}) {
  if (!args.name.trim()) throw new ConvexError("Give the promotion a name");
  if (!(args.value > 0)) throw new ConvexError("The discount must be more than 0");
  if (args.type === "percentage" && args.value > 100) throw new ConvexError("A percentage discount can be at most 100");
  if (args.minOrderValue !== undefined && args.minOrderValue < 0) throw new ConvexError("The minimum order cannot be negative");
  if (args.maxUses !== undefined && (!Number.isInteger(args.maxUses) || args.maxUses < 1)) {
    throw new ConvexError("The usage limit must be a whole number of at least 1");
  }
  if (args.startsAt !== undefined && args.expiresAt !== undefined && args.expiresAt <= args.startsAt) {
    throw new ConvexError("The end date must be after the start date");
  }
}

async function assertCodeFree(ctx: QueryCtx, code: string, except?: Id<"promotions">) {
  if (!/^[A-Z0-9_-]{3,32}$/.test(code)) {
    throw new ConvexError("Codes are 3 to 32 letters, numbers, dashes or underscores");
  }
  const existing = await ctx.db
    .query("promotions")
    .withIndex("by_code", (q) => q.eq("code", code))
    .first();
  if (existing && existing._id !== except) throw new ConvexError("Promotion code already exists");
}

export const add = mutation({
  args: { code: v.string(), ...promotionFields },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const code = normalizeCode(args.code);
    validate(args);
    await assertCodeFree(ctx, code);

    return await ctx.db.insert("promotions", {
      ...args,
      code,
      name: args.name.trim(),
      usedCount: 0,
      active: true,
    });
  },
});

export const update = mutation({
  args: { id: v.id("promotions"), code: v.string(), ...promotionFields },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const { id, ...data } = args;
    const code = normalizeCode(data.code);
    validate(data);
    await assertCodeFree(ctx, code, id);

    // Optional limits left blank are cleared rather than kept.
    await ctx.db.patch(id, {
      ...data,
      code,
      name: data.name.trim(),
      minOrderValue: data.minOrderValue,
      maxUses: data.maxUses,
      startsAt: data.startsAt,
      expiresAt: data.expiresAt,
    });
  },
});

export const setActive = mutation({
  args: { id: v.id("promotions"), active: v.boolean() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.id, { active: args.active });
  },
});

export const remove = mutation({
  args: { id: v.id("promotions") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const products = await ctx.db
      .query("promotionProducts")
      .withIndex("by_promotionId", (q) => q.eq("promotionId", args.id))
      .collect();

    for (const product of products) {
      await ctx.db.delete(product._id);
    }

    await ctx.db.delete(args.id);
  },
});
