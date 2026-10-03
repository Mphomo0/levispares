import { notFound, permanentRedirect } from 'next/navigation'
import ProductContent from './ProductContent'
import { getProductDetails, resolveProduct } from './resolve'

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: ref } = await params
  const product = await resolveProduct(decodeURIComponent(ref))
  if (!product) notFound()

  // Old id links (and any other spelling) move to the readable address.
  if (product.slug && product.slug !== decodeURIComponent(ref)) {
    permanentRedirect(`/products/${product.slug}`)
  }

  const details = await getProductDetails(product._id)
  return <ProductContent productId={product._id} initialProduct={details ?? undefined} />
}
