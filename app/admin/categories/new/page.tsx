'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export default function NewCategoryPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    const formData = new FormData(e.currentTarget)
    const data = {
      name: formData.get('name'),
      description: formData.get('description'),
      icon: formData.get('icon'),
    }
    
    console.log('Category data:', data)
    
    setTimeout(() => {
      setIsSubmitting(false)
      router.push('/admin/categories')
    }, 1000)
  }

  const emojiOptions = ['🛑', '💧', '🔧', '⚡', '💡', '🛞', '🔋', '🌧️', '🔩', '🧰', '💺', '🎯']

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
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="card-shadow">
            <CardHeader>
              <CardTitle>Category Details</CardTitle>
              <CardDescription>Enter the details for your new category.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Category Name</Label>
                <Input id="name" name="name" placeholder="e.g., Brakes" required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" placeholder="Describe this category" rows={3} />
              </div>

              <div className="space-y-2">
                <Label>Icon</Label>
                <div className="grid grid-cols-6 gap-2">
                  {emojiOptions.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      className="h-10 w-10 rounded-lg border border-border hover:border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950 flex items-center justify-center text-xl transition-colors"
                      onClick={() => {
                        const input = document.getElementById('icon') as HTMLInputElement
                        if (input) input.value = emoji
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                <Input id="icon" name="icon" type="hidden" />
                <p className="text-sm text-muted-foreground">Select an icon or emoji for this category.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="card-shadow">
            <CardHeader>
              <CardTitle>Preview</CardTitle>
              <CardDescription>See how your category will appear.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 p-4 rounded-lg border border-border">
                <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center text-3xl" id="preview-icon">
                  🏷️
                </div>
                <div>
                  <p className="font-semibold text-lg" id="preview-name">Category Name</p>
                  <p className="text-sm text-muted-foreground" id="preview-description">Category description</p>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="slug">URL Slug</Label>
                  <Input id="slug" name="slug" placeholder="category-name" />
                  <p className="text-sm text-muted-foreground">This will be used in the URL: /products/category-name</p>
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="status" value="active" defaultChecked className="text-orange-500" />
                      <span className="text-sm">Active</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="status" value="inactive" className="text-orange-500" />
                      <span className="text-sm">Inactive</span>
                    </label>
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
                Save Category
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
