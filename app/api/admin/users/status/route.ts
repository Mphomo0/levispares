import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { getErrorMessage } from "@/lib/errors";
import { getRole } from "@/lib/auth";

/**
 * Ban (active: false) or reinstate (active: true) a user.
 *
 * Convex marks the account inactive (so every user-scoped function rejects it)
 * and Clerk bans it (so their sessions end and they cannot sign in).
 */
export async function POST(request: NextRequest) {
  const { userId, sessionClaims, getToken } = await auth();

  if (!userId || getRole(sessionClaims) !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id, active } = await request.json();
  if (typeof id !== "string" || typeof active !== "boolean") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const token = await getToken({ template: "convex" });
  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  convex.setAuth(token);
  const userArgs = { id: id as Id<"users"> };

  let clerkId: string;
  try {
    ({ clerkId } = await convex.mutation(api.users.setActive, { ...userArgs, active }));
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Failed to update user") },
      { status: 400 },
    );
  }

  try {
    const client = await clerkClient();
    if (active) {
      await client.users.unbanUser(clerkId);
    } else {
      await client.users.banUser(clerkId);
    }
  } catch (error) {
    console.error("Clerk ban/unban failed:", error);
    // Put Convex back so both sides agree.
    await convex.mutation(api.users.setActive, { ...userArgs, active: !active }).catch(() => {});
    return NextResponse.json({ error: "Failed to update the sign-in account" }, { status: 502 });
  }

  return NextResponse.json({ success: true });
}
