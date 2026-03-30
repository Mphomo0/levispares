'use client'

import React, { useState } from 'react'
import { useParams } from 'next/navigation'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { useCart } from '@/lib/CartContext'
import { useFavorites } from '@/lib/FavoritesContext'
import { useUser, SignInButton } from '@clerk/nextjs'
import { motion, AnimatePresence } from 'motion/react'
import { 
  ShoppingBag, 
  Heart, 
  ChevronRight, 
  Star, 
  ShieldCheck, 
  Truck, 
  RotateCcw,
  Minus,
  Plus,
  Share2,
  Check,
  MessageSquare,
  AlertCircle,
  User
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import ProductCard from '@/components/sections/products/ProductCard'

export default function ProductPage() {
  const params = useParams()
  const productId = params.id as Id<'products'>
  const { user } = useUser()
  
  // Data Fetching
  const product = useQuery(api.products.getWithFullHierarchy, { id: productId })
  const reviewStats = useQuery(api.reviews.getStats, { productId })
  const reviews = useQuery(api.reviews.listByProduct, { productId })
  
  // Mutations
  const addReview = useMutation(api.reviews.add)
  
  // UI State
  const { addToCart } = useCart()
  const { isFavorite, toggleFavorite } = useFavorites()
  const [quantity, setQuantity] = useState(1)
  const [activeTab, setActiveTab] = useState<'description' | 'specs' | 'reviews'>('description')
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  
  // Review Form State
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewTitle, setReviewTitle] = useState('')
  const [reviewComment, setReviewComment] = useState('')

  if (product === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 font-medium font-display animate-pulse">Loading spare part details...</p>
        </div>
      </div>
    )
  }

  if (product === null) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4">
        <h1 className="text-4xl font-display font-bold text-slate-800 mb-4">Product Not Found</h1>
        <p className="text-slate-500 mb-8 text-center max-w-md">We couldn't find the part you're looking for. It might have been removed or the link is incorrect.</p>
        <Link href="/shop" className="bg-accent text-white px-8 py-3 rounded-lg font-bold hover:brightness-110 transition-all shadow-lg shadow-accent/20">
          Back to Shop
        </Link>
      </div>
    )
  }

  const mainImage = selectedImage || product.image || 'https://placehold.co/600x600?text=No+Image'
  const isFavorited = isFavorite(product._id)

  const handleAddToCart = () => {
    for (let i = 0; i < quantity; i++) {
      addToCart({
        _id: product._id,
        name: product.name,
        price: product.price,
        image: product.image || '',
        category: (product.category as any)?.name || 'General',
        description: product.description || '',
        specs: product.specs
      })
    }
    toast.success(`Added ${quantity} ${quantity === 1 ? 'item' : 'items'} to cart`, {
      description: `${product.name} is ready for checkout.`,
      icon: <ShoppingBag className="w-5 h-5 text-accent" />
    })
  }

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setIsSubmitting(true)

    try {
      await addReview({
        productId,
        rating: reviewRating,
        title: reviewTitle,
        comment: reviewComment
      })
      toast.success('Review submitted!', { description: 'Thank you for your feedback.' })
      setReviewTitle('')
      setReviewComment('')
      setReviewRating(5)
    } catch (err: any) {
      toast.error('Failed to submit review', { description: err.message })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Breadcrumbs */}
      <div className="bg-white border-b border-slate-200">
        <div className="container mx-auto px-4 py-4 flex items-center gap-2 text-sm text-slate-500 overflow-x-auto whitespace-nowrap scrollbar-hide">
          <Link href="/" className="hover:text-accent transition-colors">Home</Link>
          <ChevronRight className="w-4 h-4 flex-shrink-0" />
          <Link href="/shop" className="hover:text-accent transition-colors">Shop</Link>
          <ChevronRight className="w-4 h-4 flex-shrink-0" />
          <span className="text-slate-400 capitalize">{(product.category as any)?.name}</span>
          <ChevronRight className="w-4 h-4 flex-shrink-0" />
          <span className="text-slate-900 font-semibold truncate">{product.name}</span>
        </div>
      </div>

      <div className="container mx-auto px-4 mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          
          {/* Left Column: Image Gallery */}
          <div className="lg:col-span-7 space-y-4">
            <motion.div 
              layoutId="product-image"
              className="relative aspect-square bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-200 group"
            >
              <img 
                src={mainImage} 
                alt={product.name}
                className="w-full h-full object-contain p-8 transition-transform duration-700 group-hover:scale-110"
              />
              <button 
                onClick={() => toggleFavorite(product as any)}
                className="absolute top-6 right-6 p-4 bg-white/90 backdrop-blur-md rounded-2xl shadow-xl hover:bg-white transition-all transform group-hover:translate-x-0"
              >
                <Heart className={`w-6 h-6 transition-all ${isFavorited ? 'fill-red-500 text-red-500 scale-125' : 'text-slate-400'}`} />
              </button>
              
              <div className="absolute bottom-6 left-6">
                <span className="bg-slate-900/10 backdrop-blur-md text-slate-900 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border border-white/20">
                  Quality Part
                </span>
              </div>
            </motion.div>

            {/* Thumbnails */}
            {product.images && product.images.length > 0 && (
              <div className="flex gap-4 overflow-x-auto py-2 scrollbar-hide">
                {[product.image, ...product.images.map(img => img.url)].filter(Boolean).map((url, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(url!)}
                    className={`relative w-24 h-24 flex-shrink-0 rounded-2xl overflow-hidden border-2 transition-all ${
                      mainImage === url ? 'border-accent shadow-lg scale-105' : 'border-transparent hover:border-slate-300'
                    } bg-white shadow-sm`}
                  >
                    <img src={url!} alt={`${product.name} ${idx}`} className="w-full h-full object-cover p-2" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Product Details */}
          <div className="lg:col-span-5 space-y-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-accent/10 text-accent text-xs font-bold rounded-full uppercase tracking-widest">
                  {(product.brand as any)?.name}
                </span>
                <span className="px-3 py-1 bg-slate-100 text-slate-500 text-xs font-bold rounded-full uppercase tracking-widest">
                  {(product.model as any)?.name}
                </span>
              </div>
              
              <h1 className="text-3xl md:text-4xl font-display font-bold text-slate-900 leading-tight">
                {product.name}
              </h1>

              <div className="flex items-center gap-6">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`w-4 h-4 ${(reviewStats?.average || 0) > i ? 'fill-yellow-400 text-yellow-400' : 'text-slate-300 fill-slate-300'}`} />
                  ))}
                  <span className="ml-2 text-sm text-slate-500 font-medium">({reviewStats?.average.toFixed(1) || '0.0'} / 5.0)</span>
                </div>
                <div className="h-4 w-px bg-slate-300" />
                <span className="text-sm text-slate-500 font-medium">SKU: <span className="text-slate-900 font-bold">{product.sku}</span></span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-display font-bold text-slate-900">R{product.price.toFixed(2)}</span>
                {product.originalPrice && product.originalPrice > product.price && (
                  <>
                    <span className="text-lg text-slate-400 line-through">R{product.originalPrice.toFixed(2)}</span>
                    <span className="text-sm font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg">
                      Save {Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}%
                    </span>
                  </>
                )}
              </div>
              <p className="text-sm text-slate-500">VAT inclusive</p>
            </div>

            <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-6">
              {/* Availability */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${(product.stockQty ?? 0) > 0 ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                  <span className="text-sm font-semibold text-slate-700">
                    {(product.stockQty ?? 0) > 0 ? `In Stock (${product.stockQty} available)` : 'Out of Stock'}
                  </span>
                </div>
                <Truck className="w-5 h-5 text-slate-400" />
              </div>

              {/* Quantity */}
              <div className="flex items-center justify-between py-4 border-y border-slate-100">
                <span className="text-sm font-bold text-slate-900 uppercase tracking-wider">Quantity</span>
                <div className="flex items-center bg-slate-100 rounded-2xl p-1 shadow-inner">
                  <button 
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    className="p-2 hover:bg-white rounded-xl transition-all disabled:opacity-30"
                    disabled={quantity <= 1}
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-12 text-center font-bold text-slate-900">{quantity}</span>
                  <button 
                    onClick={() => setQuantity(q => Math.min(product.stockQty || 99, q + 1))}
                    className="p-2 hover:bg-white rounded-xl transition-all disabled:opacity-30"
                    disabled={quantity >= (product.stockQty || 99)}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-1 gap-4">
                <button 
                  onClick={handleAddToCart}
                  className="w-full bg-accent text-white py-5 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all hover:scale-[1.02] hover:brightness-110 active:scale-95 shadow-xl shadow-accent/30"
                >
                  <ShoppingBag className="w-6 h-6" />
                  Add to Cart
                </button>
                
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => toggleFavorite(product as any)}
                    className={`flex items-center justify-center gap-2 py-4 rounded-2xl font-bold transition-all border-2 ${
                      isFavorited 
                      ? 'border-red-500 bg-red-50 text-red-500' 
                      : 'border-slate-200 bg-white text-slate-700 hover:border-accent hover:text-accent'
                    }`}
                  >
                    <Heart className={`w-5 h-5 ${isFavorited ? 'fill-red-500' : ''}`} />
                    {isFavorited ? 'Saved' : 'Save'}
                  </button>
                  <button className="flex items-center justify-center gap-2 py-4 rounded-2xl font-bold border-2 border-slate-200 bg-white text-slate-700 hover:border-accent hover:text-accent transition-all">
                    <Share2 className="w-5 h-5" />
                    Share
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Benefits */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-slate-100">
                <ShieldCheck className="w-5 h-5 text-accent" />
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wide leading-tight">Authentic OEM Quality</span>
              </div>
              <div className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-slate-100">
                <Truck className="w-5 h-5 text-accent" />
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wide leading-tight">Express Nationwide Delivery</span>
              </div>
              <div className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-slate-100">
                <RotateCcw className="w-5 h-5 text-accent" />
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wide leading-tight">Easy 7-Day Returns</span>
              </div>
              <div className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-slate-100">
                <Check className="w-5 h-5 text-accent" />
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wide leading-tight">Verified Fitment</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Section */}
        <div className="mt-20">
          <div className="flex border-b border-slate-200 overflow-x-auto scrollbar-hide">
            {(['description', 'specs', 'reviews'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-8 py-5 font-display text-sm font-bold uppercase tracking-widest transition-all relative ${
                  activeTab === tab ? 'text-accent' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {tab}
                {activeTab === tab && (
                  <motion.div 
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-1 bg-accent rounded-t-full"
                  />
                )}
              </button>
            ))}
          </div>

          <div className="mt-10 min-h-[300px]">
            <AnimatePresence mode="wait">
              {activeTab === 'description' && (
                <motion.div
                  key="description"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="max-w-4xl space-y-6"
                >
                  <p className="text-slate-600 leading-relaxed text-lg">
                    {product.description || "This premium spare part is designed for precision fitment and long-lasting durability. Every Levi's Spare component undergoes rigorous quality control to ensure it meets or exceeds original manufacturer standards."}
                  </p>
                  <div className="p-8 bg-slate-900 rounded-[2rem] text-white">
                    <h4 className="text-xl font-display font-bold mb-4">Why Choose This Part?</h4>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        "Precision engineering for perfect fit",
                        "High-grade materials for durability",
                        "Stress-tested under extreme conditions",
                        "Corrosion resistant coating",
                        "Reduces wear on connected components",
                        "Maintains vehicle resale value"
                      ].map((item, i) => (
                        <li key={i} className="flex items-center gap-3 text-slate-300">
                          <Check className="w-4 h-4 text-accent" />
                          <span className="text-sm">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              )}

              {activeTab === 'specs' && (
                <motion.div
                  key="specs"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="max-w-3xl"
                >
                  <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                      <tbody className="divide-y divide-slate-100">
                        <tr className="bg-slate-50/50">
                          <th className="px-6 py-4 text-sm font-bold text-slate-500 uppercase tracking-wider">Property</th>
                          <th className="px-6 py-4 text-sm font-bold text-slate-900">Value</th>
                        </tr>
                        <tr>
                          <td className="px-6 py-4 text-sm text-slate-500 font-medium">Part Number</td>
                          <td className="px-6 py-4 text-sm text-slate-900 font-bold">{product.partNumber || product.sku}</td>
                        </tr>
                        <tr>
                          <td className="px-6 py-4 text-sm text-slate-500 font-medium">Brand</td>
                          <td className="px-6 py-4 text-sm text-slate-900 font-bold">{(product.brand as any)?.name}</td>
                        </tr>
                        <tr>
                          <td className="px-6 py-4 text-sm text-slate-500 font-medium">Vehicle Model</td>
                          <td className="px-6 py-4 text-sm text-slate-900 font-bold">{(product.model as any)?.name}</td>
                        </tr>
                        <tr>
                          <td className="px-6 py-4 text-sm text-slate-500 font-medium">Category</td>
                          <td className="px-6 py-4 text-sm text-slate-900 font-bold capitalize">{(product.category as any)?.name}</td>
                        </tr>
                        {product.specs?.map((spec, i) => (
                          <tr key={i}>
                            <td className="px-6 py-4 text-sm text-slate-500 font-medium">{spec.label}</td>
                            <td className="px-6 py-4 text-sm text-slate-900 font-bold">{spec.value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}

              {activeTab === 'reviews' && (
                <motion.div
                  key="reviews"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-12"
                >
                  {/* Reviews Stats Header */}
                  <div className="flex flex-col md:flex-row gap-12 items-start">
                    <div className="p-8 bg-white rounded-3xl border border-slate-200 text-center space-y-2 min-w-[240px] shadow-sm">
                      <div className="text-6xl font-display font-bold text-slate-900">
                        {reviewStats?.average.toFixed(1) || '0.0'}
                      </div>
                      <div className="flex justify-center text-yellow-400">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`w-6 h-6 ${(reviewStats?.average || 0) > i ? 'fill-current' : 'text-slate-200'}`} />
                        ))}
                      </div>
                      <div className="text-sm text-slate-500 font-bold uppercase tracking-wider">
                        {reviewStats?.total || 0} Review{reviewStats?.total !== 1 ? 's' : ''}
                      </div>
                    </div>
                    
                    <div className="flex-1 w-full space-y-4 pt-4">
                      {[5, 4, 3, 2, 1].map((stars) => {
                        const count = (reviewStats?.distribution as any)?.[stars] || 0;
                        const percentage = reviewStats?.total ? (count / reviewStats.total) * 100 : 0;
                        return (
                          <div key={stars} className="flex items-center gap-4">
                            <span className="text-xs font-bold text-slate-500 w-8">{stars} STAR</span>
                            <div className="h-3 flex-1 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${percentage}%` }}
                                transition={{ duration: 1, ease: 'easeOut' }}
                                className="h-full bg-accent" 
                              />
                            </div>
                            <span className="text-xs font-bold text-slate-500 w-8 text-right">{count}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    {/* Review List */}
                    <div className="space-y-8">
                      <h4 className="text-2xl font-display font-bold flex items-center gap-3 text-slate-900">
                        <MessageSquare className="w-6 h-6 text-accent" />
                        Customer Feedback
                      </h4>
                      
                      <div className="space-y-6">
                        {reviews && reviews.length > 0 ? (
                          reviews.map((r) => (
                            <motion.div 
                              key={r._id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4"
                            >
                              <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                                    <User className="w-5 h-5 text-slate-400" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-bold text-slate-900">{(r.user as any)?.name || 'Verified Mechanic'}</p>
                                    <p className="text-xs text-slate-400">
                                      {new Date(r._creationTime).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex text-yellow-400">
                                  {[...Array(5)].map((_, i) => (
                                    <Star key={i} className={`w-3.5 h-3.5 ${i < r.rating ? 'fill-current' : 'text-slate-200'}`} />
                                  ))}
                                </div>
                              </div>
                              {r.title && <h5 className="font-bold text-slate-800">{r.title}</h5>}
                              <p className="text-slate-600 text-sm leading-relaxed">{r.comment}</p>
                              {r.verifiedPurchase && (
                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-green-600 bg-green-50 w-fit px-2 py-1 rounded-md uppercase tracking-wider">
                                  <Check className="w-3 h-3" />
                                  Verified Fitment
                                </div>
                              )}
                            </motion.div>
                          ))
                        ) : (
                          <div className="text-center py-20 bg-slate-100/50 rounded-[2rem] border-2 border-dashed border-slate-200">
                            <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                            <p className="text-slate-400 font-medium">No reviews yet for this part.</p>
                            <p className="text-xs text-slate-400 mt-1">Be the first to share your experience!</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Review Form Area */}
                    <div className="space-y-8">
                      <h4 className="text-2xl font-display font-bold text-slate-900">Leave a Review</h4>
                      
                      {user ? (
                        <form onSubmit={handleReviewSubmit} className="p-8 bg-white rounded-[2rem] border border-slate-200 shadow-lg space-y-6">
                          <div className="space-y-4">
                            <label className="text-sm font-bold text-slate-500 uppercase tracking-widest block text-center">Quality Rating</label>
                            <div className="flex justify-center gap-3">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  key={star}
                                  type="button"
                                  onClick={() => setReviewRating(star)}
                                  className="transition-all hover:scale-125 focus:scale-110"
                                >
                                  <Star className={`w-10 h-10 ${reviewRating >= star ? 'fill-yellow-400 text-yellow-400' : 'text-slate-200'}`} />
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-2 mb-1 block">Subject</label>
                              <input 
                                type="text" 
                                value={reviewTitle}
                                onChange={(e) => setReviewTitle(e.target.value)}
                                placeholder="Speedy delivery, perfect fit, etc."
                                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm focus:bg-white focus:border-accent outline-none transition-all placeholder:text-slate-300"
                                required
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-2 mb-1 block">Your Thoughts</label>
                              <textarea 
                                value={reviewComment}
                                onChange={(e) => setReviewComment(e.target.value)}
                                placeholder="Tell us about the part quality, installation process, or vehicle performance Improvements..."
                                rows={4}
                                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm focus:bg-white focus:border-accent outline-none transition-all placeholder:text-slate-300 resize-none"
                                required
                              />
                            </div>
                          </div>

                          <button 
                            type="submit" 
                            disabled={isSubmitting}
                            className="w-full bg-slate-900 text-white py-5 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all hover:bg-black active:scale-[0.98] disabled:opacity-50"
                          >
                            {isSubmitting ? (
                              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                            ) : (
                              'Publish My Review'
                            )}
                          </button>
                        </form>
                      ) : (
                        <div className="p-10 bg-slate-900 rounded-[2.5rem] text-center space-y-6 shadow-2xl">
                          <div className="w-16 h-16 bg-white/10 rounded-3xl flex items-center justify-center mx-auto">
                            <AlertCircle className="w-8 h-8 text-white" />
                          </div>
                          <div className="space-y-2">
                            <h5 className="text-xl font-display font-bold text-white">Share Your Expertise</h5>
                            <p className="text-slate-400 text-sm max-w-xs mx-auto">Must be a verified user to review spare parts. Log in to help other mechanics and owners.</p>
                          </div>
                          <SignInButton mode="modal">
                            <button className="w-full bg-white text-slate-900 py-4 rounded-2xl font-bold hover:bg-slate-100 transition-all flex items-center justify-center gap-2">
                              Sign In to Review
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </SignInButton>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Related Products Section */}
        {product.relatedProducts && product.relatedProducts.length > 0 && (
          <div className="mt-32 space-y-8">
            <div className="flex items-end justify-between">
              <div>
                <h2 className="text-3xl font-display font-bold text-slate-900 uppercase tracking-tight">YOU MAY ALSO LIKE</h2>
                <div className="h-1.5 w-20 bg-accent mt-2 rounded-full" />
              </div>
              <Link href="/shop" className="text-accent font-bold hover:underline mb-2">View All Products</Link>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {product.relatedProducts.map((p) => (
                <ProductCard key={p._id} product={p as any} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
