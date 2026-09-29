import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getRole } from "@/lib/auth";

// /admin and /account are protected in their own layouts (resource-based
// checks), not here — path-matching middleware can diverge from how Next.js
// actually routes a request. This middleware only handles the post-auth
// redirect dispatcher below, which isn't a protected resource itself.
export default clerkMiddleware(async (auth, req) => {
  if (req.nextUrl.pathname === "/auth-redirect") {
    const { userId, sessionClaims } = await auth();
    if (!userId) {
      return NextResponse.redirect(new URL("/", req.url));
    }
    const target = getRole(sessionClaims) === "admin" ? "/admin" : "/account";
    return NextResponse.redirect(new URL(target, req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
