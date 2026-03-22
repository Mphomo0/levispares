'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import LogoUpload from '@/components/admin/LogoUpload'

import { useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'

export default function NewBrandPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [slugManual, setSlugManual] = useState(false)
  const [logo, setLogo] = useState<string | undefined>()
  const [logoFileId, setLogoFileId] = useState<string | undefined>()
  const addBrand = useMutation(api.brands.add)

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
    
    const slug = slugManual ? slugValue : generateSlug(name)

    try {
      await addBrand({
        name,
        slug,
        logo,
        imageKitFileId: logoFileId,
        description: description || undefined,
      })
      router.push('/admin/brands')
    } catch (error: any) {
      console.error('Failed to add brand:', error)
      alert(error.message || 'Failed to add brand. Please try again.')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Add New Brand</h2>
          <p className="text-muted-foreground">Create a new vehicle or product brand.</p>
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
          <Card>
            <CardHeader>
              <CardTitle>Brand Details</CardTitle>
              <CardDescription>Enter the details for your new brand.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Brand Name *</Label>
                <Input
                  id="name"
                  name="name"
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
                  placeholder="Describe this brand..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Logo</CardTitle>
              <CardDescription>Upload a logo for this brand.</CardDescription>
            </CardHeader>
            <CardContent>
              <LogoUpload
                value={logo}
                onChange={(url, fileId) => {
                  setLogo(url)
                  setLogoFileId(fileId)
                }}
                folder="/brands"
                label=""
              />

              <div className="mt-6 space-y-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="status"
                        value="active"
                        defaultChecked
                        className="text-orange-500"
                      />
                      <span className="text-sm">Active</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="status"
                        value="inactive"
                        className="text-orange-500"
                      />
                      <span className="text-sm">Inactive</span>
                    </label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    New brands are created as active by default.
                  </p>
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
                Save Brand
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
