import "server-only";

import { prisma } from "@/lib/prisma";
import { store } from "@/store.config";
import {
  customerOrderEmail,
  ownerOrderEmail,
  type EmailOrder,
} from "@/lib/email/templates";

/**
 * Transactional email via Resend.
 *
 * Resend's HTTP API is used directly rather than the SDK — one fetch call, no
 * extra dependency, and it works identically on Vercel, Hostinger and a VPS.
 *
 * Email is entirely optional. With RESEND_API_KEY unset the store works exactly
 * as before; nothing throws and no order is lost.
 */

const RESEND_API = "https://api.resend.com/emails";

export function emailEnabled(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

interface SendArgs {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}

async function send({ to, subject, html, text, replyTo }: SendArgs): Promise<boolean> {
  if (!emailEnabled()) return false;

  try {
    const response = await fetch(RESEND_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: [to],
        subject,
        html,
        text,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error(`[email] Resend rejected message to ${to}:`, detail.slice(0, 300));
      return false;
    }
    return true;
  } catch (error) {
    console.error("[email] send failed:", error);
    return false;
  }
}

/** Load an order in the shape the templates expect. */
async function loadOrder(reference: string): Promise<EmailOrder | null> {
  const order = await prisma.order.findUnique({
    where: { reference },
    include: { items: true },
  });
  if (!order) return null;

  return {
    reference: order.reference,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    customerPhone: order.customerPhone,
    shippingAddress: order.shippingAddress,
    city: order.city,
    state: order.state,
    note: order.note,
    subtotal: order.subtotal,
    shippingFee: order.shippingFee,
    total: order.total,
    items: order.items.map((item) => ({
      title: item.title,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    })),
  };
}

/**
 * Send the confirmation to the customer and an alert to the store owner.
 *
 * Never throws and never blocks the caller's success path: a payment that
 * succeeded must not appear to fail because an email provider was down. Both
 * messages are attempted independently so one failure doesn't suppress the other.
 */
export async function sendOrderEmails(
  reference: string,
  paid: boolean,
): Promise<void> {
  if (!emailEnabled()) return;

  try {
    const order = await loadOrder(reference);
    if (!order) return;

    const ownerAddress = process.env.OWNER_EMAIL || store.contact.email;

    const customer = customerOrderEmail(order, paid);
    const owner = ownerOrderEmail(order, paid);

    await Promise.allSettled([
      send({
        to: order.customerEmail,
        subject: customer.subject,
        html: customer.html,
        text: customer.text,
        // Replies go to the shop, not to a no-reply void.
        replyTo: ownerAddress,
      }),
      ownerAddress
        ? send({
            to: ownerAddress,
            subject: owner.subject,
            html: owner.html,
            text: owner.text,
            // Owner can reply straight to the buyer.
            replyTo: order.customerEmail,
          })
        : Promise.resolve(false),
    ]);
  } catch (error) {
    console.error("[email] sendOrderEmails failed:", error);
  }
}
