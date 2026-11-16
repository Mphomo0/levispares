'use client'

import { useState } from 'react'
import { m } from 'framer-motion'
import { toast } from 'sonner'
import { formatPrice } from '@/lib/format'

interface PaymentStepProps {
  convexOrderId: string
  /** Set for guest checkouts: proves the order is theirs to the payment route. */
  guestToken?: string
  /** Order total in rand. */
  total: number
  onBack: () => void
}

export default function PaymentStep({ convexOrderId, guestToken, total, onBack }: PaymentStepProps) {
  const [busy, setBusy] = useState(false)

  // Asks our server to create the payment, then sends the customer to the
  // page Ozow gives us. The order is confirmed by Ozow's notification, not
  // by the customer coming back.
  const pay = async () => {
    setBusy(true)
    try {
      const response = await fetch('/api/ozow/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ convexOrderId, guestToken }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not start the payment')
      window.location.assign(data.redirectUrl)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not start the payment')
      setBusy(false)
    }
  }

  return (
    <m.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
    >
      <h2 className="text-2xl font-bold text-foreground mb-2">Payment</h2>
      <p className="text-muted-foreground mb-6">
        Pay securely by instant EFT from your own bank, through Ozow.
      </p>

      <div className="bg-card rounded-xl p-6 card-shadow mb-6">
        <div className="mb-5 rounded-lg bg-secondary/60 p-4 text-sm text-foreground">
          <p className="font-semibold">You will pay {formatPrice(total)}</p>
          <p className="text-muted-foreground mt-1">
            You&apos;ll be taken to Ozow to choose your bank and approve the payment, then
            brought back here. Your order is confirmed once your bank approves it.
          </p>
        </div>

        <button
          onClick={pay}
          disabled={busy}
          className="w-full bg-accent text-white px-6 py-3.5 rounded-lg font-semibold transition hover:brightness-110 disabled:opacity-60"
        >
          {busy ? 'Taking you to Ozow…' : `Pay ${formatPrice(total)} with Ozow`}
        </button>
      </div>

      <button
        onClick={onBack}
        disabled={busy}
        className="px-6 py-3 rounded-lg border border-border text-foreground hover:bg-secondary transition-colors flex items-center gap-2 w-full md:w-auto disabled:opacity-60"
      >
        <svg aria-hidden="true" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Review
      </button>
    </m.div>
  )
}
