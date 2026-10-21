import { SITE_NAME, SITE_URL, emailButton, emailLayout, escapeHtml, formatPrice } from "./email";

export type OrderEmailKind = "confirmation" | "newOrder" | "shipped" | "delivered" | "cancelled";

export interface OrderEmailData {
  orderId: string;
  /** Set for guest orders: lets the "view order" link work without an account. */
  guestToken?: string;
  customerName?: string;
  customerEmail: string;
  items: Array<{ name: string; quantity: number; price: number; partNumber?: string }>;
  subtotal: number;
  discount: number;
  promoCode?: string;
  shipping: number;
  tax: number;
  total: number;
  address?: {
    name: string;
    street: string;
    city: string;
    province?: string;
    postalCode: string;
    country: string;
    phone?: string;
  };
  notes?: string;
}

/** Short order reference, the same one the admin order list shows. */
export const orderNumber = (orderId: string) => orderId.slice(-8).toUpperCase();

function orderLink(data: OrderEmailData) {
  return data.guestToken
    ? `${SITE_URL}/checkout/success?orderId=${encodeURIComponent(data.orderId)}&token=${encodeURIComponent(data.guestToken)}`
    : `${SITE_URL}/account/orders`;
}

function summaryHtml(data: OrderEmailData) {
  const cell = "padding:8px 0;font-size:14px;color:#111827";
  const rows = data.items.map((item) => `
          <tr>
            <td style="${cell};border-bottom:1px solid #e5e7eb">${escapeHtml(item.name)}<br><span style="color:#6b7280">Qty ${item.quantity}</span></td>
            <td style="${cell};border-bottom:1px solid #e5e7eb;text-align:right;white-space:nowrap">${formatPrice(item.price * item.quantity)}</td>
          </tr>`).join("");
  const line = (label: string, value: string, bold = false) => `
          <tr>
            <td style="${cell}${bold ? ";font-weight:bold" : ""}">${escapeHtml(label)}</td>
            <td style="${cell};text-align:right;white-space:nowrap${bold ? ";font-weight:bold" : ""}">${value}</td>
          </tr>`;

  const address = data.address
    ? `
        <p style="font-size:14px;font-weight:bold;color:#111827;margin:24px 0 4px">Delivering to</p>
        <p style="font-size:14px;color:#374151;margin:0;line-height:1.5">
          ${[data.address.name, data.address.street, `${data.address.city}${data.address.province ? `, ${data.address.province}` : ""} ${data.address.postalCode}`, data.address.country, data.address.phone]
            .filter(Boolean).map((part) => escapeHtml(part!)).join("<br>")}
        </p>`
    : "";

  return `
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">${rows}
          ${line("Subtotal", formatPrice(data.subtotal))}
          ${data.discount > 0 ? line(`Discount${data.promoCode ? ` (${data.promoCode})` : ""}`, `-${formatPrice(data.discount)}`) : ""}
          ${line("Shipping", data.shipping === 0 ? "Free" : formatPrice(data.shipping))}
          ${data.tax > 0 ? line("VAT", formatPrice(data.tax)) : ""}
          ${line("Total", formatPrice(data.total), true)}
        </table>${address}`;
}

function summaryText(data: OrderEmailData) {
  return [
    ...data.items.map((item) => `- ${item.name} x${item.quantity}: ${formatPrice(item.price * item.quantity)}`),
    `Subtotal: ${formatPrice(data.subtotal)}`,
    ...(data.discount > 0 ? [`Discount${data.promoCode ? ` (${data.promoCode})` : ""}: -${formatPrice(data.discount)}`] : []),
    `Shipping: ${data.shipping === 0 ? "Free" : formatPrice(data.shipping)}`,
    ...(data.tax > 0 ? [`VAT: ${formatPrice(data.tax)}`] : []),
    `Total: ${formatPrice(data.total)}`,
    ...(data.address
      ? ["", "Delivering to:", data.address.name, data.address.street,
        `${data.address.city}${data.address.province ? `, ${data.address.province}` : ""} ${data.address.postalCode}`,
        data.address.country, ...(data.address.phone ? [data.address.phone] : [])]
      : []),
  ].join("\n");
}

