'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { ShoppingBag, Search, Menu, X, Phone, User, ChevronRight } from 'lucide-react'
import { useCart } from '@/lib/CartContext'
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs'
import { motion, AnimatePresence } from 'motion/react'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'

export default function Navbar() {
  const { totalItems, totalPrice } = useCart()
  const pathname = usePathname()
  const [searchQuery, setSearchQuery] = useState('')
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  const storeSettings = useQuery(api.settings.get)
  const freeShippingThreshold = storeSettings?.freeShippingThreshold ?? 750

  // Shadow on scroll
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close mobile menu on route change
  useEffect(() => { 
    if (isMenuOpen) {
      setIsMenuOpen(false) 
    }
  }, [pathname, isMenuOpen])

  const handleSearch = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchQuery)}`
    }
  }

  const navLinks = [
    { path: '/', label: 'Home' },
    { path: '/shop', label: 'All Parts' },
    { path: '/about', label: 'About Us' },
    { path: '/contact', label: 'Contact Support' },
  ]

  const isActive = (path: string) =>
    path === '/' ? pathname === '/' : pathname.startsWith(path)

  return (

    <header className={`sticky top-0 z-50 bg-white dark:bg-slate-950 border-b border-border transition-shadow duration-300 ${scrolled ? 'shadow-lg shadow-black/5' : ''}`}>
      
      {/* Top utility bar */}
      <div className="hidden lg:block bg-accent text-accent-foreground text-xs py-2">
        <div className="container mx-auto px-4 flex items-center justify-between font-medium">
          <div className="flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5" />
            <span>012 770 3389</span>
    <nav className="sticky top-0 z-50 bg-white/55 backdrop-blur-md border-b border-border shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 md:h-20">
          <Link href="/">
            <Image
              src="/images/logo/logo.webp"
              alt="Levi's Spares Logo"
              width={250}
              height={250}
              className="w-auto h-auto object-contain"
            />
          </Link>

          <button
            className="lg:hidden p-2 rounded-md hover:bg-secondary transition-colors"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {isMenuOpen ? (
              <X className="w-6 h-6 text-foreground" />
            ) : (
              <Menu className="w-6 h-6 text-foreground" />
            )}
          </button>

          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                href={link.path}
                className="px-4 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all duration-200 font-medium"
              >
                {link.label}
              </Link>
            ))}
>>>>>>> 70da723f074bbf2ce245814cdc1095c6ceba029b
          </div>
          <span className="tracking-wide">FREE SHIPPING ON ORDERS OVER R{freeShippingThreshold.toFixed(2)} · 100% OEM QUALITY GUARANTEED</span>
          <div className="flex items-center gap-4">
            <Link href="/terms-conditions" className="hover:underline underline-offset-2">Terms & Conditions</Link>
            <Link href="/about" className="hover:underline underline-offset-2">About Us</Link>
          </div>
        </div>
      </div>

      {/* Main header area (Logo, Search, Actions) */}
      <div className="border-b border-border/50">
        <div className="container mx-auto px-4 py-4 md:py-5">
          <div className="flex items-center justify-between gap-4 md:gap-8">
            
            {/* Mobile Menu Button & Logo */}
            <div className="flex items-center gap-3 shrink-0">
              <button
                className="lg:hidden p-1 -ml-1 text-foreground hover:text-accent transition-colors"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
              >
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
              <Link href="/" className="block">
                <Image
                  src="/images/logo/logo.webp"
                  alt="Levi's Spares"
                  width={160}
                  height={60}
                  className="h-9 w-auto md:h-12 object-contain"
                  priority
                />
              </Link>
            </div>

            {/* Center: Always-visible Search Bar (Hidden on small mobile, visible on md+) */}
            <div className="hidden md:block flex-1 max-w-2xl mx-auto">
              <form onSubmit={handleSearch} className="relative flex items-center w-full group">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for parts, categories, or vehicles..."
                  className="w-full pl-5 pr-14 py-2.5 rounded-full border-2 border-border group-hover:border-accent/50 focus:border-accent focus:outline-none bg-white dark:bg-slate-950 transition-colors"
                />
                <button
                  type="submit"
                  className="absolute right-1 top-1 bottom-1 px-4 bg-accent text-accent-foreground rounded-full hover:bg-accent/90 transition-colors flex items-center justify-center"
                  aria-label="Search"
                >
                  <Search className="w-4 h-4" />
                </button>
              </form>
            </div>

            {/* Right: Actions (Account, Cart) */}
            <div className="flex items-center gap-5 md:gap-8 shrink-0">
              
              {/* Account Info - Desktop only parts */}
              <div className="hidden lg:flex items-center gap-3">
                <Link href="/account" className="bg-secondary p-2.5 rounded-full text-muted-foreground hover:bg-accent/10 hover:text-accent transition-colors" aria-label="Go to account">
                  <User className="w-5 h-5" />
                </Link>
                <SignedOut>
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground leading-none mb-1 cursor-default">Welcome</span>
                    <SignInButton mode="modal" forceRedirectUrl="/auth-redirect">
                      <button className="text-sm font-bold text-foreground hover:text-accent transition-colors leading-none text-left">
                        Sign In / Register
                      </button>
                    </SignInButton>
                  </div>
                </SignedOut>
                <SignedIn>
                  <div className="flex items-center">
                    <UserButton afterSignOutUrl="/" />
                  </div>
                </SignedIn>
              </div>

              {/* Account Icon - Mobile/Tablet (hides on Desktop) */}
              <div className="flex lg:hidden items-center ml-2 gap-2">
                <Link href="/account" className="text-foreground hover:text-accent transition-colors" aria-label="Go to account">
                  <User className="w-6 h-6 md:w-7 md:h-7" />
                </Link>
                <SignedOut>
                  <SignInButton mode="modal" forceRedirectUrl="/auth-redirect">
                    <button className="text-xs font-bold text-foreground hover:text-accent transition-colors">
                      Sign In
                    </button>
                  </SignInButton>
                </SignedOut>
                <SignedIn>
                  <div className="flex flex-col justify-center">
                    <UserButton afterSignOutUrl="/" />
                  </div>
                </SignedIn>
              </div>

              {/* Cart Banner */}
              <Link href="/cart" className="flex items-center gap-3 group ml-2">
                <div className="relative">
                  <ShoppingBag className="w-6 h-6 md:w-7 md:h-7 text-foreground group-hover:text-accent transition-colors" />
                  {totalItems > 0 && (
                    <motion.span
                      key={totalItems}
                      initial={{ scale: 0.5 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1.5 -right-2 bg-accent text-accent-foreground text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-background"
                    >
                      {totalItems > 99 ? '99+' : totalItems}
                    </motion.span>
                  )}
                </div>
                <div className="hidden md:flex flex-col">
                  <span className="text-xs text-muted-foreground leading-none mb-1 group-hover:text-accent transition-colors">My Cart</span>
                  <span className="text-sm font-bold text-foreground leading-none">R{totalPrice.toFixed(2)}</span>
                </div>
              </Link>
            </div>
          </div>
          
          {/* Mobile Search Bar - Visible only on small screens */}
          <div className="mt-4 md:hidden">
            <form onSubmit={handleSearch} className="relative flex items-center w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for parts..."
                className="w-full pl-4 pr-12 py-2.5 rounded-xl border border-border focus:border-accent focus:outline-none bg-secondary/30"
              />
              <button
                type="submit"
                className="absolute right-1 top-1 bottom-1 px-3 bg-accent text-accent-foreground rounded-lg flex items-center justify-center hover:bg-accent/90 transition-colors"
                aria-label="Search"
              >
                <Search className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Bottom Nav Menu - Desktop only */}
      <div className="hidden lg:block bg-white dark:bg-slate-950">
        <div className="container mx-auto px-4">
          <ul className="flex items-center gap-8 h-12">
            {navLinks.map((link) => (
              <li key={link.path}>
                <Link
                  href={link.path}
                  className={`relative text-sm font-bold tracking-wide transition-colors hover:text-accent flex items-center h-12 uppercase ${
                    isActive(link.path) ? 'text-accent' : 'text-foreground/80'
                  }`}
                >
                  {link.label}
                  {isActive(link.path) && (
                    <motion.div
                      layoutId="bottom-nav-indicator"
                      className="absolute bottom-0 left-0 right-0 h-[3px] bg-accent"
                    />
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden overflow-hidden bg-white dark:bg-slate-950 border-b border-border shadow-xl absolute w-full left-0 top-full"
          >
            <div className="px-4 py-2 flex flex-col">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  href={link.path}
                  className={`flex items-center justify-between py-4 border-b border-border/50 text-base font-semibold ${
                    isActive(link.path) ? 'text-accent' : 'text-foreground hover:text-accent'
                  }`}
                >
                  {link.label}
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </Link>
              ))}

              <div className="py-6 space-y-4">
                <SignedOut>
                  <SignInButton mode="modal">
                    <button className="w-full py-3.5 rounded-xl bg-accent text-accent-foreground font-bold hover:bg-accent/90 transition-colors">
                      Sign In / Register
                    </button>
                  </SignInButton>
                </SignedOut>
                <SignedIn>
                  <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-xl border border-border">
                    <div className="flex items-center gap-3">
                      <UserButton afterSignOutUrl="/" />
                      <span className="font-semibold text-sm">My Account</span>
                    </div>
                  </div>
                </SignedIn>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
