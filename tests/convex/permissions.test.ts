import { describe, expect, it } from 'vitest'
import { api } from '../../convex/_generated/api'
import { asAdmin, asUser, seed, setup } from './helpers'

describe('admin-only catalogue and settings', () => {
  it('rejects signed-out and ordinary customers, allows admins', async () => {
    const t = setup()
    const s = await seed(t)
    const calls: Array<[string, (c: any) => Promise<unknown>]> = [
      ['settings.update', (c) => c.mutation(api.settings.update, { taxEnabled: false, taxRate: 0, shippingRate: 100 })],
      ['products.toggleActive', (c) => c.mutation(api.products.toggleActive, { id: s.p1 })],
      ['products.setStock', (c) => c.mutation(api.products.setStock, { id: s.p1, stockQty: 999 })],
      ['products.remove', (c) => c.mutation(api.products.remove, { id: s.p2 })],
      ['brands.toggleActive', (c) => c.mutation(api.brands.toggleActive, { id: s.brandId })],
      ['categories.toggleActive', (c) => c.mutation(api.categories.toggleActive, { id: s.categoryId })],
      ['admin.resetAllData', (c) => c.mutation(api.admin.resetAllData, {})],
    ]
    for (const [name, call] of calls) {
      await expect(call(t), `${name} signed out`).rejects.toThrow()
      await expect(call(asUser(t, 'user_a')), `${name} customer`).rejects.toThrow(/Admin access required/)
    }
    // nothing changed
    expect((await t.run((ctx) => ctx.db.get(s.p1)))?.stockQty).toBe(10)
    expect((await t.run((ctx) => ctx.db.get(s.p2)))).not.toBeNull()

    await asAdmin(t).mutation(api.products.toggleActive, { id: s.p1 })
    expect((await t.run((ctx) => ctx.db.get(s.p1)))?.active).toBe(false)
  })

  it('reset all data works for an admin only', async () => {
    const t = setup()
    await seed(t)
    await expect(asUser(t, 'user_a').mutation(api.admin.resetAllData, {})).rejects.toThrow(/Admin access required/)
    expect(await t.run((ctx) => ctx.db.query('products').collect())).toHaveLength(2)
    await asAdmin(t).mutation(api.admin.resetAllData, {})
    expect(await t.run((ctx) => ctx.db.query('products').collect())).toHaveLength(0)
  })

  it('a customer cannot make themselves an admin', async () => {
    const t = setup()
    await seed(t)
    await expect(asUser(t, 'user_a').mutation(api.users.setAdmin, { clerkId: 'user_a' })).rejects.toThrow(/Admin access required/)
    await expect(t.mutation(api.users.setAdmin, { clerkId: 'user_a' })).rejects.toThrow()
  })

  it('an admin is recognised by the token claim or the stored role', async () => {
    const t = setup()
    await seed(t)
    // stored role only (no claim on the token)
    await t.withIdentity({ subject: 'admin_1' }).mutation(api.settings.update, { taxEnabled: false, taxRate: 0, shippingRate: 1 })
    // token claim only (no stored user)
    await t.withIdentity({ subject: 'brand_new', role: 'admin' }).mutation(api.settings.update, { taxEnabled: false, taxRate: 0, shippingRate: 2 })
    // Clerk public metadata claim
    await t.withIdentity({ subject: 'brand_new2', metadata: { role: 'admin' } } as any).mutation(api.settings.update, { taxEnabled: false, taxRate: 0, shippingRate: 3 })
  })

  it('a banned admin loses access', async () => {
    const t = setup()
    const s = await seed(t)
    await t.run((ctx) => ctx.db.patch(s.admin, { isActive: false }))
    await expect(asAdmin(t).mutation(api.settings.update, { taxEnabled: false, taxRate: 0, shippingRate: 1 })).rejects.toThrow(/deactivated/)
  })

  it('validates the exchange rate', async () => {
    const t = setup()
    await seed(t)
    const admin = asAdmin(t)
    for (const zarPerUsd of [0, -5, NaN]) {
      await expect(admin.mutation(api.settings.update, { taxEnabled: false, taxRate: 0, shippingRate: 1, zarPerUsd })).rejects.toThrow()
    }
    await admin.mutation(api.settings.update, { taxEnabled: false, taxRate: 0, shippingRate: 1, zarPerUsd: 18.5 })
    expect((await t.query(api.settings.get, {})).zarPerUsd).toBe(18.5)
    // saving other settings keeps the rate
    await admin.mutation(api.settings.update, { taxEnabled: true, taxRate: 15, shippingRate: 300 })
    expect((await t.query(api.settings.get, {})).zarPerUsd).toBe(18.5)
  })
})

