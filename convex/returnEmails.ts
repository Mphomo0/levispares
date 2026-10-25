import { v } from "convex/values";
import { internalAction, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { REASON_LABELS } from "./returns";
import { SITE_NAME, SITE_URL, emailButton, emailConfigured, emailLayout, escapeHtml, formatPrice, sendEmail } from "./lib/email";
import { orderNumber } from "./lib/orderEmail";

const kindValidator = v.union(
  v.literal("requested"),
  v.literal("approved"),
  v.literal("rejected"),
  v.literal("refunded"),
);
type Kind = "requested" | "approved" | "rejected" | "refunded";

interface Data {
  orderId: string;
  guestToken?: string;
  customerName?: string;
  customerEmail: string | null;
  items: Array<{ name: string; quantity: number; price: number }>;
  reason: string;
  details?: string;
  adminNote?: string;
  refundAmount?: number;
  returnAddress: string;
}

const DEFAULT_RETURN_ADDRESS = "Levi's Spares\nStand 10 Zambezi\nMontana, Pretoria, 0182";

export const emailData = internalQuery({
  args: { returnId: v.id("returns") },
  handler: async (ctx, args): Promise<Data | null> => {
    const ret = await ctx.db.get(args.returnId);
    if (!ret) return null;
    const order = await ctx.db.get(ret.orderId);
    if (!order) return null;
    const user = order.userId ? await ctx.db.get(order.userId) : null;
    const email = user?.email ?? order.guestEmail;
    const settings = await ctx.db
      .query("storeSettings")
      .withIndex("by_key", (q) => q.eq("key", "global"))
      .first();

    return {
      orderId: order._id,
      guestToken: order.userId ? undefined : order.guestToken,
      customerName: user?.name ?? order.shippingSnapshot?.name,
      customerEmail: email && email.includes("@") && !email.endsWith(".invalid") ? email : null,
      items: ret.items,
      reason: REASON_LABELS[ret.reason],
      details: ret.details,
      adminNote: ret.adminNote,
      refundAmount: ret.refundAmount,
      returnAddress: [settings?.businessName, settings?.businessAddress].filter(Boolean).join("\n") || DEFAULT_RETURN_ADDRESS,
    };
  },
});

const paragraph = (text: string) =>
  `<p style="font-size:16px;color:#374151;margin:0 0 16px;white-space:pre-line">${escapeHtml(text)}</p>`;

function itemsHtml(items: Data["items"]) {
  return `<ul style="font-size:14px;color:#111827;margin:0 0 24px;padding-left:20px">${items
    .map((item) => `<li>${escapeHtml(item.name)} &times; ${item.quantity}</li>`).join("")}</ul>`;
}

/** Subject and body of an email about a return, for the customer or (requested) the shop. */
export function returnEmail(kind: Kind, data: Data) {
  const number = orderNumber(data.orderId);
  const itemsText = data.items.map((item) => `- ${item.name} x${item.quantity}`).join("\n");

  if (kind === "requested") {
    const lines = [
      `Return requested on order ${number} by ${data.customerName ?? "a customer"} (${data.customerEmail ?? "no email"}).`,
      `Reason: ${data.reason}`,
      ...(data.details ? [`Details: ${data.details}`] : []),
    ];
    return {
      subject: `Return request on order ${number}`,
      html: emailLayout(`${lines.map(paragraph).join("")}${itemsHtml(data.items)}${emailButton(`${SITE_URL}/admin/returns`, "Review returns")}`,
        `Sent by ${escapeHtml(SITE_NAME)} when a customer asks to return parts.`),
      text: [...lines, "", itemsText, "", `${SITE_URL}/admin/returns`].join("\n"),
    };
  }

  const firstName = data.customerName?.trim().split(/\s+/)[0];
  const greeting = firstName ? `Hi ${firstName},` : "Hi there,";
  const orderLink = data.guestToken
    ? `${SITE_URL}/checkout/success?orderId=${encodeURIComponent(data.orderId)}&token=${encodeURIComponent(data.guestToken)}`
    : `${SITE_URL}/account/orders`;

  const copy = {
    approved: {
      subject: `Your return is approved (${number})`,
      message: [
        "We've approved your return. Please send the parts below back to us, with your order number on the parcel:",
        data.returnAddress,
        "We'll refund you as soon as they arrive.",
        ...(data.adminNote ? [`Note from us: ${data.adminNote}`] : []),
      ],
    },
    rejected: {
      subject: `About your return request (${number})`,
      message: [
        "We're sorry, we can't accept this return.",
        ...(data.adminNote ? [data.adminNote] : []),
        "Email info@levispares.co.za or call us on 012 770 3389 if you have questions.",
      ],
    },
    refunded: {
      subject: `Your refund is on its way (${number})`,
      message: [
        `We've received your parts and refunded ${formatPrice(data.refundAmount ?? 0)} to your original payment method. It can take a few days to show on your statement.`,
      ],
    },
  }[kind];

  return {
    subject: copy.subject,
    html: emailLayout(
      `${paragraph(greeting)}${copy.message.map(paragraph).join("")}${itemsHtml(data.items)}${emailButton(orderLink, "View your order")}`,
      `${escapeHtml(SITE_NAME)}, Stand 10 Zambezi, Montana, Pretoria. You are getting this email about a return you asked for.`,
    ),
    text: [greeting, "", ...copy.message.flatMap((m) => [m, ""]), itemsText, "", `View your order: ${orderLink}`].join("\n"),
  };
}

/** Sends one email about a return. Scheduled by the return mutations. */
export const send = internalAction({
  args: { returnId: v.id("returns"), kind: kindValidator },
  handler: async (ctx, args) => {
    if (!emailConfigured()) {
      console.warn(`Return email "${args.kind}" skipped: RESEND_API_KEY or EMAIL_FROM is not set`);
      return { sent: false };
    }
    const data = await ctx.runQuery(internal.returnEmails.emailData, { returnId: args.returnId });
    const to = args.kind === "requested" ? process.env.ORDER_NOTIFY_EMAIL : data?.customerEmail;
    if (!data || !to) return { sent: false };

    const email = returnEmail(args.kind, data);
    const result = await sendEmail({
      to,
      subject: email.subject,
      html: email.html,
      text: email.text,
      idempotencyKey: `return-${args.returnId}-${args.kind}`,
      category: `return_${args.kind}`,
    });
    if (!result.ok) throw new Error(`Return email "${args.kind}" for ${args.returnId} failed: ${result.error}`);
    return { sent: true };
  },
});
