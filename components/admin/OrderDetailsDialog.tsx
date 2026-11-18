'use client'

import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { toast } from 'sonner'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatPrice } from '@/lib/format'

const money = (n: number) =>
  `${formatPrice(n)}`

export default function OrderDetailsDialog({
  orderId,
  onClose,
}: {
  orderId: Id<'orders'> | null
  onClose: () => void
}) {
  const order = useQuery(api.orders.getAdminDetail, orderId ? { id: orderId } : 'skip')
  const clearAlert = useMutation(api.orders.clearAlert)

  return (
    <Dialog open={!!orderId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Order {order ? order._id.slice(-8).toUpperCase() : ''}
          </DialogTitle>
          <DialogDescription>
            {order
              ? `${new Date(order._creationTime).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' })} · ${order.status}`
              : 'Loading…'}
          </DialogDescription>
        </DialogHeader>

        {order === undefined && <div className="h-40 bg-muted rounded animate-pulse" />}
        {order === null && <p className="text-sm text-muted-foreground">Order not found.</p>}

        {order && (
          <div className="space-y-5 text-sm">
            {order.adminAlert && (
              <section className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-800">
                <h4 className="font-semibold mb-1">Needs attention</h4>
                <p>{order.adminAlert}</p>
                <button
                  onClick={() => clearAlert({ id: order._id }).catch(() => toast.error('Could not clear the alert'))}
                  className="mt-2 text-xs font-semibold underline"
                >
                  I&apos;ve dealt with this
                </button>
              </section>
            )}

            <section>
              <h4 className="font-semibold mb-1">Customer</h4>
              <p>{order.customer?.name || 'Unknown'}</p>
              {order.customer?.email && (
                <a href={`mailto:${order.customer.email}`} className="text-brand hover:underline">
                  {order.customer.email}
                </a>
              )}
            </section>

            <section>
              <h4 className="font-semibold mb-1">Deliver to</h4>
              {order.shippingAddress ? (
                <address className="not-italic text-muted-foreground">
                  <p className="text-foreground">{order.shippingAddress.name}</p>
                  <p>{order.shippingAddress.street}</p>
                  <p>
                    {[order.shippingAddress.city, order.shippingAddress.province, order.shippingAddress.postalCode]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                  <p>{order.shippingAddress.country}</p>
                  {order.shippingAddress.phone && (
                    <p>
                      Phone:{' '}
                      <a href={`tel:${order.shippingAddress.phone}`} className="text-brand hover:underline">
                        {order.shippingAddress.phone}
                      </a>
                    </p>
                  )}
                </address>
              ) : (
                <p className="text-muted-foreground">No delivery address on this order.</p>
              )}
            </section>

            {(order.status === 'shipped' || order.status === 'delivered' || order.courier || order.trackingNumber) && (
              <Tracking key={order._id} id={order._id} courier={order.courier} trackingNumber={order.trackingNumber} />
            )}

            <section>
              <h4 className="font-semibold mb-2">Items</h4>
              <div className="rounded-lg border divide-y">
                {order.items.map((item) => (
                  <div key={item._id} className="flex items-start justify-between gap-3 p-3">
                    <div className="min-w-0">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        SKU {item.sku}
                        {item.partNumber ? ` · Part ${item.partNumber}` : ''} · {item.quantity} × {money(item.price)}
                      </p>
                    </div>
                    <p className="font-medium shrink-0">{money(item.total)}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-1">
              <div className="flex justify-between"><span>Subtotal</span><span>{money(order.subtotal)}</span></div>
              {(order.discount ?? 0) > 0 && (
                <div className="flex justify-between"><span>Discount{order.promoCode ? ` (${order.promoCode})` : ''}</span><span>-{money(order.discount ?? 0)}</span></div>
              )}
              <div className="flex justify-between"><span>Shipping</span><span>{money(order.shipping)}</span></div>
              {order.tax > 0 && <div className="flex justify-between"><span>Tax</span><span>{money(order.tax)}</span></div>}
              <div className="flex justify-between font-bold border-t pt-1"><span>Total</span><span>{money(order.total)}</span></div>
            </section>

            <section>
              <h4 className="font-semibold mb-1">Payment</h4>
              {order.paymentReference ? (
                <p className="text-muted-foreground">
                  Ozow reference <span className="font-mono">{order.paymentReference}</span>
                </p>
              ) : order.paypalOrderId ? (
                <p className="text-muted-foreground">
                  PayPal reference <span className="font-mono">{order.paypalOrderId}</span>
                  {order.exchangeRate ? <> · charged in US$ at {formatPrice(order.exchangeRate)} per US$1</> : null}
                </p>
              ) : (
                <p className="text-muted-foreground">Not paid yet.</p>
              )}
              {order.invoiceNumber && (
                <a href={`/invoice/${order._id}`} target="_blank" rel="noopener" className="text-brand hover:underline">
                  Invoice {order.invoiceNumber}
                </a>
              )}
            </section>

            {order.notes && (
              <section>
                <h4 className="font-semibold mb-1">Customer notes</h4>
                <p className="whitespace-pre-wrap text-muted-foreground">{order.notes}</p>
              </section>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

/** Courier details, editable so staff can add or correct them after sending. */
function Tracking({ id, courier, trackingNumber }: { id: Id<'orders'>; courier?: string; trackingNumber?: string }) {
  const setTracking = useMutation(api.orders.setTracking)
  const [courierValue, setCourierValue] = useState(courier ?? '')
  const [trackingValue, setTrackingValue] = useState(trackingNumber ?? '')
  const [saving, setSaving] = useState(false)
  const inputClass = 'w-full rounded-md border border-border bg-background px-3 py-2 text-sm'

  const save = async () => {
    setSaving(true)
    try {
      await setTracking({ id, courier: courierValue, trackingNumber: trackingValue })
      toast.success('Delivery details saved')
    } catch {
      toast.error('Could not save the delivery details')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section>
      <h4 className="font-semibold mb-2">Delivery tracking</h4>
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <input aria-label="Courier" placeholder="Courier" maxLength={60} value={courierValue} onChange={(e) => setCourierValue(e.target.value)} className={inputClass} />
        <input aria-label="Tracking number" placeholder="Tracking number" maxLength={80} value={trackingValue} onChange={(e) => setTrackingValue(e.target.value)} className={inputClass} />
        <button onClick={save} disabled={saving} className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">Customers see this on their order page. It is emailed when the order is marked shipped.</p>
    </section>
  )
}
