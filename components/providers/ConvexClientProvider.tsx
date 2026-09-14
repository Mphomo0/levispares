"use client";

import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import { ReactNode } from "react";

import { SyncUser } from "./SyncUser";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL!;
if (typeof window !== "undefined") {
  console.log("RUNTIME_CONVEX_URL_CACHEBUST_v2:", convexUrl);
}
const convex = new ConvexReactClient(convexUrl);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!}
    >
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <SyncUser />
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
