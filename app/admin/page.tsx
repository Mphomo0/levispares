import { Button } from "@/components/ui/button"
import Link from "next/link"

const stats = [
  { label: "Total Revenue", value: "$124,563", trend: "↗ 12.5%" },
  { label: "Active Orders", value: "1,234", trend: "↗ 8.2%" },
  { label: "Products Live", value: "567", trend: "↗ 3.1%" },
  { label: "Total Users", value: "8,901", trend: "↘ 2.4%" },
]

export default function AdminDashboardPage() {
  return (
    <div className="space-y-24 animate-in fade-in duration-700">
      
      {/* MASSIVE TYPOGRAPHIC HERO / HEADER */}
      <div className="border-b border-white/10 pb-8 md:pb-12 flex flex-col xl:flex-row xl:items-end justify-between gap-8">
        <h1 className="text-6xl md:text-8xl lg:text-9xl font-black uppercase tracking-tighter text-white/90">
          OVERVIEW
        </h1>
        <div className="flex flex-col sm:flex-row gap-4 shrink-0 pb-2">
          <Button variant="outline" className="rounded-none border-white/20 hover:bg-white hover:text-black transition-colors px-8 py-6 uppercase font-bold text-xs tracking-widest bg-transparent text-white">
            Export Report
          </Button>
          <Button className="rounded-none bg-orange-500 hover:bg-orange-600 text-black px-8 py-6 uppercase font-bold text-xs tracking-widest transition-transform hover:scale-105 active:scale-95 border-none">
            + New Product
          </Button>
        </div>
      </div>

      {/* TYPOGRAPHIC STATS - No Cards, just massive numbers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8">
        {stats.map((stat, i) => (
          <div key={i} className="flex flex-col gap-2 group cursor-default">
            <div className="h-px w-full bg-white/20 group-hover:bg-orange-500 transition-colors duration-500 mb-4" />
            <span className="text-sm font-bold uppercase tracking-widest text-white/50">{stat.label}</span>
            <span className="text-5xl lg:text-6xl font-black tracking-tighter">{stat.value}</span>
            <span className={stat.trend.startsWith("↗") ? "text-green-500 font-mono text-sm" : "text-red-500 font-mono text-sm"}>
              {stat.trend} LAST 30D
            </span>
          </div>
        ))}
      </div>

      {/* ASYMMETRIC CONTENT SPLIT (70/30) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-24">
        
        {/* RECENT ORDERS (7 cols) */}
        <div className="lg:col-span-7 space-y-8">
          <div className="flex items-end justify-between border-b border-white/10 pb-4">
            <h2 className="text-3xl font-black uppercase tracking-tight">Recent Orders</h2>
            <Link href="/admin/orders" className="text-sm font-bold text-orange-500 hover:text-orange-400 uppercase tracking-widest transition-colors">View All</Link>
          </div>
          
          <div className="flex flex-col">
            {[
              { id: "ORD-001", customer: "John Doe", product: "Brake Pads", amount: "$89.99", status: "Completed" },
              { id: "ORD-002", customer: "Jane Smith", product: "Oil Filter", amount: "$24.99", status: "Pending" },
              { id: "ORD-003", customer: "Mike Johnson", product: "Spark Plugs", amount: "$45.00", status: "Processing" },
              { id: "ORD-004", customer: "Sarah Williams", product: "Air Filter", amount: "$32.50", status: "Completed" },
            ].map((order) => (
              <div key={order.id} className="grid grid-cols-4 md:grid-cols-5 items-center py-6 border-b border-white/5 hover:bg-white/5 transition-colors px-4 -mx-4 group">
                <span className="font-mono text-white/50 text-sm">{order.id}</span>
                <span className="hidden md:block font-medium truncate">{order.customer}</span>
                <span className="col-span-2 md:col-span-1 text-white/70 truncate">{order.product}</span>
                <span className="font-bold text-right">{order.amount}</span>
                <div className="text-right flex justify-end">
                  <span className={`text-xs uppercase font-bold tracking-widest px-3 py-1 ${
                    order.status === 'Completed' ? 'bg-green-500/10 text-green-500' :
                    order.status === 'Pending' ? 'bg-orange-500/10 text-orange-500' :
                    'bg-blue-500/10 text-blue-500'
                  }`}>
                    {order.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* TOP PRODUCTS (5 cols) */}
        <div className="lg:col-span-5 space-y-8 relative">
          <div className="absolute -inset-8 bg-zinc-900/40 -z-10 hidden lg:block border border-white/5" />
          <div className="flex items-end justify-between border-b border-white/10 pb-4">
            <h2 className="text-3xl font-black uppercase tracking-tight">Top Sellers</h2>
            <Link href="/admin/products" className="text-sm font-bold text-orange-500 hover:text-orange-400 uppercase tracking-widest transition-colors">View All</Link>
          </div>

          <div className="flex flex-col gap-8 pt-2">
            {[
              { name: "Premium Brake Pads", sales: 234, revenue: "$20,899" },
              { name: "Synthetic Oil 5W-30", sales: 189, revenue: "$9,450" },
              { name: "LED Headlights", sales: 156, revenue: "$12,480" },
              { name: "All-Season Tires", sales: 98, revenue: "$19,600" },
            ].map((product, i) => (
              <div key={i} className="flex items-start gap-6 group">
                <span className="text-3xl font-black text-white/10 group-hover:text-orange-500 transition-colors mt-1">0{i+1}</span>
                <div className="flex-1 border-b border-white/5 pb-6 group-hover:border-white/10 transition-colors">
                  <h3 className="font-bold text-lg">{product.name}</h3>
                  <div className="flex justify-between mt-2 text-sm text-white/50">
                    <span className="uppercase tracking-widest text-xs font-bold">{product.sales} UNITS</span>
                    <span className="text-white font-mono">{product.revenue}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
