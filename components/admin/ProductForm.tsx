'use client'

import { useRef, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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
import { useMutation, useQuery, useAction } from 'convex/react'
import { api } from '@/convex/_generated/api'
import {
  ImageKitAbortError,
  ImageKitInvalidRequestError,
  ImageKitServerError,
  ImageKitUploadNetworkError,
  upload,
} from '@imagekit/next'
import { Id } from '@/convex/_generated/dataModel'
import { toast } from 'sonner'

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

const productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  brandId: z.string().min(1, 'Brand is required'),
  modelId: z.string().optional(),
  variantId: z.string().optional(),
  categoryId: z.string().min(1, 'Category is required'),
  description: z.string().optional(),
  price: z.preprocess((val) => Number(val), z.number().min(0.01, 'Price must be greater than 0')),
  stockQty: z.preprocess((val) => parseInt(String(val), 10) || 0, z.number().int().min(0)),
  partNumber: z.string().optional(),
})

type ProductFormData = z.infer<typeof productSchema>

export default function ProductForm({ initialData, isEditing }: ProductFormProps) {
  const router = useRouter()
  const [images, setImages] = useState<ImageItem[]>([])
  const [originalImages, setOriginalImages] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const categories = useQuery(api.categories.list, {})
  const brands = useQuery(api.brands.list, {})
  const deleteImages = useAction(api.imageActions.deleteImages)

  const { control, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema) as any,
    defaultValues: {
      name: initialData?.name || '',
      brandId: initialData?.brand?._id || '',
      modelId: initialData?.model?._id || '',
      variantId: initialData?.variant?._id || '',
      categoryId: initialData?.categoryId || initialData?.category?._id || '',
      description: initialData?.description || '',
      price: initialData?.price || '',
      stockQty: initialData?.stockQty ?? initialData?.inventory ?? 0,
      partNumber: initialData?.partNumber || '',
    },
  })

  const selectedBrandId = watch('brandId')
  const selectedModelId = watch('modelId')
  const selectedVariantId = watch('variantId')

  const models = useQuery(api.models.listActive, { brandId: selectedBrandId ? selectedBrandId as Id<'brands'> : undefined })
  const variants = useQuery(api.variants.listActive, { modelId: selectedModelId ? selectedModelId as Id<'models'> : undefined })

  const addWithRelations = useMutation(api.products.addWithRelations)
  const updateWithRelations = useMutation(api.products.updateWithRelations)

  useEffect(() => {
    let loadedImages: ImageItem[] = []
    let loadedUrls: string[] = []
    
    const urls: string[] = []
    
    if (initialData?.image) {
      urls.push(initialData.image)
    }
    
    if (initialData?.images?.length) {
      for (const img of initialData.images) {
        const url = typeof img === 'string' ? img : img.url
        if (url && !urls.includes(url)) {
          urls.push(url)
        }
      }
    }
    
    if (urls.length > 0) {
      loadedImages = urls.map(url => ({ url }))
      loadedUrls = urls
    }
    
    setImages(loadedImages)
    setOriginalImages(loadedUrls)
  }, [initialData])

  useEffect(() => {
    if (isEditing && initialData) {
      setValue('brandId', initialData.brand?._id || '')
      setValue('modelId', initialData.model?._id || '')
      setValue('variantId', initialData.variant?._id || '')
    }
  }, [initialData, isEditing, setValue])

  const handleBrandChange = (value: string) => {
    setValue('brandId', value, { shouldValidate: true })
    setValue('modelId', '', { shouldValidate: true })
    setValue('variantId', '', { shouldValidate: true })
  }

  const handleModelChange = (value: string) => {
    setValue('modelId', value, { shouldValidate: true })
    setValue('variantId', '', { shouldValidate: true })
  }

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

  const onSubmit = async (data: ProductFormData) => {
    if (images.length < 1) {
      toast.error('Please upload at least 1 image')
      return
    }

    try {
      const imageUrls: string[] = []
      const imagesToDelete: string[] = []

      if (isEditing && originalImages.length > 0) {
        const currentUrls = images
          .filter(img => !img.file)
          .map(img => img.url)
        
        for (const originalUrl of originalImages) {
          if (!currentUrls.includes(originalUrl)) {
            imagesToDelete.push(originalUrl)
          }
        }
      }

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
            toast('Image upload failed', { description: 'Please try again.' })
            return
          }
        } else {
          imageUrls.push(item.url)
        }
      }

      const productData = {
        name: data.name,
        description: data.description || undefined,
        price: data.price,
        stockQty: data.stockQty ?? 0,
        categoryId: data.categoryId as Id<'categories'>,
        brandId: data.brandId as Id<'brands'>,
        modelId: data.modelId ? data.modelId as Id<'models'> : undefined,
        variantId: data.variantId ? data.variantId as Id<'variants'> : undefined,
        partNumber: data.partNumber || undefined,
        image: imageUrls[0] || undefined,
        specs: [],
      }

      if (isEditing && initialData?._id) {
        await updateWithRelations({
          id: initialData._id as Id<'products'>,
          ...productData,
        })
        
        if (imagesToDelete.length > 0) {
          await deleteImages({ urls: imagesToDelete })
        }
        
        toast('Product updated', { description: 'Your changes have been saved.' })
      } else {
        await addWithRelations(productData)
        toast('Product created', { description: 'The product has been added to your catalog.' })
      }

      router.push('/admin/products')
      router.refresh()
    } catch (error: any) {
      console.error('Failed to save product:', error)
      const message = error?.message || 'Failed to save product. Please try again.'
      toast(message, { description: 'Failed to save product.' })
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Product Details</CardTitle>
            <CardDescription>Basic information about the product.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Product Name</Label>
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <>
                    <Input {...field} id="name" placeholder="e.g., Premium Brake Pads" />
                    {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                  </>
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Brand / Make</Label>
                <Controller
                  name="brandId"
                  control={control}
                  render={({ field }) => (
                    <>
                      <Select value={field.value} onValueChange={handleBrandChange}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select brand" />
                        </SelectTrigger>
                        <SelectContent>
                          {brands?.map((brand) => (
                            <SelectItem key={brand._id} value={brand._id}>
                              {brand.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.brandId && <p className="text-sm text-destructive">{errors.brandId.message}</p>}
                    </>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label>Model</Label>
                <Controller
                  name="modelId"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value || ''} onValueChange={handleModelChange} disabled={!selectedBrandId}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={selectedBrandId ? "Select model (optional)" : "Select brand first"} />
                      </SelectTrigger>
                      <SelectContent>
                        {models?.map((model) => (
                          <SelectItem key={model._id} value={model._id}>
                            {model.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label>Variant</Label>
                <Controller
                  name="variantId"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value || ''} onValueChange={field.onChange} disabled={!selectedModelId}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={selectedModelId ? "Select variant" : "Select model first"} />
                      </SelectTrigger>
                      <SelectContent>
                        {variants?.map((variant) => (
                          <SelectItem key={variant._id} value={variant._id}>
                            {variant.variantValue} ({variant.variantType})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <Textarea {...field} id="description" placeholder="Product description..." rows={5} />
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Price (R)</Label>
                <Controller
                  name="price"
                  control={control}
                  render={({ field }) => (
                    <>
                      <Input {...field} id="price" type="number" step="0.01" placeholder="0.00" />
                      {errors.price && <p className="text-sm text-destructive">{errors.price.message}</p>}
                    </>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stockQty">Inventory</Label>
                <Controller
                  name="stockQty"
                  control={control}
                  render={({ field }) => (
                    <>
                      <Input {...field} id="stockQty" type="number" placeholder="0" />
                      {errors.stockQty && <p className="text-sm text-destructive">{errors.stockQty.message}</p>}
                    </>
                  )}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="partNumber">Part Number</Label>
              <Controller
                name="partNumber"
                control={control}
                render={({ field }) => (
                  <Input {...field} id="partNumber" placeholder="e.g., BP-12345" />
                )}
              />
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Controller
                name="categoryId"
                control={control}
                render={({ field }) => (
                  <>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories?.map((cat) => (
                          <SelectItem key={cat._id} value={cat._id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.categoryId && <p className="text-sm text-destructive">{errors.categoryId.message}</p>}
                  </>
                )}
              />
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

      <div className="flex flex-col sm:flex-row items-center justify-end gap-4">
        <Button type="button" variant="outline" onClick={() => router.back()} className="w-full sm:w-auto">
          Cancel
        </Button>
        <Button
          type="submit"
          className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-white font-semibold"
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
