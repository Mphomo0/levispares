/** Statuses of orders the customer has actually paid for. */
const PAID_STATUSES = ['paid', 'processing', 'shipped', 'delivered']

export const isPaidOrder = (order: { status: string }) =>
  PAID_STATUSES.includes(order.status)

/** How a status reads to the customer. */
const STATUS_LABELS: Record<string, string> = {
  pending: 'Awaiting payment',
  paid: 'Paid',
  processing: 'Being prepared',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

export const orderStatusLabel = (status: string) =>
  STATUS_LABELS[status] ?? status.charAt(0).toUpperCase() + status.slice(1)
