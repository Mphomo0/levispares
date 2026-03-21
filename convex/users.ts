import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Insert or update the user information from Clerk.
 */
export const store = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Called storeUser without authentication identity");
    }

    // Role detection: 
    // 1. Try to get role from Clerk JWT claims (if user added it to the template)
    // 2. Fallback to "user"
    const role = (identity as any).role || "user";

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

export const toggleStatus = mutation({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.id);
    if (!user) throw new Error("User not found");
    
    const identity = await ctx.auth.getUserIdentity();
    if (identity?.subject === user.clerkId) {
      throw new Error("You cannot deactivate your own account.");
    }

    await ctx.db.patch(args.id, { 
      isActive: user.isActive === false ? true : false 
    });
  },
});

export const getByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();
  },
});

export const setAdmin = mutation({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (user) {
      await ctx.db.patch(user._id, { role: "admin" });
    } else {
      // Don't create phantom users — the user must sign in first to sync
      throw new Error(
        "User not found in Convex. The user must sign in at least once before being promoted to admin."
      );
    }
  },
});

export const getById = query({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("users").order("desc").collect();
  },
});

export const deleteById = mutation({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.id);
    if (!user) throw new Error("User not found");

    // Don't allow deleting yourself
    const identity = await ctx.auth.getUserIdentity();
    if (identity?.subject === user.clerkId) {
      throw new Error("You cannot delete your own user record.");
    }

    await ctx.db.delete(args.id);
  },
});

