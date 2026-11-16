import { createHash, timingSafeEqual } from 'node:crypto'
import { SITE_URL } from '@/lib/site'

/**
 * Ozow Hosted Checkout on One API (instant EFT). We ask Ozow for a payment
 * request, send the customer to the page it gives us, and Ozow tells us the
 * outcome by POSTing to our notify URL. That notification (not the customer
 * landing back on our site) is what marks an order paid.
 */

/** Ozow only charges rand. */
export const OZOW_CURRENCY = 'ZAR'

/** Staging is a separate environment with its own credentials; production otherwise. */
const apiBase = () => (process.env.OZOW_ENV === 'staging' ? 'https://stagingone.ozow.com/v1' : 'https://one.ozow.com/v1')

/** How long a customer has to finish paying. Stock is held for the same time. */
export const PAYMENT_EXPIRY_MS = 2 * 60 * 60 * 1000

function privateKey() {
  const key = process.env.OZOW_PRIVATE_KEY
  if (!key) throw new Error('Ozow private key not configured')
  return key
}

function siteCode() {
  const code = process.env.OZOW_SITE_CODE
  if (!code) throw new Error('Ozow site code not configured')
  return code
}

/** Where Ozow sends the customer back to and calls us: the live site unless overridden. */
export const callbackBase = () => process.env.OZOW_CALLBACK_BASE_URL || SITE_URL

/** SHA512 of the values joined together plus the private key, lowercased, as Ozow requires. */
export function ozowHash(values: string[], key: string): string {
  return createHash('sha512').update((values.join('') + key).toLowerCase()).digest('hex')
}

// The access token is good for hours, so it is kept between requests.
let cachedToken: { value: string; expiresAt: number } | null = null

/** For tests: forget the kept access token. */
export const resetOzowToken = () => { cachedToken = null }

/** An OAuth access token for One API (client credentials), reused until shortly before it expires. */
async function accessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) return cachedToken.value
  const clientId = process.env.OZOW_CLIENT_ID
  const clientSecret = process.env.OZOW_CLIENT_SECRET
  if (!clientId || !clientSecret) throw new Error('Ozow One API client not configured')

  const response = await fetch(`${apiBase()}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'payments',
      grant_type: 'client_credentials',
    }),
  })
  if (!response.ok) throw new Error(`Ozow token request failed: ${response.status}`)
  const data = await response.json()
  // expires_in is seconds, sent as a string. Refresh a minute early.
  cachedToken = { value: data.access_token, expiresAt: Date.now() + (Number(data.expires_in) - 60) * 1000 }
  return cachedToken.value
}

export interface OzowOrderInput {
  /** Our order id; sent as merchantReference. */
  orderId: string
  /** Order total in rand. */
  total: number
  /** Appended to the return URL so guests can open their order afterwards. */
  guestToken?: string
}

/**
 * Creates the payment request (POST /payments) and returns its id and the
 * Ozow page to send the customer to. That URL is Ozow's to choose: never build it.
 */
export async function createPayment(order: OzowOrderInput): Promise<{ id: string; redirectUrl: string }> {
  const base = callbackBase()
  const returnUrl = new URL('/checkout/success', base)
  returnUrl.searchParams.set('orderId', order.orderId)
  if (order.guestToken) returnUrl.searchParams.set('token', order.guestToken)

  const response = await fetch(`${apiBase()}/payments`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${await accessToken()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      siteCode: siteCode(),
      amount: { currency: OZOW_CURRENCY, value: Math.round(order.total * 100) / 100 },
      merchantReference: order.orderId,
      // On the shop's bank statement. Letters and numbers only, 20 at most.
      beneficiaryReference: `LS${order.orderId.slice(-8).toUpperCase()}`,
      expireAt: new Date(Date.now() + PAYMENT_EXPIRY_MS).toISOString(),
      returnUrl: returnUrl.toString(),
      // The stable way to be told the outcome: the hashed notification.
      notifyUrl: `${base}/api/ozow/notify`,
    }),
  })
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(`Ozow payment request failed: ${response.status} ${data?.code ?? ''} ${data?.detail ?? ''}`.trim())
  }
  if (!data?.id || !data.redirectUrl) throw new Error('Ozow returned no redirectUrl for the payment')
  return { id: data.id, redirectUrl: data.redirectUrl }
}

/**
 * The fields the notification hash is built from, in this order. It is not
 * the order they arrive in, and SubStatus and Hash are not part of it.
 * Empty ones are skipped.
 */
const NOTIFICATION_HASH_FIELDS = [
  'SiteCode',
  'TransactionId',
  'TransactionReference',
  'Amount',
  'Status',
  'Optional1',
  'Optional2',
  'Optional3',
  'Optional4',
  'Optional5',
  'CurrencyCode',
  'IsTest',
  'StatusMessage',
]

/** Checks a notification really came from Ozow. */
export function verifyNotification(body: Record<string, string>): boolean {
  const received = body.Hash
  if (!received) return false
  const parts = NOTIFICATION_HASH_FIELDS.map((field) => body[field] ?? '').filter((value) => value !== '')
  const expected = ozowHash(parts, privateKey())
  const a = Buffer.from(expected)
  const b = Buffer.from(received.toLowerCase())
  return a.length === b.length && timingSafeEqual(a, b)
}

/** The parts of a One API Transaction we use. */
export interface OzowTransaction {
  id: string
  status: string
  amount?: number
}

/**
 * Asks Ozow for the transactions on a payment request (GET
 * /payments/{id}/transactions). An unknown id gives an empty list, not a 404.
 */
export async function getPaymentTransactions(paymentId: string, since: number): Promise<OzowTransaction[]> {
  const day = (ms: number) => new Date(ms).toISOString().slice(0, 10)
  const url = new URL(`${apiBase()}/payments/${encodeURIComponent(paymentId)}/transactions`)
  // Both dates are required and count whole days; a day either side covers time zones.
  url.searchParams.set('fromDate', day(since - 24 * 60 * 60 * 1000))
  url.searchParams.set('toDate', day(Date.now() + 24 * 60 * 60 * 1000))

  const response = await fetch(url, { headers: { Authorization: `Bearer ${await accessToken()}` } })
  if (!response.ok) throw new Error(`Ozow transaction lookup failed: ${response.status}`)
  const data = await response.json()
  const results: Array<Record<string, unknown>> = Array.isArray(data?.results) ? data.results : []
  return results.map((row) => ({
    id: String(row.id ?? ''),
    status: String(row.status ?? ''),
    amount: typeof (row.amount as { value?: unknown } | undefined)?.value === 'number'
      ? (row.amount as { value: number }).value
      : undefined,
  }))
}
