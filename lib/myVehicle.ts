'use client'

import { useSyncExternalStore } from 'react'

/** The truck a customer is shopping for, remembered in this browser. */
export interface MyVehicle {
  brand: { id: string; slug: string; name: string }
  model?: { id: string; slug: string; name: string }
  variant?: { id: string; slug: string; name: string }
}

const STORAGE_KEY = 'levispares-vehicle'
const listeners = new Set<() => void>()
let cachedRaw: string | null = null
let cachedValue: MyVehicle | null = null

function read(): MyVehicle | null {
  let raw: string | null = null
  try {
    raw = localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
  // Same string, same object, so React doesn't re-render for nothing.
  if (raw === cachedRaw) return cachedValue
  cachedRaw = raw
  try {
    const parsed = raw ? JSON.parse(raw) : null
    cachedValue = parsed?.brand?.slug ? parsed : null
  } catch {
    cachedValue = null
  }
  return cachedValue
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) listener()
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

export function setMyVehicle(vehicle: MyVehicle | null) {
  try {
    if (vehicle) localStorage.setItem(STORAGE_KEY, JSON.stringify(vehicle))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Private browsing or storage blocked: the vehicle just isn't remembered.
  }
  listeners.forEach((listener) => listener())
}

/** The remembered vehicle, or null (also null while rendering on the server). */
export function useMyVehicle() {
  return useSyncExternalStore(subscribe, read, () => null)
}

export function vehicleName(vehicle: MyVehicle) {
  return [vehicle.brand.name, vehicle.model?.name, vehicle.variant?.name].filter(Boolean).join(' ')
}

/**
 * Whether a product is listed for the vehicle. A product with no model fits
 * every model of its brand; one with no variant fits every variant of its model.
 */
export function fitsVehicle(
  product: { brandId: string; modelId?: string | null; variantId?: string | null },
  vehicle: MyVehicle,
) {
  if (product.brandId !== vehicle.brand.id) return false
  if (product.modelId && vehicle.model && product.modelId !== vehicle.model.id) return false
  if (product.modelId && !vehicle.model) return false
  if (product.variantId && vehicle.variant && product.variantId !== vehicle.variant.id) return false
  return true
}
