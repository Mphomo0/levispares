'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { toast } from 'sonner'

export default function NewCategoryPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [slugManual, setSlugManual] = useState(false)
  const [icon, setIcon] = useState<string>('🏷️')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)

  const categories = useQuery(api.categories.list, {})
  const addCategory = useMutation(api.categories.add)

  const emojiOptions = ['🛑', '💧', '🔧', '⚡', '💡', '🛞', '🔋', '🌧️', '🔩', '🧰', '💺', '🎯']

  const generateSlug = (value: string) => {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  }

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setName(value)
    if (!slugManual) {
      const slugInput = document.getElementById('slug') as HTMLInputElement
      if (slugInput) slugInput.value = generateSlug(value)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const categoryName = formData.get('name') as string
    const categoryDescription = formData.get('description') as string
    const categorySlug = formData.get('slug') as string
    const categoryParentId = formData.get('parentId') as string

    const slug = slugManual ? categorySlug : generateSlug(categoryName)

    if (!slug) {
      setError('Please enter a valid slug.')
      setIsSubmitting(false)
      return
    }

    try {
      await addCategory({
        name: categoryName,
        description: categoryDescription || undefined,
        icon,
        slug,
        parentId: categoryParentId && categoryParentId !== '__none__' ? (categoryParentId as any) : undefined,
      })
      toast('Category created', { description: `"${categoryName}" has been added.` })
      router.push('/admin/categories')
    } catch (err: any) {
      console.error('Failed to add category:', err)
      const message = err?.message || 'Failed to add category. Please try again.'
      setError(message)
      toast('Error', { description: message })
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Add New Category</h2>
          <p className="text-muted-foreground">Create a new product category.</p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back
        </Button>
      </div>

      <form onSubmit={handleSubmit}>
        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive mb-4">
            {error}
          </div>
        )}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="">
            <CardHeader>
              <CardTitle>Category Details</CardTitle>
              <CardDescription>Enter the details for your new category.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Category Name *</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="e.g., Brakes"
                  required
                  value={name}
                  onChange={handleNameChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Describe this category"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="parentId">Parent Category</Label>
                <Select name="parentId">
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="No parent (top-level)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No parent (top-level)</SelectItem>
                    {(categories || []).map((cat) => (
                      <SelectItem key={cat._id} value={cat._id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Leave empty to create a top-level category.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="slug">URL Slug *</Label>
                  <button
                    type="button"
                    className="text-xs text-brand hover:text-brand"
                    onClick={() => {
                      setSlugManual(!slugManual)
                      if (!slugManual && name) {
                        const slugInput = document.getElementById('slug') as HTMLInputElement
                        if (slugInput) slugInput.value = generateSlug(name)
                      }
                    }}
                  >
                    {slugManual ? 'Auto-generate from name' : 'Enter manually'}
                  </button>
                </div>
                <Input
                  id="slug"
                  name="slug"
                  placeholder="category-name"
                  required
                  disabled={!slugManual}
                />
                <p className="text-sm text-muted-foreground">
                  This will be used in the URL: /products/category-name
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="">
            <CardHeader>
              <CardTitle>Icon & Preview</CardTitle>
              <CardDescription>Choose an icon and see how your category will appear.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Icon</Label>
                <div className="grid grid-cols-6 gap-2">
                  {emojiOptions.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      className={`h-10 w-10 rounded-lg border flex items-center justify-center text-xl transition-colors ${
                        icon === emoji
                          ? 'border-brand bg-brand dark:bg-orange-950'
                          : 'border-border hover:border-brand hover:bg-brand dark:hover:bg-orange-950'
                      }`}
                      onClick={() => setIcon(emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">Select an icon or emoji for this category.</p>
              </div>

              <div className="space-y-2">
                <Label>Preview</Label>
                <div className="flex items-center gap-4 p-4 rounded-lg border border-border">
                  <div className="h-16 w-16 rounded-lg bg-brand dark:bg-orange-900/30 flex items-center justify-center text-3xl">
                    {icon}
                  </div>
                  <div>
                    <p className="font-semibold text-lg">{name || 'Category Name'}</p>
                    <p className="text-sm text-muted-foreground">{description || 'Category description'}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      value="active"
                      defaultChecked
                      className="text-brand"
                    />
                    <span className="text-sm">Active</span>
                  </label>
                </div>
                <p className="text-sm text-muted-foreground">
                  New categories are created as active by default.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-end gap-4 mt-6">
          <Button type="button" variant="outline" onClick={() => router.back()} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button
            type="submit"
            className="w-full sm:w-auto bg-brand hover:bg-brand text-white font-semibold"
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
                Save Category
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
