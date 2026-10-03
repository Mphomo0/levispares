'use client'

import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toPayPalAmounts } from '@/lib/currency'
import { formatPrice } from '@/lib/format'

const PAYPAL_CURRENCY = process.env.NEXT_PUBLIC_PAYPAL_CURRENCY || 'USD'

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
  const charged = order
    ? toPayPalAmounts(
        { items: order.items, shipping: order.shipping, tax: order.tax, exchangeRate: order.exchangeRate },
        PAYPAL_CURRENCY,
      )
    : null

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
              <div className="flex justify-between"><span>Shipping</span><span>{money(order.shipping)}</span></div>
              {order.tax > 0 && <div className="flex justify-between"><span>Tax</span><span>{money(order.tax)}</span></div>}
              <div className="flex justify-between font-bold border-t pt-1"><span>Total</span><span>{money(order.total)}</span></div>
            </section>

            <section>
              <h4 className="font-semibold mb-1">Payment</h4>
              {order.paypalOrderId ? (
                <p className="text-muted-foreground">
                  PayPal reference <span className="font-mono">{order.paypalOrderId}</span>
                  {charged && PAYPAL_CURRENCY !== 'ZAR' && (
                    <>
                      {' '}· charged {PAYPAL_CURRENCY} {charged.total.toFixed(2)} at {formatPrice(order.exchangeRate)} per {PAYPAL_CURRENCY}
                    </>
                  )}
                </p>
              ) : (
                <p className="text-muted-foreground">Not paid yet.</p>
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
