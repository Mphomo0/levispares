'use client'

import Link from 'next/link'
import { Truck } from 'lucide-react'
import { setMyVehicle, useMyVehicle, vehicleName, type MyVehicle } from '@/lib/myVehicle'
import { shopUrl, type ShopFilters } from '@/lib/shopUrl'

/**
 * Above the shop results: shows the customer's remembered vehicle with a
 * one-click filter for it, or offers to remember the vehicle they've just
 * filtered by.
 */
export default function MyVehicleBar({
  filters,
  filtered,
}: {
  filters: ShopFilters
  /** The vehicle the current filters pick out, once its names are known. */
  filtered: MyVehicle | null
}) {
  const vehicle = useMyVehicle()

  const showing = vehicle && filters.brand === vehicle.brand.slug &&
    (filters.model ?? '') === (vehicle.model?.slug ?? '') &&
    (filters.variant ?? '') === (vehicle.variant?.slug ?? '')

  if (vehicle && showing) {
    return (
      <Bar>
        <span>Showing parts for your <strong>{vehicleName(vehicle)}</strong></span>
        <button type="button" onClick={() => setMyVehicle(null)} className="text-brand font-medium hover:underline">
          Forget this vehicle
        </button>
      </Bar>
    )
  }

  if (filtered && (!vehicle || vehicleName(filtered) !== vehicleName(vehicle))) {
    return (
      <Bar>
        <span>Shopping for a <strong>{vehicleName(filtered)}</strong>?</span>
        <button type="button" onClick={() => setMyVehicle(filtered)} className="text-brand font-medium hover:underline">
          Remember it as my vehicle
        </button>
      </Bar>
    )
  }

  if (vehicle) {
    return (
      <Bar>
        <span>Your vehicle: <strong>{vehicleName(vehicle)}</strong></span>
        <Link
          href={shopUrl({ brand: vehicle.brand.slug, model: vehicle.model?.slug, variant: vehicle.variant?.slug })}
          className="text-brand font-medium hover:underline"
        >
          Show parts that fit
        </Link>
      </Bar>
    )
  }

  return null
}

function Bar({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
      <Truck className="h-5 w-5 text-brand shrink-0" aria-hidden="true" />
      {children}
    </div>
  )
}
