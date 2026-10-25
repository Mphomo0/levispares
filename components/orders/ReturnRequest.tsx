'use client'

import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { toast } from 'sonner'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { getErrorMessage } from '@/lib/errors'
import { formatPrice } from '@/lib/format'

type Reason = 'wrong_part' | 'damaged' | 'not_needed' | 'other'

const REASONS: Array<{ value: Reason; label: string }> = [
  { value: 'wrong_part', label: "Wrong part / doesn't fit" },
  { value: 'damaged', label: 'Damaged or faulty' },
  { value: 'not_needed', label: 'No longer needed' },
  { value: 'other', label: 'Other' },
]

const STATUS: Record<string, { label: string; className: string }> = {
  requested: { label: 'Waiting for review', className: 'bg-amber-100 text-amber-800' },
  approved: { label: 'Approved: send the parts back', className: 'bg-blue-100 text-blue-800' },
  rejected: { label: 'Not accepted', className: 'bg-red-100 text-red-800' },
  refunded: { label: 'Refunded', className: 'bg-green-100 text-green-800' },
}

const formatDate = (ms: number) =>
  new Date(ms).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })

/** Lets a customer ask to return parts from a delivered order, and follow their returns. */
export default function ReturnRequest({ orderId, guestToken }: { orderId: Id<'orders'>; guestToken?: string }) {
  const info = useQuery(api.returns.forOrder, { orderId, guestToken })
  const request = useMutation(api.returns.request)
  const [open, setOpen] = useState(false)
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [reason, setReason] = useState<Reason>('wrong_part')
  const [details, setDetails] = useState('')
  const [sending, setSending] = useState(false)

  if (!info) return null
  const deadlinePassed = info.deadline !== null && !info.canRequest && info.returns.length === 0
  if (!info.canRequest && info.returns.length === 0 && !deadlinePassed) return null

  const chosen = info.items.filter((item) => (quantities[item.productId] ?? 0) > 0)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)
    try {
      await request({
        orderId,
        guestToken,
        items: chosen.map((item) => ({ productId: item.productId, quantity: quantities[item.productId] })),
        reason,
        details: details.trim() || undefined,
      })
      toast.success("Return requested. We'll email you once we've reviewed it.")
      setOpen(false)
      setQuantities({})
      setDetails('')
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not request the return.'))
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="border-t border-border pt-3 mt-3 space-y-3 text-sm">
      {info.returns.map((ret) => {
        const status = STATUS[ret.status]
        return (
          <div key={ret._id} className="rounded-lg bg-muted/40 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">Return requested {formatDate(ret._creationTime)}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.className}`}>{status.label}</span>
            </div>
            <p className="text-muted-foreground mt-1">
              {ret.items.map((item) => `${item.name} × ${item.quantity}`).join(', ')}
            </p>
            {ret.status === 'refunded' && ret.refundAmount !== undefined && (
              <p className="mt-1">{formatPrice(ret.refundAmount)} refunded to your original payment method.</p>
            )}
            {ret.adminNote && <p className="mt-1 text-muted-foreground">Note from us: {ret.adminNote}</p>}
          </div>
        )
      })}

      {deadlinePassed && <p className="text-muted-foreground">{info.why}</p>}

      {info.canRequest && !open && (
        <button type="button" onClick={() => setOpen(true)} className="text-brand font-medium hover:underline">
          Return items
          {info.deadline && <span className="text-muted-foreground font-normal"> (until {formatDate(info.deadline)})</span>}
        </button>
      )}

      {info.canRequest && open && (
        <form onSubmit={submit} className="rounded-lg border border-border p-4 space-y-4">
          <fieldset className="space-y-2">
            <legend className="font-medium mb-1">Which items are you returning?</legend>
            {info.items.map((item) => (
              <div key={item.productId} className="flex items-center justify-between gap-3">
                <label htmlFor={`ret-${item.productId}`} className="min-w-0">
                  <span className="block truncate">{item.name}</span>
                  <span className="text-xs text-muted-foreground">{formatPrice(item.price)} each · up to {item.maxQuantity}</span>
                </label>
                <input
                  id={`ret-${item.productId}`}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={item.maxQuantity}
                  value={quantities[item.productId] ?? 0}
                  onChange={(e) => {
                    const n = Math.max(0, Math.min(item.maxQuantity, Math.floor(Number(e.target.value) || 0)))
                    setQuantities((q) => ({ ...q, [item.productId]: n }))
                  }}
                  className="input-styled w-20 shrink-0"
                />
              </div>
            ))}
          </fieldset>
          <div>
            <label htmlFor={`ret-reason-${orderId}`} className="block font-medium mb-1">Reason</label>
            <select
              id={`ret-reason-${orderId}`}
              value={reason}
              onChange={(e) => setReason(e.target.value as Reason)}
              className="input-styled"
            >
              {REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor={`ret-details-${orderId}`} className="block font-medium mb-1">
              Details {reason === 'other' ? '' : '(optional)'}
            </label>
            <textarea
              id={`ret-details-${orderId}`}
              rows={3}
              maxLength={2000}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Tell us what's wrong, e.g. which vehicle the part didn't fit"
              className="input-styled"
              required={reason === 'other'}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Once we approve the return we&apos;ll email you where to send the parts. Your refund, including VAT, goes back to
            your original payment method when they arrive. Delivery costs aren&apos;t refunded.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <button type="submit" disabled={sending || chosen.length === 0} className="btn-accent text-white disabled:opacity-50">
              {sending ? 'Sending…' : 'Request Return'}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="px-6 py-3 rounded-lg border border-border hover:bg-secondary transition-colors">
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
