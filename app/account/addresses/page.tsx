'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useUser } from '@clerk/nextjs'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { toast } from 'sonner'

const MAX_ADDRESSES = 3

const emptyForm = {
  label: 'Home',
  name: '',
  street: '',
  city: '',
  province: '',
  postalCode: '',
  country: 'South Africa',
  phone: '',
  isDefault: false,
}

export default function AddressesPage() {
  const { user } = useUser()
  const addresses = useQuery(api.addresses.listByUser)
  const addAddress = useMutation(api.addresses.add)
  const updateAddress = useMutation(api.addresses.update)
  const removeAddress = useMutation(api.addresses.remove)
  const setDefaultAddress = useMutation(api.addresses.setDefault)

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<Id<'addresses'> | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const canAddMore = (addresses?.length ?? 0) < MAX_ADDRESSES

  const openAddForm = () => {
    setEditingId(null)
    setForm({ ...emptyForm, isDefault: (addresses?.length ?? 0) === 0 })
    setShowForm(true)
  }

  const openEditForm = (addr: typeof addresses extends (infer T)[] | undefined ? T : never) => {
    if (!addr) return
    setEditingId(addr._id)
    setForm({
      label: addr.label ?? 'Home',
      name: addr.name,
      street: addr.street,
      city: addr.city,
      province: addr.province ?? '',
      postalCode: addr.postalCode,
      country: addr.country,
      phone: addr.phone ?? '',
      isDefault: addr.isDefault ?? false,
    })
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!user?.id) return
    if (!form.name.trim() || !form.street.trim() || !form.city.trim() || !form.province.trim() || !form.postalCode.trim() || !form.phone.trim()) {
      toast.error('Please fill in all required fields.')
      return
    }
    setSaving(true)
    try {
      if (editingId) {
        await updateAddress({ id: editingId, ...form })
        toast.success('Address updated')
      } else {
        await addAddress({ type: 'shipping', ...form })
        toast.success('Address added')
      }
      setShowForm(false)
      setEditingId(null)
      setForm(emptyForm)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: Id<'addresses'>) => {
    try {
      await removeAddress({ id })
      toast.success('Address deleted')
    } catch {
      toast.error('Failed to delete address')
    }
  }

  const handleSetDefault = async (id: Id<'addresses'>) => {
    try {
      await setDefaultAddress({ id })
      toast.success('Default address updated')
    } catch {
      toast.error('Failed to set default address')
    }
  }

  const loading = addresses === undefined

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">My Addresses</h2>
          <p className="text-muted-foreground">
            Manage your delivery addresses ({addresses?.length ?? 0}/{MAX_ADDRESSES}).
          </p>
        </div>
        {canAddMore && !showForm && (
          <Button onClick={openAddForm} className="bg-brand hover:bg-brand text-white font-semibold">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add New Address
          </Button>
        )}
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <Card className="card-shadow border-orange-200 dark:border-orange-900/50">
          <CardHeader>
            <CardTitle>{editingId ? 'Edit Address' : 'Add New Address'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="label">Label</Label>
                <select
                  id="label"
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                  className="w-full px-3 py-2 text-sm border rounded-lg bg-background"
                >
                  <option value="Home">Home</option>
                  <option value="Work">Work</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Full name"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="street">Street Address *</Label>
              <Input
                id="street"
                value={form.street}
                onChange={(e) => setForm({ ...form, street: e.target.value })}
                placeholder="123 Main Street, Apt 4B"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder="Johannesburg"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="province">Province *</Label>
                <Input
                  id="province"
                  value={form.province}
                  onChange={(e) => setForm({ ...form, province: e.target.value })}
                  placeholder="Gauteng"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="postalCode">Postal Code *</Label>
                <Input
                  id="postalCode"
                  value={form.postalCode}
                  onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
                  placeholder="2000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+27 12 345 6789"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isDefault"
                checked={form.isDefault}
                onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand"
              />
              <Label htmlFor="isDefault" className="font-normal">Set as default address</Label>
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} disabled={saving} className="bg-brand hover:bg-brand text-white font-semibold">
                {saving ? 'Saving...' : editingId ? 'Update Address' : 'Save Address'}
              </Button>
              <Button variant="outline" onClick={() => { setShowForm(false); setEditingId(null); setForm(emptyForm) }}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Address List */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      ) : addresses.length === 0 && !showForm ? (
        <Card className="card-shadow">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <svg className="h-16 w-16 text-muted-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <h3 className="mt-4 text-lg font-medium">No addresses yet</h3>
            <p className="text-sm text-muted-foreground mt-1">Add your first delivery address to get started.</p>
            <Button onClick={openAddForm} className="mt-4 bg-brand hover:bg-brand text-white font-semibold">
              Add Address
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {addresses.map((address) => (
            <Card key={address._id} className={`card-shadow ${address.isDefault ? 'border-brand border-2' : ''}`}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg">{address.label}</CardTitle>
                  {address.isDefault && (
                    <span className="bg-brand text-orange-700 text-xs px-2 py-0.5 rounded-full font-medium dark:bg-orange-900/30 dark:text-brand">
                      Default
                    </span>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditForm(address)}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(address._id)}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <p className="font-medium">{address.name}</p>
                  <p className="text-sm text-muted-foreground">{address.street}</p>
                  <p className="text-sm text-muted-foreground">
                    {address.city}, {address.province} {address.postalCode}
                  </p>
                  <p className="text-sm text-muted-foreground">{address.country}</p>
                  <p className="text-sm text-muted-foreground mt-2">{address.phone}</p>
                </div>
                {!address.isDefault && (
                  <Button variant="outline" size="sm" className="w-full mt-4" onClick={() => handleSetDefault(address._id)}>
                    Set as Default
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}

          {/* Add new card — only show if under limit and form not open */}
          {canAddMore && !showForm && (
            <Card
              className="card-shadow border-dashed border-2 border-border hover:border-orange-300 transition-colors cursor-pointer"
              onClick={openAddForm}
            >
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
          )}
        </div>
      )}
    </div>
  )
}
