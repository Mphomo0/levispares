'use client'

import { useState } from 'react'
import { useMutation } from 'convex/react'
import { useUser } from '@clerk/nextjs'
import { Bell } from 'lucide-react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { getErrorMessage } from '@/lib/errors'

/** For an out-of-stock part: sign up for one email when it's back. */
export default function NotifyWhenBack({ productId }: { productId: Id<'products'> }) {
  const { user } = useUser()
  const subscribe = useMutation(api.stockAlerts.subscribe)
  const [email, setEmail] = useState<string | null>(null)
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle')
  const [error, setError] = useState<string | null>(null)
  const value = email ?? user?.primaryEmailAddress?.emailAddress ?? ''

  if (state === 'done') {
    return (
      <p className="flex items-center gap-2 rounded-2xl bg-green-50 px-4 py-3 text-sm text-green-800" role="status">
        <Bell className="h-4 w-4" aria-hidden="true" />
        We&apos;ll email {value} as soon as it&apos;s back in stock.
      </p>
    )
  }

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault()
        setState('sending')
        setError(null)
        try {
          await subscribe({ productId, email: value })
          setState('done')
        } catch (err) {
          setError(getErrorMessage(err, 'Could not sign you up. Please try again.'))
          setState('idle')
        }
      }}
      className="rounded-2xl border border-slate-200 p-4 space-y-2"
    >
      <label htmlFor="notify-email" className="flex items-center gap-2 text-sm font-semibold text-slate-900">
        <Bell className="h-4 w-4 text-accent" aria-hidden="true" />
        Email me when it&apos;s back in stock
      </label>
      <div className="flex gap-2">
        <input
          id="notify-email"
          type="email"
          required
          autoComplete="email"
          spellCheck={false}
          value={value}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="input-styled flex-1 min-w-0"
        />
        <button
          type="submit"
          disabled={state === 'sending'}
          className="shrink-0 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {state === 'sending' ? 'Saving…' : 'Notify me'}
        </button>
      </div>
      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
      <p className="text-xs text-slate-500">One email, only about this part.</p>
    </form>
  )
}
