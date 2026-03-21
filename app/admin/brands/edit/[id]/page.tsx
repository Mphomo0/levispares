'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import LogoUpload from '@/components/admin/LogoUpload'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { use } from 'react'

export default function EditBrandPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const unwrappedParams = use(params)
  const brandId = unwrappedParams.id as Id<'brands'>

  const brand = useQuery(api.brands.getById, { id: brandId })
  const updateBrand = useMutation(api.brands.update)
  const toggleActive = useMutation(api.brands.toggleActive)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [slugManual, setSlugManual] = useState(false)
  const [logo, setLogo] = useState<string | undefined>()

  useEffect(() => {
    if (brand?.logo) {
      setLogo(brand.logo)
    }
  }, [brand])

  if (brand === undefined) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <p className="text-muted-foreground italic">Loading brand data...</p>
      </div>
    )
  }

  if (brand === null) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <p className="text-destructive font-semibold">Brand not found</p>
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
    const slugValue = formData.get('slug') as string
    const description = formData.get('description') as string
    
    const slug = slugManual ? slugValue : brand.slug

    try {
      await updateBrand({
        id: brandId,
        name: name !== brand.name ? name : undefined,
        slug: slug !== brand.slug ? slug : undefined,
        logo: logo !== brand.logo ? logo : undefined,
        description: description !== (brand.description || '') ? (description || undefined) : undefined,
      })
      router.push('/admin/brands')
    } catch (error: any) {
      console.error('Failed to update brand:', error)
      alert(error.message || 'Failed to update brand. Please try again.')
      setIsSubmitting(false)
    }
  }

  const handleToggleActive = async () => {
    try {
      await toggleActive({ id: brandId })
    } catch (error) {
      console.error('Failed to toggle brand status:', error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Edit Brand</h2>
          <p className="text-muted-foreground">Modify brand details and settings.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleToggleActive}
            className={brand.active ? 'text-yellow-600 hover:text-yellow-700' : 'text-green-600 hover:text-green-700'}
          >
            {brand.active ? (
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
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Brand Details</CardTitle>
              <CardDescription>Update the details for this brand.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Brand Name *</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={brand.name}
                  placeholder="e.g., Toyota, Bosch, Michelin"
                  required
                  onChange={handleNameChange}
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
                    {slugManual ? 'Auto-generate from name' : 'Enter manually'}
                  </button>
                </div>
                <Input
                  id="slug"
                  name="slug"
                  defaultValue={brand.slug}
                  placeholder="brand-name"
                  required
                  disabled={!slugManual}
                />
                <p className="text-sm text-muted-foreground">
                  This will be used in URLs: /products/brand-name
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  defaultValue={brand.description || ''}
                  placeholder="Describe this brand..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Logo</CardTitle>
              <CardDescription>Upload or update the brand logo.</CardDescription>
            </CardHeader>
            <CardContent>
              <LogoUpload
                value={logo}
                onChange={setLogo}
                folder="/brands"
                label=""
              />

              <div className="mt-6 space-y-4">
                <div className="space-y-2">
                  <Label>Current Status</Label>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                      brand.active
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                    }`}>
                      {brand.active ? 'Active' : 'Inactive'}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {brand.active ? 'Brand is visible to customers' : 'Brand is hidden from customers'}
                    </span>
                  </div>
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
