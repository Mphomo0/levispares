'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react'

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
  totalItems: number
  totalPrice: number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

const CART_STORAGE_KEY = 'levispares-cart'

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

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
  const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

  const value = useMemo(() => ({
    items,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    totalItems,
    totalPrice,
  }), [items, addToCart, removeFromCart, updateQuantity, clearCart, totalItems, totalPrice])

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
