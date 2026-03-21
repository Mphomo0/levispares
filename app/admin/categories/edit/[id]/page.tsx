'use client'

import { useState, useEffect } from 'react'
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
import { Id } from '@/convex/_generated/dataModel'
import { use } from 'react'

export default function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const unwrappedParams = use(params)
  const categoryId = unwrappedParams.id as Id<'categories'>

  const category = useQuery(api.categories.getWithSubcategories, { id: categoryId })
  const categories = useQuery(api.categories.list, {})
  const updateCategory = useMutation(api.categories.update)
  const toggleActive = useMutation(api.categories.toggleActive)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [slugManual, setSlugManual] = useState(false)
  const [icon, setIcon] = useState<string>('🏷️')

  const emojiOptions = ['🛑', '💧', '🔧', '⚡', '💡', '🛞', '🔋', '🌧️', '🔩', '🧰', '💺', '🎯', '🚗', '🔑', '🛢️', '⚙️']

  useEffect(() => {
    if (category?.icon) {
      setIcon(category.icon)
    }
  }, [category])

  if (category === undefined) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <p className="text-muted-foreground italic">Loading category data...</p>
      </div>
    )
  }

  if (category === null) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <p className="text-destructive font-semibold">Category not found</p>
      </div>
    )
  }

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value
    const previewName = document.getElementById('preview-name')
    if (previewName) {
      previewName.textContent = name || 'Category Name'
    }
  }

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const description = e.target.value
    const previewDesc = document.getElementById('preview-description')
    if (previewDesc) {
      previewDesc.textContent = description || 'Category description'
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)
    const name = formData.get('name') as string
    const slugValue = formData.get('slug') as string
    const description = formData.get('description') as string
    const parentId = formData.get('parentId') as string

    const slug = slugManual ? slugValue : category.slug

    try {
      await updateCategory({
        id: categoryId,
        name: name !== category.name ? name : undefined,
        slug: slug !== category.slug ? slug : undefined,
        description: description !== (category.description || '') ? (description || undefined) : undefined,
        icon: icon !== category.icon ? icon : undefined,
        parentId: parentId !== (category.parentId || '') ? (parentId as Id<'categories'> || undefined) : undefined,
      })
      router.push('/admin/categories')
    } catch (error: any) {
      console.error('Failed to update category:', error)
      alert(error.message || 'Failed to update category. Please try again.')
      setIsSubmitting(false)
    }
  }

  const handleToggleActive = async () => {
    try {
      await toggleActive({ id: categoryId })
    } catch (error) {
      console.error('Failed to toggle category status:', error)
    }
  }

  const getParentName = (parentId: Id<'categories'>) => {
    const parent = categories?.find(c => c._id === parentId)
    return parent?.name || 'Unknown'
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Edit Category</h2>
          <p className="text-muted-foreground">Modify category details and settings.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleToggleActive}
            className={category.active ? 'text-yellow-600 hover:text-yellow-700' : 'text-green-600 hover:text-green-700'}
          >
            {category.active ? (
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
              <CardTitle>Category Details</CardTitle>
              <CardDescription>Update the details for this category.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Category Name</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={category.name}
                  placeholder="e.g., Brakes"
                  required
                  onChange={handleNameChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  defaultValue={category.description || ''}
                  placeholder="Describe this category"
                  rows={3}
                  onChange={handleDescriptionChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="parentId">Parent Category</Label>
                <Select name="parentId" defaultValue={category.parentId || ''}>
                  <SelectTrigger>
                    <SelectValue placeholder="No parent (top-level)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No parent (top-level)</SelectItem>
                    {(categories || [])
                      .filter(c => c._id !== categoryId)
                      .map((cat) => (
                        <SelectItem key={cat._id} value={cat._id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Leave empty for a top-level category.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">URL Slug</Label>
                <div className="flex items-center justify-between">
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
                  defaultValue={category.slug}
                  placeholder="category-name"
                  disabled={!slugManual}
                />
                <p className="text-sm text-muted-foreground">This will be used in the URL: /products/category-name</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Icon & Preview</CardTitle>
              <CardDescription>Choose an icon and preview your category.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Icon</Label>
                <div className="grid grid-cols-8 gap-2">
                  {emojiOptions.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      className={`h-10 w-10 rounded-lg border flex items-center justify-center text-xl transition-colors ${
                        icon === emoji
                          ? 'border-orange-500 bg-orange-50 dark:bg-orange-950'
                          : 'border-border hover:border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950'
                      }`}
                      onClick={() => {
                        setIcon(emoji)
                        const previewIcon = document.getElementById('preview-icon')
                        if (previewIcon) {
                          previewIcon.textContent = emoji
                        }
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                <Input
                  id="icon"
                  name="icon"
                  type="hidden"
                  value={icon}
                />
              </div>

              <div className="space-y-2">
                <Label>Preview</Label>
                <div className="flex items-center gap-4 p-4 rounded-lg border border-border">
                  <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center text-3xl" id="preview-icon">
                    {category.icon}
                  </div>
                  <div>
                    <p className="font-semibold text-lg" id="preview-name">{category.name}</p>
                    <p className="text-sm text-muted-foreground" id="preview-description">
                      {category.description || 'Category description'}
                    </p>
                  </div>
                </div>
              </div>

              {category.subcategories && category.subcategories.length > 0 && (
                <div className="space-y-2">
                  <Label>Subcategories ({category.subcategories.length})</Label>
                  <div className="flex flex-wrap gap-2">
                    {category.subcategories.map((sub: any) => (
                      <span
                        key={sub._id}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300"
                      >
                        {sub.icon} {sub.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {category.productCount !== undefined && (
                <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-950/20">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    <p className="text-sm text-blue-800 dark:text-blue-300">
                      This category has <strong>{category.productCount}</strong> associated product{category.productCount !== 1 ? 's' : ''}.
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Current Status</Label>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                    category.active
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                  }`}>
                    {category.active ? 'Active' : 'Inactive'}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {category.active ? 'Category is visible to customers' : 'Category is hidden from customers'}
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
