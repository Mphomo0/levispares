'use client'

import { CircleCheck, CircleAlert } from 'lucide-react'
import { fitsVehicle, useMyVehicle, vehicleName } from '@/lib/myVehicle'

/** On a product page: whether the part is listed for the customer's remembered vehicle. */
export default function FitmentNote({
  product,
}: {
  product: {
    brandId: string
    modelId?: string | null
    variantId?: string | null
    brand?: { name: string } | null
    model?: { name: string } | null
    variant?: { variantValue: string } | null
  }
}) {
  const vehicle = useMyVehicle()
  if (!vehicle) return null

  const listedFor = [product.brand?.name, product.model?.name, product.variant?.variantValue].filter(Boolean).join(' ')

  if (fitsVehicle(product, vehicle)) {
    return (
      <p className="flex items-start gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
        <CircleCheck className="h-5 w-5 shrink-0" aria-hidden="true" />
        <span>Fits your <strong>{vehicleName(vehicle)}</strong></span>
      </p>
    )
  }
  return (
    <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
      <CircleAlert className="h-5 w-5 shrink-0" aria-hidden="true" />
      <span>
        Not listed for your <strong>{vehicleName(vehicle)}</strong>
        {listedFor && <> (listed for {listedFor})</>}. Call us on 012 770 3389 if you&apos;re not sure.
      </span>
    </p>
  )
}
