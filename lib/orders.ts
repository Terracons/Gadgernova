import "server-only";

import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/money";
import { sendOrderEmails } from "@/lib/email/send";
import type { OrderStatus } from "@prisma/client";

/**
 * Mark an order paid, decrement stock, and email both parties.
 *
 * The database work happens in a single transaction so a crash midway can't
 * leave stock reduced for an unpaid order, or vice versa.
 *
 * Idempotent: only PENDING orders transition, because payment webhooks are
 * routinely delivered more than once and the success page verifies in parallel.
 * That guard is also what makes the confirmation email fire exactly once — only
 * the transition that actually happened returns true.
 */
export async function markOrderPaid(reference: string): Promise<boolean> {
  const transitioned = await applyPayment(reference);

  if (transitioned) {
    // Awaited, not fire-and-forget: serverless platforms terminate the
    // function once the response is sent, which would silently drop a
    // detached promise. sendOrderEmails never throws.
    await sendOrderEmails(reference, true);
  }

  return transitioned;
}

async function applyPayment(reference: string): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { reference },
      include: { items: true },
    });

    if (!order || order.status !== "PENDING") return false;

    await tx.order.update({
      where: { id: order.id },
      data: { status: "PAID", paidAt: new Date() },
    });

    for (const item of order.items) {
      if (item.productId === null) continue;
      // Clamp at zero: two orders racing for the last unit must not push
      // stock negative.
      await tx.product.updateMany({
        where: { id: item.productId, stock: { gte: item.quantity } },
        data: { stock: { decrement: item.quantity } },
      });
    }

    return true;
  });
}

export async function getOrderByReference(reference: string) {
  const order = await prisma.order.findUnique({
    where: { reference },
    include: { items: true },
  });
  if (!order) return null;

  return {
    reference: order.reference,
    status: order.status,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    subtotalDisplay: formatMoney(order.subtotal),
    shippingDisplay:
      order.shippingFee === 0 ? "Free" : formatMoney(order.shippingFee),
    total: order.total,
    totalDisplay: formatMoney(order.total),
    createdAt: order.createdAt.toISOString(),
    items: order.items.map((item) => ({
      title: item.title,
      quantity: item.quantity,
      unitPriceDisplay: formatMoney(item.unitPrice),
      lineTotalDisplay: formatMoney(item.unitPrice * item.quantity),
    })),
  };
}

export const PAID_STATUSES: OrderStatus[] = ["PAID", "SHIPPED", "DELIVERED"];

export function isPaid(status: OrderStatus): boolean {
  return PAID_STATUSES.includes(status);
}
