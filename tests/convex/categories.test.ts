import { describe, expect, it } from 'vitest'
import { internal } from '../../convex/_generated/api'
import { seed, setup } from './helpers'

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
