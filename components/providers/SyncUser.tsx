'use client'

import { useConvexAuth, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect, useState } from "react";

/**
 * A component that syncs the authenticated user with the Convex database.
 */
export function SyncUser() {
  const { isAuthenticated } = useConvexAuth();
  const storeUser = useMutation(api.users.store);
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    if (isAuthenticated && !synced) {
      console.log("SyncUser: Authenticated, starting sync...");
      storeUser()
        .then(() => {
          console.log("SyncUser: Successfully synced user to Convex");
          setSynced(true);
        })
        .catch((error) => {
          console.error("SyncUser: Failed to sync user:", error);
        });
    }
  }, [isAuthenticated, storeUser, synced]);

  return null;
}
