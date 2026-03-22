'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion } from 'motion/react'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import Link from 'next/link'
import { Suspense } from 'react'

function SuccessContent() {
  const searchParams = useSearchParams()
  const orderId = searchParams.get('orderId')
  const order = useQuery(
    api.orders.getById,
    orderId ? { id: orderId as Id<'orders'> } : 'skip'
  )

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  if (!orderId) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-foreground mb-4">No order found</h1>
        <Link href="/shop" className="text-accent hover:underline">
          Continue Shopping
        </Link>
      </div>
    )
  }

  return (
    <>
      {/* Header */}
      <div className="hero-gradient text-primary-foreground py-16 md:py-20">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
            className="w-20 h-20 mx-auto mb-6 rounded-full bg-accent/20 flex items-center justify-center"
          >
            <svg className="w-10 h-10 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="font-display text-3xl md:text-4xl lg:text-5xl tracking-wide mb-4"
          >
            ORDER <span className="text-accent">CONFIRMED</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-lg text-primary-foreground/80"
          >
            Thank you for your purchase!
          </motion.p>
        </div>
      </div>

      {/* Details */}
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="bg-card rounded-xl p-6 card-shadow mb-6"
        >
          <div className="text-center mb-6">
            <p className="text-sm text-muted-foreground mb-1">Order ID</p>
            <p className="font-mono text-sm text-foreground bg-secondary px-4 py-2 rounded-lg inline-block">
              {orderId}
            </p>
          </div>

          {order === undefined ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          ) : order ? (
            <>
              {/* Items */}
              <div className="border-t border-border pt-4 mb-4">
                <h3 className="font-semibold text-foreground mb-3">Items Ordered</h3>
                <div className="space-y-3">
                  {order.items.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-foreground">
                        {item.name} <span className="text-muted-foreground">× {item.quantity}</span>
                      </span>
                      <span className="font-medium text-foreground">
                        R{(item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="border-t border-border pt-4 mb-4 space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Shipping</span>
                  <span>{order.shipping === 0 ? 'Free' : `R${order.shipping.toFixed(2)}`}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Tax</span>
                  <span>R{order.tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-foreground font-bold text-lg pt-2 border-t border-border">
                  <span>Total Paid</span>
                  <span>R{order.total.toFixed(2)}</span>
                </div>
              </div>

              {/* Shipping Address */}
              {order.shippingAddress && (
                <div className="border-t border-border pt-4 mb-4">
                  <h3 className="font-semibold text-foreground mb-2">Shipping To</h3>
                  <p className="text-sm text-foreground">{order.shippingAddress.name}</p>
                  <p className="text-sm text-muted-foreground">{order.shippingAddress.street}</p>
                  <p className="text-sm text-muted-foreground">
                    {order.shippingAddress.city}, {order.shippingAddress.province} {order.shippingAddress.postalCode}
                  </p>
                  <p className="text-sm text-muted-foreground">{order.shippingAddress.phone}</p>
                </div>
              )}

              {/* Status */}
              <div className="border-t border-border pt-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <span className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-xs px-2.5 py-0.5 rounded-full font-medium capitalize">
                    {order.status}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <p className="text-center text-muted-foreground">Order details not found.</p>
          )}
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
          className="flex flex-col sm:flex-row gap-4"
        >
          <Link href="/account/orders" className="btn-accent text-center flex-1">
            View My Orders
          </Link>
          <Link
            href="/shop"
            className="px-6 py-3 rounded-lg border border-border text-foreground hover:bg-secondary transition-colors text-center flex-1"
          >
            Continue Shopping
          </Link>
        </motion.div>
      </div>
    </>
  )
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  )
}
