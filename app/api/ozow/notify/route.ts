import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  getPaymentTransactions,
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

    const orderId = field("TransactionReference") as Id<"orders">;
    const serverSecret = process.env.PAYMENT_SERVER_SECRET!;
    const status = field("Status");
    const flag = (note: string) => convexServer.mutation(api.orders.flagPayment, { id: orderId, note, serverSecret });

    const order = await convexServer.query(api.orders.getForPayment, { id: orderId, serverSecret }).catch(() => null);
    if (!order) {
      console.error("Ozow: notification for an unknown order", { orderId, status });
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (status === "Cancelled" || status === "Error" || status === "Abandoned") {
      // Nothing was paid: put the held parts back on sale.
      await convexServer.mutation(api.orders.releasePayment, { id: orderId, serverSecret });
      return NextResponse.json({ ok: true });
    }
    if (status === "PendingInvestigation") {
      // The bank gave no clear answer and no update is coming: a person has to check.
      if (order.status === "pending") {
        await flag(`Ozow could not confirm this payment (transaction ${field("TransactionId")}). Check your bank statement: if the money arrived, mark the order paid; if not, cancel it.`);
      }
      return NextResponse.json({ ok: true });
    }
    // Pending is not an outcome, and a status we do not know is not acted on.
    if (status !== "Complete") {
      if (status !== "Pending") console.error("Ozow: unknown status", { orderId, status });
      return NextResponse.json({ ok: true });
    }

    if (order.status !== "pending") {
      // Ozow repeats notifications, so the same payment again is fine. Money
      // for an order that is no longer waiting for it needs a person.
      if (order.paymentReference !== field("TransactionId")) {
        await flag(order.status === "cancelled"
          ? `Ozow payment ${field("TransactionId")} of R${field("Amount")} arrived after this order was cancelled. Refund the customer or reinstate the order.`
          : `A second Ozow payment (${field("TransactionId")}, R${field("Amount")}) arrived for this order. Refund the extra payment.`);
      }
      return NextResponse.json({ ok: true });
    }

    const expectedAmount = order.total.toFixed(2);
    const isTest = field("IsTest").toLowerCase() === "true";
    if (
      Number(field("Amount")).toFixed(2) !== expectedAmount ||
      field("CurrencyCode") !== OZOW_CURRENCY ||
      // A test payment moves no money, so it only counts where tests are allowed.
      (isTest && process.env.OZOW_ALLOW_TEST_PAYMENTS !== "true")
    ) {
      console.error("Ozow payment does not match order", { orderId, body });
      await flag(`Ozow payment ${field("TransactionId")} of R${field("Amount")} does not match this order's total of R${expectedAmount}${isTest ? " (test payment)" : ""}. The order was not marked paid: check it with Ozow.`);
      return NextResponse.json({ error: "Payment does not match order" }, { status: 400 });
    }

    // The hash already proves this came from Ozow. As a second check, ask
    // Ozow for its own record of the payment and refuse if it disagrees. If
    // the lookup itself cannot be done, the verified notification stands.
    if (order.paymentRequestId) {
      try {
        const transactions = await getPaymentTransactions(order.paymentRequestId, order.paymentStartedAt ?? Date.now());
        const transaction = transactions.find((t) => t.id.toLowerCase() === field("TransactionId").toLowerCase());
        if (transaction && transaction.status.toLowerCase() !== "successful") {
          console.error("Ozow lookup does not confirm payment", { orderId, transaction });
          return NextResponse.json({ error: "Payment not confirmed" }, { status: 400 });
        }
        if (!transaction) console.warn("Ozow lookup did not list this transaction; relying on the verified notification", { orderId });
      } catch (error) {
        console.warn("Ozow lookup failed; relying on the verified notification", { orderId, error });
      }
    }

    await convexServer.mutation(api.orders.markPaid, {
      id: orderId,
      paymentReference: field("TransactionId"),
      serverSecret,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Ozow notify error:", error);
    return NextResponse.json({ error: "Failed to process notification" }, { status: 500 });
  }
}
