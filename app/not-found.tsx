import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-16 text-center">
      <p className="text-accent font-display text-lg tracking-widest mb-2">404</p>
      <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
        Page not found
      </h1>
      <p className="text-muted-foreground max-w-md mb-8">
        The page you are looking for does not exist or has moved. Try searching
        for the part you need, or head back to the shop.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <Link href="/shop" className="btn-accent text-white text-center">
          Browse the shop
        </Link>
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
