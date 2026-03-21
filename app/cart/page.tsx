'use client'

import { useState } from 'react'
import { motion } from 'motion/react'
import { useCart } from '@/lib/CartContext'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import Link from 'next/link'

const OrderSummary = ({ totalPrice, taxEnabled, taxRate, shippingRate, freeShippingThreshold, onCheckout }: { totalPrice: number; taxEnabled: boolean; taxRate: number; shippingRate: number; freeShippingThreshold: number; onCheckout: () => void }) => {
  const [termsAccepted, setTermsAccepted] = useState(false)
  const shipping = totalPrice >= freeShippingThreshold ? 0 : shippingRate
  const tax = taxEnabled ? totalPrice * (taxRate / 100) : 0
  const grandTotal = totalPrice + shipping + tax

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className="bg-card rounded-xl p-6 card-shadow sticky top-24"
    >
      <h2 className="font-semibold text-xl text-foreground mb-6">
        Order Summary
      </h2>

      <div className="space-y-3 mb-6">
        <div className="flex justify-between text-muted-foreground">
          <span>Subtotal</span>
          <span>R{totalPrice.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Shipping</span>
          <span>{totalPrice >= freeShippingThreshold ? 'Free' : `R${shippingRate.toFixed(2)}`}</span>
        </div>
        {taxEnabled && (
          <div className="flex justify-between text-muted-foreground">
            <span>Tax ({taxRate}%)</span>
            <span>R{tax.toFixed(2)}</span>
          </div>
        )}
      </div>

      <div className="border-t border-border pt-4 mb-6">
        <div className="flex justify-between text-foreground">
          <span className="font-semibold text-lg">Total</span>
          <span className="font-bold text-xl">R{grandTotal.toFixed(2)}</span>
        </div>
      </div>

      <div className="mb-4">
        <label className="flex items-start gap-3 cursor-pointer group">
          <div className="relative flex items-center mt-1">
            <input
              type="checkbox"
              className="peer sr-only"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
            />
            <div className="w-5 h-5 border-2 border-muted-foreground/30 rounded-md peer-checked:bg-accent peer-checked:border-accent transition-all flex items-center justify-center">
              <svg className={`w-3.5 h-3.5 text-white ${termsAccepted ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <span className="text-sm text-muted-foreground flex-1 leading-snug">
            I agree to the <Link href="/terms-conditions" target="_blank" className="text-foreground font-medium hover:text-accent underline underline-offset-2">Terms & Conditions</Link>
          </span>
        </label>
      </div>

      <button
        onClick={onCheckout}
        disabled={!termsAccepted}
        className={`btn-accent w-full flex items-center justify-center gap-2 ${
          !termsAccepted ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        Proceed to Checkout
      </button>

      <p className="text-center text-muted-foreground text-xs mt-4">
        Free shipping on orders over R{freeShippingThreshold.toFixed(2)}
      </p>
    </motion.div>
  )
}

export default function CartPage() {
  const { items, totalPrice, clearCart, removeFromCart, updateQuantity } =
    useCart()
  const router = useRouter()
  const { user } = useUser()
  const storeSettings = useQuery(api.settings.get)
  const taxEnabled = storeSettings?.taxEnabled ?? false
  const taxRate = storeSettings?.taxRate ?? 0
  const shippingRate = storeSettings?.shippingRate ?? 250
  const freeShippingThreshold = storeSettings?.freeShippingThreshold ?? 750

  const handleCheckout = () => {
    if (!user) {
      router.push('/login')
      return
    }
    router.push('/checkout')
  }

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 md:py-24 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="w-20 h-20 mx-auto mb-6 rounded-full bg-secondary flex items-center justify-center"
        >
          <svg
            className="w-10 h-10 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
            />
          </svg>
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="text-2xl md:text-3xl font-bold text-foreground mb-4"
        >
          Your cart is empty
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="text-muted-foreground mb-8"
        >
          Looks like you haven&apos;t added any items to your cart yet.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-accent font-medium hover:gap-3 transition-all"
          >
            Start Shopping{' '}
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
                d="M14 5l7 7m0 0l-7 7m7-7H3"
              />
            </svg>
          </Link>
        </motion.div>
      </div>
    )
  }

  return (
    <>
      <div className="hero-gradient text-primary-foreground py-16 md:py-24">
        <div className="container mx-auto px-4">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="font-display text-4xl md:text-5xl lg:text-6xl tracking-wide mb-6"
          >
            YOUR <span className="text-accent">CART</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-lg md:text-xl text-primary-foreground/80 max-w-2xl"
          >
            {items.length} {items.length === 1 ? 'item' : 'items'} in your cart
          </motion.p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {items.map((item, index) => (
              <motion.div
                  key={item._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="bg-card rounded-xl p-4 md:p-6 card-shadow flex flex-col sm:flex-row gap-4"
              >
                <Link
                  href={`/product/${item._id}`}
                  className="w-full sm:w-32 h-32 bg-secondary rounded-lg overflow-hidden shrink-0"
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                </Link>

                <div className="flex-1 flex flex-col">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs text-accent font-medium uppercase tracking-wide">
                        {item.category}
                      </span>
                      <Link
                        href={`/product/${item._id}`}
                        className="block font-semibold text-foreground text-lg hover:text-accent transition-colors"
                      >
                        {item.name}
                      </Link>
                    </div>
                    <button
                      onClick={() => removeFromCart(item._id)}
                      className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                      aria-label="Remove item"
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
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>

                  <div className="mt-auto pt-4 flex items-center justify-between">
                    <div className="flex items-center border border-border rounded-lg">
                      <button
                        onClick={() =>
                          updateQuantity(item._id, item.quantity - 1)
                        }
                        className="p-2 hover:bg-secondary transition-colors"
                        aria-label="Decrease quantity"
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
                            d="M20 12H4"
                          />
                        </svg>
                      </button>
                      <span className="px-4 font-medium text-foreground">{item.quantity}</span>
                      <button
                        onClick={() =>
                          updateQuantity(item._id, item.quantity + 1)
                        }
                        className="p-2 hover:bg-secondary transition-colors"
                        aria-label="Increase quantity"
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
                            d="M12 4v16m8-8H4"
                          />
                        </svg>
                      </button>
                    </div>

                    <span className="text-lg font-bold text-foreground">
                      R{(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.5 }}
              onClick={clearCart}
              className="text-muted-foreground hover:text-destructive transition-colors text-sm"
            >
              Clear all items
            </motion.button>
          </div>

          <div className="lg:col-span-1">
            <OrderSummary totalPrice={totalPrice} taxEnabled={taxEnabled} taxRate={taxRate} shippingRate={shippingRate} freeShippingThreshold={freeShippingThreshold} onCheckout={handleCheckout} />
          </div>
        </div>
      </div>
    </>
  )
}
