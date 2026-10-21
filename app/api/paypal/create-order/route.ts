import { NextRequest, NextResponse } from "next/server";
import { createPayPalOrder, PAYPAL_CURRENCY } from "@/lib/paypal";
import { toPayPalAmounts } from "@/lib/currency";
import { getConvexAsUser } from "@/lib/serverConvex";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

const convexServer = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * Starts a PayPal payment for an order the customer already created. The
 * amounts come from the stored order, never from the request.
 */
export async function POST(request: NextRequest) {
  try {
    const { convexOrderId, guestToken } = await request.json();
    if (typeof convexOrderId !== "string") {
      return NextResponse.json({ error: "Missing convexOrderId" }, { status: 400 });
    }

    // Guests prove the order is theirs with the token from checkout;
    // everyone else must be signed in as the customer who placed it.
    let order;
    if (typeof guestToken === "string") {
      order = await convexServer.query(api.orders.getGuest, {
        id: convexOrderId as Id<"orders">,
        token: guestToken,
      });
    } else {
      const convex = await getConvexAsUser();
      if (!convex) {
        return NextResponse.json({ error: "Please sign in to pay" }, { status: 401 });
      }
      order = await convex.query(api.orders.getOwned, {
        id: convexOrderId as Id<"orders">,
      });
    }
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    if (order.status !== "pending") {
      return NextResponse.json({ error: "This order is not awaiting payment" }, { status: 409 });
    }

    const amounts = toPayPalAmounts(order, PAYPAL_CURRENCY);
    if (!amounts) {
      console.error("PayPal: no exchange rate set, cannot convert the order to", PAYPAL_CURRENCY);
      return NextResponse.json(
        { error: "Online payment is temporarily unavailable. Please contact us to complete your order." },
        { status: 503 }
      );
    }

    const paypalOrderId = await createPayPalOrder({
      referenceId: order._id,
      items: amounts.items,
      shipping: amounts.shipping,
      tax: amounts.tax,
      discount: amounts.discount,
      totalAmount: amounts.total,
    });

    return NextResponse.json({ id: paypalOrderId });
  } catch (error) {
    console.error("PayPal create order error:", error);
    return NextResponse.json(
      { error: "Failed to create PayPal order" },
      { status: 500 }
    );
  }
}
