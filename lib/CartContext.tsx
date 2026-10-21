'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, ReactNode } from 'react'
import { useConvexAuth, useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'

export interface Product {
  _id: string
  name: string
  price: number
  originalPrice?: number
  image?: string
  category?: string
  description?: string
  sku?: string
  /** Units in stock when the product was added; the server re-checks at checkout. */
  stockQty?: number
  specs?: { label: string; value: string }[]
}

export interface CartItem extends Product {
  quantity: number
}

interface CartContextType {
  items: CartItem[]
  /** Returns false when nothing could be added (out of stock, or the whole stock is already in the cart). */
  addToCart: (product: Product, quantity?: number) => boolean
  removeFromCart: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  /** Adds items (e.g. from a saved cart), keeping the larger quantity of any already in the cart. */
  mergeItems: (incoming: CartItem[]) => void
  totalItems: number
  totalPrice: number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

const CART_STORAGE_KEY = 'levispares-cart'
// Wait for changes to settle before saving the cart to the server.
const SAVE_DELAY_MS = 1000

function mergeCarts(current: CartItem[], incoming: CartItem[]) {
  const merged = current.map(item => {
    const match = incoming.find(i => i._id === item._id)
    if (!match) return item
    const max = match.stockQty ?? Infinity
    return { ...item, ...match, quantity: Math.min(Math.max(item.quantity, match.quantity), max) }
  })
  for (const item of incoming) {
    if (!current.some(i => i._id === item._id)) merged.push(item)
  }
  return merged
}

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const savedCart = localStorage.getItem(CART_STORAGE_KEY)
    if (savedCart) {
      try {
        const parsed = JSON.parse(savedCart)
        setItems(parsed) // eslint-disable-line react-hooks/set-state-in-effect
      } catch (e) {
        console.error('Failed to parse cart from localStorage:', e)
      }
    }
    setIsLoaded(true)
  }, [])

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
    }
  }, [items, isLoaded])

  const addToCart = useCallback((product: Product, quantity = 1) => {
    const max = product.stockQty ?? Infinity
    const current = items.find(item => item._id === product._id)?.quantity ?? 0
    const next = Math.min(current + quantity, max)
    if (next <= current) return false

    setItems(prev => {
      const existing = prev.find(item => item._id === product._id)
      if (existing) {
        return prev.map(item =>
          item._id === product._id
            ? { ...item, ...product, quantity: next }
            : item
        )
      }
      return [...prev, { ...product, quantity: next }]
    })
    return true
  }, [items])

  const removeFromCart = useCallback((productId: string) => {
    setItems(prev => prev.filter(item => item._id !== productId))
  }, [])

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems(prev => prev.filter(item => item._id !== productId))
      return
    }
    setItems(prev =>
      prev.map(item =>
        item._id === productId
          ? { ...item, quantity: Math.min(quantity, item.stockQty ?? Infinity) }
          : item
      )
    )
  }, [])

  const clearCart = useCallback(() => {
    setItems([])
    localStorage.removeItem(CART_STORAGE_KEY)
  }, [])

  const mergeItems = useCallback((incoming: CartItem[]) => {
    setItems(prev => mergeCarts(prev, incoming))
  }, [])

  // Signed-in customers' carts are also kept on the server, so they follow
  // them between devices and a reminder can be sent if they are left behind.
  // On sign-in the saved cart is merged in first; after that every change is saved.
  const { isAuthenticated } = useConvexAuth()
  const savedCart = useQuery(api.carts.mine, isAuthenticated ? {} : 'skip')
  const saveCart = useMutation(api.carts.save)
  const [synced, setSynced] = useState(false)
  const lastSaved = useRef<string | null>(null)

  useEffect(() => {
    if (!isAuthenticated) {
      setSynced(false) // eslint-disable-line react-hooks/set-state-in-effect
      lastSaved.current = null
      return
    }
    if (!isLoaded || synced || !savedCart) return
    setItems(prev => mergeCarts(prev, savedCart))
    setSynced(true)
  }, [isAuthenticated, isLoaded, synced, savedCart])

  useEffect(() => {
    if (!synced) return
    const payload = items.map(item => ({ productId: item._id as Id<'products'>, quantity: item.quantity }))
    const key = JSON.stringify(payload)
    if (key === lastSaved.current) return
    const timer = setTimeout(() => {
      saveCart({ items: payload })
        .then(() => { lastSaved.current = key })
        .catch(error => console.error('Failed to save cart:', error))
    }, SAVE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [items, synced, saveCart])

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
  const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

  const value = useMemo(() => ({
    items,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    mergeItems,
    totalItems,
    totalPrice,
  }), [items, addToCart, removeFromCart, updateQuantity, clearCart, mergeItems, totalItems, totalPrice])

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}
