'use client'

import { useState } from 'react'
import Script from 'next/script'
import { m } from 'framer-motion'
import { toast } from 'sonner'
import { formatPrice } from '@/lib/format'

interface OzowSdk {
  createPaymentModal: (paymentUrl: string, postData: Record<string, string>) => void
  cancelFramePayment: () => void
}
declare global {
  interface Window {
    Ozow?: new () => OzowSdk
  }
}

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
  // jQuery has to be loaded before the Ozow SDK, which needs it.
  const [jqueryReady, setJqueryReady] = useState(false)
  const [sdkReady, setSdkReady] = useState(false)
  const [sdk, setSdk] = useState<OzowSdk | null>(null)

  // Asks our server to sign the payment, then opens Ozow's payment page in a modal.
  // The modal reports nothing we trust: the order is confirmed by Ozow's notification.
  const pay = async () => {
    if (!window.Ozow) {
      toast.error('The payment window is still loading. Please try again in a moment.')
      return
    }
    setBusy(true)
    try {
      const response = await fetch('/api/ozow/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ convexOrderId, guestToken }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not start the payment')
      const ozow = sdk ?? new window.Ozow()
      setSdk(ozow)
      ozow.createPaymentModal(data.paymentUrl, data.postData)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not start the payment')
    } finally {
      setBusy(false)
    }
  }

  const cancel = () => {
    sdk?.cancelFramePayment()
    onBack()
  }

  return (
    <m.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
    >
      <Script src="https://code.jquery.com/jquery-3.6.0.min.js" strategy="afterInteractive" onReady={() => setJqueryReady(true)} />
      {jqueryReady && (
        <Script
          src="https://static-content.ozow.com/scripts/js/v2/ozow-integration-2.0.min.js"
          strategy="afterInteractive"
          onReady={() => setSdkReady(true)}
        />
      )}

      <h2 className="text-2xl font-bold text-foreground mb-2">Payment</h2>
      <p className="text-muted-foreground mb-6">
        Pay securely by instant EFT from your own bank, through Ozow.
      </p>

      <div className="bg-card rounded-xl p-6 card-shadow mb-6">
        <div className="mb-5 rounded-lg bg-secondary/60 p-4 text-sm text-foreground">
          <p className="font-semibold">You will pay {formatPrice(total)}</p>
          <p className="text-muted-foreground mt-1">
            A secure Ozow window opens over this page where you choose your bank and approve the
            payment. Your order is confirmed once your bank approves it.
          </p>
        </div>

        <button
          onClick={pay}
          disabled={busy || !sdkReady}
          className="w-full bg-accent text-white px-6 py-3.5 rounded-lg font-semibold transition hover:brightness-110 disabled:opacity-60"
        >
          {busy ? 'Opening Ozow…' : `Pay ${formatPrice(total)} with Ozow`}
        </button>
      </div>

      <button
        onClick={cancel}
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
