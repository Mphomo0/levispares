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

const categories = [
  { id: 1, name: 'Brakes', products: 45, icon: '🛑', status: 'Active' },
  { id: 2, name: 'Oil & Fluids', products: 78, icon: '💧', status: 'Active' },
  { id: 3, name: 'Filters', products: 56, icon: '🔧', status: 'Active' },
  { id: 4, name: 'Electrical', products: 89, icon: '⚡', status: 'Active' },
  { id: 5, name: 'Lighting', products: 67, icon: '💡', status: 'Active' },
  { id: 6, name: 'Tires', products: 34, icon: '🛞', status: 'Active' },
  { id: 7, name: 'Batteries', products: 23, icon: '🔋', status: 'Inactive' },
  { id: 8, name: 'Wipers', products: 19, icon: '🌧️', status: 'Active' },
]

export default function AdminCategoriesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Categories</h2>
          <p className="text-muted-foreground">Manage product categories.</p>
        </div>
        <Link href="/admin/categories/new">
          <Button className="bg-orange-500 hover:bg-orange-600 text-black font-semibold">
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

      <Card className="card-shadow">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Categories</CardTitle>
              <CardDescription>
                View and manage product categories.
              </CardDescription>
            </div>
            <div className="relative">
              <svg
                className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"
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
                className="pl-9 w-64 input-styled"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {categories.map((category) => (
              <Card
                key={category.id}
                className="card-shadow-hover transition-all hover:scale-[1.02]"
              >
                <CardHeader className="flex flex-row items-center gap-4 pb-2">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-2xl">
                    {category.icon}
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-base">{category.name}</CardTitle>
                    <CardDescription>
                      {category.products} products
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        category.status === 'Active'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                      }`}
                    >
                      {category.status}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Edit category"
                      >
                        <svg
                          className="w-4 h-4"
                          aria-hidden="true"
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
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-destructive"
                        aria-label="Delete category"
                      >
                        <svg
                          className="w-4 h-4"
                          aria-hidden="true"
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
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