const CUSTOMER_COPY: Record<Exclude<OrderEmailKind, "newOrder">, { subject: string; heading: string; message: string }> = {
  confirmation: {
    subject: "Thank you for your order",
    heading: "Thank you for your order",
    message: "We have received your payment and are getting your parts ready. We will email you again when your order is on its way.",
  },
  shipped: {
    subject: "Your order is on its way",
    heading: "Your order is on its way",
    message: "Good news: your parts have been sent. Contact us if you have any questions about the delivery.",
  },
  delivered: {
    subject: "Your order has been delivered",
    heading: "Your order has been delivered",
    message: "Your order has been marked as delivered. If anything is missing or not right, email info@levispares.co.za or call us on 012 770 3389.",
  },
  cancelled: {
    subject: "Your order has been cancelled",
    heading: "Your order has been cancelled",
    message: "Your order has been cancelled. If you paid for it, your refund is being processed to your original payment method. Email info@levispares.co.za or call us on 012 770 3389 if you have questions.",
  },
};

/** Subject and body of an email about an order, for the customer or (newOrder) the shop. */
export function orderEmail(kind: OrderEmailKind, data: OrderEmailData) {
  const number = orderNumber(data.orderId);

  if (kind === "newOrder") {
    const subject = `New order ${number}: ${formatPrice(data.total)}`;
    const customer = `${data.customerName ? `${data.customerName}, ` : ""}${data.customerEmail}${data.guestToken ? " (guest)" : ""}`;
    const body = `
        <p style="font-size:18px;font-weight:bold;color:#111827;margin:0 0 8px">New paid order ${escapeHtml(number)}</p>
        <p style="font-size:14px;color:#374151;margin:0 0 24px">From ${escapeHtml(customer)}</p>
${summaryHtml(data)}
        ${data.notes ? `<p style="font-size:14px;color:#374151;margin:24px 0 0"><strong>Notes:</strong> ${escapeHtml(data.notes)}</p>` : ""}
        ${emailButton(`${SITE_URL}/admin/orders`, "Open orders")}`;
    return {
      subject,
      html: emailLayout(body, `Sent by ${escapeHtml(SITE_NAME)} when an order is paid.`),
      text: [`New paid order ${number}`, `From ${customer}`, "", summaryText(data),
        ...(data.notes ? ["", `Notes: ${data.notes}`] : []), "", `${SITE_URL}/admin/orders`].join("\n"),
    };
  }

  const copy = CUSTOMER_COPY[kind];
  const firstName = data.customerName?.trim().split(/\s+/)[0];
  const greeting = firstName ? `Hi ${firstName},` : "Hi there,";
  const link = orderLink(data);
  const body = `
        <p style="font-size:20px;font-weight:bold;color:#111827;margin:0 0 4px">${escapeHtml(copy.heading)}</p>
        <p style="font-size:14px;color:#6b7280;margin:0 0 24px">Order ${escapeHtml(number)}</p>
        <p style="font-size:16px;color:#111827;margin:0 0 8px">${escapeHtml(greeting)}</p>
        <p style="font-size:16px;color:#374151;margin:0 0 24px">${escapeHtml(copy.message)}</p>
${summaryHtml(data)}
        ${emailButton(link, "View your order")}`;

  return {
    subject: `${copy.subject} (${number})`,
    html: emailLayout(body, `${escapeHtml(SITE_NAME)}, Stand 10 Zambezi, Montana, Pretoria. You are getting this email about an order you placed with us.`),
    text: [greeting, "", copy.message, "", `Order ${number}`, summaryText(data), "", `View your order: ${link}`].join("\n"),
  };
}
