import { NextRequest, NextResponse } from "next/server";
import { capturePayPalOrder } from "@/lib/paypal";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { paypalOrderId, convexOrderId } = body;

    if (!paypalOrderId || !convexOrderId) {
      return NextResponse.json(
        { error: "Missing paypalOrderId or convexOrderId" },
        { status: 400 }
      );
    }

    // Capture payment with PayPal
    const captureResult = await capturePayPalOrder(paypalOrderId);

    if (captureResult.status !== "COMPLETED") {
      return NextResponse.json(
        { error: `Payment not completed. Status: ${captureResult.status}` },
        { status: 400 }
      );
    }

    // Mark order as paid in Convex + update inventory
    await convex.mutation(api.orders.markPaid, {
      id: convexOrderId as Id<"orders">,
      paypalOrderId: captureResult.id,
    });

    return NextResponse.json({ success: true, paypalOrderId: captureResult.id });
  } catch (error) {
    console.error("PayPal capture error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to capture payment" },
      { status: 500 }
    );
  }
}
