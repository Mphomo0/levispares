'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  ShoppingBag,
  Search,
  Menu,
  X,
  Phone,
  User,
  ChevronDown,
  LayoutDashboard,
} from 'lucide-react'
import { useCart } from '@/lib/CartContext'
import { SignedIn, SignedOut, SignInButton, UserButton, useUser } from '@clerk/nextjs'
import { motion, AnimatePresence } from 'motion/react'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'

export default function Navbar() {
  const { totalItems, totalPrice } = useCart()
  const pathname = usePathname()
  const [searchQuery, setSearchQuery] = useState('')
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  const { user } = useUser()
  const currentUser = useQuery(api.users.getCurrent)
  const isAdmin = currentUser?.role === 'admin'

  const storeSettings = useQuery(api.settings.get)
  const freeShippingThreshold = storeSettings?.freeShippingThreshold ?? 750

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (isMenuOpen) {
      setIsMenuOpen(false)
    }
  }, [pathname])

  const handleSearch = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchQuery)}`
    }
  }

  const categories = [
    { name: 'Engine Parts', href: '/shop?category=engine' },
    { name: 'Brakes & Suspension', href: '/shop?category=brakes' },
    { name: 'Filters', href: '/shop?category=filters' },
    { name: 'Electrical', href: '/shop?category=electrical' },
    { name: 'Body Parts', href: '/shop?category=body' },
  ]

  const navLinks = [
    { path: '/', label: 'Home' },
    { path: '/shop', label: 'Shop' },
    { path: '/about', label: 'About' },
    { path: '/contact', label: 'Contact' },
  ]

  const isActive = (path: string) =>
    path === '/' ? pathname === '/' : pathname.startsWith(path)

  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm">
      <div className="bg-slate-900 text-white text-xs">
        <div className="container mx-auto px-4 py-2 flex items-center justify-between">
          <div className="hidden md:flex items-center gap-6">
            <span className="flex items-center gap-1.5">
              <Phone className="w-3 h-3" />
              <span className="font-medium">012 770 3389</span>
            </span>
            <span className="text-slate-400">|</span>
            <span className="text-slate-300">Mon-Fri: 8am - 5pm</span>
          </div>
          <div className="flex items-center gap-4 md:gap-6 text-slate-300">
            <span className="hidden sm:inline">
              Free Shipping on orders over R{freeShippingThreshold}
            </span>
            <span className="hidden lg:inline text-orange-400 font-medium">
              100% OEM Quality Guaranteed
            </span>
          </div>
        </div>
      </div>

      <div
        className={`border-b border-slate-200 transition-shadow ${scrolled ? 'shadow-md' : ''}`}
      >
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16 lg:h-20">
            <div className="flex items-center gap-6">
              <button
                className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-slate-100 transition-colors"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-label="Toggle menu"
              >
                {isMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>

              <Link href="/" className="shrink-0">
                <Image
                  src="/images/logo/logo.webp"
                  alt="Levi's Spares"
                  width={160}
                  height={50}
                  className="h-10 lg:h-12 w-auto object-contain"
                  priority
                />
              </Link>

              <nav className="hidden lg:flex items-center gap-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.path}
                    href={link.path}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                      isActive(link.path)
                        ? 'text-orange-600 bg-orange-50'
                        : 'text-slate-700 hover:text-orange-600 hover:bg-slate-50'
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>

            <div className="hidden md:flex flex-1 max-w-xl mx-6">
              <form onSubmit={handleSearch} className="relative w-full">
                <div className="flex items-center bg-slate-100 rounded-lg border-2 border-transparent focus-within:border-orange-500 focus-within:bg-white transition-all">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search for parts, brands, vehicles..."
                    className="flex-1 px-4 py-2.5 bg-transparent outline-none text-sm placeholder:text-slate-400"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="p-1.5 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    type="submit"
                    className="m-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-md transition-colors flex items-center gap-2"
                  >
                    <Search className="w-4 h-4" />
                    <span className="hidden sm:inline">Search</span>
                  </button>
                </div>
              </form>
            </div>

            <div className="flex items-center gap-2 lg:gap-4">
              <a
                href="tel:0127703389"
                className="hidden xl:flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <Phone className="w-5 h-5 text-orange-500" />
                <div className="text-sm">
                  <p className="text-xs text-slate-500 leading-none">
                    Need Help?
                  </p>
                  <p className="font-semibold text-slate-800">012 770 3389</p>
                </div>
              </a>

              <div className="h-8 w-px bg-slate-200 hidden xl:block" />

              <SignedOut>
                <SignInButton mode="modal" forceRedirectUrl="/auth-redirect">
                  <button className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors">
                    <User className="w-5 h-5 text-slate-600" />
                    <div className="hidden sm:block text-sm text-left">
                      <p className="text-xs text-slate-500 leading-none">
                        Sign In
                      </p>
                      <p className="font-semibold text-slate-800">Account</p>
                    </div>
                  </button>
                </SignInButton>
              </SignedOut>
              <SignedIn>
                <Link
                  href={isAdmin ? '/admin' : '/account'}
                  className="relative group"
                >
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors">
                    {isAdmin ? (
                      <LayoutDashboard className="w-5 h-5 text-orange-500" />
                    ) : (
                      <User className="w-5 h-5 text-slate-600" />
                    )}
                    <div className="hidden sm:block text-sm text-left">
                      <p className="text-xs text-slate-500 leading-none">
                        {isAdmin ? 'Admin' : 'Welcome back'}
                      </p>
                      <p className="font-semibold text-slate-800">
                        {isAdmin ? 'Dashboard' : 'My Account'}
                      </p>
                    </div>
                  </div>
                </Link>
                <div className="hidden lg:block">
                  <UserButton afterSignOutUrl="/" />
                </div>
              </SignedIn>

              <div className="h-8 w-px bg-slate-200" />

              <Link href="/cart" className="relative group">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors">
                  <div className="relative">
                    <ShoppingBag className="w-6 h-6 text-slate-700 group-hover:text-orange-600 transition-colors" />
                    {totalItems > 0 && (
                      <motion.span
                        key={totalItems}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-orange-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center"
                      >
                        {totalItems > 99 ? '99+' : totalItems}
                      </motion.span>
                    )}
                  </div>
                  <div className="hidden lg:block text-sm">
                    <p className="text-xs text-slate-500 leading-none">Cart</p>
                    <p className="font-semibold text-slate-800">
                      R{totalPrice.toFixed(2)}
                    </p>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="hidden lg:block bg-slate-50 border-b border-slate-200">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-12">
            <div className="flex items-center gap-8">
              <div className="relative group">
                <button className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-orange-600 transition-colors">
                  <span>All Categories</span>
                  <ChevronDown className="w-4 h-4" />
                </button>
                <div className="absolute top-full left-0 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <div className="bg-white rounded-lg shadow-xl border border-slate-200 py-2 min-w-48">
                    {categories.map((cat) => (
                      <Link
                        key={cat.name}
                        href={cat.href}
                        className="block px-4 py-2 text-sm text-slate-700 hover:bg-orange-50 hover:text-orange-600 transition-colors"
                      >
                        {cat.name}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>

              {categories.slice(0, 5).map((cat) => (
                <Link
                  key={cat.name}
                  href={cat.href}
                  className="text-sm font-medium text-slate-700 hover:text-orange-600 transition-colors"
                >
                  {cat.name}
                </Link>
              ))}
            </div>

            <div className="flex items-center gap-4 text-sm text-slate-500">
              <Link
                href="/track-order"
                className="hover:text-orange-600 transition-colors"
              >
                Track Order
              </Link>
              <span>|</span>
              <Link
                href="/help"
                className="hover:text-orange-600 transition-colors"
              >
                Help Center
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="md:hidden bg-white border-b border-slate-200">
        <div className="container mx-auto px-4 py-3">
          <form onSubmit={handleSearch} className="relative flex items-center">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search parts..."
              className="w-full pl-4 pr-12 py-2.5 rounded-lg bg-slate-100 border-2 border-transparent focus:border-orange-500 focus:bg-white outline-none text-sm transition-all"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-orange-500"
            >
              <Search className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden overflow-hidden bg-white border-t border-slate-200"
          >
            <nav className="container mx-auto px-4 py-4 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  href={link.path}
                  className={`block py-3 px-4 rounded-lg text-base font-medium transition-colors ${
                    isActive(link.path)
                      ? 'bg-orange-50 text-orange-600'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}

              <div className="pt-4 pb-2">
                <p className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Categories
                </p>
              </div>
              {categories.map((cat) => (
                <Link
                  key={cat.name}
                  href={cat.href}
                  className="block py-2.5 px-4 text-sm text-slate-600 hover:bg-slate-50 hover:text-orange-600 transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {cat.name}
                </Link>
              ))}

              <div className="pt-4 border-t border-slate-200 mt-4 space-y-3">
                <a
                  href="tel:0127703389"
                  className="flex items-center gap-3 py-3 px-4 rounded-lg bg-slate-50"
                >
                  <Phone className="w-5 h-5 text-orange-500" />
                  <div>
                    <p className="text-xs text-slate-500">Need Help?</p>
                    <p className="font-semibold text-slate-800">012 770 3389</p>
                  </div>
                </a>

                <SignedOut>
                  <SignInButton mode="modal" forceRedirectUrl="/auth-redirect">
                    <button className="w-full py-3 px-4 rounded-lg bg-slate-900 text-white font-medium hover:bg-slate-800 transition-colors">
                      Sign In / Register
                    </button>
                  </SignInButton>
                </SignedOut>
                <SignedIn>
                  <Link
                    href={isAdmin ? '/admin' : '/account'}
                    className="flex items-center justify-between py-3 px-4 rounded-lg bg-slate-50"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <div className="flex items-center gap-3">
                      {isAdmin ? (
                        <LayoutDashboard className="w-5 h-5 text-orange-500" />
                      ) : (
                        <User className="w-5 h-5 text-slate-600" />
                      )}
                      <div>
                        <p className="text-xs text-slate-500">
                          {isAdmin ? 'Admin Access' : 'Welcome back'}
                        </p>
                        <p className="font-semibold text-slate-800">
                          {isAdmin ? 'Go to Dashboard' : 'My Account'}
                        </p>
                      </div>
                    </div>
                    <UserButton afterSignOutUrl="/" />
                  </Link>
                </SignedIn>

                <Link
                  href="/cart"
                  className="flex items-center justify-between py-3 px-4 rounded-lg bg-orange-50 border border-orange-100"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <div className="flex items-center gap-3">
                    <ShoppingBag className="w-5 h-5 text-orange-600" />
                    <div>
                      <p className="text-xs text-slate-500">Shopping Cart</p>
                      <p className="font-semibold text-slate-800">
                        {totalItems} item{totalItems !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <span className="font-bold text-orange-600">
                    R{totalPrice.toFixed(2)}
                  </span>
                </Link>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
