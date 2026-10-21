'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { getErrorMessage } from '@/lib/errors'

function Unsubscribe() {
  const token = useSearchParams().get('token') ?? ''
  const unsubscribe = useMutation(api.carts.unsubscribe)
  const [state, setState] = useState<'idle' | 'working' | 'done'>('idle')
  const [error, setError] = useState<string | null>(null)

  // A button rather than unsubscribing on load, so link scanners in mail
  // clients cannot turn reminders off by opening the link.
  const confirm = async () => {
    setState('working')
    setError(null)
    try {
      await unsubscribe({ token })
      setState('done')
    } catch (err) {
      setError(getErrorMessage(err, 'Something went wrong. Please try again.'))
      setState('idle')
    }
  }

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
        {state === 'done' ? 'You are unsubscribed' : 'Stop cart reminders'}
      </h1>
      <p className="text-muted-foreground max-w-md mb-8">
        {state === 'done'
          ? 'We will no longer email you about items left in your cart. You can turn reminders back on in your account settings.'
          : 'We email you when you leave items in your cart. Turn these reminders off?'}
      </p>
      {error && <p className="text-red-600 mb-4" role="alert">{error}</p>}
      {state === 'done' ? (
        <Link href="/shop" className="btn-accent text-white text-center">
          Back to the shop
        </Link>
      ) : (
        <button
          type="button"
          onClick={confirm}
          disabled={!token || state === 'working'}
          className="btn-accent text-white text-center disabled:opacity-50"
        >
          {state === 'working' ? 'Unsubscribing…' : 'Unsubscribe'}
        </button>
      )}
    </div>
  )
}

export default function UnsubscribePage() {
  return (
    <Suspense>
      <Unsubscribe />
    </Suspense>
  )
}
