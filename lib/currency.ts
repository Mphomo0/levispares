/**
 * PayPal cannot charge in South African rand, so orders (priced in rand) are
 * converted to the PayPal currency (US dollars) using the rand-per-dollar
 * rate frozen onto the order when it was created.
 *
 * The same function is used to show the customer the amount, to create the
 * PayPal payment, and to verify the payment when it is captured, so all three
 * always agree to the cent.
 */

export interface PayableOrder {
  items: Array<{ name: string; price: number; quantity: number }>
  shipping: number
  tax: number
  /** Rand per 1 unit of the PayPal currency. Not needed when paying in ZAR. */
  exchangeRate?: number
}

export interface PayPalAmounts {
  currency: string
  items: Array<{ name: string; quantity: number; price: number }>
  itemTotal: number
  shipping: number
  tax: number
  total: number
}

/** Returns null when a conversion is needed but no valid rate is available. */
export function toPayPalAmounts(order: PayableOrder, currency: string): PayPalAmounts | null {
  const rate = currency === 'ZAR' ? 1 : order.exchangeRate
  if (!rate || !Number.isFinite(rate) || rate <= 0) return null

  // Work in whole cents so the parts always add up to the total exactly.
  const cents = (rand: number) => Math.round((rand / rate) * 100)

  const items = order.items.map((item) => ({
    name: item.name,
    quantity: item.quantity,
    priceCents: cents(item.price),
  }))
  const itemTotalCents = items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0)
  const shippingCents = cents(order.shipping)
  const taxCents = cents(order.tax)

  return {
    currency,
    items: items.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      price: item.priceCents / 100,
    })),
    itemTotal: itemTotalCents / 100,
    shipping: shippingCents / 100,
    tax: taxCents / 100,
    total: (itemTotalCents + shippingCents + taxCents) / 100,
  }
}
