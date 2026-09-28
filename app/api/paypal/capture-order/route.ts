import { NextRequest, NextResponse } from "next/server";
import { capturePayPalOrder, getPayPalOrder, PAYPAL_CURRENCY } from "@/lib/paypal";
import { getConvexAsUser } from "@/lib/serverConvex";
import { toPayPalAmounts } from "@/lib/currency";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

const convexServer = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    const convex = await getConvexAsUser();
    if (!convex) {
      return NextResponse.json({ error: "Please sign in to pay" }, { status: 401 });
    }

    const { paypalOrderId, convexOrderId } = await request.json();
    if (typeof paypalOrderId !== "string" || typeof convexOrderId !== "string") {
      return NextResponse.json(
        { error: "Missing paypalOrderId or convexOrderId" },
        { status: 400 }
      );
    }

    const order = await convex.query(api.orders.getOwned, {
      id: convexOrderId as Id<"orders">,
    });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    if (order.status === "paid" && order.paypalOrderId === paypalOrderId) {
      return NextResponse.json({ success: true, paypalOrderId });
    }
    if (order.status !== "pending") {
      return NextResponse.json({ error: "This order is not awaiting payment" }, { status: 409 });
    }

    // Before taking any money, make sure this PayPal payment is for exactly
    // this order: same order reference, amount and currency.
    const amounts = toPayPalAmounts(order, PAYPAL_CURRENCY);
    if (!amounts) {
      console.error("PayPal: order has no exchange rate", { convexOrderId });
      return NextResponse.json(
        { error: "Online payment is temporarily unavailable. Please contact us." },
        { status: 503 }
      );
    }
    const expectedAmount = amounts.total.toFixed(2);
    const matches = (unit?: {
      reference_id?: string;
      amount?: { currency_code: string; value: string };
    }) =>
      unit?.reference_id === order._id &&
      unit?.amount?.value === expectedAmount &&
      unit?.amount?.currency_code === PAYPAL_CURRENCY;

    const paypalOrder = await getPayPalOrder(paypalOrderId);
    if (!matches(paypalOrder.purchase_units?.[0])) {
      console.error("PayPal order does not match order", { paypalOrderId, convexOrderId });
      return NextResponse.json(
        { error: "This payment does not match your order" },
        { status: 400 }
      );
    }

    // From here money may move, so the order must not be reused or cleared.
    await convexServer.mutation(api.orders.attachPayPal, {
      id: convexOrderId as Id<"orders">,
      paypalOrderId,
      serverSecret: process.env.PAYMENT_SERVER_SECRET!,
    });

    const captured = await capturePayPalOrder(paypalOrderId);
    const capture = captured.purchase_units?.[0]?.payments?.captures?.[0];
    if (
      captured.status !== "COMPLETED" ||
      capture?.status !== "COMPLETED" ||
      capture.amount.value !== expectedAmount ||
      capture.amount.currency_code !== PAYPAL_CURRENCY
    ) {
      // Money may have moved without matching the order: needs a manual look.
      console.error("PayPal capture did not match order", { paypalOrderId, convexOrderId, captured });
      return NextResponse.json(
        { error: `Payment not completed. Status: ${captured.status}` },
        { status: 400 }
      );
    }

    // Mark order as paid in Convex + update inventory
    await convexServer.mutation(api.orders.markPaid, {
      id: convexOrderId as Id<"orders">,
      paypalOrderId: captured.id,
      serverSecret: process.env.PAYMENT_SERVER_SECRET!,
    });

    return NextResponse.json({ success: true, paypalOrderId: captured.id });
  } catch (error) {
    console.error("PayPal capture error:", error);
    return NextResponse.json(
      { error: "Failed to capture payment" },
      { status: 500 }
    );
  }
}
