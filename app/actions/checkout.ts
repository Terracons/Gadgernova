"use server";

import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { buildQuote } from "@/lib/quote";
import { sendOrderEmails } from "@/lib/email/send";
import {
  initializeTransaction,
  PaystackError,
  paystackEnabled,
} from "@/lib/paystack";
import type { Quote } from "@/lib/quote";

/**
 * Checkout.
 *
 * The cart is re-priced here from the database — the totals the browser was
 * displaying are never used. If stock changed while the customer was filling
 * the form we stop and make them re-confirm rather than charging for a
 * different basket than they saw.
 */

export type CheckoutResult =
  | { status: "redirect"; reference: string; checkoutUrl: string }
  | { status: "manual"; reference: string; message: string }
  | { status: "adjusted"; message: string; quote: Quote }
  | { status: "error"; message: string };

export interface CheckoutInput {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  city?: string;
  state?: string;
  note?: string;
  entries: unknown;
}

function newReference(): string {
  const now = new Date();
  const stamp = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  return `ORD-${stamp}-${randomBytes(4).toString("hex").toUpperCase()}`;
}

export async function createCheckout(
  input: CheckoutInput,
): Promise<CheckoutResult> {
  const name = (input.customerName ?? "").trim();
  const email = (input.customerEmail ?? "").trim();
  const phone = (input.customerPhone ?? "").trim();
  const address = (input.shippingAddress ?? "").trim();

  if (!name || !email || !phone || !address) {
    return { status: "error", message: "Please fill in all required fields." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { status: "error", message: "Enter a valid email address." };
  }

  const quote = await buildQuote(input.entries);

  if (quote.isEmpty) {
    return { status: "error", message: "Your cart is empty." };
  }
  if (quote.wasAdjusted) {
    return {
      status: "adjusted",
      message:
        "Your cart changed since you started checkout. Please review it and try again.",
      quote,
    };
  }

  const order = await prisma.order.create({
    data: {
      reference: newReference(),
      customerName: name,
      customerEmail: email,
      customerPhone: phone,
      shippingAddress: address,
      city: input.city?.trim() || null,
      state: input.state?.trim() || null,
      note: input.note?.trim() || null,
      subtotal: quote.subtotal,
      shippingFee: quote.shipping,
      total: quote.total,
      status: "PENDING",
      items: {
        create: quote.lines.map((line) => ({
          productId: line.productId,
          title: line.title,
          unitPrice: line.unitPrice,
          quantity: line.quantity,
        })),
      },
    },
  });

  // No gateway configured — record the order so the owner can arrange bank
  // transfer or WhatsApp payment. Plenty of sellers start this way.
  if (!paystackEnabled()) {
    // Unpaid confirmation: the customer gets a receipt of what they asked for,
    // and the owner gets an alert with the phone number to call.
    await sendOrderEmails(order.reference, false);

    return {
      status: "manual",
      reference: order.reference,
      message:
        "Order received. We'll contact you shortly to arrange payment and delivery.",
    };
  }

  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  ).replace(/\/$/, "");

  try {
    const checkoutUrl = await initializeTransaction({
      email: order.customerEmail,
      amountKobo: order.total,
      reference: order.reference,
      callbackUrl: `${siteUrl}/order/${order.reference}`,
    });

    await prisma.order.update({
      where: { id: order.id },
      data: { paymentReference: order.reference },
    });

    return { status: "redirect", reference: order.reference, checkoutUrl };
  } catch (error) {
    const message =
      error instanceof PaystackError
        ? error.message
        : "Could not start payment. Please try again.";
    // The order still exists as PENDING, so nothing is lost.
    return { status: "error", message };
  }
}