describe('banning users', () => {
  it('only an admin can ban, and not themselves', async () => {
    const t = setup()
    const s = await seed(t)
    await expect(asUser(t, 'user_b').mutation(api.users.setActive, { id: s.userA, active: false })).rejects.toThrow(/Admin access required/)
    await expect(asAdmin(t).mutation(api.users.setActive, { id: s.admin, active: false })).rejects.toThrow(/your own account/)
    const result = await asAdmin(t).mutation(api.users.setActive, { id: s.userA, active: false })
    expect(result).toEqual({ clerkId: 'user_a' })
  })

  it('a banned customer is treated as signed out everywhere', async () => {
    const t = setup()
    const s = await seed(t)
    const a = asUser(t, 'user_a')
    await a.mutation(api.orders.create, { items: [{ productId: s.p1, quantity: 1 }] })
    await asAdmin(t).mutation(api.users.setActive, { id: s.userA, active: false })

    await expect(a.mutation(api.orders.create, { items: [{ productId: s.p1, quantity: 1 }] })).rejects.toThrow(/Not authenticated/)
    expect(await a.query(api.orders.listByUser, {})).toEqual([])
    expect(await a.query(api.addresses.listByUser, {})).toEqual([])
    await expect(a.mutation(api.wishlists.addToDefault, { productId: s.p1 })).rejects.toThrow(/Not authenticated/)
    await expect(a.mutation(api.reviews.add, { productId: s.p1, rating: 5 })).rejects.toThrow(/Not authenticated/)

    // reinstated
    await asAdmin(t).mutation(api.users.setActive, { id: s.userA, active: true })
    await a.mutation(api.orders.create, { items: [{ productId: s.p1, quantity: 1 }] })
  })

  it('the user list and profiles are admin-only', async () => {
    const t = setup()
    const s = await seed(t)
    expect(await asUser(t, 'user_a').query(api.users.list, {})).toEqual([])
    expect(await asUser(t, 'user_a').query(api.users.getById, { id: s.userB })).toBeNull()
    expect((await asAdmin(t).query(api.users.list, {})).length).toBe(3)
    // a customer can read their own record by Clerk id but not someone else's
    expect(await asUser(t, 'user_a').query(api.users.getByClerkId, { clerkId: 'user_a' })).not.toBeNull()
    expect(await asUser(t, 'user_a').query(api.users.getByClerkId, { clerkId: 'user_b' })).toBeNull()
    expect(await t.query(api.users.getByClerkId, { clerkId: 'user_a' })).toBeNull()
  })
})

describe('customers can only touch their own saved data', () => {
  it('addresses', async () => {
    const t = setup()
    const s = await seed(t)
    const b = asUser(t, 'user_b')
    await expect(b.mutation(api.addresses.update, { id: s.addrA, name: 'Hacked' })).rejects.toThrow(/Address not found/)
    await expect(b.mutation(api.addresses.remove, { id: s.addrA })).rejects.toThrow(/Address not found/)
    await expect(b.mutation(api.addresses.setDefault, { id: s.addrA })).rejects.toThrow(/Address not found/)
    await expect(t.mutation(api.addresses.remove, { id: s.addrA })).rejects.toThrow()
    expect((await t.run((ctx) => ctx.db.get(s.addrA)))?.name).toBe('Alice')
    await asUser(t, 'user_a').mutation(api.addresses.update, { id: s.addrA, name: 'Alice Smith' })
    expect((await t.run((ctx) => ctx.db.get(s.addrA)))?.name).toBe('Alice Smith')
    expect(await b.query(api.addresses.listByUserId, { userId: s.userA })).toEqual([])
    expect(await asAdmin(t).query(api.addresses.listByUserId, { userId: s.userA })).toHaveLength(1)
  })

  it('wishlists', async () => {
    const t = setup()
    const s = await seed(t)
    const a = asUser(t, 'user_a')
    const b = asUser(t, 'user_b')
    const id = await a.mutation(api.wishlists.create, { name: 'Mine' })
    await expect(b.mutation(api.wishlists.update, { id, name: 'Hacked' })).rejects.toThrow(/Wishlist not found/)
    await expect(b.mutation(api.wishlists.remove, { id })).rejects.toThrow(/Wishlist not found/)
    await expect(b.mutation(api.wishlists.addItem, { wishlistId: id, productId: s.p1 })).rejects.toThrow(/Wishlist not found/)
    await expect(b.mutation(api.wishlists.clearWishlist, { id })).rejects.toThrow(/Wishlist not found/)
    await a.mutation(api.wishlists.addItem, { wishlistId: id, productId: s.p1 })
    await expect(b.mutation(api.wishlists.removeItem, { wishlistId: id, productId: s.p1 })).rejects.toThrow(/Wishlist not found/)
    // private lists are private, public ones are readable
    expect(await b.query(api.wishlists.getById, { id })).toBeNull()
    expect(await a.query(api.wishlists.getById, { id })).not.toBeNull()
    await a.mutation(api.wishlists.update, { id, isPublic: true })
    expect(await b.query(api.wishlists.getById, { id })).not.toBeNull()
  })

  it('reviews: edit and delete by the author or an admin only', async () => {
    const t = setup()
    const s = await seed(t)
    const a = asUser(t, 'user_a')
    const b = asUser(t, 'user_b')
    const id = await a.mutation(api.reviews.add, { productId: s.p1, rating: 4, title: 'Good' })
    await expect(b.mutation(api.reviews.update, { id, rating: 1 })).rejects.toThrow(/Admin access required/)
    await expect(b.mutation(api.reviews.remove, { id })).rejects.toThrow(/Admin access required/)
    await expect(a.mutation(api.reviews.markVerified, { id })).rejects.toThrow(/Admin access required/)
    await a.mutation(api.reviews.update, { id, rating: 5 })
    expect((await t.run((ctx) => ctx.db.get(id)))?.rating).toBe(5)
    await asAdmin(t).mutation(api.reviews.remove, { id })
    expect(await t.run((ctx) => ctx.db.get(id))).toBeNull()
  })

  it('reviews: validation, one per product, verified only after a paid purchase, no email leak', async () => {
    const t = setup()
    const s = await seed(t)
    const a = asUser(t, 'user_a')
    for (const rating of [0, 6, 2.5]) {
      await expect(a.mutation(api.reviews.add, { productId: s.p1, rating })).rejects.toThrow(/between 1 and 5/)
    }
    await expect(a.mutation(api.reviews.add, { productId: s.p1, rating: 5, title: 'x'.repeat(101) })).rejects.toThrow(/too long/)
    await expect(a.mutation(api.reviews.add, { productId: s.p1, rating: 5, comment: 'x'.repeat(2001) })).rejects.toThrow(/too long/)

    const first = await a.mutation(api.reviews.add, { productId: s.p1, rating: 5 })
    await expect(a.mutation(api.reviews.add, { productId: s.p1, rating: 5 })).rejects.toThrow(/already reviewed/)
    expect((await t.run((ctx) => ctx.db.get(first)))?.verifiedPurchase).toBe(false)

    const { orderId } = await a.mutation(api.orders.create, { items: [{ productId: s.p2, quantity: 1 }] })
    await t.mutation(api.orders.markPaid, { id: orderId, paypalOrderId: 'PP', serverSecret: 'test-secret' })
    const second = await a.mutation(api.reviews.add, { productId: s.p2, rating: 4 })
    expect((await t.run((ctx) => ctx.db.get(second)))?.verifiedPurchase).toBe(true)

    const listed = await t.query(api.reviews.listByProduct, { productId: s.p2 })
    expect(listed[0].user).toEqual({ name: 'Alice' })
  })
})

