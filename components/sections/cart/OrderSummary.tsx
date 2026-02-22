'use client'

import { ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function OrderSummary({ totalPrice }: { totalPrice: number }) {
  const shipping = totalPrice >= 750 ? 0 : 250
  const tax = totalPrice * 0.15
  const grandTotal = totalPrice + shipping + tax

  return (
    <div className="bg-card rounded-xl p-6 card-shadow sticky top-24">
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
          <span>{totalPrice >= 750 ? 'Free' : 'R250.00'}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Tax (15%)</span>
          <span>R{tax.toFixed(2)}</span>
        </div>
      </div>

      <div className="border-t border-border pt-4 mb-6">
        <div className="flex justify-between text-foreground">
          <span className="font-semibold text-lg">Total</span>
          <span className="font-bold text-xl">R{grandTotal.toFixed(2)}</span>
        </div>
      </div>

      <Link
        href="/checkout"
        className="btn-accent w-full flex items-center justify-center gap-2"
      >
        Proceed to Checkout <ArrowRight className="w-5 h-5" />
      </Link>

      <p className="text-center text-muted-foreground text-xs mt-4">
        Free shipping on orders over R750
      </p>
    </div>
  )
}
