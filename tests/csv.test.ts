import { describe, expect, it } from 'vitest'
import { parseCsv, parseCsvRecords, toCsv } from '@/lib/csv'

describe('csv', () => {
  it('reads quoted fields with commas, quotes and line breaks, and Excel byte-order marks', () => {
    const text = '﻿sku,name,description\r\nA-1,"Pad, front","Says ""hi""\nline two"\r\n\r\nB-2,Filter,\n'
    expect(parseCsv(text)).toEqual([
      ['sku', 'name', 'description'],
      ['A-1', 'Pad, front', 'Says "hi"\nline two'],
      ['B-2', 'Filter', ''],
    ])
    expect(parseCsvRecords(text)[0]).toEqual({ sku: 'A-1', name: 'Pad, front', description: 'Says "hi"\nline two' })
  })

  it('writes what it reads', () => {
    const csv = toCsv(['sku', 'name'], [['A-1', 'Pad, "front"'], ['B-2', 3]])
    expect(parseCsv(csv)).toEqual([['sku', 'name'], ['A-1', 'Pad, "front"'], ['B-2', '3']])
  })
})
