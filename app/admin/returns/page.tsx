'use client'

import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { toast } from 'sonner'
import { api } from '@/convex/_generated/api'
import type { FunctionReturnType } from 'convex/server'
import { useConfirm } from '@/components/admin/ConfirmDialog'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { getErrorMessage } from '@/lib/errors'
import { formatPrice } from '@/lib/format'

type Return = FunctionReturnType<typeof api.returns.listAll>[number]

const FILTERS = [
  { key: 'open', label: 'To do', statuses: ['requested', 'approved'] },
  { key: 'done', label: 'Done', statuses: ['refunded', 'rejected'] },
  { key: 'all', label: 'All', statuses: ['requested', 'approved', 'refunded', 'rejected'] },
] as const

const STATUS: Record<string, { label: string; className: string }> = {
  requested: { label: 'Needs review', className: 'bg-amber-100 text-amber-800' },
  approved: { label: 'Approved, awaiting parts', className: 'bg-blue-100 text-blue-800' },
  rejected: { label: 'Rejected', className: 'bg-muted text-muted-foreground' },
  refunded: { label: 'Refunded', className: 'bg-green-100 text-green-800' },
}

const formatDate = (ms: number) =>
  new Date(ms).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })

export default function AdminReturnsPage() {
  const returns = useQuery(api.returns.listAll)
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['key']>('open')
  const statuses: readonly string[] = FILTERS.find((f) => f.key === filter)!.statuses
  const shown = returns?.filter((r) => statuses.includes(r.status))

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Returns</h2>
        <p className="text-muted-foreground">
          Customers can ask to return parts within 14 days of delivery. Approve a return, then refund it once the parts arrive;
          refunding puts the parts back in stock.
        </p>
      </div>

      <div className="flex gap-2" role="tablist" aria-label="Filter returns">
        {FILTERS.map((f) => (
          <Button
            key={f.key}
            role="tab"
            aria-selected={filter === f.key}
            variant={filter === f.key ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(f.key)}
          >
            {f.label}
            {returns && ` (${returns.filter((r) => (f.statuses as readonly string[]).includes(r.status)).length})`}
          </Button>
        ))}
      </div>

      {shown === undefined ? (
        <div className="space-y-3">{[1, 2].map((i) => <div key={i} className="h-32 bg-muted rounded-lg animate-pulse" />)}</div>
      ) : shown.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {filter === 'open' ? 'No returns waiting for you.' : 'No returns here yet.'}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {shown.map((ret) => <ReturnCard key={ret._id} ret={ret} />)}
        </div>
      )}
    </div>
  )
}

function ReturnCard({ ret }: { ret: Return }) {
  const approve = useMutation(api.returns.approve)
  const reject = useMutation(api.returns.reject)
  const markRefunded = useMutation(api.returns.markRefunded)
  const { confirm, confirmDialog } = useConfirm()
  const [note, setNote] = useState('')
  const [amount, setAmount] = useState(ret.suggestedRefund.toFixed(2))
  const [busy, setBusy] = useState(false)
  const status = STATUS[ret.status]

  const run = async (action: () => Promise<unknown>, success: string) => {
    setBusy(true)
    try {
      await action()
      toast.success(success)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Something went wrong.'))
    } finally {
      setBusy(false)
    }
  }

  const refund = async () => {
    const value = Math.round(Number(amount) * 100) / 100
    if (!(value > 0) || value > ret.maxRefund) {
      toast.error(`Enter an amount between R0.01 and ${formatPrice(ret.maxRefund)}.`)
      return
    }
    const how = ret.paidWithPayPal ? 'through PayPal' : 'as refunded by hand'
    if (!(await confirm(`Refund ${formatPrice(value)} ${how} and put the parts back in stock? The customer is emailed.`))) return

    if (ret.paidWithPayPal) {
      await run(async () => {
        const res = await fetch('/api/admin/returns/refund', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ returnId: ret._id, amount: value }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'The refund failed')
      }, `${formatPrice(value)} refunded through PayPal`)
    } else {
      await run(() => markRefunded({ id: ret._id, amount: value }), `Marked ${formatPrice(value)} as refunded`)
    }
  }

  return (
    <Card>
      {confirmDialog}
      <CardContent className="pt-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">Order {ret.orderNumber}</span>
              {ret.invoiceNumber && <span className="text-sm text-muted-foreground">· {ret.invoiceNumber}</span>}
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.className}`}>{status.label}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {ret.customerName ?? 'Customer'}{ret.customerEmail ? ` · ${ret.customerEmail}` : ''} · requested {formatDate(ret._creationTime)}
            </p>
          </div>
          {ret.status === 'refunded' && ret.refundAmount !== undefined && (
            <p className="text-sm font-medium">{formatPrice(ret.refundAmount)} refunded{ret.paypalRefundId ? ' via PayPal' : ''}</p>
          )}
        </div>

        <ul className="text-sm space-y-1">
          {ret.items.map((item) => (
            <li key={item.productId} className="flex justify-between gap-4">
              <span>{item.name} × {item.quantity}</span>
              <span className="text-muted-foreground">{formatPrice(item.price * item.quantity)}</span>
            </li>
          ))}
        </ul>

        <div className="text-sm">
          <p><span className="font-medium">Reason:</span> {ret.reasonLabel}</p>
          {ret.details && <p className="whitespace-pre-wrap text-muted-foreground mt-1">{ret.details}</p>}
          {ret.adminNote && <p className="mt-1"><span className="font-medium">Your note:</span> {ret.adminNote}</p>}
        </div>

        {ret.status === 'requested' && (
          <div className="space-y-2 border-t pt-4">
            <Textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Note to the customer (required when rejecting)"
              aria-label="Note to the customer"
            />
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={busy}
                onClick={() => run(() => approve({ id: ret._id, note: note || undefined }), 'Return approved; the customer has been emailed where to send the parts')}
                className="bg-accent text-white hover:bg-accent/90"
              >
                Approve
              </Button>
              <Button
                variant="outline"
                disabled={busy || !note.trim()}
                onClick={() => run(() => reject({ id: ret._id, note }), 'Return rejected; the customer has been emailed')}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                Reject
              </Button>
            </div>
          </div>
        )}

        {ret.status === 'approved' && (
          <div className="border-t pt-4 space-y-2">
            <p className="text-sm text-muted-foreground">
              Once the parts are back, refund the customer. Suggested: {formatPrice(ret.suggestedRefund)} (the items&apos; share of
              what was paid, including VAT and any discount; delivery not included).
            </p>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <label htmlFor={`refund-${ret._id}`} className="text-sm font-medium shrink-0">Refund (R)</label>
              <Input
                id={`refund-${ret._id}`}
                type="number"
                inputMode="decimal"
                min="0.01"
                max={ret.maxRefund}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="sm:w-36"
              />
              <Button disabled={busy} onClick={refund} className="bg-accent text-white hover:bg-accent/90">
                {ret.paidWithPayPal ? 'Parts received: refund via PayPal' : 'Parts received: mark refunded'}
              </Button>
            </div>
            {!ret.paidWithPayPal && (
              <p className="text-xs text-muted-foreground">This order wasn&apos;t paid through PayPal, so pay the refund yourself first.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
