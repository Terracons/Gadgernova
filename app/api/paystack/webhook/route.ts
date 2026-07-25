import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signatureIsValid } from "@/lib/paystack";
import { markOrderPaid } from "@/lib/orders";

/**
 * Paystack webhook — the authoritative record of payment.
 *
 * Not the browser redirect: a customer can close the tab after paying, or
 * forge a visit to the success page. Only a signed webhook (or a direct
 * verification call to Paystack) marks an order paid.
 *
 * Must run on Node, not Edge — the signature check uses node:crypto.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  // Read the raw body. Re-serialising parsed JSON would change whitespace and
  // key order, and the HMAC would never match.
  const raw = await request.text();
  const signature = request.headers.get("x-paystack-signature");

  if (!signatureIsValid(raw, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: { event?: string; data?: { reference?: string; amount?: number } };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Malformed body" }, { status: 400 });
  }

  if (event.event !== "charge.success") {
    return NextResponse.json({ status: "ignored" });
  }

  const reference = event.data?.reference;
  if (!reference) {
    return NextResponse.json({ status: "no_reference" });
  }

  const order = await prisma.order.findUnique({
    where: { reference },
    select: { total: true, status: true },
  });

  if (!order) return NextResponse.json({ status: "unknown_reference" });
  if (order.status !== "PENDING") {
    return NextResponse.json({ status: "already_processed" });
  }

  // Guard against a partial or tampered payment.
  if (event.data?.amount !== order.total) {
    return NextResponse.json({ status: "amount_mismatch" });
  }

  await markOrderPaid(reference);
  return NextResponse.json({ status: "ok" });
}
