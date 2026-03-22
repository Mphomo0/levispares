'use client'

import { useCart } from '@/lib/CartContext'
import { useFavorites } from '@/lib/FavoritesContext'
import { motion } from 'motion/react'
import { toast } from 'sonner'

interface Product {
  _id: string
  name: string
  description: string
  price: number
  category: string
  image: string
  specs?: { label: string; value: string }[]
}

interface ProductCardProps {
  product: any // Temporarily use any to avoid strict Convex types in shared component, or import Doc
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addToCart } = useCart()
  const { isFavorite, toggleFavorite } = useFavorites()
  const favorited = isFavorite(product._id)

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    toggleFavorite(product)
    toast.success(
      favorited ? 'Removed from favorites' : 'Added to favorites',
      { description: favorited ? `${product.name} removed` : `${product.name} saved` }
    )
  }

  return (
    <div className="product-card group block bg-white rounded-xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-lg transition-shadow">
      <div className="relative aspect-4/3 overflow-hidden bg-slate-100">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />

        <button
          onClick={handleToggleFavorite}
          className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-md hover:bg-white hover:scale-110 transition-all"
          aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
        >
          <svg
            className={`w-5 h-5 transition-colors ${
              favorited ? 'text-red-500 fill-red-500' : 'text-slate-400 hover:text-red-400'
            }`}
            fill={favorited ? 'currentColor' : 'none'}
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
        </button>
      </div>

      <div className="p-4 md:p-5">
        <span className="text-xs font-medium text-accent uppercase tracking-wide">
          {product.category}
        </span>

        <h3 className="mt-1 font-semibold text-foreground text-lg leading-tight group-hover:text-accent transition-colors">
          {product.name}
        </h3>

        <p className="mt-2 text-muted-foreground text-sm line-clamp-2">
          {product.description}
        </p>

        <div className="mt-4 flex items-center justify-between">
          <span className="text-xl font-bold text-foreground">
            R{product.price.toFixed(2)}
          </span>

          <button
            onClick={() => addToCart(product)}
            className="flex items-center gap-2 bg-accent text-white px-4 py-2 rounded-lg font-medium text-sm transition-all hover:brightness-110 hover:scale-105 active:scale-95"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            Add To Cart
          </button>
        </div>
      </div>
    </div>
  )
}
