'use client'

import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { toast } from 'sonner'
import { api } from '@/convex/_generated/api'
import type { Doc, Id } from '@/convex/_generated/dataModel'
import { useConfirm } from '@/components/admin/ConfirmDialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getErrorMessage } from '@/lib/errors'
import { formatPrice } from '@/lib/format'

type Promotion = Doc<'promotions'>

interface FormState {
  code: string
  name: string
  type: 'percentage' | 'fixed'
  value: string
  minOrderValue: string
  maxUses: string
  startsOn: string
  endsOn: string
}

const EMPTY_FORM: FormState = {
  code: '',
  name: '',
  type: 'percentage',
  value: '',
  minOrderValue: '',
  maxUses: '',
  startsOn: '',
  endsOn: '',
}

const DAY_MS = 24 * 60 * 60 * 1000

// Dates are whole days in the browser's time zone: a code runs from the
// start of its first day to the end of its last day.
const dayStart = (date: string) => new Date(`${date}T00:00:00`).getTime()
const toDateInput = (ms: number) => {
  const d = new Date(ms)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const formatDate = (ms: number) =>
  new Date(ms).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })

function toForm(p: Promotion): FormState {
  return {
    code: p.code ?? '',
    name: p.name,
    type: p.type === 'fixed' ? 'fixed' : 'percentage',
    value: String(p.value),
    minOrderValue: p.minOrderValue !== undefined ? String(p.minOrderValue) : '',
    maxUses: p.maxUses !== undefined ? String(p.maxUses) : '',
    startsOn: p.startsAt !== undefined ? toDateInput(p.startsAt) : '',
    endsOn: p.expiresAt !== undefined ? toDateInput(p.expiresAt - DAY_MS) : '',
  }
}

function status(p: Promotion, now: number) {
  if (p.active === false) return { label: 'Off', className: 'bg-muted text-muted-foreground' }
  if (p.expiresAt !== undefined && now >= p.expiresAt) return { label: 'Expired', className: 'bg-muted text-muted-foreground' }
  if (p.maxUses !== undefined && (p.usedCount ?? 0) >= p.maxUses) return { label: 'Used up', className: 'bg-muted text-muted-foreground' }
  if (p.startsAt !== undefined && now < p.startsAt) return { label: 'Scheduled', className: 'bg-amber-100 text-amber-800' }
  return { label: 'Live', className: 'bg-green-100 text-green-800' }
}

function describeDiscount(p: Pick<Promotion, 'type' | 'value'>) {
  return p.type === 'fixed' ? `${formatPrice(p.value)} off` : `${p.value}% off`
}

