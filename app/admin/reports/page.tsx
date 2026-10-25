'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import ProductSpreadsheet from '@/components/admin/ProductSpreadsheet'
import { downloadCsv, toCsv } from '@/lib/csv'
import { formatPrice } from '@/lib/format'

// Ranges are whole days in the browser's time zone (South Africa for the shop).
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const toInput = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const fromInput = (s: string) => new Date(`${s}T00:00:00`)

function presets() {
  const today = startOfDay(new Date())
  const y = today.getFullYear()
  const m = today.getMonth()
  return [
    { label: 'This month', from: new Date(y, m, 1), to: today },
    { label: 'Last month', from: new Date(y, m - 1, 1), to: new Date(y, m, 0) },
    { label: 'Last 30 days', from: new Date(y, m, today.getDate() - 29), to: today },
    { label: 'This year', from: new Date(y, 0, 1), to: today },
  ]
}

export default function AdminReportsPage() {
  const [range, setRange] = useState(() => {
    const p = presets()[0]
    return { from: toInput(p.from), to: toInput(p.to) }
  })
  const fromMs = fromInput(range.from).getTime()
  // "To" is inclusive: count up to the start of the next day.
  const toMs = fromInput(range.to).getTime() + 24 * 60 * 60 * 1000
  const valid = Boolean(range.from && range.to) && fromMs < toMs
  const report = useQuery(api.adminTools.salesReport, valid ? { from: fromMs, to: toMs } : 'skip')
  const lowStock = useQuery(api.adminTools.lowStockList)

  const downloadOrders = () => {
    if (!report) return
    downloadCsv(
      `orders-${range.from}-to-${range.to}.csv`,
      toCsv(
        ['Date', 'Invoice', 'Order', 'Status', 'Customer', 'Company', 'Subtotal', 'Discount', 'Delivery', 'VAT', 'Total', 'Refunded'],
        report.orders.map((o) => [
          new Date(o.date).toLocaleDateString('en-ZA'),
          o.invoiceNumber, o.orderNumber, o.status, o.customer, o.company,
          o.subtotal.toFixed(2), o.discount.toFixed(2), o.shipping.toFixed(2), o.tax.toFixed(2), o.total.toFixed(2), o.refunded.toFixed(2),
        ]),
      ),
    )
  }

  const stats = useMemo(() => report ? [
    { label: 'Paid orders', value: String(report.orderCount) },
    { label: 'Sales (incl. VAT)', value: formatPrice(report.total) },
    { label: 'VAT collected', value: formatPrice(report.tax) },
    { label: 'Discounts given', value: formatPrice(report.discount) },
    { label: 'Refunds', value: formatPrice(report.refunded) },
    { label: 'Net after refunds', value: formatPrice(report.net) },
  ] : [], [report])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Reports</h2>
        <p className="text-muted-foreground">Sales for any period, stock running low, and the product spreadsheet.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sales</CardTitle>
          <CardDescription>Paid orders, counted on the day they were paid.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap items-end gap-3">
            {presets().map((p) => (
              <Button
                key={p.label}
                variant="outline"
                size="sm"
                onClick={() => setRange({ from: toInput(p.from), to: toInput(p.to) })}
              >
                {p.label}
              </Button>
            ))}
            <div className="flex items-end gap-2">
              <label className="text-sm">
                <span className="block text-muted-foreground mb-1">From</span>
                <Input type="date" value={range.from} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} />
              </label>
              <label className="text-sm">
                <span className="block text-muted-foreground mb-1">To</span>
                <Input type="date" value={range.to} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} />
              </label>
            </div>
            <Button onClick={downloadOrders} disabled={!report || report.orders.length === 0} className="bg-accent text-white hover:bg-accent/90">
              Download orders (CSV)
            </Button>
          </div>

          {!valid ? (
            <p className="text-sm text-red-600">The start date must be on or before the end date.</p>
          ) : report === undefined ? (
            <div className="h-40 bg-muted rounded-lg animate-pulse" />
          ) : report === null ? null : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {stats.map((s) => (
                  <div key={s.label} className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                    <p className="text-lg font-bold">{s.value}</p>
                  </div>
                ))}
              </div>
              <div className="grid lg:grid-cols-2 gap-6">
                <RankTable title="Top products" rows={report.products.slice(0, 15).map((p) => ({ name: p.name, sub: p.sku, quantity: p.quantity, revenue: p.revenue }))} />
                <RankTable title="By category" rows={report.categories.map((c) => ({ name: c.name, quantity: c.quantity, revenue: c.revenue }))} />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Low stock</CardTitle>
          <CardDescription>
            Active products with 5 or fewer left. The same list is emailed to the shop every morning at 08:00 when there is
            anything on it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {lowStock === undefined ? (
            <div className="h-24 bg-muted rounded-lg animate-pulse" />
          ) : lowStock.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing is running low.</p>
          ) : (
            <ul className="divide-y text-sm">
              {lowStock.map((p) => (
                <li key={p.productId} className="flex items-center justify-between gap-4 py-2">
                  <span className="min-w-0">
                    <Link href={`/admin/products/edit/${p.productId}`} className="font-medium hover:underline">{p.name}</Link>
                    <span className="block text-xs text-muted-foreground">
                      {p.sku}{p.waiting > 0 && ` · ${p.waiting} customer${p.waiting === 1 ? '' : 's'} waiting for it`}
                    </span>
                  </span>
                  <span className={`shrink-0 font-semibold ${p.stockQty <= 0 ? 'text-red-600' : ''}`}>
                    {p.stockQty <= 0 ? 'Out of stock' : `${p.stockQty} left`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <ProductSpreadsheet />
    </div>
  )
}

function RankTable({ title, rows }: { title: string; rows: Array<{ name: string; sub?: string; quantity: number; revenue: number }> }) {
  return (
    <div>
      <h4 className="font-semibold mb-2">{title}</h4>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No sales in this period.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground border-b">
              <th className="py-1 font-medium">Name</th>
              <th className="py-1 font-medium text-right">Sold</th>
              <th className="py-1 font-medium text-right">Sales (excl. VAT)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b last:border-0">
                <td className="py-1.5 pr-2">{r.name}{r.sub && <span className="block text-xs text-muted-foreground">{r.sub}</span>}</td>
                <td className="py-1.5 text-right">{r.quantity}</td>
                <td className="py-1.5 text-right whitespace-nowrap">{formatPrice(r.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
