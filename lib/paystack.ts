import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { store } from "@/store.config";

/**
 * Paystack integration.
 *
 * If PAYSTACK_SECRET_KEY isn't set the store still works — orders are recorded
 * as pending and the owner arranges bank transfer or WhatsApp payment. That
 * matters for this template: plenty of Nigerian gadget sellers start that way
 * and add a gateway later.
 */

const API = "https://api.paystack.co";

export class PaystackError extends Error {}

export function paystackEnabled(): boolean {
  return Boolean(process.env.PAYSTACK_SECRET_KEY);
}

function headers(): HeadersInit {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new PaystackError("PAYSTACK_SECRET_KEY is not set");
  return {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

/** Creates a transaction and returns the hosted checkout URL. */
export async function initializeTransaction(params: {
  email: string;
  amountKobo: number;
  reference: string;
  callbackUrl: string;
}): Promise<string> {
  const response = await fetch(`${API}/transaction/initialize`, {
    method: "POST",
    headers: headers(),
    cache: "no-store",
    body: JSON.stringify({
      email: params.email,
      amount: params.amountKobo, // Paystack uses minor units, same as us
      reference: params.reference,
      callback_url: params.callbackUrl,
      currency: store.currency.code,
    }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body?.status) {
    throw new PaystackError(body?.message ?? "Could not start payment");
  }
  return body.data.authorization_url as string;
}

/** Asks Paystack about a reference. Never trust the browser for this. */
export async function verifyTransaction(reference: string): Promise<{
  status: string;
  amount: number;
  reference: string;
}> {
  const response = await fetch(
    `${API}/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: headers(), cache: "no-store" },
  );

  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body?.status) {
    throw new PaystackError(body?.message ?? "Verification failed");
  }
  return body.data;
}

/**
 * Validate the x-paystack-signature header: HMAC-SHA512 of the raw body.
 *
 * Must be given the exact bytes received — re-serialising parsed JSON changes
 * whitespace and key order, and the signature will never match.
 */
export function signatureIsValid(
  rawBody: string,
  signature: string | null,
): boolean {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!signature || !key) return false;

  const expected = createHmac("sha512", key).update(rawBody).digest("hex");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
