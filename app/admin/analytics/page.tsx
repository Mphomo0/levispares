'use client'

import { useMemo, useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'

export default function AdminAnalyticsPage() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const allOrders = useQuery(api.orders.listAll)
  const allProducts = useQuery(api.products.listAllSimple)
  const bestSellers = useQuery(api.products.listBestSellers, { limit: 5 })
  const allUsers = useQuery(api.users.list)

  const loading = allOrders === undefined || allProducts === undefined || allUsers === undefined

  // Compute stats
  const totalRevenue = useMemo(() => {
    if (!allOrders) return 0
    return allOrders.reduce((sum, o) => {
      if (o.status !== 'cancelled' && o.status !== 'draft') return sum + o.totalAmount
      return sum
    }, 0)
  }, [allOrders])

  const totalOrders = allOrders?.length ?? 0
  const totalProducts = allProducts?.length ?? 0
  const totalUsers = allUsers?.length ?? 0
  const avgOrderValue = totalOrders > 0 ? totalRevenue / allOrders!.filter(o => o.status !== 'cancelled' && o.status !== 'draft').length : 0

  // Monthly revenue data for chart (last 12 months)
  const monthlyRevenue = useMemo(() => {
    if (!allOrders) return []
    const now = new Date()
    const months: { month: string; revenue: number; orders: number }[] = []

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthKey = d.toLocaleDateString('en-US', { month: 'short' })
      const year = d.getFullYear()
      const month = d.getMonth()

      const monthOrders = allOrders.filter((o) => {
        if (o.status === 'cancelled' || o.status === 'draft') return false
        const oDate = new Date(o._creationTime)
        return oDate.getFullYear() === year && oDate.getMonth() === month
      })

      months.push({
        month: monthKey,
        revenue: monthOrders.reduce((s, o) => s + o.totalAmount, 0),
        orders: monthOrders.length,
      })
    }
    return months
  }, [allOrders])

  const maxRevenue = Math.max(...monthlyRevenue.map((d) => d.revenue), 1)

  // Order status breakdown
  const statusBreakdown = useMemo(() => {
    if (!allOrders) return []
    const counts: Record<string, number> = {}
    allOrders.forEach((o) => {
      counts[o.status] = (counts[o.status] || 0) + 1
    })
    const total = allOrders.length || 1
    const statusLabels: Record<string, string> = {
      draft: 'Draft',
      paid: 'Paid',
      shipped: 'Shipped',
      delivered: 'Delivered',
      cancelled: 'Cancelled',
    }
    const statusColors: Record<string, string> = {
      draft: 'from-slate-500 to-slate-400',
      paid: 'from-yellow-500 to-yellow-400',
      shipped: 'from-blue-500 to-blue-400',
      delivered: 'from-green-500 to-green-400',
      cancelled: 'from-red-500 to-red-400',
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([status, count]) => ({
        label: statusLabels[status] || status,
        count,
        percentage: Math.round((count / total) * 100),
        color: statusColors[status] || 'from-gray-500 to-gray-400',
      }))
  }, [allOrders])

  const stats = [
    {
      title: 'Total Revenue',
      value: loading ? '—' : `R${totalRevenue.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
      subtitle: 'From paid & shipped orders',
      icon: (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      iconBg: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    },
    {
      title: 'Total Orders',
      value: loading ? '—' : totalOrders.toString(),
      subtitle: 'All time',
      icon: (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
      iconBg: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    },
    {
      title: 'Total Products',
      value: loading ? '—' : totalProducts.toString(),
      subtitle: 'In catalogue',
      icon: (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
      iconBg: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
    },
    {
      title: 'Avg. Order Value',
      value: loading ? '—' : `R${avgOrderValue.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      subtitle: `${totalUsers} registered users`,
      icon: (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
      iconBg: 'bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Analytics</h2>
          <p className="text-muted-foreground">
            Track your store performance and insights.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <div className={`p-2 rounded-lg ${stat.iconBg}`}>{stat.icon}</div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-8 w-24 bg-muted rounded animate-pulse" />
              ) : (
                <div className="text-2xl font-bold">{stat.value}</div>
              )}
              <p className="text-xs text-muted-foreground mt-1">{stat.subtitle}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Revenue Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue Overview</CardTitle>
            <CardDescription>Monthly revenue for the past 12 months</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-64 flex items-end justify-between gap-2">
                {[40, 65, 45, 80, 55, 90, 35, 75, 50, 85, 40, 60].map((h, i) => (
                  <div key={i} className="flex-1 bg-muted rounded-t-md animate-pulse" style={{ height: `${h}%` }} />
                ))}
              </div>
            ) : monthlyRevenue.every((m) => m.revenue === 0) ? (
              <div className="h-64 flex items-center justify-center">
                <div className="text-center">
                  <svg className="mx-auto h-12 w-12 text-muted-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <p className="mt-2 text-muted-foreground">No revenue data yet</p>
                </div>
              </div>
            ) : (
              <div className="h-64 flex items-end justify-between gap-2">
                {monthlyRevenue.map((item) => (
                  <div key={item.month} className="flex-1 flex flex-col items-center gap-2 group">
                    <div className="relative w-full">
                      {mounted && item.revenue > 0 && (
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-foreground text-background text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          R{item.revenue.toLocaleString('en-ZA')}
                        </div>
                      )}
                      <div
                        className="w-full bg-gradient-to-t from-orange-500 to-orange-400 rounded-t-md transition-all hover:opacity-80"
                        style={{ height: `${(item.revenue / maxRevenue) * 200}px` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">{item.month}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Order Breakdown</CardTitle>
            <CardDescription>Orders by status</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                    <div className="h-2 bg-muted rounded-full animate-pulse" />
                  </div>
                ))}
              </div>
            ) : statusBreakdown.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-muted-foreground">No orders yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {statusBreakdown.map((item) => (
                  <div key={item.label} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{item.label}</span>
                      <span className="text-muted-foreground">
                        {item.count} ({item.percentage}%)
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r ${item.color} rounded-full transition-all`}
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Products */}
      <Card>
        <CardHeader>
          <CardTitle>Top Products</CardTitle>
          <CardDescription>Best selling products by units sold</CardDescription>
        </CardHeader>
        <CardContent>
          {bestSellers === undefined ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-14 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          ) : bestSellers.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No sales data yet. Product rankings will appear here once orders are placed.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {bestSellers.map((product, index) => {
                const productRevenue = (product.totalSold ?? 0) * product.price
                return (
                  <div
                    key={product._id}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 font-medium">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {product.totalSold ?? 0} units sold
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        R{productRevenue.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        @ R{product.price.toFixed(2)} each
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
