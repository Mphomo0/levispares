import { v } from "convex/values";
import { internalMutation, type MutationCtx } from "./_generated/server";

/**
 * Counts one request against a fixed time window. Returns false once the
 * limit for the current window has been reached.
 */
export async function hitRateLimit(ctx: MutationCtx, key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const row = await ctx.db
    .query("rateLimits")
    .withIndex("by_key", (q) => q.eq("key", key))
    .first();
  if (!row) {
    await ctx.db.insert("rateLimits", { key, windowStart: now, count: 1 });
    return true;
  }
  if (now - row.windowStart >= windowMs) {
    await ctx.db.patch(row._id, { windowStart: now, count: 1 });
    return true;
  }
  if (row.count >= limit) return false;
  await ctx.db.patch(row._id, { count: row.count + 1 });
  return true;
}

/** For HTTP actions: true when every one of the limits still has room. */
export const hit = internalMutation({
  args: { limits: v.array(v.object({ key: v.string(), limit: v.number(), windowMs: v.number() })) },
  handler: async (ctx, args) => {
    for (const { key, limit, windowMs } of args.limits) {
      if (!(await hitRateLimit(ctx, key, limit, windowMs))) return false;
    }
    return true;
  },
});

/** Daily: removes counters nobody has touched for a day. */
export const prune = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const rows = await ctx.db.query("rateLimits").take(2000);
    for (const row of rows) {
      if (row.windowStart < cutoff) await ctx.db.delete(row._id);
    }
  },
});
