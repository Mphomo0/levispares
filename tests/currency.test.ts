import { describe, expect, it } from 'vitest'
import { toPayPalAmounts } from '../lib/currency'
import { isPaidOrder, orderStatusLabel } from '../lib/orders'

const order = {
  items: [
    { name: 'Brake pad', price: 100, quantity: 2 },
    { name: 'Oil filter', price: 49.99, quantity: 3 },
  ],
  shipping: 250,
  tax: 61.5,
  exchangeRate: 18.37,
}

describe('toPayPalAmounts', () => {
  it('converts rand to dollars and the parts add up to the total to the cent', () => {
    const a = toPayPalAmounts(order, 'USD')!
    const parts = a.itemTotal + a.shipping + a.tax
    expect(Math.round(parts * 100)).toBe(Math.round(a.total * 100))
    const lines = a.items.reduce((sum, i) => sum + Math.round(i.price * 100) * i.quantity, 0)
    expect(lines).toBe(Math.round(a.itemTotal * 100))
    // R250 / 18.37 = $13.61
    expect(a.shipping).toBe(13.61)
    expect(a.currency).toBe('USD')
  })

  it('always has at most two decimals', () => {
    for (let rate = 15; rate < 22; rate += 0.137) {
      const a = toPayPalAmounts({ ...order, exchangeRate: rate }, 'USD')!
      for (const n of [a.total, a.itemTotal, a.shipping, a.tax, ...a.items.map((i) => i.price)]) {
        expect(Math.round(n * 100)).toBeCloseTo(n * 100, 6)
      }
    }
  })

  it('is deterministic, so the charge and the verification agree', () => {
    expect(toPayPalAmounts(order, 'USD')).toEqual(toPayPalAmounts({ ...order }, 'USD'))
  })

  it('needs a valid rate to pay in dollars', () => {
    for (const exchangeRate of [undefined, 0, -1, NaN, Infinity]) {
      expect(toPayPalAmounts({ ...order, exchangeRate }, 'USD')).toBeNull()
    }
  })

  it('passes rand through untouched when paying in ZAR', () => {
    const a = toPayPalAmounts({ ...order, exchangeRate: undefined }, 'ZAR')!
    expect(a.shipping).toBe(250)
    expect(a.total).toBe(200 + 149.97 + 250 + 61.5)
  })
})

describe('order status helpers', () => {
  it('only paid-or-later orders count as paid', () => {
    for (const status of ['paid', 'processing', 'shipped', 'delivered']) expect(isPaidOrder({ status })).toBe(true)
    for (const status of ['pending', 'cancelled']) expect(isPaidOrder({ status })).toBe(false)
  })
  it('labels statuses for customers', () => {
    expect(orderStatusLabel('pending')).toBe('Awaiting payment')
    expect(orderStatusLabel('mystery')).toBe('Mystery')
  })
})
