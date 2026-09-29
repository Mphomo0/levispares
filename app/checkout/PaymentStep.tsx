'use client'

import { motion } from 'motion/react'
import { toast } from 'sonner'
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js'
import type { PaymentInfo } from './page'

const PAYPAL_CURRENCY = process.env.NEXT_PUBLIC_PAYPAL_CURRENCY || 'USD'

interface PaymentStepProps {
  convexOrderId: string
  payment: PaymentInfo | null
  onSuccess: () => void
  onBack: () => void
}

export default function PaymentStep({ convexOrderId, payment, onSuccess, onBack }: PaymentStepProps) {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!
  const currency = PAYPAL_CURRENCY

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
    >
      <h2 className="text-2xl font-bold text-foreground mb-2">Payment</h2>
      <p className="text-muted-foreground mb-6">
        Complete your payment securely with PayPal.
      </p>

      <div className="bg-card rounded-xl p-6 card-shadow mb-6">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
          <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none">
            <path d="M7.076 21.337H2.47a.641.641 0 01-.633-.74L4.944 2.78a.77.77 0 01.757-.644h5.554c2.098 0 3.632.496 4.559 1.475.434.458.718.96.863 1.533.152.6.187 1.315.103 2.126l-.013.097v.695l.542.306c.46.238.828.51 1.11.82.47.517.775 1.17.907 1.938.136.786.102 1.72-.098 2.774-.231 1.21-.607 2.264-1.117 3.133a6.45 6.45 0 01-1.81 2.025 6.06 6.06 0 01-2.355.996c-.844.189-1.785.283-2.797.283H10.3a.96.96 0 00-.948.82l-.043.243-.728 4.612-.033.174a.96.96 0 01-.949.82H7.076z" fill="#253B80"/>
            <path d="M19.252 7.912c-.015.097-.032.195-.052.296-.685 3.517-3.03 4.733-6.024 4.733H11.66a.741.741 0 00-.732.626l-.777 4.93-.22 1.396a.39.39 0 00.386.453h2.711a.65.65 0 00.642-.548l.027-.138.508-3.225.032-.178a.65.65 0 01.643-.548h.405c2.623 0 4.674-1.066 5.274-4.148.252-1.287.121-2.362-.543-3.118a2.596 2.596 0 00-.744-.548" fill="#179BD7"/>
            <path d="M18.375 7.548a5.472 5.472 0 00-.678-.15 8.655 8.655 0 00-1.374-.1h-4.17a.648.648 0 00-.642.548l-.887 5.626-.025.166a.741.741 0 01.732-.626h1.523c2.995 0 5.34-1.216 6.025-4.733.02-.104.037-.205.052-.303a3.603 3.603 0 00-.556-.239v-.189z" fill="#222D65"/>
          </svg>
          <div>
            <p className="font-semibold text-foreground">PayPal Checkout</p>
            <p className="text-sm text-muted-foreground">You&apos;ll be redirected to PayPal to complete payment</p>
          </div>
        </div>

        {payment && !payment.amounts ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Online payment is temporarily unavailable. Please call us on 012 770 3389
            or email info@levispares.co.za to complete your order.
          </div>
        ) : (
          <>
            {payment?.amounts && currency !== 'ZAR' && (
              <div className="mb-5 rounded-lg bg-secondary/60 p-4 text-sm text-foreground">
                <p className="font-semibold">
                  You will be charged {currency === 'USD' ? 'US$' : `${currency} `}
                  {payment.amounts.total.toFixed(2)}
                </p>
                <p className="text-muted-foreground mt-1">
                  PayPal charges in {currency === 'USD' ? 'US dollars' : currency}. Your order total of
                  R{payment.total.toFixed(2)} is converted at R{payment.rate?.toFixed(2)} = 1 {currency}.
                </p>
              </div>
            )}
        <PayPalScriptProvider
          options={{
            clientId,
            currency,
            intent: 'capture',
          }}
        >
          <PayPalButtons
            style={{
              layout: 'vertical',
              color: 'gold',
              shape: 'rect',
              label: 'paypal',
              height: 50,
            }}
            createOrder={async () => {
              const response = await fetch('/api/paypal/create-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ convexOrderId }),
              })
              const data = await response.json()
              if (!response.ok) throw new Error(data.error)
              return data.id
            }}
            onApprove={async (data) => {
              const response = await fetch('/api/paypal/capture-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  paypalOrderId: data.orderID,
                  convexOrderId,
                }),
              })
              const result = await response.json()
              if (!response.ok) {
                toast.error(result.error || 'Payment failed')
                return
              }
              toast.success('Payment successful!')
              onSuccess()
            }}
            onError={(err) => {
              console.error('PayPal error:', err)
              toast.error('Payment failed. Please try again.')
            }}
            onCancel={() => {
              toast('Payment cancelled', { description: 'You can try again when ready.' })
            }}
          />
        </PayPalScriptProvider>
          </>
        )}
      </div>

      <button
        onClick={onBack}
        className="px-6 py-3 rounded-lg border border-border text-foreground hover:bg-secondary transition-colors flex items-center gap-2 w-full md:w-auto"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Review
      </button>
    </motion.div>
  )
}
