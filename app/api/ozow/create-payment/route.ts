import { NextRequest, NextResponse } from "next/server";
import { createPayment } from "@/lib/ozow";
import { getConvexAsUser } from "@/lib/serverConvex";
import { ConvexHttpClient } from "convex/browser";
import { ConvexError } from "convex/values";
import { getErrorMessage } from "@/lib/errors";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

const convexServer = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * Creates an Ozow payment request for an order the customer already created. The amount
 * comes from the stored order, never from the request.
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

    // From here money may move, so the order must not be reused or cleared.
    // This also holds the parts, and refuses if one has just sold out.
    try {
      await convexServer.mutation(api.orders.attachPayment, {
        id: convexOrderId as Id<"orders">,
        serverSecret: process.env.PAYMENT_SERVER_SECRET!,
      });
    } catch (error) {
      if (error instanceof ConvexError) {
        return NextResponse.json({ error: getErrorMessage(error, "This order can no longer be paid") }, { status: 409 });
      }
      throw error;
    }

    const payment = await createPayment({
      orderId: order._id,
      total: order.total,
      guestToken: typeof guestToken === "string" ? guestToken : undefined,
    });
    // Kept so the notification can be checked against Ozow's own record.
    await convexServer.mutation(api.orders.recordPaymentRequest, {
      id: convexOrderId as Id<"orders">,
      paymentRequestId: payment.id,
      serverSecret: process.env.PAYMENT_SERVER_SECRET!,
    });

    return NextResponse.json({ redirectUrl: payment.redirectUrl });
  } catch (error) {
    console.error("Ozow create payment error:", error);
    return NextResponse.json({ error: "Failed to start the payment" }, { status: 500 });
  }
}
