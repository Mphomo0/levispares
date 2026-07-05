import { Suspense } from 'react'
import ShopContent from './ShopContent'

export default function ShopPage() {
  return (
    <Suspense>
      <ShopContent />
    </Suspense>
  )
}
