'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { formatPrice } from '@/lib/format'

const formatDate = (ms: number) =>
  new Date(ms).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })

/**
 * A printable invoice for a paid order. "Download PDF" uses the browser's
 * print dialog (Save as PDF), so the layout is styled for A4 paper.
 */
function Invoice() {
  const { orderId } = useParams<{ orderId: string }>()
  const token = useSearchParams().get('token') ?? undefined
  const invoice = useQuery(api.invoices.get, { orderId: orderId as Id<'orders'>, guestToken: token })

  if (invoice === undefined) {
    return <div className="min-h-screen flex items-center justify-center text-slate-500">Loading invoice…</div>
  }
  if (invoice === null) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Invoice not available</h1>
        <p className="text-slate-600 max-w-md">
          An invoice is issued once an order has been paid. If you placed this order, sign in to the account you used, or open
          the link from your order email.
        </p>
        <Link href="/" className="text-brand font-medium hover:underline">Back to the shop</Link>
      </div>
    )
  }

  const { seller, buyer } = invoice
  const sellerLines = [seller.address, seller.phone, seller.email].filter(Boolean)

  return (
    <div className="min-h-screen bg-slate-100 py-8 print:bg-white print:py-0">
      <div className="mx-auto max-w-[210mm] px-4 print:px-0">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link href="/" className="text-sm text-slate-600 hover:text-slate-900">&larr; Back to the shop</Link>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:brightness-110"
          >
            Download PDF / Print
          </button>
        </div>

        <article className="bg-white p-8 sm:p-12 shadow-sm print:shadow-none print:p-0 text-slate-900 text-sm">
          <header className="flex flex-col sm:flex-row sm:justify-between gap-6 border-b border-slate-200 pb-6">
            <div>
              <p className="text-lg font-bold">{seller.name}</p>
              {sellerLines.map((line) => (
                <p key={line} className="text-slate-600 whitespace-pre-line">{line}</p>
              ))}
              {seller.vatNumber && <p className="text-slate-600">VAT number: {seller.vatNumber}</p>}
              {seller.registrationNumber && <p className="text-slate-600">Company reg.: {seller.registrationNumber}</p>}
            </div>
            <div className="sm:text-right">
              <h1 className="text-2xl font-bold uppercase tracking-wide">{invoice.title}</h1>
              <dl className="mt-2 grid grid-cols-[auto_auto] gap-x-4 gap-y-0.5 sm:justify-end">
                <dt className="text-slate-500">Invoice no.</dt>
                <dd className="font-medium">{invoice.invoiceNumber}</dd>
                <dt className="text-slate-500">Date</dt>
                <dd>{formatDate(invoice.invoiceDate)}</dd>
                <dt className="text-slate-500">Order</dt>
                <dd>{invoice.orderNumber}</dd>
              </dl>
              {invoice.status === 'cancelled' && (
                <p className="mt-2 font-semibold text-red-600">Order cancelled</p>
              )}
            </div>
          </header>

          <section className="py-6 border-b border-slate-200">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Bill to</h2>
            {buyer.company && <p className="font-medium">{buyer.company}</p>}
            {buyer.vatNumber && <p>VAT number: {buyer.vatNumber}</p>}
            {buyer.name && <p className={buyer.company ? 'text-slate-600' : 'font-medium'}>{buyer.name}</p>}
            {buyer.address && (
              <p className="text-slate-600">
                {buyer.address.street}, {buyer.address.city}
                {buyer.address.province ? `, ${buyer.address.province}` : ''} {buyer.address.postalCode}, {buyer.address.country}
              </p>
            )}
            {buyer.email && <p className="text-slate-600">{buyer.email}</p>}
          </section>

          <table className="w-full mt-6">
            <thead>
              <tr className="border-b border-slate-300 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="py-2 font-semibold">Description</th>
                <th className="py-2 font-semibold text-right">Qty</th>
                <th className="py-2 font-semibold text-right">Unit price</th>
                <th className="py-2 font-semibold text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, i) => (
                <tr key={i} className="border-b border-slate-100 align-top">
                  <td className="py-2 pr-4">
                    {item.name}
                    <span className="block text-xs text-slate-500">
                      SKU {item.sku}{item.partNumber ? ` · Part no. ${item.partNumber}` : ''}
                    </span>
                  </td>
                  <td className="py-2 text-right">{item.quantity}</td>
                  <td className="py-2 text-right whitespace-nowrap">{formatPrice(item.price)}</td>
                  <td className="py-2 text-right whitespace-nowrap">{formatPrice(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <dl className="mt-6 ml-auto w-full max-w-xs space-y-1">
            <div className="flex justify-between"><dt className="text-slate-600">Subtotal</dt><dd>{formatPrice(invoice.subtotal)}</dd></div>
            {invoice.discount > 0 && (
              <div className="flex justify-between">
                <dt className="text-slate-600">Discount{invoice.promoCode ? ` (${invoice.promoCode})` : ''}</dt>
                <dd>-{formatPrice(invoice.discount)}</dd>
              </div>
            )}
            <div className="flex justify-between"><dt className="text-slate-600">Delivery</dt><dd>{formatPrice(invoice.shipping)}</dd></div>
            {invoice.vatCharged && (
              <div className="flex justify-between"><dt className="text-slate-600">VAT ({invoice.vatRate}%)</dt><dd>{formatPrice(invoice.tax)}</dd></div>
            )}
            <div className="flex justify-between border-t border-slate-300 pt-2 text-base font-bold">
              <dt>Total{invoice.vatCharged ? ' (incl. VAT)' : ''}</dt>
              <dd>{formatPrice(invoice.total)}</dd>
            </div>
          </dl>

          <footer className="mt-10 border-t border-slate-200 pt-4 text-xs text-slate-500">
            {invoice.status === 'cancelled'
              ? 'This order was cancelled. Any payment received is refunded to the original payment method.'
              : 'Paid in full. Thank you for your business.'}
            {!invoice.vatCharged && ' No VAT was charged on this invoice.'}
          </footer>
        </article>
      </div>
    </div>
  )
}

export default function InvoicePage() {
  return (
    <Suspense>
      <Invoice />
    </Suspense>
  )
}
