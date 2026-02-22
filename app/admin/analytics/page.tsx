import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

const statsCards = [
  { title: "Total Revenue", value: "$124,563", change: "+12.5%", positive: true, icon: "💰" },
  { title: "Total Orders", value: "1,234", change: "+8.2%", positive: true, icon: "📦" },
  { title: "Total Products", value: "567", change: "+3.1%", positive: true, icon: "🏷️" },
  { title: "Total Users", value: "8,901", change: "-2.4%", positive: false, icon: "👥" },
]

const revenueData = [
  { month: "Jan", revenue: 12500 },
  { month: "Feb", revenue: 15800 },
  { month: "Mar", revenue: 18200 },
  { month: "Apr", revenue: 14500 },
  { month: "May", revenue: 21000 },
  { month: "Jun", revenue: 24500 },
  { month: "Jul", revenue: 22000 },
  { month: "Aug", revenue: 28000 },
  { month: "Sep", revenue: 19500 },
  { month: "Oct", revenue: 23000 },
  { month: "Nov", revenue: 32000 },
  { month: "Dec", revenue: 38500 },
]

const topProducts = [
  { name: "Premium Brake Pads", sales: 234, revenue: "$20,899", growth: "+12%" },
  { name: "Synthetic Oil 5W-30", sales: 189, revenue: "$9,450", growth: "+8%" },
  { name: "LED Headlights", sales: 156, revenue: "$12,480", growth: "+23%" },
  { name: "All-Season Tires", sales: 98, revenue: "$19,600", growth: "-5%" },
  { name: "Car Battery 12V", sales: 87, revenue: "$8,700", growth: "+15%" },
]

const trafficSources = [
  { source: "Organic Search", visits: 12450, percentage: 42 },
  { source: "Direct", visits: 8320, percentage: 28 },
  { source: "Social Media", visits: 4450, percentage: 15 },
  { source: "Referral", visits: 3560, percentage: 12 },
  { source: "Email", visits: 1220, percentage: 3 },
]

export default function AdminAnalyticsPage() {
  const maxRevenue = Math.max(...revenueData.map(d => d.revenue))

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Analytics</h2>
          <p className="text-slate-500 dark:text-slate-400">Track your store performance and insights.</p>
        </div>
        <div className="flex items-center gap-2">
          <select className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50">
            <option>Last 7 days</option>
            <option>Last 30 days</option>
            <option>Last 90 days</option>
            <option>This year</option>
          </select>
          <Button variant="outline" size="sm">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat) => (
          <Card key={stat.title} className="border-slate-200 dark:border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">
                {stat.title}
              </CardTitle>
              <span className="text-xl">{stat.icon}</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className={`text-xs ${stat.positive ? 'text-green-600' : 'text-red-600'}`}>
                {stat.change} from last period
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Revenue Chart */}
        <Card className="lg:col-span-2 border-slate-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle>Revenue Overview</CardTitle>
            <CardDescription>Monthly revenue for the past year</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-end justify-between gap-2">
              {revenueData.map((item) => (
                <div key={item.month} className="flex-1 flex flex-col items-center gap-2">
                  <div 
                    className="w-full bg-gradient-to-t from-accent to-orange-400 rounded-t-md transition-all hover:opacity-80"
                    style={{ height: `${(item.revenue / maxRevenue) * 100}%` }}
                  ></div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{item.month}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Traffic Sources */}
        <Card className="border-slate-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle>Traffic Sources</CardTitle>
            <CardDescription>Where your visitors come from</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {trafficSources.map((source) => (
                <div key={source.source} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{source.source}</span>
                    <span className="text-slate-500">{source.visits.toLocaleString()} ({source.percentage}%)</span>
                  </div>
                  <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-accent to-orange-400 rounded-full"
                      style={{ width: `${source.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Products */}
      <Card className="border-slate-200 dark:border-slate-700">
        <CardHeader>
          <CardTitle>Top Products</CardTitle>
          <CardDescription>Best selling products by revenue</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topProducts.map((product, index) => (
              <div key={product.name} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 text-accent font-medium">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium">{product.name}</p>
                    <p className="text-sm text-slate-500">{product.sales} sales</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{product.revenue}</p>
                  <p className={`text-xs ${product.growth.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                    {product.growth}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
