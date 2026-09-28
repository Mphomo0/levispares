import { convexTest } from 'convex-test'
import schema from '../../convex/schema'

export const modules = import.meta.glob('../../convex/**/*.*s')

export function setup() {
  process.env.PAYMENT_SERVER_SECRET = 'test-secret'
  return convexTest(schema, modules)
}

export type T = ReturnType<typeof setup>

/** A small store: two products, a customer with an address, another customer, and an admin. */
export async function seed(t: T, opts: { settings?: boolean } = {}) {
  return t.run(async (ctx) => {
    const brandId = await ctx.db.insert('brands', { name: 'Isuzu', slug: 'isuzu', active: true })
    const categoryId = await ctx.db.insert('categories', { name: 'Brakes', slug: 'brakes', active: true })
    const p1 = await ctx.db.insert('products', {
      brandId, categoryId, sku: 'SKU-1', name: 'Brake pad', price: 100, stockQty: 10, active: true,
    })
    const p2 = await ctx.db.insert('products', {
      brandId, categoryId, sku: 'SKU-2', name: 'Oil filter', price: 49.99, stockQty: 5, active: true,
    })
    const userA = await ctx.db.insert('users', { clerkId: 'user_a', email: 'a@example.com', name: 'Alice', role: 'user', isActive: true })
    const userB = await ctx.db.insert('users', { clerkId: 'user_b', email: 'b@example.com', name: 'Bob', role: 'user', isActive: true })
    const admin = await ctx.db.insert('users', { clerkId: 'admin_1', email: 'admin@example.com', name: 'Admin', role: 'admin', isActive: true })
    const addrA = await ctx.db.insert('addresses', {
      userId: userA, type: 'shipping', name: 'Alice', street: '1 Main Road', city: 'Pretoria',
      province: 'Gauteng', postalCode: '0182', country: 'South Africa', phone: '0123456789', isDefault: true,
    })
    const addrB = await ctx.db.insert('addresses', {
      userId: userB, type: 'shipping', name: 'Bob', street: '2 Side Street', city: 'Cape Town',
      postalCode: '8001', country: 'South Africa',
    })
    if (opts.settings !== false) {
      await ctx.db.insert('storeSettings', {
        key: 'global', taxEnabled: true, taxRate: 15, shippingRate: 250, zarPerUsd: 18,
      })
    }
    return { brandId, categoryId, p1, p2, userA, userB, admin, addrA, addrB }
  })
}

export const asUser = (t: T, sub: string) => t.withIdentity({ subject: sub, email: `${sub}@example.com` })
export const asAdmin = (t: T) => t.withIdentity({ subject: 'admin_1', role: 'admin' })
