'use client'

import { useConvexAuth, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { linkGuestOrders } from "@/app/account/actions";

/**
 * A component that syncs the authenticated user with the Convex database.
 */
export function SyncUser() {
  const { isAuthenticated } = useConvexAuth();
  const storeUser = useMutation(api.users.store);
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    if (isAuthenticated && !synced) {
      console.log("SyncUser: Authenticated, starting sync…");
      storeUser()
        .then(async () => {
          console.log("SyncUser: Successfully synced user to Convex");
          setSynced(true);
          // Bring in any orders they placed as a guest with this email.
          const { linked } = await linkGuestOrders();
          if (linked > 0) {
            toast.success(`We've added ${linked} earlier order${linked === 1 ? "" : "s"} to your account.`);
          }
        })
        .catch((error) => {
          console.error("SyncUser: Failed to sync user:", error);
        });
    }
  }, [isAuthenticated, storeUser, synced]);

  return null;
}
