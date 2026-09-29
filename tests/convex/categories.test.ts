import { describe, expect, it } from 'vitest'
import { api, internal } from '../../convex/_generated/api'
import { asAdmin, seed, setup } from './helpers'

describe('categories.update on a category with products', () => {
  it('allows a rename, trimming the name', async () => {
    const t = setup()
    const s = await seed(t)
    await asAdmin(t).mutation(api.categories.update, { id: s.categoryId, name: ' Brake Parts ', description: 'Pads and discs' })
    const category = await t.run((ctx) => ctx.db.get(s.categoryId))
    expect(category?.name).toBe('Brake Parts')
    expect(category?.description).toBe('Pads and discs')
  })

  it('still blocks changing the slug', async () => {
    const t = setup()
    const s = await seed(t)
    await expect(
      asAdmin(t).mutation(api.categories.update, { id: s.categoryId, slug: 'brake-parts' }),
    ).rejects.toThrow("slug and parent can't be changed")
  })

  it('still blocks moving it under another category', async () => {
    const t = setup()
    const s = await seed(t)
    const other = await t.run((ctx) => ctx.db.insert('categories', { name: 'Parts', slug: 'parts', active: true }))
    await expect(
      asAdmin(t).mutation(api.categories.update, { id: s.categoryId, parentId: other }),
    ).rejects.toThrow("slug and parent can't be changed")
  })

  it('treats resubmitting the current slug as no change', async () => {
    const t = setup()
    const s = await seed(t)
    await asAdmin(t).mutation(api.categories.update, { id: s.categoryId, name: 'Brakes & Discs', slug: 'brakes' })
    expect((await t.run((ctx) => ctx.db.get(s.categoryId)))?.name).toBe('Brakes & Discs')
  })
})

describe('categories.changeSlug', () => {
  it('changes the slug even when the category has products', async () => {
    const t = setup()
    const s = await seed(t)
    await t.mutation(internal.categories.changeSlug, { id: s.categoryId, slug: 'brake-parts' })
    expect((await t.run((ctx) => ctx.db.get(s.categoryId)))?.slug).toBe('brake-parts')
  })

  it('rejects a slug another category already uses, or a badly formed one', async () => {
    const t = setup()
    const s = await seed(t)
    await t.run((ctx) => ctx.db.insert('categories', { name: 'Parts', slug: 'parts', active: true }))
    await expect(t.mutation(internal.categories.changeSlug, { id: s.categoryId, slug: 'parts' })).rejects.toThrow('already exists')
    await expect(t.mutation(internal.categories.changeSlug, { id: s.categoryId, slug: 'Bad Slug' })).rejects.toThrow('lowercase')
  })
})

describe('categories.renameMany', () => {
  it('renames a category that has products, trimming the name and keeping the slug', async () => {
    const t = setup()
    const s = await seed(t)
    await t.mutation(internal.categories.renameMany, {
      renames: [{ id: s.categoryId, name: '  Brake Parts  ' }],
    })
    const category = await t.run((ctx) => ctx.db.get(s.categoryId))
    expect(category?.name).toBe('Brake Parts')
    expect(category?.slug).toBe('brakes')
  })

  it('rejects an empty name', async () => {
    const t = setup()
    const s = await seed(t)
    await expect(
      t.mutation(internal.categories.renameMany, { renames: [{ id: s.categoryId, name: '   ' }] }),
    ).rejects.toThrow('cannot be empty')
  })
})
