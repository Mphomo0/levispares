'use client'

import { useState, useRef, useEffect } from 'react'
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
import { useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import {
  ImageKitAbortError,
  ImageKitInvalidRequestError,
  ImageKitServerError,
  ImageKitUploadNetworkError,
  upload,
} from '@imagekit/next'

interface ImageItem {
  file?: File
  url: string
  progress?: number
  uploading?: boolean
}

interface ProductFormProps {
  initialData?: any
  isEditing?: boolean
}

export default function ProductForm({ initialData, isEditing }: ProductFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [images, setImages] = useState<ImageItem[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const categories = useQuery(api.categories.list)
  const addProduct = useMutation(api.products.add)
  const updateProduct = useMutation(api.products.update)

  useEffect(() => {
    if (initialData?.imageUrls?.length) {
      setImages(initialData.imageUrls.map((url: string) => ({ url })))
    } else if (initialData?.images?.length) {
      setImages(initialData.images.map((url: string) => ({ url })))
    } else if (initialData?.image) {
      setImages([{ url: initialData.image }])
    }
  }, [initialData])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      const newImages: ImageItem[] = files.map(file => ({
        file,
        url: URL.createObjectURL(file),
      }))
      setImages(prev => [...prev, ...newImages].slice(0, 10))
    }
  }

  const removeImage = (index: number) => {
    setImages(prev => {
      const updated = [...prev]
      if (updated[index].file) {
        URL.revokeObjectURL(updated[index].url)
      }
      updated.splice(index, 1)
      return updated
    })
  }

  const authenticator = async () => {
    const response = await fetch('/api/upload-auth')
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Auth failed: ${response.status}: ${errorText}`)
    }
    const data = await response.json()
    return data as { signature: string; expire: string; token: string; publicKey: string }
  }

  const uploadToImageKit = async (file: File, index: number): Promise<string> => {
    const authParams = await authenticator()

    const { signature, expire, token, publicKey } = authParams

    const response = await upload({
      signature,
      expire: Number(expire),
      token,
      publicKey,
      file,
      fileName: file.name,
      folder: '/products',
      onProgress: (event) => {
        const pct = Math.round((event.loaded / event.total) * 100)
        setImages(prev => {
          const updated = [...prev]
          if (updated[index]) {
            updated[index] = { ...updated[index], progress: pct, uploading: true }
          }
          return updated
        })
      },
    })

    setImages(prev => {
      const updated = [...prev]
      if (updated[index]) {
        updated[index] = { ...updated[index], url: response.url!, uploading: false, progress: 100, file: undefined }
      }
      return updated
    })

    return response.url!
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const formData = new FormData(e.currentTarget)
      const imageUrls: string[] = []

      for (let i = 0; i < images.length; i++) {
        const item = images[i]
        if (item.file) {
          try {
            const url = await uploadToImageKit(item.file, i)
            imageUrls.push(url)
          } catch (error) {
            if (error instanceof ImageKitAbortError) {
              console.error('Upload aborted:', error.reason)
            } else if (error instanceof ImageKitInvalidRequestError) {
              console.error('Invalid request:', error.message)
            } else if (error instanceof ImageKitUploadNetworkError) {
              console.error('Network error:', error.message)
            } else if (error instanceof ImageKitServerError) {
              console.error('Server error:', error.message)
            } else {
              console.error('Upload error:', error)
            }
            setIsSubmitting(false)
            return
          }
        } else {
          imageUrls.push(item.url)
        }
      }

      const productData = {
        name: formData.get('name') as string,
        description: formData.get('description') as string,
        price: parseFloat(formData.get('price') as string),
        category: formData.get('category') as string,
        make: formData.get('make') as string,
        model: formData.get('model') as string,
        inventory: parseInt(formData.get('inventory') as string),
        imageUrls,
        specs: [],
      }

      if (isEditing) {
        await updateProduct({
          id: initialData._id,
          ...productData,
        })
      } else {
        await addProduct(productData)
      }

      router.push('/admin/products')
      router.refresh()
    } catch (error) {
      console.error('Failed to save product:', error)
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Product Details</CardTitle>
            <CardDescription>Basic information about the product.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Product Name</Label>
              <Input id="name" name="name" defaultValue={initialData?.name} placeholder="e.g., Premium Brake Pads" required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="make">Make</Label>
                <Input id="make" name="make" defaultValue={initialData?.make} placeholder="e.g., Toyota" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <Input id="model" name="model" defaultValue={initialData?.model} placeholder="e.g., Hilux" required />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" defaultValue={initialData?.description} placeholder="Product description..." rows={5} required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Price (R)</Label>
                <Input id="price" name="price" type="number" step="0.01" defaultValue={initialData?.price} placeholder="0.00" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inventory">Inventory</Label>
                <Input id="inventory" name="inventory" type="number" defaultValue={initialData?.inventory || 0} placeholder="0" required />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select name="category" defaultValue={initialData?.category} required>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((cat) => (
                    <SelectItem key={cat._id} value={cat.name}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Product Images</CardTitle>
            <CardDescription>Upload up to 10 images. At least 1 is required.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {images.map((image, index) => (
                <div key={index} className="aspect-square rounded-lg border bg-muted relative group overflow-hidden">
                  <img src={image.url} alt={`Preview ${index}`} className="h-full w-full object-cover" />
                  {image.uploading && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-16 h-16 rounded-full border-4 border-white/30 border-t-white animate-spin mx-auto" />
                        <span className="text-white text-xs mt-2 block">{image.progress ?? 0}%</span>
                      </div>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  {index === 0 && (
                    <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[10px] text-center py-0.5">
                      Primary
                    </div>
                  )}
                </div>
              ))}
              {images.length < 10 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square rounded-lg border-2 border-dashed border-muted flex flex-col items-center justify-center bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <svg className="h-8 w-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="mt-1 text-xs text-muted-foreground">Add Image</span>
                </button>
              )}
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleImageChange} />
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <svg className="h-4 w-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>The first image will be used as the main thumbnail.</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-end gap-4">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button 
          type="submit" 
          className="bg-orange-500 hover:bg-orange-600 text-black font-semibold" 
          disabled={isSubmitting || images.length < 1}
        >
          {isSubmitting ? 'Saving...' : isEditing ? 'Update Product' : 'Add Product'}
        </Button>
      </div>
      {images.length < 1 && (
        <p className="text-right text-xs text-destructive">
          * Please upload at least 1 image to proceed.
        </p>
      )}
    </form>
  )
}
