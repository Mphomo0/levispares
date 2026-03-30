'use client'

import Link from 'next/link'
import { useCart } from '@/lib/CartContext'
import { useFavorites } from '@/lib/FavoritesContext'
import { motion } from 'motion/react'
import { toast } from 'sonner'

interface Product {
  _id: string
  name: string
  description: string
  price: number
  originalPrice?: number
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
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className="product-card group relative bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300"
    >
      <Link href={`/products/${product._id}`} className="block">
        <div className="relative aspect-square overflow-hidden bg-slate-50 p-6 flex items-center justify-center">
          <img
            src={product.image || 'https://placehold.co/400x400?text=No+Image'}
            alt={product.name}
            className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-110"
          />
          
          <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/5 transition-colors duration-300" />
        </div>
      </Link>

      <button
        onClick={handleToggleFavorite}
        className="absolute top-4 right-4 p-2.5 bg-white/90 backdrop-blur-md rounded-xl shadow-lg hover:bg-white hover:scale-110 transition-all z-10"
        aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
      >
        <svg
          className={`w-5 h-5 transition-all ${
            favorited ? 'text-red-500 fill-red-500 scale-110' : 'text-slate-400 hover:text-red-400'
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

      <div className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-accent uppercase tracking-widest bg-accent/5 px-2 py-1 rounded-md">
            {product.category}
          </span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {product.sku?.split('-')[0]}
          </span>
        </div>

        <Link href={`/products/${product._id}`} className="block group/title">
          <h3 className="font-display font-bold text-slate-900 text-lg leading-tight line-clamp-2 group-hover/title:text-accent transition-colors">
            {product.name}
          </h3>
        </Link>

        <p className="text-slate-500 text-xs line-clamp-2 font-medium">
          {product.description || 'Premium quality replacement part for optimal vehicle performance.'}
        </p>

        <div className="pt-2 flex items-center justify-between">
          <div className="flex flex-col">
            {product.originalPrice && product.originalPrice > product.price && (
              <span className="text-xs text-brand line-through font-medium leading-none mb-1">
                R{product.originalPrice.toFixed(2)}
              </span>
            )}
            <span className="text-xl font-display font-bold text-slate-900">
              R{product.price.toFixed(2)}
            </span>
          </div>

          <button
            onClick={(e) => {
              e.preventDefault();
              addToCart(product);
              toast.success('Added to cart', { description: product.name });
            }}
            className="p-3 bg-accent text-white rounded-xl shadow-lg shadow-accent/20 hover:brightness-110 hover:scale-110 active:scale-95 transition-all"
          >
            <svg
              className="w-5 h-5"
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
          </button>
        </div>
      </div>
    </motion.div>
  )
}
