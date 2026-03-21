const PAYPAL_API_BASE = "https://api-m.sandbox.paypal.com";

export async function getPayPalAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("PayPal credentials not configured");
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`PayPal auth failed: ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

interface CreateOrderItem {
  name: string;
  quantity: number;
  price: number;
}

interface CreatePayPalOrderParams {
  items: CreateOrderItem[];
  shipping: number;
  tax: number;
  totalAmount: number;
}

export async function createPayPalOrder(params: CreatePayPalOrderParams): Promise<string> {
  const accessToken = await getPayPalAccessToken();

  const itemTotal = params.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: "ZAR",
            value: params.totalAmount.toFixed(2),
            breakdown: {
              item_total: {
                currency_code: "ZAR",
                value: itemTotal.toFixed(2),
              },
              shipping: {
                currency_code: "ZAR",
                value: params.shipping.toFixed(2),
              },
              tax_total: {
                currency_code: "ZAR",
                value: params.tax.toFixed(2),
              },
            },
          },
          items: params.items.map((item) => ({
            name: item.name.substring(0, 127),
            quantity: String(item.quantity),
            unit_amount: {
              currency_code: "ZAR",
              value: item.price.toFixed(2),
            },
            category: "PHYSICAL_GOODS",
          })),
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`PayPal create order failed: ${error}`);
  }

  const data = await response.json();
  return data.id;
}

export async function capturePayPalOrder(paypalOrderId: string): Promise<{ status: string; id: string }> {
  const accessToken = await getPayPalAccessToken();

  const response = await fetch(
    `${PAYPAL_API_BASE}/v2/checkout/orders/${paypalOrderId}/capture`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`PayPal capture failed: ${error}`);
  }

  const data = await response.json();
  return { status: data.status, id: data.id };
}
