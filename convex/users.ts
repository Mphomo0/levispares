import { v, ConvexError } from "convex/values";
import { internalQuery, mutation, query } from "./_generated/server";
import { isAdmin, requireAdmin } from "./lib/auth";

/**
 * Insert or update the user information from Clerk.
 */
export const store = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Called storeUser without authentication identity");
    }

    // Role detection: 
    // 1. Try to get role from Clerk JWT claims (if user added it to the template)
    // 2. Fallback to "user"
    const role = (identity as { role?: string }).role || "user";

    // Check if we've already stored this user.
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (user !== null) {
      // Update user info if it has changed in Clerk
      if (user.email !== identity.email || user.name !== identity.name || user.role !== role) {
        await ctx.db.patch(user._id, { 
          email: identity.email,
          name: identity.name,
          role: role
        });
      }
      return user._id;
    }

    // If it's a new user, create them.
    console.log("Creating new user in Convex:", identity.email, "with role:", role);
    return await ctx.db.insert("users", {
      clerkId: identity.subject,
      email: identity.email || "No email provided",
      name: identity.name || identity.nickname || identity.preferredUsername || "Anonymous User",
      role: role,
      isActive: true, // New users are active by default
    });
  },
});

/**
 * Ban (active: false) or reinstate (active: true) a user. Deactivated users
 * are rejected by every user-scoped function. The API route that calls this
 * also bans the account in Clerk so they cannot sign in at all.
 */
export const setActive = mutation({
  args: { id: v.id("users"), active: v.boolean() },
  handler: async (ctx, args) => {
    const { identity } = await requireAdmin(ctx);

    const user = await ctx.db.get(args.id);
    if (!user) throw new ConvexError("User not found");

    if (identity.subject === user.clerkId) {
      throw new ConvexError("You cannot deactivate your own account.");
    }

    await ctx.db.patch(args.id, { isActive: args.active });
    return { clerkId: user.clerkId };
  },
});

/** Lets actions confirm the caller is an admin (the caller's identity is passed through). */
export const assertAdmin = internalQuery({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return null;
  },
});

export const getByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity?.subject !== args.clerkId && !(await isAdmin(ctx))) return null;
    return await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();
  },
});

export const getCurrent = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }
    return await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
  },
});

export const setAdmin = mutation({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (user) {
      await ctx.db.patch(user._id, { role: "admin" });
    } else {
      // Don't create phantom users — the user must sign in first to sync
      throw new ConvexError(
        "User not found in Convex. The user must sign in at least once before being promoted to admin."
      );
    }
  },
});

export const getById = query({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    if (!(await isAdmin(ctx))) return null;
    return await ctx.db.get(args.id);
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isAdmin(ctx))) return [];
    return await ctx.db.query("users").order("desc").collect();
  },
});

/**
 * Lets a customer erase their own personal data. Saved addresses, wishlists
 * and reviews are deleted and the account record is anonymised. Orders are
 * kept as financial records, tied to the anonymised record.
 */
export const deleteMyData = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return;

    const addresses = await ctx.db
      .query("addresses")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();
    for (const address of addresses) await ctx.db.delete(address._id);

    const wishlists = await ctx.db
      .query("wishlists")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();
    for (const wishlist of wishlists) {
      const items = await ctx.db
        .query("wishlistItems")
        .withIndex("by_wishlistId", (q) => q.eq("wishlistId", wishlist._id))
        .collect();
      for (const item of items) await ctx.db.delete(item._id);
      await ctx.db.delete(wishlist._id);
    }

    const reviews = await ctx.db
      .query("reviews")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();
    for (const review of reviews) await ctx.db.delete(review._id);

    await ctx.db.patch(user._id, {
      name: "Deleted customer",
      email: `deleted-${user._id}@deleted.invalid`,
    });
  },
});

export const deleteById = mutation({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const user = await ctx.db.get(args.id);
    if (!user) throw new ConvexError("User not found");

    // Don't allow deleting yourself
    const identity = await ctx.auth.getUserIdentity();
    if (identity?.subject === user.clerkId) {
      throw new ConvexError("You cannot delete your own user record.");
    }

    await ctx.db.delete(args.id);
  },
});

