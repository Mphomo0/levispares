"use client"

import { useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

const NAV_ITEMS = [
  { name: 'General', icon: '⚙️' },
  { name: 'Store Settings', icon: '🏪' },
  { name: 'Payment Methods', icon: '💳' },
  { name: 'Shipping', icon: '🚚' },
  { name: 'Email Templates', icon: '📧' },
  { name: 'API Keys', icon: '🔑' },
  { name: 'Appearance', icon: '🎨' },
]

export default function AdminSettingsPage() {
  const [selected, setSelected] = useState('General')

  const [storeName, setStoreName] = useState('LeviSpares')
  const [storeEmail, setStoreEmail] = useState('admin@levispares.com')
  const [storeUrl, setStoreUrl] = useState('https://levispares.com')
  const [storePhone, setStorePhone] = useState('+1 (555) 000-0000')
  const [storeAddress, setStoreAddress] = useState(
    '123 Auto Parts Street, New York, NY 10001',
  )
  const [saving, setSaving] = useState(false)

  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [guestCheckout, setGuestCheckout] = useState(true)
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [inventoryAlerts, setInventoryAlerts] = useState(true)

  async function handleSave() {
    setSaving(true)
    try {
      await new Promise((r) => setTimeout(r, 700))
      console.log({ storeName, storeEmail, storeUrl, storePhone, storeAddress })
      // TODO: call API to persist settings
    } catch (e) {
      console.error(e)
    }
    setSaving(false)
  }

  function handleReset() {
    const ok = window.confirm(
      'This will delete ALL products, orders and customer data. This action is irreversible. Do you want to continue?',
    )
    if (ok) {
      // TODO: call destructive API
      console.log('Reset confirmed')
      alert('Reset executed (placeholder)')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-slate-500 dark:text-slate-400">
          Manage your admin panel preferences.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <Card className="border-slate-200 dark:border-slate-700">
            <CardContent className="p-2">
              <nav className="space-y-1" aria-label="Settings navigation">
                {NAV_ITEMS.map((item) => (
                  <button
                    key={item.name}
                    onClick={() => setSelected(item.name)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selected === item.name
                        ? 'bg-accent text-white'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>{item.icon}</span>
                    {item.name}
                  </button>
                ))}
              </nav>
            </CardContent>
          </Card>
        </div>

        {/* Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* General Settings */}
          <Card className="border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>
                Manage your store information and preferences.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="storeName">Store Name</Label>
                  <Input
                    id="storeName"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    className="input-styled"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="storeEmail">Store Email</Label>
                  <Input
                    id="storeEmail"
                    type="email"
                    value={storeEmail}
                    onChange={(e) => setStoreEmail(e.target.value)}
                    className="input-styled"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="storeUrl">Store URL</Label>
                <Input
                  id="storeUrl"
                  value={storeUrl}
                  onChange={(e) => setStoreUrl(e.target.value)}
                  className="input-styled"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="storePhone">Contact Phone</Label>
                <Input
                  id="storePhone"
                  type="tel"
                  value={storePhone}
                  onChange={(e) => setStorePhone(e.target.value)}
                  className="input-styled"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="storeAddress">Business Address</Label>
                <Textarea
                  id="storeAddress"
                  rows={3}
                  value={storeAddress}
                  onChange={(e) => setStoreAddress(e.target.value)}
                  className="input-styled"
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  className="btn-accent"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Store Settings */}
          <Card className="border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle>Store Configuration</CardTitle>
              <CardDescription>Configure your store settings.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <div>
                  <p className="font-medium">Maintenance Mode</p>
                  <p className="text-sm text-slate-500">
                    Temporarily hide your store from visitors
                  </p>
                </div>
                <button
                  role="switch"
                  aria-label="Toggle maintenance mode"
                  aria-checked={maintenanceMode}
                  onClick={() => setMaintenanceMode(!maintenanceMode)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${maintenanceMode ? 'bg-accent' : 'bg-slate-200 dark:bg-slate-700'}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${maintenanceMode ? 'translate-x-6' : 'translate-x-1'}`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <div>
                  <p className="font-medium">Allow Guest Checkout</p>
                  <p className="text-sm text-slate-500">
                    Let customers checkout without an account
                  </p>
                </div>
                <button
                  role="switch"
                  aria-label="Toggle guest checkout"
                  aria-checked={guestCheckout}
                  onClick={() => setGuestCheckout(!guestCheckout)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${guestCheckout ? 'bg-accent' : 'bg-slate-200 dark:bg-slate-700'}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${guestCheckout ? 'translate-x-6' : 'translate-x-1'}`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <div>
                  <p className="font-medium">Email Notifications</p>
                  <p className="text-sm text-slate-500">
                    Receive email for new orders
                  </p>
                </div>
                <button
                  role="switch"
                  aria-label="Toggle email notifications"
                  aria-checked={emailNotifications}
                  onClick={() => setEmailNotifications(!emailNotifications)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${emailNotifications ? 'bg-accent' : 'bg-slate-200 dark:bg-slate-700'}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${emailNotifications ? 'translate-x-6' : 'translate-x-1'}`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <div>
                  <p className="font-medium">Inventory Alerts</p>
                  <p className="text-sm text-slate-500">
                    Get notified when products are low on stock
                  </p>
                </div>
                <button
                  role="switch"
                  aria-label="Toggle inventory alerts"
                  aria-checked={inventoryAlerts}
                  onClick={() => setInventoryAlerts(!inventoryAlerts)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${inventoryAlerts ? 'bg-accent' : 'bg-slate-200 dark:bg-slate-700'}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${inventoryAlerts ? 'translate-x-6' : 'translate-x-1'}`}
                  />
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-red-200 dark:border-red-900/50">
            <CardHeader>
              <CardTitle className="text-red-600">Danger Zone</CardTitle>
              <CardDescription>
                Irreversible actions that affect your store.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-red-50 dark:bg-red-900/10">
                <div>
                  <p className="font-medium text-red-600">Reset All Data</p>
                  <p className="text-sm text-red-500">
                    Delete all products, orders, and customer data
                  </p>
                </div>
                <Button variant="destructive" size="sm" onClick={handleReset}>
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
