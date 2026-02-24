'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

const categories = ['Brakes', 'Oil & Fluids', 'Filters', 'Electrical', 'Lighting', 'Tires', 'Batteries', 'Wipers']

export default function NewProductPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    const formData = new FormData(e.currentTarget)
    const data = {
      name: formData.get('name'),
      description: formData.get('description'),
      category: formData.get('category'),
      price: formData.get('price'),
      stock: formData.get('stock'),
      sku: formData.get('sku'),
    }
    
    console.log('Product data:', data)
    
    setTimeout(() => {
      setIsSubmitting(false)
      router.push('/admin/products')
    }, 1000)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Add New Product</h2>
          <p className="text-muted-foreground">Create a new product in your inventory.</p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back
        </Button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="card-shadow">
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Enter the basic details of your product.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Product Name</Label>
                <Input id="name" name="name" placeholder="Enter product name" required />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" placeholder="Enter product description" rows={4} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <select 
                    id="category" 
                    name="category" 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    required
                  >
                    <option value="">Select category</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sku">SKU</Label>
                  <Input id="sku" name="sku" placeholder="e.g., BRK-001" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-shadow">
            <CardHeader>
              <CardTitle>Pricing & Inventory</CardTitle>
              <CardDescription>Set price and stock details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Price</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input id="price" name="price" type="number" step="0.01" min="0" placeholder="0.00" className="pl-8" required />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stock">Stock Quantity</Label>
                  <Input id="stock" name="stock" type="number" min="0" placeholder="0" required />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="minStock">Minimum Stock Level</Label>
                <Input id="minStock" name="minStock" type="number" min="0" placeholder="10" />
                <p className="text-sm text-muted-foreground">Get notified when stock falls below this level.</p>
              </div>

              <div className="space-y-2">
                <Label>Product Images</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                  <svg className="mx-auto h-12 w-12 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="mt-2 text-sm text-muted-foreground">Click to upload or drag and drop</p>
                  <p className="text-xs text-muted-foreground">PNG, JPG up to 10MB</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-shadow lg:col-span-2">
            <CardHeader>
              <CardTitle>Additional Options</CardTitle>
              <CardDescription>Configure additional product settings.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="brand">Brand</Label>
                  <Input id="brand" name="brand" placeholder="Enter brand name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="partNumber">Part Number</Label>
                  <Input id="partNumber" name="partNumber" placeholder="Enter part number" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center justify-end gap-4 mt-6">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" className="bg-orange-500 hover:bg-orange-600 text-black font-semibold" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Saving...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Save Product
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
