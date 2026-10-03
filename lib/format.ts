const amountFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

// Rand amount for display, e.g. R1,234.50. Not for payment provider payloads,
// which need plain two-decimal numbers.
export function formatPrice(value: number | null | undefined): string {
  return `R${amountFormatter.format(value ?? 0)}`
}
