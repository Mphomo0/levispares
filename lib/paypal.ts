const PAYPAL_API_BASE =
  process.env.NEXT_PUBLIC_PAYPAL_MODE === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com'

// One variable drives both the checkout button and the server. PayPal does not
// support ZAR, so this is normally USD (prices are converted, see lib/currency).
export const PAYPAL_CURRENCY =
  process.env.NEXT_PUBLIC_PAYPAL_CURRENCY || process.env.PAYPAL_CURRENCY || 'USD'

export async function getPayPalAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('PayPal credentials not configured')
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`PayPal auth failed: ${error}`)
  }

  const data = await response.json()
  return data.access_token
}

interface CreateOrderItem {
  name: string
  quantity: number
  price: number
}

interface CreatePayPalOrderParams {
  /** Our order id, stored on the PayPal order so a payment can only settle this order. */
  referenceId: string
  items: CreateOrderItem[]
  shipping: number
  tax: number
  totalAmount: number
}

export async function createPayPalOrder(
  params: CreatePayPalOrderParams,
): Promise<string> {
  const accessToken = await getPayPalAccessToken()

  const itemTotal = params.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  )

  const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: params.referenceId,
          custom_id: params.referenceId,
          amount: {
            currency_code: PAYPAL_CURRENCY,
            value: params.totalAmount.toFixed(2),
            breakdown: {
              item_total: {
                currency_code: PAYPAL_CURRENCY,
                value: itemTotal.toFixed(2),
              },
              shipping: {
                currency_code: PAYPAL_CURRENCY,
                value: params.shipping.toFixed(2),
              },
              tax_total: {
                currency_code: PAYPAL_CURRENCY,
                value: params.tax.toFixed(2),
              },
            },
          },
          items: params.items.map((item) => ({
            name: item.name.substring(0, 127),
            quantity: String(item.quantity),
            unit_amount: {
              currency_code: PAYPAL_CURRENCY,
              value: item.price.toFixed(2),
            },
            category: 'PHYSICAL_GOODS',
          })),
        },
      ],
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`PayPal create order failed: ${error}`)
  }

  const data = await response.json()
  return data.id
}

export interface PayPalOrderDetails {
  id: string
  status: string
  purchase_units?: Array<{
    reference_id?: string
    amount?: { currency_code: string; value: string }
    payments?: {
      captures?: Array<{ status: string; amount: { currency_code: string; value: string } }>
    }
  }>
}

export async function getPayPalOrder(paypalOrderId: string): Promise<PayPalOrderDetails> {
  const accessToken = await getPayPalAccessToken()

  const response = await fetch(
    `${PAYPAL_API_BASE}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`PayPal order lookup failed: ${error}`)
  }

  return response.json()
}

export async function capturePayPalOrder(paypalOrderId: string): Promise<PayPalOrderDetails> {
  const accessToken = await getPayPalAccessToken()

  const response = await fetch(
    `${PAYPAL_API_BASE}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    },
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`PayPal capture failed: ${error}`)
  }

  return response.json()
}
