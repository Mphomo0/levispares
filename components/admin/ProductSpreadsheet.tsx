'use client'

import { useState } from 'react'
import { useConvex, useMutation } from 'convex/react'
import { toast } from 'sonner'
import { api } from '@/convex/_generated/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { downloadCsv, parseCsvRecords, toCsv } from '@/lib/csv'
import { getErrorMessage } from '@/lib/errors'

const COLUMNS = ['sku', 'name', 'partNumber', 'price', 'originalPrice', 'stockQty', 'active', 'brand', 'model', 'variant', 'category', 'description'] as const
const CHUNK = 200

type Row = { sku: string } & Partial<Record<(typeof COLUMNS)[number], string>>
type Result = { created: number; updated: number; unchanged: number; errors: Array<{ row: number; sku: string; message: string }> }

/**
 * Download every product as a spreadsheet, edit it (prices, stock, new
 * parts) and upload it again. Uploads are checked first and only saved
 * once the admin confirms.
 */
export default function ProductSpreadsheet() {
  const convex = useConvex()
  const importProducts = useMutation(api.adminTools.importProducts)
  const [rows, setRows] = useState<Row[] | null>(null)
  const [fileName, setFileName] = useState('')
  const [preview, setPreview] = useState<Result | null>(null)
  const [busy, setBusy] = useState(false)

  const exportAll = async () => {
    setBusy(true)
    try {
      const products = await convex.query(api.adminTools.exportProducts, {})
      const date = new Date().toISOString().slice(0, 10)
      downloadCsv(`products-${date}.csv`, toCsv([...COLUMNS], products.map((p) => COLUMNS.map((c) => p[c]))))
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not export products.'))
    } finally {
      setBusy(false)
    }
  }

  // Runs the rows through the server in chunks, either checking or saving.
  const run = async (data: Row[], dryRun: boolean): Promise<Result> => {
    const total: Result = { created: 0, updated: 0, unchanged: 0, errors: [] }
    for (let i = 0; i < data.length; i += CHUNK) {
      const result = await importProducts({ rows: data.slice(i, i + CHUNK), dryRun, firstRowNumber: i + 2 })
      total.created += result.created
      total.updated += result.updated
      total.unchanged += result.unchanged
      total.errors.push(...result.errors)
    }
    return total
  }

  const choose = async (file: File | undefined) => {
    if (!file) return
    setBusy(true)
    setPreview(null)
    try {
      const records = parseCsvRecords(await file.text())
      const lower = Object.fromEntries(COLUMNS.map((c) => [c.toLowerCase(), c]))
      const parsed: Row[] = records.map((record) => {
        const row: Row = { sku: '' }
        for (const [key, value] of Object.entries(record)) {
          const column = lower[key.replace(/[\s_]/g, '')]
          if (column && value !== '') row[column] = value
        }
        return row
      }).filter((row) => Object.keys(row).length > 1 || row.sku)
      if (parsed.length === 0) throw new Error('No rows found. Is the first line the column names?')
      if (!records[0] || !('sku' in records[0])) throw new Error('The file needs a "sku" column.')
      setRows(parsed)
      setFileName(file.name)
      setPreview(await run(parsed, true))
    } catch (err) {
      setRows(null)
      toast.error(getErrorMessage(err, 'Could not read that file.'))
    } finally {
      setBusy(false)
    }
  }

  const apply = async () => {
    if (!rows) return
    setBusy(true)
    try {
      const result = await run(rows, false)
      toast.success(`Saved: ${result.created} added, ${result.updated} updated.`)
      setRows(null)
      setPreview(null)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not save the changes.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Product spreadsheet</CardTitle>
        <CardDescription>
          Download all products, change prices, stock or details in Excel or Google Sheets, and upload the file again (save it as
          CSV). Products are matched by SKU; a new SKU adds a product (it then needs a name, price, brand and category). Empty
          cells leave a field as it is. Brand, model, variant and category use the short names from the URLs, e.g. isuzu.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={exportAll} disabled={busy}>Download products (CSV)</Button>
          <label className={`inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium cursor-pointer hover:bg-muted ${busy ? 'opacity-50 pointer-events-none' : ''}`}>
            Upload changes (CSV)
            <input
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={(e) => {
                void choose(e.target.files?.[0])
                e.target.value = ''
              }}
            />
          </label>
        </div>

        {busy && !preview && <p className="text-sm text-muted-foreground">Working…</p>}

        {preview && rows && (
          <div className="rounded-lg border p-4 space-y-3 text-sm">
            <p className="font-medium">Checked {fileName}: {rows.length} rows</p>
            <p>
              {preview.created} new product{preview.created === 1 ? '' : 's'}, {preview.updated} to update, {preview.unchanged} unchanged
              {preview.errors.length > 0 && <span className="text-red-600">, {preview.errors.length} with problems (these will be skipped)</span>}.
            </p>
            {preview.errors.length > 0 && (
              <ul className="max-h-48 overflow-y-auto space-y-1 text-red-700">
                {preview.errors.map((e) => (
                  <li key={`${e.row}-${e.sku}`}>Row {e.row}{e.sku ? ` (${e.sku})` : ''}: {e.message}</li>
                ))}
              </ul>
            )}
            <div className="flex gap-2">
              <Button onClick={apply} disabled={busy || preview.created + preview.updated === 0} className="bg-accent text-white hover:bg-accent/90">
                {busy ? 'Saving…' : `Save ${preview.created + preview.updated} change${preview.created + preview.updated === 1 ? '' : 's'}`}
              </Button>
              <Button variant="outline" onClick={() => { setRows(null); setPreview(null) }} disabled={busy}>Cancel</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
