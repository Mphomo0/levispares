import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { getRole } from "@/lib/auth";
import { getErrorMessage } from "@/lib/errors";
import { getCaptureId, PAYPAL_CURRENCY, refundCapture } from "@/lib/paypal";

/**
 * Refunds an approved return through PayPal, then records it (which puts the
 * parts back in stock and emails the customer). The amount is in rand and is
 * converted at the rate frozen onto the order, so the customer gets back
 * exactly what they were charged for those items.
 */
export async function POST(request: NextRequest) {
  const { userId, sessionClaims, getToken } = await auth();
  if (!userId || getRole(sessionClaims) !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { returnId, amount } = await request.json();
  if (typeof returnId !== "string" || typeof amount !== "number" || !(amount > 0)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const token = await getToken({ template: "convex" });
  if (!token) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  convex.setAuth(token);
  const id = returnId as Id<"returns">;

  try {
    const quote = await convex.query(api.returns.refundQuote, { id });
    if (!quote) return NextResponse.json({ error: "Return not found" }, { status: 404 });
    if (quote.status !== "approved") {
      return NextResponse.json({ error: "Only an approved return can be refunded" }, { status: 409 });
    }
    if (amount > quote.maxRefund + 0.001) {
      return NextResponse.json({ error: `The most that can be refunded is R${quote.maxRefund.toFixed(2)}` }, { status: 400 });
    }
    if (!quote.paypalOrderId) {
      return NextResponse.json({ error: "This order wasn't paid with PayPal; refund it by hand" }, { status: 400 });
    }

    const rate = PAYPAL_CURRENCY === "ZAR" ? 1 : quote.exchangeRate;
    if (!rate || !(rate > 0)) {
      return NextResponse.json({ error: "The order has no exchange rate, so the refund can't be converted" }, { status: 400 });
    }
    const paypalAmount = Math.round((amount / rate) * 100) / 100;

    const captureId = await getCaptureId(quote.paypalOrderId);
    if (!captureId) return NextResponse.json({ error: "PayPal has no captured payment for this order" }, { status: 400 });

    const refund = await refundCapture({
      captureId,
      amount: paypalAmount,
      requestId: `return-${returnId}`,
      note: `Refund for returned parts on order ${quote.orderId.slice(-8).toUpperCase()}`,
    });

    await convex.mutation(api.returns.markRefunded, { id, amount, paypalRefundId: refund.id });
    return NextResponse.json({ success: true, refundId: refund.id, paypalAmount, currency: PAYPAL_CURRENCY });
  } catch (error) {
    console.error("Return refund failed:", error);
    return NextResponse.json({ error: getErrorMessage(error, "The refund failed") }, { status: 500 });
  }
}
