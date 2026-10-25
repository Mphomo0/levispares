'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { ImagePlus, X } from 'lucide-react'
import { useMyVehicle, vehicleName } from '@/lib/myVehicle'

const MAX_PHOTOS = 3
const MAX_SIDE = 1600

// The endpoint lives on the Convex deployment's HTTP domain (.convex.site).
const ENDPOINT = `${
  process.env.NEXT_PUBLIC_CONVEX_SITE_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL!.replace('.convex.cloud', '.convex.site')
}/part-request`

/** Shrinks a photo to at most 1600px and re-encodes it as JPEG, so phone photos upload quickly. */
async function shrinkPhoto(file: File): Promise<{ type: string; data: string; preview: string }> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  const preview = canvas.toDataURL('image/jpeg', 0.82)
  return { type: 'image/jpeg', data: preview.split(',')[1], preview }
}

export default function PartRequestPage() {
  const myVehicle = useMyVehicle()
  const [form, setForm] = useState({ name: '', email: '', phone: '', vehicle: '', vin: '', partNumber: '', description: '', website: '' })
  const [vehicleTouched, setVehicleTouched] = useState(false)
  const [photos, setPhotos] = useState<Array<{ type: string; data: string; preview: string }>>([])
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  // Fill in the remembered vehicle until the customer types their own.
  const vehicle = vehicleTouched ? form.vehicle : form.vehicle || (myVehicle ? vehicleName(myVehicle) : '')
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  const addPhotos = async (files: FileList | null) => {
    if (!files) return
    const room = MAX_PHOTOS - photos.length
    const chosen = [...files].filter((f) => f.type.startsWith('image/')).slice(0, room)
    if (files.length > room) toast.error(`You can add up to ${MAX_PHOTOS} photos.`)
    try {
      const shrunk = await Promise.all(chosen.map(shrinkPhoto))
      setPhotos((p) => [...p, ...shrunk])
    } catch {
      toast.error("One of those photos couldn't be read. Try a JPEG or PNG.")
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, vehicle, photos: photos.map(({ type, data }) => ({ type, data })) }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Something went wrong')
      setSent(true)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "We couldn't send your request.")
    } finally {
      setSending(false)
    }
  }

  if (sent) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-16 text-center">
        <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">Thanks, we&apos;re on it</h1>
        <p className="text-muted-foreground max-w-md mb-8">
          We&apos;ve received your request and will email you at {form.email} once we&apos;ve found the part, usually within one
          working day.
        </p>
        <Link href="/shop" className="btn-accent text-white text-center">Back to the shop</Link>
      </div>
    )
  }

  const field = 'input-styled'
  const label = 'block text-sm font-medium text-foreground mb-1'

  return (
    <>
      <div className="hero-gradient text-primary-foreground py-12 md:py-16">
        <div className="container mx-auto px-4">
          <h1 className="font-display text-3xl md:text-4xl lg:text-5xl tracking-wide mb-2">CAN&apos;T FIND YOUR PART?</h1>
          <p className="text-primary-foreground/80 max-w-2xl">
            Not everything we can get is listed online. Tell us what you need and we&apos;ll find it for you.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-10">
        <form onSubmit={submit} className="max-w-2xl mx-auto bg-card rounded-xl p-6 md:p-8 card-shadow space-y-5">
          {/* Hidden from people; bots fill it in. */}
          <div className="hidden" aria-hidden="true">
            <label htmlFor="pr-website">Website</label>
            <input id="pr-website" tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="pr-name" className={label}>Your name *</label>
              <input id="pr-name" required autoComplete="name" value={form.name} onChange={set('name')} className={field} />
            </div>
            <div>
              <label htmlFor="pr-email" className={label}>Email *</label>
              <input id="pr-email" type="email" required autoComplete="email" spellCheck={false} value={form.email} onChange={set('email')} className={field} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="pr-phone" className={label}>Phone</label>
              <input id="pr-phone" type="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} className={field} />
            </div>
            <div>
              <label htmlFor="pr-vehicle" className={label}>Vehicle (make, model, year)</label>
              <input
                id="pr-vehicle"
                value={vehicle}
                onChange={(e) => {
                  setVehicleTouched(true)
                  setForm((f) => ({ ...f, vehicle: e.target.value }))
                }}
                placeholder="Isuzu NPR 400, 2015"
                className={field}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="pr-vin" className={label}>VIN (optional)</label>
              <input id="pr-vin" autoComplete="off" spellCheck={false} maxLength={17} value={form.vin} onChange={set('vin')} placeholder="17 characters" className={`${field} uppercase placeholder:normal-case`} />
            </div>
            <div>
              <label htmlFor="pr-part" className={label}>Part number (if you have it)</label>
              <input id="pr-part" autoComplete="off" spellCheck={false} value={form.partNumber} onChange={set('partNumber')} className={field} />
            </div>
          </div>
          <div>
            <label htmlFor="pr-description" className={label}>What part do you need?</label>
            <textarea
              id="pr-description"
              rows={4}
              maxLength={3000}
              value={form.description}
              onChange={set('description')}
              placeholder="e.g. Front left headlamp, the one with the indicator built in"
              className={field}
            />
          </div>

          <div>
            <p className={label}>Photos of the part (optional, up to {MAX_PHOTOS})</p>
            <div className="flex flex-wrap gap-3">
              {photos.map((photo, i) => (
                <div key={i} className="relative h-24 w-24 overflow-hidden rounded-lg border border-border">
                  {/* eslint-disable-next-line @next/next/no-img-element -- a local preview, not a hosted image */}
                  <img src={photo.preview} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))}
                    aria-label={`Remove photo ${i + 1}`}
                    className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white"
                  >
                    <X className="h-3 w-3" aria-hidden="true" />
                  </button>
                </div>
              ))}
              {photos.length < MAX_PHOTOS && (
                <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border text-xs text-muted-foreground hover:border-accent hover:text-accent">
                  <ImagePlus className="h-6 w-6" aria-hidden="true" />
                  Add photo
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="sr-only"
                    onChange={(e) => {
                      void addPhotos(e.target.files)
                      e.target.value = ''
                    }}
                  />
                </label>
              )}
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Your details are only used to answer this request. See our <Link href="/privacy-policy" className="underline">privacy policy</Link>.
          </p>

          <button
            type="submit"
            disabled={sending || (!form.description.trim() && !form.partNumber.trim())}
            className="btn-accent text-white w-full sm:w-auto disabled:opacity-50"
          >
            {sending ? 'Sending…' : 'Send Request'}
          </button>
        </form>
      </div>
    </>
  )
}
