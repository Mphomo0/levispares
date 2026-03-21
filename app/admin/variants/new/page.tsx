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

export default function NewVariantPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [slugManual, setSlugManual] = useState(false)
  const [withBulkVariants, setWithBulkVariants] = useState(false)
  const [bulkVariants, setBulkVariants] = useState<Array<{ variantType: string; variantValue: string }>>([])

  const models = useQuery(api.models.list, {})
  const brands = useQuery(api.brands.listAll, {})
  const addVariant = useMutation(api.variants.add)
  const addBulkVariants = useMutation(api.variants.addBulk)

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    const autoSlug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const slugInput = document.getElementById('slug') as HTMLInputElement
    if (slugInput && !slugManual) {
      slugInput.value = autoSlug
    }
  }

  const generateSlug = (value: string) => {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  }

  const addBulkVariant = () => {
    setBulkVariants([...bulkVariants, { variantType: 'GVM', variantValue: '' }])
  }

  const removeBulkVariant = (index: number) => {
    setBulkVariants(bulkVariants.filter((_, i) => i !== index))
  }

  const updateBulkVariant = (index: number, field: 'variantType' | 'variantValue', value: string) => {
    const updated = [...bulkVariants]
    updated[index] = { ...updated[index], [field]: value }
    setBulkVariants(updated)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)
    const modelId = formData.get('modelId') as string
    const variantType = formData.get('variantType') as string
    const variantValue = formData.get('variantValue') as string
    const slugValue = formData.get('slug') as string

    const slug = slugManual ? slugValue : generateSlug(variantValue)

    try {
      if (withBulkVariants && bulkVariants.length > 0) {
        const validVariants = bulkVariants
          .filter(v => v.variantValue.trim() !== '')
          .map(v => ({
            variantType: v.variantType as 'GVM' | 'Engine' | 'Chassis',
            variantValue: v.variantValue,
          }))
        
        await addBulkVariants({
          modelId: modelId as any,
          variants: validVariants,
        })
      } else {
        await addVariant({
          modelId: modelId as any,
          variantType: variantType as 'GVM' | 'Engine' | 'Chassis',
          variantValue,
          slug,
        })
      }
      router.push('/admin/variants')
    } catch (error: any) {
      console.error('Failed to add variant:', error)
      alert(error.message || 'Failed to add variant. Please try again.')
      setIsSubmitting(false)
    }
  }

  const getModelBrand = (modelId: string) => {
    const model = models?.find(m => m._id === modelId)
    if (!model) return null
    const brand = brands?.find(b => b._id === model.brandId)
    return { model, brand }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Add New Variant</h2>
          <p className="text-muted-foreground">Create a new vehicle variant.</p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back
        </Button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Variant Details</CardTitle>
              <CardDescription>Enter the details for your new variant.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="modelId">Model *</Label>
                  <Select name="modelId" required>
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
                  <Select name="variantType" required>
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
                    placeholder="variant-value"
                    required
                    disabled={!slugManual}
                  />
                </div>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={withBulkVariants}
                    onChange={(e) => setWithBulkVariants(e.target.checked)}
                    className="text-orange-500 rounded"
                  />
                  <span className="text-sm font-medium">Add multiple variants</span>
                </label>
              </div>

              {withBulkVariants && (
                <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between">
                    <Label>Multiple Variants</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addBulkVariant}>
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add Variant
                    </Button>
                  </div>
                  
                  {bulkVariants.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Click "Add Variant" to add multiple variants at once.</p>
                  ) : (
                    <div className="space-y-3">
                      {bulkVariants.map((variant, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Select
                            value={variant.variantType}
                            onValueChange={(value) => updateBulkVariant(index, 'variantType', value)}
                          >
                            <SelectTrigger className="w-[140px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="GVM">GVM</SelectItem>
                              <SelectItem value="Engine">Engine</SelectItem>
                              <SelectItem value="Chassis">Chassis</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            placeholder="Variant value"
                            value={variant.variantValue}
                            onChange={(e) => updateBulkVariant(index, 'variantValue', e.target.value)}
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeBulkVariant(index)}
                            className="text-red-500 hover:text-red-600"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
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
                Save Variant
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
