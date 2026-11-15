import { createHash, timingSafeEqual } from 'node:crypto'
import { SITE_URL } from '@/lib/site'

/**
 * Ozow Payments API (instant EFT), shown in a modal over our checkout through
 * the Ozow SDK. Ozow tells us the outcome by POSTing to our notify URL, and
 * that notification (not the SDK, not the browser landing on the success URL)
 * is what marks an order paid.
 */

/** Ozow only charges rand. */
export const OZOW_CURRENCY = 'ZAR'
const OZOW_COUNTRY = 'ZA'

/** Ozow runs sandbox payments through the same site code with IsTest=true. */
export const isOzowTest = () => process.env.OZOW_IS_TEST !== 'false'

/** Staging is a separate environment with its own credentials; production otherwise. */
const apiBase = () => (process.env.OZOW_ENV === 'staging' ? 'https://stagingapi.ozow.com' : 'https://api.ozow.com')

function config() {
  const siteCode = process.env.OZOW_SITE_CODE
  const privateKey = process.env.OZOW_PRIVATE_KEY
  if (!siteCode || !privateKey) throw new Error('Ozow credentials not configured')
  return { siteCode, privateKey }
}

/** Where Ozow sends the customer back to and calls us: the live site unless overridden. */
export const callbackBase = () => process.env.OZOW_CALLBACK_BASE_URL || SITE_URL

/** SHA512 of the values joined together plus the private key, lowercased, as Ozow requires. */
export function ozowHash(values: string[], privateKey: string): string {
  return createHash('sha512').update((values.join('') + privateKey).toLowerCase()).digest('hex')
}

export interface OzowOrderInput {
  /** Our order id; Ozow echoes it back as TransactionReference. */
  orderId: string
  /** Order total in rand. */
  total: number
  /** Shown to the customer on their bank statement (Ozow allows 20 characters). */
  customer?: string
  /** Appended to the success URL so guests can open their order afterwards. */
  guestToken?: string
}

/** The payment page the Ozow SDK loads: its own host, not the API's. */
const sdkPaymentUrl = () => (process.env.OZOW_ENV === 'staging' ? 'https://stagingpay.ozow.com/' : 'https://pay.ozow.com/')

/**
 * What the browser hands the Ozow SDK (createPaymentModal) to open the payment
 * page in a modal. Built server-side, because the hash is made with the
 * private key. Field names and their casing are Ozow's.
 */
export function buildEmbeddedPayment(order: OzowOrderInput): { paymentUrl: string; postData: Record<string, string> } {
  const { siteCode, privateKey } = config()
  const base = callbackBase()
  const success = new URL('/checkout/success', base)
  success.searchParams.set('orderId', order.orderId)
  if (order.guestToken) success.searchParams.set('token', order.guestToken)

  // Insertion order is the order the hash is built in (the documented request order).
  const fields = {
    SiteCode: siteCode,
    CountryCode: OZOW_COUNTRY,
    CurrencyCode: OZOW_CURRENCY,
    Amount: order.total.toFixed(2),
    TransactionReference: order.orderId,
    // Alphanumerics, spaces and dashes only, 20 characters at most.
    BankReference: `LS-${order.orderId.slice(-8).toUpperCase()}`,
    CancelUrl: `${base}/checkout?payment=cancelled`,
    ErrorUrl: `${base}/checkout?payment=failed`,
    SuccessUrl: success.toString(),
    NotifyUrl: `${base}/api/ozow/notify`,
    IsTest: String(isOzowTest()),
  }
  // Ozow caps each URL at 150 characters.
  for (const key of ['CancelUrl', 'ErrorUrl', 'SuccessUrl', 'NotifyUrl'] as const) {
    if (fields[key].length > 150) throw new Error(`Ozow ${key} is longer than 150 characters`)
  }
  return {
    paymentUrl: sdkPaymentUrl(),
    postData: { ...fields, HashCheck: ozowHash(Object.values(fields), privateKey) },
  }
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
  const { privateKey } = config()
  const received = body.Hash
  if (!received) return false
  const parts = NOTIFICATION_HASH_FIELDS.map((field) => body[field] ?? '').filter((value) => value !== '')
  const expected = ozowHash(parts, privateKey)
  const a = Buffer.from(expected)
  const b = Buffer.from(received.toLowerCase())
  return a.length === b.length && timingSafeEqual(a, b)
}

/** The parts of Ozow's TransactionModel we use. */
export interface OzowTransaction {
  id: string
  transactionReference: string
  amount: number
  status: string
}

/** Asks Ozow directly for a payment's state, so a forged notification cannot mark an order paid. */
export async function getTransactionByReference(reference: string): Promise<OzowTransaction | null> {
  const { siteCode } = config()
  const apiKey = process.env.OZOW_API_KEY
  if (!apiKey) throw new Error('Ozow API key not configured')

  const url = new URL(`${apiBase()}/GetTransactionByReference`)
  url.searchParams.set('siteCode', siteCode)
  url.searchParams.set('transactionReference', reference)
  url.searchParams.set('isTest', String(isOzowTest()))

  const response = await fetch(url, { headers: { ApiKey: apiKey, Accept: 'application/json' } })
  if (!response.ok) throw new Error(`Ozow transaction lookup failed: ${response.status}`)
  // An array, because a reference can be used more than once (at most 10 come back).
  const list: Array<Record<string, unknown>> = await response.json()
  // Prefer a completed attempt if the customer tried more than once.
  const row = list.find((t) => t.status === 'Complete') ?? list[0]
  if (!row) return null
  return {
    id: String(row.id ?? ''),
    transactionReference: String(row.transactionReference ?? ''),
    amount: Number(row.amount),
    status: String(row.status ?? ''),
  }
}
