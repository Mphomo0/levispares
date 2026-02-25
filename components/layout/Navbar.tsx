'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ShoppingBag, Search, User, Menu, X } from 'lucide-react'
import { useCart } from '@/lib/CartContext'

export default function Navbar() {
  const { totalItems } = useCart()
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const navLinks = [
    { path: '/', label: 'Home' },
    { path: '/shop', label: 'Shop' },
    { path: '/about', label: 'About' },
    { path: '/contact', label: 'Contact' },
  ]

  const handleSearch = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchQuery)}`
    }
  }

  return (
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
          </div>

          <div className="hidden lg:flex items-center gap-2">
            <div className="relative">
              {isSearchOpen ? (
                <form
                  onSubmit={handleSearch}
                  className="absolute right-10 top-1/2 -translate-y-1/2"
                >
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search parts..."
                    className="w-48 md:w-64 px-4 py-2 rounded-full bg-secondary border-0 focus:outline-none focus:ring-2 focus:ring-accent text-sm"
                    autoFocus
                    onBlur={() => !searchQuery && setIsSearchOpen(false)}
                  />
                </form>
              ) : (
                <button
                  onClick={() => setIsSearchOpen(true)}
                  className="p-2.5 rounded-full hover:bg-secondary transition-colors"
                  aria-label="Search"
                >
                  <Search className="w-5 h-5 text-muted-foreground" />
                </button>
              )}
            </div>

            <Link
              href="/account"
              className="p-2.5 rounded-full hover:bg-secondary transition-colors hidden sm:block"
              aria-label="Account"
            >
              <User className="w-5 h-5 text-muted-foreground" />
            </Link>

            <Link
              href="/cart"
              className="relative p-2.5 rounded-full hover:bg-secondary transition-colors"
              aria-label="Cart"
            >
              <ShoppingBag className="w-5 h-5 text-muted-foreground" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent text-accent-foreground text-xs font-bold rounded-full flex items-center justify-center">
                  {totalItems > 9 ? '9+' : totalItems}
                </span>
              )}
            </Link>
          </div>
        </div>

        {isMenuOpen && (
          <div className="lg:hidden border-t border-border bg-background">
            <div className="container mx-auto px-4 py-4 flex flex-col gap-2">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  href={link.path}
                  className="px-4 py-3 rounded-lg text-foreground hover:bg-secondary transition-colors font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/search"
                className="px-4 py-3 rounded-lg text-foreground hover:bg-secondary transition-colors font-medium flex items-center gap-2"
                onClick={() => setIsMenuOpen(false)}
              >
                <Search className="w-5 h-5" />
                Search
              </Link>
              <Link
                href="/account"
                className="px-4 py-3 rounded-lg text-foreground hover:bg-secondary transition-colors font-medium sm:hidden flex items-center gap-2"
                onClick={() => setIsMenuOpen(false)}
              >
                <User className="w-5 h-5" />
                Account
              </Link>
              <Link
                href="/cart"
                className="px-4 py-3 rounded-lg text-foreground hover:bg-secondary transition-colors font-medium flex items-center gap-2"
                onClick={() => setIsMenuOpen(false)}
              >
                <ShoppingBag className="w-5 h-5" />
                Cart {totalItems > 0 && `(${totalItems})`}
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
