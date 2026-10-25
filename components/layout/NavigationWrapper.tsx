'use client'

import { usePathname } from 'next/navigation'
import Navbar from './Navbar'
import Footer from './Footer'

export default function NavigationWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  // Admin pages and printable invoices go without the shop's header and footer.
  const isBare = pathname?.startsWith('/admin') || pathname?.startsWith('/invoice')

  return (
    <>
      {!isBare && (
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:font-semibold focus:text-slate-900 focus:shadow-lg"
        >
          Skip to main content
        </a>
      )}
      {!isBare && <Navbar />}
      {isBare ? (
        children
      ) : (
        <main id="main-content" tabIndex={-1} className="outline-none">
          {children}
        </main>
      )}
      {!isBare && <Footer />}
    </>
  )
}
