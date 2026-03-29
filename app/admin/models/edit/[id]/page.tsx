'use client'

import { useState, useEffect } from 'react'
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

export default function EditModelPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const unwrappedParams = use(params)
  const modelId = unwrappedParams.id as Id<'models'>

  const model = useQuery(api.models.getWithBrand, { id: modelId })
  const brands = useQuery(api.brands.listAll)
  const updateModel = useMutation(api.models.update)
  const toggleActive = useMutation(api.models.toggleActive)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [slugManual, setSlugManual] = useState(false)

  if (model === undefined) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <p className="text-muted-foreground italic">Loading model data...</p>
      </div>
    )
  }

  if (model === null) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <p className="text-destructive font-semibold">Model not found</p>
      </div>
    )
  }

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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)
    const name = formData.get('name') as string
    const brandId = formData.get('brandId') as string
    const slugValue = formData.get('slug') as string
    const yearFrom = formData.get('yearFrom') as string
    const yearTo = formData.get('yearTo') as string

    const slug = slugManual ? slugValue : model.slug

    try {
      await updateModel({
        id: modelId,
        name: name !== model.name ? name : undefined,
        brandId: brandId !== model.brandId ? brandId as any : undefined,
        slug: slug !== model.slug ? slug : undefined,
        yearFrom: yearFrom ? parseInt(yearFrom) : undefined,
        yearTo: yearTo ? parseInt(yearTo) : undefined,
      })
      router.push('/admin/models')
    } catch (error: any) {
      console.error('Failed to update model:', error)
      alert(error.message || 'Failed to update model. Please try again.')
      setIsSubmitting(false)
    }
  }

  const handleToggleActive = async () => {
    try {
      await toggleActive({ id: modelId })
    } catch (error) {
      console.error('Failed to toggle model status:', error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Edit Model</h2>
          <p className="text-muted-foreground">Modify model details and settings.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleToggleActive}
            className={model.active ? 'text-yellow-600 hover:text-yellow-700' : 'text-green-600 hover:text-green-700'}
          >
            {model.active ? (
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
              <CardTitle>Model Details</CardTitle>
              <CardDescription>Update the details for this model.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="brandId">Brand *</Label>
                  <Select name="brandId" defaultValue={model.brandId}>
                    <SelectTrigger>
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
                    defaultValue={model.name}
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
                    defaultValue={model.slug}
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
                      defaultValue={model.yearFrom || ''}
                    />
                    <span className="text-muted-foreground">to</span>
                    <Input
                      id="yearTo"
                      name="yearTo"
                      type="number"
                      placeholder="To"
                      min="1900"
                      max="2100"
                      defaultValue={model.yearTo || ''}
                    />
                  </div>
                </div>
              </div>

              {model.brand && (
                <div className="p-4 border rounded-lg bg-muted/50">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-white flex items-center justify-center overflow-hidden">
                      {model.brand.logo ? (
                        <img src={model.brand.logo} alt={model.brand.name} className="h-full w-full object-contain p-1" />
                      ) : (
                        <span className="text-lg font-bold text-muted-foreground">
                          {model.brand.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{model.brand.name}</p>
                      <p className="text-sm text-muted-foreground">Parent brand</p>
                    </div>
                  </div>
                </div>
              )}

              {model.variants && model.variants.length > 0 && (
                <div className="space-y-2">
                  <Label>Associated Variants ({model.variants.length})</Label>
                  <div className="flex flex-wrap gap-2">
                    {model.variants.map((variant: any) => (
                      <span
                        key={variant._id}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-brand text-orange-800 dark:bg-orange-900/30 dark:text-brand"
                      >
                        {variant.variantType}: {variant.variantValue}
                      </span>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Manage variants from the <a href="/admin/variants" className="text-brand hover:underline">Variants page</a>.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label>Current Status</Label>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                    model.active
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                  }`}>
                    {model.active ? 'Active' : 'Inactive'}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {model.active ? 'Model is visible to customers' : 'Model is hidden from customers'}
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
            className="bg-brand hover:bg-brand text-black font-semibold"
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
