'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'

const products = [
  { id: 1, name: 'Premium Brake Pads', category: 'Brakes', price: '$89.99', stock: 234, status: 'Active' },
  { id: 2, name: 'Synthetic Oil 5W-30', category: 'Oil & Fluids', price: '$24.99', stock: 567, status: 'Active' },
  { id: 3, name: 'LED Headlights', category: 'Lighting', price: '$79.99', stock: 89, status: 'Active' },
  { id: 4, name: 'All-Season Tires', category: 'Tires', price: '$199.99', stock: 45, status: 'Low Stock' },
  { id: 5, name: 'Car Battery 12V', category: 'Electrical', price: '$99.99', stock: 0, status: 'Out of Stock' },
  { id: 6, name: 'Air Filter', category: 'Filters', price: '$19.99', stock: 432, status: 'Active' },
]

export default function AdminProductsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Products</h2>
          <p className="text-muted-foreground">Manage your product inventory.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <Input placeholder="Search products..." className="pl-9 w-64" />
          </div>
          <Link href="/admin/products/new">
            <Button className="bg-orange-500 hover:bg-orange-600 text-black font-semibold">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Product
            </Button>
          </Link>
        </div>
      </div>

      <Card className="card-shadow">
        <CardHeader>
          <CardTitle>All Products</CardTitle>
          <CardDescription>View and manage your product catalog.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative w-full overflow-auto">
            <table className="w-full caption-bottom text-sm">
              <thead className="[&_tr]:border-b">
                <tr className="border-b transition-colors hover:bg-muted/50">
                  <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Product</th>
                  <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Category</th>
                  <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Price</th>
                  <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Stock</th>
                  <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Status</th>
                  <th className="h-10 px-2 text-right align-middle font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {products.map((product) => (
                  <tr key={product.id} className="border-b transition-colors hover:bg-muted/50">
                    <td className="p-2 align-middle">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                          <svg className="h-5 w-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <span className="font-medium">{product.name}</span>
                      </div>
                    </td>
                    <td className="p-2 align-middle text-muted-foreground">{product.category}</td>
                    <td className="p-2 align-middle font-mono">{product.price}</td>
                    <td className="p-2 align-middle font-mono">{product.stock}</td>
                    <td className="p-2 align-middle">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        product.status === 'Active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                        product.status === 'Low Stock' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                        'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {product.status}
                      </span>
                    </td>
                    <td className="p-2 align-middle text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" aria-label="Edit product">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive" aria-label="Delete product">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
