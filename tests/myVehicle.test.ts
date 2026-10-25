import { describe, expect, it } from 'vitest'
import { fitsVehicle, vehicleName, type MyVehicle } from '@/lib/myVehicle'

const npr: MyVehicle = {
  brand: { id: 'isuzu', slug: 'isuzu', name: 'Isuzu' },
  model: { id: 'npr', slug: 'npr', name: 'NPR' },
  variant: { id: 'npr400', slug: 'npr-400', name: '400' },
}

describe('fitsVehicle', () => {
  it('matches brand, model and variant, treating a missing model or variant as "fits all"', () => {
    expect(fitsVehicle({ brandId: 'isuzu' }, npr)).toBe(true)
    expect(fitsVehicle({ brandId: 'isuzu', modelId: 'npr' }, npr)).toBe(true)
    expect(fitsVehicle({ brandId: 'isuzu', modelId: 'npr', variantId: 'npr400' }, npr)).toBe(true)
    expect(fitsVehicle({ brandId: 'isuzu', modelId: 'npr', variantId: 'npr300' }, npr)).toBe(false)
    expect(fitsVehicle({ brandId: 'isuzu', modelId: 'frr' }, npr)).toBe(false)
    expect(fitsVehicle({ brandId: 'hino' }, npr)).toBe(false)
  })

  it('cannot confirm a model-specific part when only the make is known', () => {
    expect(fitsVehicle({ brandId: 'isuzu', modelId: 'npr' }, { brand: npr.brand })).toBe(false)
    expect(vehicleName(npr)).toBe('Isuzu NPR 400')
  })
})
