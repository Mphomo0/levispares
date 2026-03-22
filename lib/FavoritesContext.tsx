'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'

export interface Product {
  _id: string
  name: string
  price: number
  image: string
  category: string
  description: string
  specs?: { label: string; value: string }[]
}

interface FavoritesContextType {
  items: Product[]
  isFavorite: (productId: string) => boolean
  addToFavorites: (product: Product) => void
  removeFromFavorites: (productId: string) => void
  toggleFavorite: (product: Product) => void
  clearFavorites: () => void
  count: number
  getGuestFavorites: () => Product[]
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined)

const GUEST_FAVORITES_KEY = 'levispares-favorites-guest'

export const FavoritesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<Product[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(GUEST_FAVORITES_KEY)
    if (saved) {
      try {
        setItems(JSON.parse(saved))
      } catch (e) {
        console.error('Failed to parse favorites from localStorage:', e)
      }
    }
    setIsLoaded(true)
  }, [])

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(GUEST_FAVORITES_KEY, JSON.stringify(items))
    }
  }, [items, isLoaded])

  const isFavorite = useCallback((productId: string) => {
    return items.some(item => item._id === productId)
  }, [items])

  const addToFavorites = useCallback((product: Product) => {
    setItems(prev => {
      if (prev.some(item => item._id === product._id)) return prev
      return [...prev, product]
    })
  }, [])

  const removeFromFavorites = useCallback((productId: string) => {
    setItems(prev => prev.filter(item => item._id !== productId))
  }, [])

  const toggleFavorite = useCallback((product: Product) => {
    if (isFavorite(product._id)) {
      removeFromFavorites(product._id)
    } else {
      addToFavorites(product)
    }
  }, [isFavorite, addToFavorites, removeFromFavorites])

  const clearFavorites = useCallback(() => {
    setItems([])
    localStorage.removeItem(GUEST_FAVORITES_KEY)
  }, [])

  const getGuestFavorites = useCallback(() => {
    return items
  }, [items])

  return (
    <FavoritesContext.Provider value={{
      items,
      isFavorite,
      addToFavorites,
      removeFromFavorites,
      toggleFavorite,
      clearFavorites,
      count: items.length,
      getGuestFavorites,
    }}>
      {children}
    </FavoritesContext.Provider>
  )
}

export const useFavorites = () => {
  const context = useContext(FavoritesContext)
  if (!context) {
    throw new Error('useFavorites must be used within a FavoritesProvider')
  }
  return context
}