describe('deleting an account', () => {
  it('erases personal data, keeps the order record anonymised', async () => {
    const t = setup()
    const s = await seed(t)
    const a = asUser(t, 'user_a')
    await a.mutation(api.wishlists.addToDefault, { productId: s.p1 })
    await a.mutation(api.reviews.add, { productId: s.p1, rating: 5 })
    const { orderId } = await a.mutation(api.orders.create, { items: [{ productId: s.p1, quantity: 1 }], shippingAddressId: s.addrA })

    await a.mutation(api.users.deleteMyData, {})
    const left = await t.run(async (ctx) => ({
      addresses: await ctx.db.query('addresses').withIndex('by_userId', (q) => q.eq('userId', s.userA)).collect(),
      wishlists: await ctx.db.query('wishlists').withIndex('by_userId', (q) => q.eq('userId', s.userA)).collect(),
      wishlistItems: await ctx.db.query('wishlistItems').collect(),
      reviews: await ctx.db.query('reviews').collect(),
      user: await ctx.db.get(s.userA),
      order: await ctx.db.get(orderId),
    }))
    expect(left.addresses).toHaveLength(0)
    expect(left.wishlists).toHaveLength(0)
    expect(left.wishlistItems).toHaveLength(0)
    expect(left.reviews).toHaveLength(0)
    expect(left.user).toMatchObject({ name: 'Deleted customer' })
    expect(left.user?.email).not.toContain('example.com')
    expect(left.order).not.toBeNull()
    // someone else's data is untouched
    expect(await t.run((ctx) => ctx.db.get(s.addrB))).not.toBeNull()
  })
})

describe('public product visibility', () => {
  it('deactivated products are hidden from the product page', async () => {
    const t = setup()
    const s = await seed(t)
    expect(await t.query(api.products.getWithFullHierarchy, { id: s.p1 })).not.toBeNull()
    await asAdmin(t).mutation(api.products.toggleActive, { id: s.p1 })
    expect(await t.query(api.products.getWithFullHierarchy, { id: s.p1 })).toBeNull()
  })

  it('a malformed or unknown product id is simply not found', async () => {
    const t = setup()
    await seed(t)
    expect(await t.query(api.products.getWithFullHierarchy, { id: 'not-a-real-id' })).toBeNull()
    expect(await t.query(api.products.getWithFullHierarchy, { id: '' })).toBeNull()
  })
})
