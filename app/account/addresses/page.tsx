'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const addresses = [
  {
    id: 1,
    type: 'Home',
    name: 'John Doe',
    address: '123 Main Street, Apt 4B',
    city: 'New York',
    state: 'NY',
    zip: '10001',
    country: 'United States',
    phone: '+1 (555) 123-4567',
    isDefault: true,
  },
  {
    id: 2,
    type: 'Work',
    name: 'John Doe',
    address: '456 Business Ave, Suite 100',
    city: 'New York',
    state: 'NY',
    zip: '10002',
    country: 'United States',
    phone: '+1 (555) 987-6543',
    isDefault: false,
  },
  {
    id: 3,
    type: 'Other',
    name: 'John Doe',
    address: '789 Other Street',
    city: 'Los Angeles',
    state: 'CA',
    zip: '90001',
    country: 'United States',
    phone: '+1 (555) 456-7890',
    isDefault: false,
  },
]

export default function AddressesPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">My Addresses</h2>
          <p className="text-muted-foreground">Manage your delivery addresses.</p>
        </div>
        <Button className="bg-orange-500 hover:bg-orange-600 text-black font-semibold">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add New Address
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {addresses.map((address) => (
          <Card key={address.id} className={`card-shadow ${address.isDefault ? 'border-orange-500 border-2' : ''}`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">{address.type}</CardTitle>
                {address.isDefault && (
                  <span className="bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded-full font-medium">
                    Default
                  </span>
                )}
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="font-medium">{address.name}</p>
                <p className="text-sm text-muted-foreground">{address.address}</p>
                <p className="text-sm text-muted-foreground">
                  {address.city}, {address.state} {address.zip}
                </p>
                <p className="text-sm text-muted-foreground">{address.country}</p>
                <p className="text-sm text-muted-foreground mt-2">{address.phone}</p>
              </div>
              {!address.isDefault && (
                <Button variant="outline" size="sm" className="w-full mt-4">
                  Set as Default
                </Button>
              )}
            </CardContent>
          </Card>
        ))}

        <Card className="card-shadow border-dashed border-2 border-border hover:border-orange-300 transition-colors cursor-pointer">
          <CardContent className="flex flex-col items-center justify-center h-full min-h-[200px] py-8">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <p className="font-medium text-muted-foreground">Add New Address</p>
            <p className="text-sm text-muted-foreground">Save a new delivery location</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
