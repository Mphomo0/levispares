import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  getTransactionByReference,
  isOzowTest,
  OZOW_CURRENCY,
  verifyNotification,
} from "@/lib/ozow";

const convexServer = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * Ozow calls this after every payment attempt. It is the only thing that
 * marks an order paid: the customer's browser coming back proves nothing.
 * Anything other than a 2xx makes Ozow retry, so only return one when the
 * notification has been dealt with.
 */
export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const body = Object.fromEntries([...form.entries()].map(([key, value]) => [key, String(value)]));
    const field = (name: string) => body[name] ?? "";

    if (!verifyNotification(body) || field("SiteCode") !== process.env.OZOW_SITE_CODE) {
      console.error("Ozow notification failed verification");
      return NextResponse.json({ error: "Invalid notification" }, { status: 400 });
    }

    // Cancelled, abandoned and failed attempts need nothing from us.
    if (field("Status") !== "Complete") return NextResponse.json({ ok: true });

    const orderId = field("TransactionReference");
    const order = await convexServer.query(api.orders.getForPayment, {
      id: orderId as Id<"orders">,
      serverSecret: process.env.PAYMENT_SERVER_SECRET!,
    }).catch(() => null);
    if (!order) {
      console.error("Ozow: payment for an unknown order", { orderId });
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    // Ozow retries notifications, so a second one for a paid order is fine.
    if (order.status !== "pending") return NextResponse.json({ ok: true });

    const expectedAmount = order.total.toFixed(2);
    if (
      Number(field("Amount")).toFixed(2) !== expectedAmount ||
      field("CurrencyCode") !== OZOW_CURRENCY ||
      (field("IsTest").toLowerCase() === "true") !== isOzowTest()
    ) {
      console.error("Ozow payment does not match order", { orderId, body });
      return NextResponse.json({ error: "Payment does not match order" }, { status: 400 });
    }

    // Ask Ozow directly as well, so the order is only released on a payment
    // Ozow itself reports as complete.
    const transaction = await getTransactionByReference(orderId);
    if (
      !transaction ||
      transaction.status !== "Complete" ||
      transaction.amount.toFixed(2) !== expectedAmount
    ) {
      console.error("Ozow lookup does not confirm payment", { orderId, transaction });
      return NextResponse.json({ error: "Payment not confirmed" }, { status: 400 });
    }

    await convexServer.mutation(api.orders.markPaid, {
      id: orderId as Id<"orders">,
      paymentReference: field("TransactionId") || transaction.id,
      serverSecret: process.env.PAYMENT_SERVER_SECRET!,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Ozow notify error:", error);
    return NextResponse.json({ error: "Failed to process notification" }, { status: 500 });
  }
}
