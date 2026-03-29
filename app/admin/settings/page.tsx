"use client"

import { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { toast } from 'sonner'

export default function AdminSettingsPage() {
  const resetAllData = useMutation(api.admin.resetAllData)
  const storeSettings = useQuery(api.settings.get)
  const updateSettings = useMutation(api.settings.update)

  const [taxEnabled, setTaxEnabled] = useState(false)
  const [taxRate, setTaxRate] = useState('')
  const [savingTax, setSavingTax] = useState(false)
  const [showSavedMessage, setShowSavedMessage] = useState(false)
  
const [shippingRate, setShippingRate] = useState('')
const [savingShipping, setSavingShipping] = useState(false)
  const [showSavedShippingMessage, setShowSavedShippingMessage] = useState(false)

  const [showConfirm, setShowConfirm] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [resetting, setResetting] = useState(false)

  useEffect(() => {
    if (storeSettings) {
      setTaxEnabled(storeSettings.taxEnabled ?? false)
      setTaxRate((storeSettings.taxRate ?? 0) > 0 ? String(storeSettings.taxRate) : '')
setShippingRate(String(storeSettings.shippingRate ?? 250))
  }
  }, [storeSettings])

  async function handleSaveTax() {
    const rate = parseFloat(taxRate)
    if (taxEnabled && (isNaN(rate) || rate <= 0 || rate > 100)) {
      toast.error('Please enter a valid tax rate between 0.01 and 100.')
      return
    }
    setSavingTax(true)
    try {
await updateSettings({
      taxEnabled,
      taxRate: taxEnabled ? rate : 0,
      shippingRate: parseFloat(shippingRate) || 0,
    })
      toast.success('Tax settings saved.')
      setShowSavedMessage(true)
      setTimeout(() => setShowSavedMessage(false), 3000)
    } catch {
      toast.error('Failed to save tax settings.')
    } finally {
      setSavingTax(false)
    }
  }

async function handleSaveShipping() {
  const sRate = parseFloat(shippingRate)

  if (isNaN(sRate) || sRate < 0) {
    toast.error('Please enter a valid positive number for shipping rate.')
    return
  }

  setSavingShipping(true)
  try {
    await updateSettings({
      taxEnabled,
      taxRate: taxEnabled ? parseFloat(taxRate) : 0,
      shippingRate: sRate,
    })
      toast.success('Shipping settings saved.')
      setShowSavedShippingMessage(true)
      setTimeout(() => setShowSavedShippingMessage(false), 3000)
    } catch {
      toast.error('Failed to save shipping settings.')
    } finally {
      setSavingShipping(false)
    }
  }

  async function handleReset() {
    if (confirmText !== 'RESET') return
    setResetting(true)
    try {
      await resetAllData()
      toast.success('All data has been reset successfully.')
      setShowConfirm(false)
      setConfirmText('')
    } catch {
      toast.error('Failed to reset data. Please try again.')
    } finally {
      setResetting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">
          Manage your admin panel preferences.
        </p>
      </div>

      {/* Tax Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h-.01m5.51 5h-.01M19 21l-7-4-7 4V5a2 2 0 012-2h10a2 2 0 012 2v16z" />
            </svg>
            Tax Configuration
          </CardTitle>
          <CardDescription>
            Enable and configure tax rates for your store. When enabled, tax will be applied to all orders.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-secondary/30">
            <div>
              <p className="font-medium text-foreground">Enable Tax</p>
              <p className="text-sm text-muted-foreground">
                Apply tax to all customer orders
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={taxEnabled}
              onClick={() => setTaxEnabled(!taxEnabled)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${
                taxEnabled ? 'bg-accent' : 'bg-brand'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform duration-200 ease-in-out ${
                  taxEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Tax Rate Input */}
          {taxEnabled && (
            <div className="p-4 rounded-lg border border-border bg-secondary/30 space-y-2">
              <label htmlFor="tax-rate" className="block text-sm font-medium text-foreground">
                Tax Rate (%)
              </label>
              <div className="relative max-w-xs">
                <input
                  id="tax-rate"
                  type="number"
                  min="0.01"
                  max="100"
                  step="0.01"
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                  placeholder="e.g. 15"
                  className="w-full px-3 py-2 pr-8 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Enter the tax percentage (e.g. 15 for 15% VAT).
              </p>
            </div>
          )}

          {/* Save Area */}
          <div className="flex items-center gap-4">
            <Button
              onClick={handleSaveTax}
              disabled={savingTax}
              className="bg-brand text-white hover:bg-brand"
            >
              {savingTax ? 'Saving...' : 'Save Tax Settings'}
            </Button>
            {showSavedMessage && (
              <span className="text-sm font-medium text-green-600 dark:text-green-500 animate-in fade-in duration-300">
                ✓ Settings saved successfully
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Shipping Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
            Shipping Configuration
          </CardTitle>
<CardDescription>
          Configure your standard shipping rate.
        </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Shipping Rate Input */}
            <div className="p-4 rounded-lg border border-border bg-secondary/30 space-y-2">
              <label htmlFor="shipping-rate" className="block text-sm font-medium text-foreground">
                Standard Shipping Rate (R)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R</span>
                <input
                  id="shipping-rate"
                  type="number"
                  min="0"
                  step="0.01"
                  value={shippingRate}
                  onChange={(e) => setShippingRate(e.target.value)}
                  placeholder="e.g. 250"
                  className="w-full pl-8 pr-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                The standard flat fee for delivery.
              </p>
</div>
    </div>

          {/* Save Area */}
          <div className="flex items-center gap-4">
            <Button
              onClick={handleSaveShipping}
              disabled={savingShipping}
              className="bg-brand text-white hover:bg-brand"
            >
              {savingShipping ? 'Saving...' : 'Save Shipping Settings'}
            </Button>
            {showSavedShippingMessage && (
              <span className="text-sm font-medium text-green-600 dark:text-green-500 animate-in fade-in duration-300">
                ✓ Settings saved successfully
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200 dark:border-red-900/50">
        <CardHeader>
          <CardTitle className="text-red-600 dark:text-red-400">Danger Zone</CardTitle>
          <CardDescription>
            Irreversible actions that affect your store.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20">
            <div>
              <p className="font-medium text-red-600 dark:text-red-400">Reset All Data</p>
              <p className="text-sm text-muted-foreground">
                Delete all products, orders, categories, and addresses. This action cannot be undone.
              </p>
            </div>
            {!showConfirm ? (
              <Button
                variant="outline"
                className="text-red-600 border-red-300 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-950/50 shrink-0"
                onClick={() => setShowConfirm(true)}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Reset All Data
              </Button>
            ) : (
              <div className="space-y-3 w-full sm:w-auto sm:min-w-[280px]">
                <p className="text-sm font-medium text-red-600 dark:text-red-400">
                  Type <span className="font-mono font-bold">RESET</span> to confirm:
                </p>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="Type RESET"
                  className="w-full px-3 py-2 text-sm border border-red-300 dark:border-red-800 rounded-lg bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500/50"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowConfirm(false)
                      setConfirmText('')
                    }}
                    disabled={resetting}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    disabled={confirmText !== 'RESET' || resetting}
                    onClick={handleReset}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    {resetting ? 'Resetting...' : 'Permanently Reset'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
