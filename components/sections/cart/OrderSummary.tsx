'use client'

import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'

export default function OrderSummary({ totalPrice }: { totalPrice: number }) {
  const [termsAccepted, setTermsAccepted] = useState(false)
  const storeSettings = useQuery(api.settings.get)
const taxEnabled = storeSettings?.taxEnabled ?? false
const taxRate = storeSettings?.taxRate ?? 0
const shippingRateSetting = storeSettings?.shippingRate ?? 250

const shipping = shippingRateSetting
  const tax = taxEnabled ? totalPrice * (taxRate / 100) : 0
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
          <span>R{shippingRateSetting.toFixed(2)}</span>
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

      <Link
        href={termsAccepted ? "/checkout" : "#"}
        onClick={(e) => {
          if (!termsAccepted) e.preventDefault()
        }}
        className={`btn-accent w-full flex items-center justify-center gap-2 ${
          !termsAccepted ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        Proceed to Checkout <ArrowRight className="w-5 h-5" />
</Link>
</div>
  )
}
