import { describe, expect, it } from 'vitest'
import { api } from '../../convex/_generated/api'
import { setup } from './helpers'

const asAdmin = (t: ReturnType<typeof setup>) => t.withIdentity({ subject: 'admin_1', role: 'admin' })

async function seed(t: ReturnType<typeof setup>) {
  return t.run(async (ctx) => ({
    brandId: await ctx.db.insert('brands', { name: 'Isuzu', slug: 'isuzu', active: true }),
    categoryId: await ctx.db.insert('categories', { name: 'Mirrors', slug: 'mirrors', active: true }),
  }))
}

describe('product pictures', () => {
  it('keeps every picture when a product is created with several', async () => {
    const t = setup()
    const { brandId, categoryId } = await seed(t)
    const id = await asAdmin(t).mutation(api.products.addWithRelations, {
      name: 'Mirror Arm LH',
      price: 500,
      brandId,
      categoryId,
      image: 'https://ik.imagekit.io/x/one.jpg',
      images: ['https://ik.imagekit.io/x/two.jpg', 'https://ik.imagekit.io/x/three.jpg'],
    })
    const product = await t.query(api.products.getWithFullHierarchy, { id })
    expect(product?.image).toBe('https://ik.imagekit.io/x/one.jpg')
    expect(product?.images.map((i) => i.url)).toEqual([
      'https://ik.imagekit.io/x/two.jpg',
      'https://ik.imagekit.io/x/three.jpg',
    ])
  })

  it('replaces the gallery when a product is edited', async () => {
    const t = setup()
    const { brandId, categoryId } = await seed(t)
    const admin = asAdmin(t)
    const id = await admin.mutation(api.products.addWithRelations, {
      name: 'Mirror Arm RH',
      price: 500,
      brandId,
      categoryId,
      image: 'https://ik.imagekit.io/x/a.jpg',
      images: ['https://ik.imagekit.io/x/b.jpg'],
    })
    await admin.mutation(api.products.updateWithRelations, {
      id,
      image: 'https://ik.imagekit.io/x/a.jpg',
      images: ['https://ik.imagekit.io/x/c.jpg', 'https://ik.imagekit.io/x/d.jpg'],
    })
    const product = await t.query(api.products.getWithFullHierarchy, { id })
    expect(product?.images.map((i) => i.url)).toEqual([
      'https://ik.imagekit.io/x/c.jpg',
      'https://ik.imagekit.io/x/d.jpg',
    ])
  })

  it('leaves the gallery alone when an edit does not mention pictures', async () => {
    const t = setup()
    const { brandId, categoryId } = await seed(t)
    const admin = asAdmin(t)
    const id = await admin.mutation(api.products.addWithRelations, {
      name: 'Door Handle LH',
      price: 300,
      brandId,
      categoryId,
      image: 'https://ik.imagekit.io/x/a.jpg',
      images: ['https://ik.imagekit.io/x/b.jpg'],
    })
    await admin.mutation(api.products.updateWithRelations, { id, price: 350 })
    const product = await t.query(api.products.getWithFullHierarchy, { id })
    expect(product?.images.map((i) => i.url)).toEqual(['https://ik.imagekit.io/x/b.jpg'])
  })
})
