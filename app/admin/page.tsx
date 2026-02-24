'use client'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { useCallback } from 'react'

const stats = [
  {
    label: 'Total Revenue',
    value: '$124,563',
    trend: '↗ 12.5%',
    trendUp: true,
  },
  { label: 'Active Orders', value: '1,234', trend: '↗ 8.2%', trendUp: true },
  { label: 'Products Live', value: '567', trend: '↗ 3.1%', trendUp: true },
  { label: 'Total Users', value: '8,901', trend: '↘ 2.4%', trendUp: false },
]

const recentOrders = [
  {
    id: 'ORD-001',
    customer: 'John Doe',
    product: 'Brake Pads',
    amount: '$89.99',
    status: 'Completed',
  },
  {
    id: 'ORD-002',
    customer: 'Jane Smith',
    product: 'Oil Filter',
    amount: '$24.99',
    status: 'Pending',
  },
  {
    id: 'ORD-003',
    customer: 'Mike Johnson',
    product: 'Spark Plugs',
    amount: '$45.00',
    status: 'Processing',
  },
  {
    id: 'ORD-004',
    customer: 'Sarah Williams',
    product: 'Air Filter',
    amount: '$32.50',
    status: 'Completed',
  },
]

const topProducts = [
  { name: 'Premium Brake Pads', sales: 234, revenue: '$20,899' },
  { name: 'Synthetic Oil 5W-30', sales: 189, revenue: '$9,450' },
  { name: 'LED Headlights', sales: 156, revenue: '$12,480' },
  { name: 'All-Season Tires', sales: 98, revenue: '$19,600' },
]

export default function AdminDashboardPage() {
  const handleExportReport = useCallback(() => {
    const rows = [
      ['Label', 'Value', 'Trend'],
      ...stats.map((s) => [s.label, s.value, s.trend]),
    ]
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'admin-report.csv'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Overview of your store performance.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExportReport}>
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            Export
          </Button>
          <Link href="/admin/products/new">
            <Button className="bg-orange-500 hover:bg-orange-600 text-black font-semibold">
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              New Product
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <Card key={i} className="card-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.label}
              </CardTitle>
              <span
                className={`text-xs font-mono ${stat.trendUp ? 'text-green-600' : 'text-red-600'}`}
              >
                {stat.trend}
              </span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="card-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Orders</CardTitle>
                <CardDescription>Latest customer orders</CardDescription>
              </div>
              <Link
                href="/admin/orders"
                className="text-sm text-orange-600 hover:text-orange-700 font-medium"
              >
                View All
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      <svg
                        className="h-5 w-5 text-muted-foreground"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium">{order.customer}</p>
                      <p className="text-sm text-muted-foreground">
                        {order.product}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{order.amount}</p>
                    <span
                      className={`text-xs inline-flex items-center rounded-full px-2 py-0.5 ${
                        order.status === 'Completed'
                          ? 'bg-green-100 text-green-800'
                          : order.status === 'Pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="card-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Top Products</CardTitle>
                <CardDescription>Best selling items</CardDescription>
              </div>
              <Link
                href="/admin/products"
                className="text-sm text-orange-600 hover:text-orange-700 font-medium"
              >
                View All
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topProducts.map((product, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-2xl font-bold text-muted-foreground/30">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {product.sales} units
                      </p>
                    </div>
                  </div>
                  <p className="font-mono font-medium">{product.revenue}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
