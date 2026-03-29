'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useEffect } from 'react'
import { useQuery, useMutation, useAction } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { toast } from 'sonner'

const statuses = ['All', 'Active', 'Inactive']

const getStatusColor = (active: boolean | undefined) => {
  return active
    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
    : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
}

const getStatusLabel = (active: boolean | undefined) => {
  return active ? 'Active' : 'Inactive'
}

export default function AdminCategoriesPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [mounted, setMounted] = useState(false)
  const [statusFilter, setStatusFilter] = useState('All')

  const categories = useQuery(api.categories.list, {})
  const productCounts = useQuery(api.categories.getProductCounts)
  const removeCategory = useMutation(api.categories.remove)
  const toggleActive = useMutation(api.categories.toggleActive)
  const deleteImage = useAction(api.imageActions.deleteImage)

  useEffect(() => {
    if (!mounted) {
      setMounted(true)
    }
  }, [mounted])

  const filteredCategories = (categories || []).filter((category) => {
    const matchesSearch = category.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
    const matchesStatus =
      statusFilter === 'All' || getStatusLabel(category.active) === statusFilter
    return matchesSearch && matchesStatus
  })

  const categoryStats = {
    total: categories?.length || 0,
    active: categories?.filter((c) => c.active).length || 0,
    inactive: categories?.filter((c) => !c.active).length || 0,
  }

  const handleDelete = async (
    id: Id<'categories'>,
    imageUrl?: string | null,
  ) => {
    const count = productCounts?.[id] || 0
    if (count > 0) {
      toast('Cannot delete', {
        description: `This category has ${count} product${count !== 1 ? 's' : ''} assigned. Remove or reassign them first.`,
      })
      return
    }
    if (
      confirm(
        'Are you sure you want to delete this category? This will also delete all subcategories.',
      )
    ) {
      try {
        const result = await removeCategory({ id })
        if (result?.imageUrl) {
          await deleteImage({ url: result.imageUrl })
        }
        toast('Category deleted')
      } catch (error: any) {
        console.error('Failed to delete category:', error)
        toast('Error', {
          description:
            error?.message || 'Failed to delete category. Please try again.',
        })
      }
    }
  }

  const handleToggleActive = async (id: Id<'categories'>) => {
    try {
      await toggleActive({ id })
    } catch (error) {
      console.error('Failed to toggle category status:', error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Categories</h2>
          <p className="text-muted-foreground">Manage product categories.</p>
        </div>
        <Link href="/admin/categories/new" className="w-full md:w-auto">
          <Button className="w-full md:w-auto bg-brand hover:bg-brand text-white font-semibold">
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Category
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Categories
            </CardTitle>
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                />
              </svg>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categoryStats.total}</div>
            <p className="text-xs text-muted-foreground">All categories</p>
          </CardContent>
        </Card>
        <Card className="">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Categories
            </CardTitle>
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categoryStats.active}</div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>
        <Card className="">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Inactive Categories
            </CardTitle>
            <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                />
              </svg>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categoryStats.inactive}</div>
            <p className="text-xs text-muted-foreground">Disabled categories</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <Input
                placeholder="Search categories..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {statuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status === 'All' ? 'All Statuses' : status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Categories Grid */}
      <Card className="">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Categories</CardTitle>
              <CardDescription>
                {filteredCategories.length} category
                {filteredCategories.length !== 1 ? 's' : ''} found
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {!categories || productCounts === undefined ? (
              <div className="col-span-full space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-32 bg-muted rounded-lg animate-pulse"
                  />
                ))}
              </div>
            ) : filteredCategories.length === 0 ? (
              <div className="col-span-full py-12 text-center bg-muted/30 rounded-xl border border-dashed">
                <p className="text-muted-foreground font-medium">
                  No categories found
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Try adjusting your filters or add a new category.
                </p>
              </div>
            ) : (
              filteredCategories.map((category) => {
                const productCount = productCounts[category._id] || 0
                const hasProducts = productCount > 0
                return (
                  <Card
                    key={category._id}
                    className={`hover:shadow-md transition-shadow ${hasProducts ? 'border-amber-200 dark:border-amber-800' : ''}`}
                  >
                    <CardHeader className="flex flex-row items-center gap-4 pb-2">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-50 dark:bg-red-900/30 text-2xl">
                        {category.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base truncate">
                          {category.name}
                        </CardTitle>
                        <CardDescription>
                          {category.parentId ? 'Subcategory' : 'Top-level'}
                        </CardDescription>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(category.active)}`}
                          >
                            {getStatusLabel(category.active)}
                          </span>
                          {hasProducts && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                              <svg
                                className="h-3 w-3"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                                />
                              </svg>
                              {productCount} product
                              {productCount !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        {mounted && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                id={`actions-${category._id}`}
                              >
                                <svg
                                  className="h-4 w-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                                  />
                                </svg>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <div className="px-2 py-1.5 text-xs text-muted-foreground font-medium">
                                Actions
                              </div>
                              <DropdownMenuSeparator />
                              <div
                                className={`${hasProducts ? 'opacity-50 pointer-events-none' : ''}`}
                                title={
                                  hasProducts
                                    ? 'Cannot edit: category has associated products'
                                    : undefined
                                }
                              >
                                <Link
                                  href={`/admin/categories/edit/${category._id}`}
                                >
                                  <DropdownMenuItem className="cursor-pointer">
                                    <svg
                                      className="mr-2 h-4 w-4"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                                      />
                                    </svg>
                                    Edit Category
                                  </DropdownMenuItem>
                                </Link>
                              </div>
                              <DropdownMenuItem
                                className="cursor-pointer"
                                onClick={() => handleToggleActive(category._id)}
                              >
                                <svg
                                  className="mr-2 h-4 w-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                                  />
                                </svg>
                                {category.active ? 'Deactivate' : 'Activate'}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className={`${hasProducts ? 'opacity-50 cursor-not-allowed' : 'text-red-600 focus:text-red-600 cursor-pointer'}`}
                                onClick={() =>
                                  !hasProducts &&
                                  handleDelete(category._id, category.image)
                                }
                              >
                                <svg
                                  className="mr-2 h-4 w-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
                                Delete Category
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                      {hasProducts && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                          Cannot edit or delete while products are assigned.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
