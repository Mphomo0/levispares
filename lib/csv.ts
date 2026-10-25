/**
 * Minimal CSV reading and writing (RFC 4180: quoted fields, doubled quotes,
 * commas and line breaks inside quotes), enough for spreadsheets exported
 * from Excel or Google Sheets.
 */

export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  // Excel adds a byte-order mark to UTF-8 files.
  const input = text.replace(/^﻿/, '')

  for (let i = 0; i < input.length; i++) {
    const c = input[i]
    if (quoted) {
      if (c === '"' && input[i + 1] === '"') {
        field += '"'
        i++
      } else if (c === '"') {
        quoted = false
      } else {
        field += c
      }
    } else if (c === '"') {
      quoted = true
    } else if (c === ',') {
      row.push(field)
      field = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && input[i + 1] === '\n') i++
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else {
      field += c
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  // Drop completely empty lines.
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''))
}

/** Reads a CSV with a header row into objects keyed by the (lower-cased, trimmed) header names. */
export function parseCsvRecords(text: string): Array<Record<string, string>> {
  const [header, ...rows] = parseCsv(text)
  if (!header) return []
  const keys = header.map((h) => h.trim().toLowerCase())
  return rows.map((row) => Object.fromEntries(keys.map((key, i) => [key, (row[i] ?? '').trim()])))
}

function cell(value: unknown) {
  const text = value === undefined || value === null ? '' : String(value)
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function toCsv(header: string[], rows: unknown[][]) {
  return [header, ...rows].map((row) => row.map(cell).join(',')).join('\r\n') + '\r\n'
}

/** Starts a download of a CSV file in the browser. */
export function downloadCsv(filename: string, csv: string) {
  // The byte-order mark makes Excel read the file as UTF-8.
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
