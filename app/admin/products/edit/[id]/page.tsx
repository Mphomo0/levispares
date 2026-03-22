'use client'

import ProductForm from '@/components/admin/ProductForm'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { use } from 'react'

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const unwrappedParams = use(params)
  const productId = unwrappedParams.id as Id<'products'>
  
  const product = useQuery(api.products.getById, { id: productId })

  if (product === undefined) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <p className="text-muted-foreground italic">Loading product data...</p>
      </div>
    )
  }

  if (product === null) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <p className="text-destructive font-semibold">Product not found</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
        <div className="flex flex-col-reverse md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Edit Product</h2>
          <p className="text-muted-foreground">Modify product details and inventory.</p>
        </div>
        <Button variant="outline" onClick={() => router.back()} className="w-full sm:w-auto">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back
        </Button>
      </div>

      <ProductForm initialData={product} isEditing />
    </div>
  )
}
