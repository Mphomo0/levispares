'use client'

import { useEffect, useState } from 'react'

/**
 * Returns true only after the component has mounted on the client.
 * Used to defer rendering of client-only UI (e.g. portal-based menus)
 * until after hydration, avoiding SSR/client markup mismatches.
 */
export function useMounted() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount-only flag, required to avoid a hydration mismatch
    setMounted(true)
  }, [])

  return mounted
}
