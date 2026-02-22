import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const products = [
  { id: 1, name: "Premium Brake Pads", category: "Brakes", price: "$89.99", stock: 234, status: "Active" },
  { id: 2, name: "Synthetic Oil 5W-30", category: "Oil & Fluids", price: "$24.99", stock: 567, status: "Active" },
  { id: 3, name: "LED Headlights", category: "Lighting", price: "$79.99", stock: 89, status: "Active" },
  { id: 4, name: "All-Season Tires", category: "Tires", price: "$199.99", stock: 45, status: "Low Stock" },
  { id: 5, name: "Car Battery 12V", category: "Electrical", price: "$99.99", stock: 0, status: "Out of Stock" },
  { id: 6, name: "Air Filter", category: "Filters", price: "$19.99", stock: 432, status: "Active" },
]

export default function AdminProductsPage() {
  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <div className="border-b border-white/10 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter text-white/90">
            PRODUCTS
          </h1>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 shrink-0 pb-1">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <Input placeholder="SEARCH PRODUCTS..." className="pl-10 w-full sm:w-64 rounded-none border-white/20 bg-transparent text-white placeholder:text-white/30 uppercase text-xs font-bold tracking-widest focus-visible:ring-offset-0 focus-visible:ring-1 focus-visible:ring-orange-500 h-12" />
          </div>
          <Button className="rounded-none bg-orange-500 hover:bg-orange-600 text-black px-8 py-0 h-12 uppercase font-bold text-xs tracking-widest transition-transform hover:scale-105 active:scale-95 border-none">
            + NEW
          </Button>
        </div>
      </div>

      <div className="w-full">
        {/* Header Row */}
        <div className="grid grid-cols-12 gap-4 pb-4 border-b border-white/20 text-xs font-bold uppercase tracking-widest text-white/50 px-4">
          <div className="col-span-5 md:col-span-4">PRODUCT</div>
          <div className="hidden md:block col-span-3">CATEGORY</div>
          <div className="col-span-2">PRICE</div>
          <div className="col-span-2">STOCK</div>
          <div className="col-span-3 md:col-span-1 text-right lg:pl-10">STATUS</div>
        </div>

        {/* List */}
        <div className="flex flex-col overflow-x-hidden">
          {products.map((product) => (
            <div key={product.id} className="grid grid-cols-12 gap-4 py-6 border-b border-white/5 items-center px-4 -mx-4 hover:bg-white/5 transition-colors group">
              <div className="col-span-5 md:col-span-4 flex items-center gap-4">
                <div className="h-12 w-12 bg-white/5 flex items-center justify-center shrink-0">
                  <svg className="h-5 w-5 text-white/30 group-hover:text-orange-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <span className="font-bold truncate">{product.name}</span>
              </div>
              <div className="hidden md:block col-span-3 text-white/60 text-sm">
                {product.category}
              </div>
              <div className="col-span-2 font-mono text-sm">
                {product.price}
              </div>
              <div className="col-span-2 font-mono text-sm">
                {product.stock}
              </div>
              <div className="col-span-3 md:col-span-1 text-right flex justify-end">
                <span className={`text-[10px] uppercase font-bold tracking-widest px-2 py-1 ${
                  product.status === 'Active' ? 'text-green-500 border border-green-500/30' :
                  product.status === 'Low Stock' ? 'text-orange-500 border border-orange-500/30' :
                  'text-red-500 border border-red-500/30'
                }`}>
                  {product.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
