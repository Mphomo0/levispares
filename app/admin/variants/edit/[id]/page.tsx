'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { use } from 'react'

export default function EditVariantPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const unwrappedParams = use(params)
  const variantId = unwrappedParams.id as Id<'variants'>

  const variant = useQuery(api.variants.getWithModel, { id: variantId })
  const models = useQuery(api.models.list, {})
  const brands = useQuery(api.brands.listAll, {})
  const updateVariant = useMutation(api.variants.update)
  const toggleActive = useMutation(api.variants.toggleActive)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [slugManual, setSlugManual] = useState(false)

  if (variant === undefined) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <p className="text-muted-foreground italic">Loading variant data...</p>
      </div>
    )
  }

  if (variant === null) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <p className="text-destructive font-semibold">Variant not found</p>
      </div>
    )
  }

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    const autoSlug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const slugInput = document.getElementById('slug') as HTMLInputElement
    if (slugInput && !slugManual) {
      slugInput.value = autoSlug
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)
    const modelId = formData.get('modelId') as string
    const variantType = formData.get('variantType') as string
    const variantValue = formData.get('variantValue') as string
    const slugValue = formData.get('slug') as string

    const slug = slugManual ? slugValue : variant.slug

    try {
      await updateVariant({
        id: variantId,
        modelId: modelId !== variant.modelId ? modelId as any : undefined,
        variantType: variantType !== variant.variantType ? variantType as 'GVM' | 'Engine' | 'Chassis' : undefined,
        variantValue: variantValue !== variant.variantValue ? variantValue : undefined,
        slug: slug !== variant.slug ? slug : undefined,
      })
      router.push('/admin/variants')
    } catch (error: any) {
      console.error('Failed to update variant:', error)
      alert(error.message || 'Failed to update variant. Please try again.')
      setIsSubmitting(false)
    }
  }

  const handleToggleActive = async () => {
    try {
      await toggleActive({ id: variantId })
    } catch (error) {
      console.error('Failed to toggle variant status:', error)
    }
  }

  const getModelBrand = (modelId: Id<'models'>) => {
    const model = models?.find(m => m._id === modelId)
    if (!model) return null
    const brand = brands?.find(b => b._id === model.brandId)
    return { model, brand }
  }

  const { model: parentModel, brand: parentBrand } = getModelBrand(variant.modelId) || {}

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Edit Variant</h2>
          <p className="text-muted-foreground">Modify variant details and settings.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleToggleActive}
            className={variant.active ? 'text-yellow-600 hover:text-yellow-700' : 'text-green-600 hover:text-green-700'}
          >
            {variant.active ? (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
                Deactivate
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Activate
              </>
            )}
          </Button>
          <Button variant="outline" onClick={() => router.back()}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Variant Details</CardTitle>
              <CardDescription>Update the details for this variant.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="modelId">Model *</Label>
                  <Select name="modelId" defaultValue={variant.modelId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a model" />
                    </SelectTrigger>
                    <SelectContent>
                      {(brands || []).map((brand) => (
                        <SelectItem key={brand._id} value={brand._id} disabled>
                          <div className="font-semibold">{brand.name}</div>
                        </SelectItem>
                      ))}
                      {(models || []).map((model) => {
                        const { brand } = getModelBrand(model._id) || {}
                        return (
                          <SelectItem key={model._id} value={model._id} className="pl-6">
                            {brand && <span className="text-muted-foreground mr-2">{brand.name} -</span>}{model.name}
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="variantType">Variant Type *</Label>
                  <Select name="variantType" defaultValue={variant.variantType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GVM">GVM (Gross Vehicle Mass)</SelectItem>
                      <SelectItem value="Engine">Engine</SelectItem>
                      <SelectItem value="Chassis">Chassis</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="variantValue">Variant Value *</Label>
                  <Input
                    id="variantValue"
                    name="variantValue"
                    defaultValue={variant.variantValue}
                    placeholder="e.g., 3500kg, 2.8L Diesel, Cab Chassis"
                    required
                    onChange={handleValueChange}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="slug">URL Slug *</Label>
                    <button
                      type="button"
                      className="text-xs text-orange-500 hover:text-orange-600"
                      onClick={() => setSlugManual(!slugManual)}
                    >
                      {slugManual ? 'Auto-generate from value' : 'Enter manually'}
                    </button>
                  </div>
                  <Input
                    id="slug"
                    name="slug"
                    defaultValue={variant.slug}
                    placeholder="variant-value"
                    required
                    disabled={!slugManual}
                  />
                </div>
              </div>

              {parentModel && (
                <div className="p-4 border rounded-lg bg-muted/50">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-white flex items-center justify-center overflow-hidden">
                      {parentBrand?.logo ? (
                        <img src={parentBrand.logo} alt={parentBrand.name} className="h-full w-full object-contain p-1" />
                      ) : (
                        <span className="text-lg font-bold text-muted-foreground">
                          {parentBrand?.name?.charAt(0).toUpperCase() || 'M'}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{parentBrand?.name} {parentModel.name}</p>
                      <p className="text-sm text-muted-foreground">Parent brand and model</p>
                    </div>
                  </div>
                </div>
              )}

              {'productCount' in variant && variant.productCount !== undefined && variant.productCount > 0 && (
                <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-950/20">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm text-blue-800 dark:text-blue-300">
                      This variant has <strong>{(variant as any).productCount}</strong> associated product{(variant as any).productCount !== 1 ? 's' : ''}.
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Current Status</Label>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                    variant.active
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                  }`}>
                    {variant.active ? 'Active' : 'Inactive'}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {variant.active ? 'Variant is available for products' : 'Variant is hidden from products'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center justify-end gap-4 mt-6">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button
            type="submit"
            className="bg-orange-500 hover:bg-orange-600 text-black font-semibold"
            disabled={isSubmitting}
          >
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
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
