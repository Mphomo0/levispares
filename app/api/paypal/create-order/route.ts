import { NextRequest, NextResponse } from "next/server";
import { createPayPalOrder } from "@/lib/paypal";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { items, shipping, tax, totalAmount } = body;

    if (!items?.length || totalAmount == null) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const paypalOrderId = await createPayPalOrder({
      items,
      shipping,
      tax,
      totalAmount,
    });

    return NextResponse.json({ id: paypalOrderId });
  } catch (error) {
    console.error("PayPal create order error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create PayPal order" },
      { status: 500 }
    );
  }
}
