'use client'

import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { toast } from 'sonner'
import { api } from '@/convex/_generated/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { getErrorMessage } from '@/lib/errors'

type Details = {
  businessName: string
  businessAddress: string
  businessPhone: string
  businessEmail: string
  vatNumber: string
  registrationNumber: string
}

/** The seller details printed at the top of every invoice. */
export default function InvoiceDetailsCard() {
  const saved = useQuery(api.invoices.businessDetails)
  const update = useMutation(api.invoices.updateBusinessDetails)
  const [form, setForm] = useState<Details | null>(null)
  const [saving, setSaving] = useState(false)

  // Start editing from the saved values once they load.
  const [prevSaved, setPrevSaved] = useState(saved)
  if (saved !== prevSaved) {
    setPrevSaved(saved)
    if (saved && form === null) {
      const { lastInvoiceNumber: _last, ...details } = saved
      void _last
      setForm(details)
    }
  }

  const set = (key: keyof Details, value: string) => setForm((f) => (f ? { ...f, [key]: value } : f))

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form) return
    setSaving(true)
    try {
      await update(form)
      toast.success('Invoice details saved.')
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to save invoice details.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invoice Details</CardTitle>
        <CardDescription>
          Printed at the top of every invoice. Your VAT number only shows on invoices for orders where VAT was charged; with
          VAT switched off, customers get a plain invoice.
          {saved?.lastInvoiceNumber && ` Last invoice issued: ${saved.lastInvoiceNumber}.`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!form ? (
          <div className="h-40 bg-muted rounded-lg animate-pulse" />
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="biz-name">Business name</Label>
                <Input id="biz-name" value={form.businessName} onChange={(e) => set('businessName', e.target.value)} placeholder="Levi's Spares (Pty) Ltd" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="biz-reg">Company registration number</Label>
                <Input id="biz-reg" value={form.registrationNumber} onChange={(e) => set('registrationNumber', e.target.value)} placeholder="2015/123456/07" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="biz-address">Address</Label>
              <Textarea id="biz-address" rows={3} value={form.businessAddress} onChange={(e) => set('businessAddress', e.target.value)} placeholder={'Stand 10 Zambezi\nMontana, Pretoria, 0182'} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="biz-phone">Phone</Label>
                <Input id="biz-phone" type="tel" value={form.businessPhone} onChange={(e) => set('businessPhone', e.target.value)} placeholder="012 770 3389" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="biz-email">Email</Label>
                <Input id="biz-email" type="email" value={form.businessEmail} onChange={(e) => set('businessEmail', e.target.value)} placeholder="info@levispares.co.za" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="biz-vat">VAT number</Label>
                <Input id="biz-vat" inputMode="numeric" value={form.vatNumber} onChange={(e) => set('vatNumber', e.target.value)} placeholder="4123456789" />
              </div>
            </div>
            <Button type="submit" disabled={saving} className="bg-accent text-white hover:bg-accent/90">
              {saving ? 'Saving…' : 'Save Invoice Details'}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
