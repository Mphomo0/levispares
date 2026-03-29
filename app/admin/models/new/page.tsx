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

export default function NewModelPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [slugManual, setSlugManual] = useState(false)
  const [withVariants, setWithVariants] = useState(false)
  const [variants, setVariants] = useState<string[]>([])

  const brands = useQuery(api.brands.listAll)
  const addModel = useMutation(api.models.add)
  const addWithVariants = useMutation(api.models.addWithVariants)

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value
    const autoSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const slugInput = document.getElementById('slug') as HTMLInputElement
    if (slugInput && !slugManual) {
      slugInput.value = autoSlug
    }
  }

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  }

  const addVariant = () => {
    setVariants([...variants, ''])
  }

  const removeVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index))
  }

  const updateVariant = (index: number, value: string) => {
    const updated = [...variants]
    updated[index] = value
    setVariants(updated)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)
    const name = formData.get('name') as string
    const brandId = formData.get('brandId') as string
    const slugValue = formData.get('slug') as string
    const yearFrom = formData.get('yearFrom') as string
    const yearTo = formData.get('yearTo') as string

    const slug = slugManual ? slugValue : generateSlug(name)

    try {
      if (withVariants && variants.length > 0) {
        const validVariants = variants
          .filter(v => v.trim() !== '')
        
        await addWithVariants({
          brandId: brandId as any,
          name,
          yearFrom: yearFrom ? parseInt(yearFrom) : undefined,
          yearTo: yearTo ? parseInt(yearTo) : undefined,
          variants: validVariants,
        })
      } else {
        await addModel({
          brandId: brandId as any,
          name,
          slug,
          yearFrom: yearFrom ? parseInt(yearFrom) : undefined,
          yearTo: yearTo ? parseInt(yearTo) : undefined,
        })
      }
      router.push('/admin/models')
    } catch (error: any) {
      console.error('Failed to add model:', error)
      alert(error.message || 'Failed to add model. Please try again.')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Add New Model</h2>
          <p className="text-muted-foreground">Create a new vehicle model.</p>
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
              <CardTitle>Model Details</CardTitle>
              <CardDescription>Enter the details for your new model.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="brandId">Brand *</Label>
                  <Select name="brandId" required>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a brand" />
                    </SelectTrigger>
                    <SelectContent>
                      {(brands || []).map((brand) => (
                        <SelectItem key={brand._id} value={brand._id}>
                          {brand.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Model Name *</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="e.g., Hilux, Corolla, Ranger"
                    required
                    onChange={handleNameChange}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="slug">URL Slug *</Label>
                    <button
                      type="button"
                      className="text-xs text-brand hover:text-brand"
                      onClick={() => setSlugManual(!slugManual)}
                    >
                      {slugManual ? 'Auto-generate from name' : 'Enter manually'}
                    </button>
                  </div>
                  <Input
                    id="slug"
                    name="slug"
                    placeholder="model-name"
                    required
                    disabled={!slugManual}
                  />
                  <p className="text-sm text-muted-foreground">
                    This will be used in URLs.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Production Years</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="yearFrom"
                      name="yearFrom"
                      type="number"
                      placeholder="From"
                      min="1900"
                      max="2100"
                    />
                    <span className="text-muted-foreground">to</span>
                    <Input
                      id="yearTo"
                      name="yearTo"
                      type="number"
                      placeholder="To"
                      min="1900"
                      max="2100"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={withVariants}
                    onChange={(e) => setWithVariants(e.target.checked)}
                    className="text-brand rounded"
                  />
                  <span className="text-sm font-medium">Add variants with model</span>
                </label>
              </div>

              {withVariants && (
                <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between">
                    <Label>Variants</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addVariant}>
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add Variant
                    </Button>
                  </div>
                  
                  {variants.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Click "Add Variant" to add variants.</p>
                  ) : (
                    <div className="space-y-3">
                      {variants.map((variant, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Input
                            placeholder="Variant value"
                            value={variant}
                            onChange={(e) => updateVariant(index, e.target.value)}
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeVariant(index)}
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

        <div className="flex flex-col md:flex-row gap-3 mt-6">
          <Button type="button" variant="outline" onClick={() => router.back()} className="w-full md:w-auto">
            Cancel
          </Button>
          <Button
            type="submit"
            className="w-full md:w-auto bg-brand hover:bg-brand text-white font-semibold"
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
                Save Model
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
