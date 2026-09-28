'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
        Something went wrong
      </h1>
      <p className="text-muted-foreground max-w-md mb-8">
        We hit an unexpected problem loading this page. Please try again. If it
        keeps happening, call us on 012 770 3389.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <button onClick={reset} className="btn-accent text-white">
          Try again
        </button>
        <Link
          href="/"
          className="px-6 py-3 rounded-lg border border-border text-foreground hover:bg-secondary transition-colors text-center"
        >
          Go home
        </Link>
      </div>
    </div>
  )
}
