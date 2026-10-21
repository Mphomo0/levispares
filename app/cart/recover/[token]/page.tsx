'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { useCart } from '@/lib/CartContext'

/** Where a cart reminder email's "Return to your cart" button lands: restores the cart, then shows it. */
export default function RecoverCartPage() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()
  const { mergeItems } = useCart()
  const saved = useQuery(api.carts.byToken, { token })
  const restored = useRef(false)

  useEffect(() => {
    if (!saved || restored.current) return
    restored.current = true
    mergeItems(saved)
    router.replace('/cart')
  }, [saved, mergeItems, router])

  if (saved === null || saved?.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-16 text-center">
        <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
          This cart is no longer available
        </h1>
        <p className="text-muted-foreground max-w-md mb-8">
          The items may have been bought already or are out of stock. Have a look
          in the shop for the parts you need.
        </p>
        <Link href="/shop" className="btn-accent text-white text-center">
          Browse the shop
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-16">
      <p className="text-muted-foreground">Restoring your cart…</p>
    </div>
  )
}
