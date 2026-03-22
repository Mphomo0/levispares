'use client'

import { useEffect, useRef } from 'react'
import { useUser } from '@clerk/nextjs'
import { useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { useFavorites } from '@/lib/FavoritesContext'
import { toast } from 'sonner'

export default function FavoritesMerge() {
  const { user, isLoaded: isUserLoaded } = useUser()
  const { items: guestFavorites, clearFavorites } = useFavorites()
  const addToWishlist = useMutation(api.wishlists.addToDefault)
  const hasMerged = useRef(false)

  useEffect(() => {
    if (!isUserLoaded || !user || hasMerged.current) return
    if (guestFavorites.length === 0) return

    hasMerged.current = true

    const merge = async () => {
      for (const product of guestFavorites) {
        try {
          await addToWishlist({ productId: product._id as any })
        } catch (e: any) {
          if (!e.message?.includes('already in wishlist')) {
            console.error('Failed to merge favorite:', e)
          }
        }
      }
      clearFavorites()
      toast.success('Your saved favorites have been added to your wishlist!')
    }

    merge()
  }, [isUserLoaded, user, guestFavorites, addToWishlist, clearFavorites])

  return null
}
