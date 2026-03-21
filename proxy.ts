import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isAdminRoute = createRouteMatcher(["/admin(.*)"]);
const isAccountRoute = createRouteMatcher(["/account(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  const { userId, sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role || (sessionClaims as any)?.publicMetadata?.role;

  // Handle post-auth redirection
  if (req.nextUrl.pathname === "/auth-redirect") {
    if (!userId) {
      return NextResponse.redirect(new URL("/", req.url));
    }
    const target = role === "admin" ? "/admin" : "/account";
    return NextResponse.redirect(new URL(target, req.url));
  }

  // Protect admin routes: only allow users with "admin" role
  if (isAdminRoute(req)) {
    if (!userId || role !== "admin") {
      const url = new URL("/", req.url);
      return NextResponse.redirect(url);
    }
  }

  // Protect account routes: require authentication AND non-admin status
  if (isAccountRoute(req)) {
    if (!userId) {
      const url = new URL("/login", req.url);
      return NextResponse.redirect(url);
    }
    
    // If admin tries to access /account, redirect to /admin
    if (role === "admin") {
      const url = new URL("/admin", req.url);
      return NextResponse.redirect(url);
    }
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
