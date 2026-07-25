"use server";

import { prisma } from "@/lib/prisma";
import { getOrderByReference, markOrderPaid } from "@/lib/orders";
import { paystackEnabled, verifyTransaction } from "@/lib/paystack";

/**
 * Confirm an order's status for the success page.
 *
 * Belt and braces alongside the webhook: if the webhook is delayed or a local
 * dev machine can't receive one, the customer still sees an accurate status.
 * The amount is checked against our own record before anything is marked paid.
 */
export async function verifyOrder(reference: string) {
  const existing = await prisma.order.findUnique({
    where: { reference },
    select: { status: true, total: true },
  });

  if (!existing) return null;

  if (existing.status === "PENDING" && paystackEnabled()) {
    try {
      const data = await verifyTransaction(reference);
      if (data.status === "success" && data.amount === existing.total) {
        await markOrderPaid(reference);
      }
    } catch {
      // Paystack unreachable — fall through and show the stored status.
    }
  }

  return getOrderByReference(reference);
}