export default function AdminPromotionsPage() {
  const promotions = useQuery(api.promotions.listAll)
  const addPromotion = useMutation(api.promotions.add)
  const updatePromotion = useMutation(api.promotions.update)
  const setActive = useMutation(api.promotions.setActive)
  const removePromotion = useMutation(api.promotions.remove)
  const { confirm, confirmDialog } = useConfirm()

  // null: form closed; 'new': adding; otherwise the code being edited.
  const [editing, setEditing] = useState<'new' | Id<'promotions'> | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [now] = useState(() => Date.now())

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const openNew = () => {
    setForm(EMPTY_FORM)
    setEditing('new')
  }

  const openEdit = (p: Promotion) => {
    setForm(toForm(p))
    setEditing(p._id)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const optionalNumber = (text: string) => (text.trim() === '' ? undefined : Number(text))
    const fields = {
      code: form.code,
      name: form.name,
      type: form.type,
      value: Number(form.value),
      minOrderValue: optionalNumber(form.minOrderValue),
      maxUses: optionalNumber(form.maxUses),
      startsAt: form.startsOn ? dayStart(form.startsOn) : undefined,
      expiresAt: form.endsOn ? dayStart(form.endsOn) + DAY_MS : undefined,
    }
    if ([fields.value, fields.minOrderValue, fields.maxUses].some((n) => n !== undefined && Number.isNaN(n))) {
      toast.error('Please enter numbers only in the amount fields.')
      return
    }

    setSaving(true)
    try {
      if (editing === 'new') {
        await addPromotion(fields)
        toast.success(`Code ${fields.code.trim().toUpperCase()} created`)
      } else if (editing) {
        await updatePromotion({ id: editing, ...fields })
        toast.success('Promo code saved')
      }
      setEditing(null)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not save the promo code.'))
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (p: Promotion) => {
    try {
      await setActive({ id: p._id, active: p.active === false })
      toast.success(p.active === false ? `${p.code} turned on` : `${p.code} turned off`)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not update the promo code.'))
    }
  }

  const handleDelete = async (p: Promotion) => {
    if (!(await confirm(`Delete code ${p.code}? Customers will no longer be able to use it. Past orders keep their discount.`))) return
    try {
      await removePromotion({ id: p._id })
      if (editing === p._id) setEditing(null)
      toast.success(`${p.code} deleted`)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not delete the promo code.'))
    }
  }

  return (
    <div className="space-y-6">
      {confirmDialog}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Promo Codes</h2>
          <p className="text-muted-foreground">Discount codes customers can enter at checkout.</p>
        </div>
        {editing === null && (
          <Button onClick={openNew} className="bg-accent text-white hover:bg-accent/90">
            <svg aria-hidden="true" className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Code
          </Button>
        )}
      </div>

      {editing !== null && (
        <Card>
          <CardHeader>
            <CardTitle>{editing === 'new' ? 'New promo code' : `Edit ${form.code.toUpperCase()}`}</CardTitle>
            <CardDescription>
              The discount comes off the item subtotal, before shipping. VAT is worked out on the discounted amount.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="promo-code">Code</Label>
                  <Input
                    id="promo-code"
                    value={form.code}
                    onChange={(e) => set('code', e.target.value.toUpperCase())}
                    placeholder="WINTER10"
                    autoComplete="off"
                    spellCheck={false}
                    className="font-mono uppercase"
                    required
                  />
                  <p className="text-xs text-muted-foreground">Letters, numbers, dashes or underscores.</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="promo-name">Name</Label>
                  <Input
                    id="promo-name"
                    value={form.name}
                    onChange={(e) => set('name', e.target.value)}
                    placeholder="Winter sale"
                    required
                  />
                  <p className="text-xs text-muted-foreground">Shown to the customer when the code is applied.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="promo-type">Discount type</Label>
                  <select
                    id="promo-type"
                    value={form.type}
                    onChange={(e) => set('type', e.target.value as FormState['type'])}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                  >
                    <option value="percentage">Percentage off</option>
                    <option value="fixed">Fixed amount off (R)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="promo-value">{form.type === 'percentage' ? 'Percentage' : 'Amount (R)'}</Label>
                  <Input
                    id="promo-value"
                    type="number"
                    inputMode="decimal"
                    min="0.01"
                    max={form.type === 'percentage' ? 100 : undefined}
                    step="0.01"
                    value={form.value}
                    onChange={(e) => set('value', e.target.value)}
                    placeholder={form.type === 'percentage' ? '10' : '100'}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="promo-min">Minimum order (R, optional)</Label>
                  <Input
                    id="promo-min"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={form.minOrderValue}
                    onChange={(e) => set('minOrderValue', e.target.value)}
                    placeholder="No minimum"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="promo-uses">Total uses allowed (optional)</Label>
                  <Input
                    id="promo-uses"
                    type="number"
                    inputMode="numeric"
                    min="1"
                    step="1"
                    value={form.maxUses}
                    onChange={(e) => set('maxUses', e.target.value)}
                    placeholder="Unlimited"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="promo-start">First day (optional)</Label>
                  <Input id="promo-start" type="date" value={form.startsOn} onChange={(e) => set('startsOn', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="promo-end">Last day (optional)</Label>
                  <Input id="promo-end" type="date" value={form.endsOn} onChange={(e) => set('endsOn', e.target.value)} />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button type="submit" disabled={saving} className="bg-accent text-white hover:bg-accent/90">
                  {saving ? 'Saving…' : editing === 'new' ? 'Create Code' : 'Save Changes'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setEditing(null)} disabled={saving}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          {promotions === undefined ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          ) : promotions.length === 0 ? (
            <div className="py-12 text-center bg-muted/30 rounded-xl border border-dashed">
              <p className="text-muted-foreground font-medium">No promo codes yet</p>
              <p className="text-sm text-muted-foreground mt-1">Create one to give customers a discount at checkout.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {promotions.map((p) => {
                const s = status(p, now)
                const limits = [
                  p.minOrderValue !== undefined && `Min. order ${formatPrice(p.minOrderValue)}`,
                  p.startsAt !== undefined && `From ${formatDate(p.startsAt)}`,
                  p.expiresAt !== undefined && `Until ${formatDate(p.expiresAt - DAY_MS)}`,
                ].filter(Boolean)
                return (
                  <li key={p._id} className="py-4 flex flex-col md:flex-row md:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-semibold">{p.code}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.className}`}>{s.label}</span>
                      </div>
                      <p className="text-sm text-foreground mt-1">
                        {p.name} · {describeDiscount(p)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Used {p.usedCount ?? 0}{p.maxUses !== undefined ? ` of ${p.maxUses}` : ''} times
                        {limits.length > 0 && ` · ${limits.join(' · ')}`}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button variant="outline" size="sm" onClick={() => openEdit(p)}>Edit</Button>
                      <Button variant="outline" size="sm" onClick={() => handleToggle(p)}>
                        {p.active === false ? 'Turn on' : 'Turn off'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(p)}
                        className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                      >
                        Delete
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
