'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useUser } from '@clerk/nextjs'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { useFavorites, Product } from '@/lib/FavoritesContext'
import { useCart } from '@/lib/CartContext'
import { toast } from 'sonner'
import { motion } from 'motion/react'

export default function FavoritesPage() {
  const { user, isLoaded: isUserLoaded } = useUser()
  const { items: guestFavorites, removeFromFavorites } = useFavorites()
  const { addToCart } = useCart()
  const [removingId, setRemovingId] = useState<string | null>(null)

  const wishlist = useQuery(api.wishlists.getDefaultWithItems)
  const removeFromWishlist = useMutation(api.wishlists.removeItem)

  const displayItems: Array<{ id: string; product: Product | null; source: 'guest' | 'wishlist' }> = []

  for (const item of guestFavorites) {
    displayItems.push({ id: item._id, product: item, source: 'guest' })
  }

  if (wishlist) {
    for (const item of wishlist.items) {
      if (item.product) {
        const alreadyAdded = displayItems.some(i => i.id === item.product?._id)
        if (!alreadyAdded) {
          displayItems.push({ id: item.product._id, product: item.product as unknown as Product, source: 'wishlist' })
        }
      }
    }
  }

  const handleRemove = async (item: { id: string; source: 'guest' | 'wishlist'; product: Product | null }) => {
    if (!item.product) return
    setRemovingId(item.id)
    try {
      if (item.source === 'guest') {
        removeFromFavorites(item.id)
        toast.success('Removed from favorites')
      } else if (wishlist) {
        await removeFromWishlist({ wishlistId: wishlist._id, productId: item.product._id as any })
        toast.success('Removed from favorites')
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to remove')
    } finally {
      setRemovingId(null)
    }
  }

  const handleMoveToCart = async (item: { id: string; source: 'guest' | 'wishlist'; product: Product | null }) => {
    if (!item.product) return
    try {
        if (item.source === 'wishlist') {
          addToCart(item.product)
      } else {
        addToCart(item.product)
      }
      await handleRemove(item)
      toast.success('Moved to cart')
    } catch (e: any) {
      toast.error(e.message || 'Failed to move to cart')
    }
  }

  const handleMoveAllToCart = async () => {
    for (const item of displayItems) {
      try {
        if (item.source === 'wishlist' && item.product) {
          addToCart(item.product)
        } else if (item.source === 'guest' && item.product) {
          addToCart(item.product)
        }
      } catch (e) {
        // skip duplicates
      }
    }
    guestFavorites.forEach(item => removeFromFavorites(item._id))
    if (wishlist) {
      for (const item of wishlist.items) {
        try {
          if (item.product) {
            await removeFromWishlist({ wishlistId: wishlist._id, productId: item.product._id as any })
          }
        } catch (e) {
          // skip
        }
      }
    }
    toast.success('All items moved to cart')
  }

  return (
    <>
      <div className="hero-gradient text-primary-foreground py-12 md:py-16">
        <div className="container mx-auto px-4">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="font-display text-3xl md:text-4xl lg:text-5xl tracking-wide mb-2"
          >
            MY FAVORITES
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-primary-foreground/70"
          >
            {displayItems.length === 0
              ? 'No saved items yet'
              : `${displayItems.length} saved item${displayItems.length !== 1 ? 's' : ''}`}
          </motion.p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {displayItems.length > 0 ? (
          <>
            <div className="flex justify-end mb-6">
              <button
                onClick={handleMoveAllToCart}
                className="flex items-center gap-2 bg-accent text-white px-5 py-2.5 rounded-lg font-medium text-sm transition-all hover:brightness-110"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Move All to Cart
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {displayItems.map((item) => (
                <motion.div
                  key={`${item.source}-${item.id}`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className="bg-white rounded-xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
                >
                  {item.product && (
                    <>
                      <div className="relative aspect-4/3 bg-slate-100 overflow-hidden">
                        <img
                          src={item.product.image}
                          alt={item.product.name}
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => handleRemove(item)}
                          disabled={removingId === item.id}
                          className="absolute top-2 right-2 p-1.5 bg-white/90 backdrop-blur-sm rounded-full shadow hover:bg-white transition-colors"
                        >
                          <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>

                      <div className="p-4">
                        <span className="text-xs font-medium text-accent uppercase tracking-wide">
                          {item.product.category}
                        </span>
                        <h3 className="mt-1 font-semibold text-foreground leading-tight line-clamp-2">
                          {item.product.name}
                        </h3>
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                          {item.product.description}
                        </p>
                        <div className="mt-3 flex items-center justify-between">
                          <span className="text-lg font-bold text-foreground">
                            R{item.product.price.toFixed(2)}
                          </span>
                          <button
                            onClick={() => handleMoveToCart(item)}
                            disabled={removingId === item.id}
                            className="flex items-center gap-1.5 bg-accent text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:brightness-110 disabled:opacity-50"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            Move to Cart
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </motion.div>
              ))}
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white p-12 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">No favorites yet</h2>
            <p className="text-muted-foreground mb-6 max-w-sm">
              Browse our shop and tap the heart icon on any product to save it here for later.
            </p>
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 bg-accent text-white px-6 py-3 rounded-lg font-medium transition-all hover:brightness-110"
            >
              Browse Shop
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          </div>
        )}

        {!isUserLoaded && (
          <div className="rounded-xl border border-slate-200 bg-white p-12 mt-8 flex flex-col items-center justify-center text-center">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        )}
      </div>
    </>
  )
}
