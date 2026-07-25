import "server-only";

import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Admin authentication.
 *
 * A single admin account from environment variables — right for a one-person
 * shop, which is what most buyers of this template are running.
 *
 * The session is an HMAC-signed cookie. No JWT library, no database table, no
 * native dependencies (bcrypt needs a compiler, which shared hosting often
 * lacks — scrypt ships with Node).
 */

const COOKIE_NAME = "store_admin_session";
const SESSION_HOURS = 12;

function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 16) {
    throw new Error(
      "SESSION_SECRET is missing or too short. Set a long random value in .env",
    );
  }
  return value;
}

// ── Password handling ────────────────────────────────────────────────

/**
 * Hash a password with scrypt. Format: "salt:hash", both hex.
 * Used by `npm run db:seed` and available if you add a users table later.
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

/** Constant-time verification against a "salt:hash" string. */
export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  try {
    const derived = scryptSync(password, salt, 64);
    const expected = Buffer.from(hash, "hex");
    return (
      derived.length === expected.length && timingSafeEqual(derived, expected)
    );
  } catch {
    return false;
  }
}

/**
 * Check submitted credentials against the environment.
 *
 * ADMIN_PASSWORD_HASH (from `hashPassword`) is preferred. A plain
 * ADMIN_PASSWORD is accepted so a buyer can get running in one minute, but
 * it's compared in constant time and the README pushes them to the hash.
 */
export function checkCredentials(username: string, password: string): boolean {
  const expectedUser = process.env.ADMIN_USERNAME ?? "admin";
  const userOk = safeEqual(username, expectedUser);

  const hash = process.env.ADMIN_PASSWORD_HASH;
  const passOk = hash
    ? verifyPassword(password, hash)
    : safeEqual(password, process.env.ADMIN_PASSWORD ?? "");

  // Evaluate both before returning so timing doesn't reveal which failed.
  return userOk && passOk;
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a ?? "");
  const bufB = Buffer.from(b ?? "");
  if (bufA.length !== bufB.length) {
    // Still burn a comparison so length isn't leaked by timing.
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

// ── Session cookie ───────────────────────────────────────────────────

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

function createToken(username: string): string {
  const expires = Date.now() + SESSION_HOURS * 60 * 60 * 1000;
  const payload = `${username}.${expires}`;
  return `${payload}.${sign(payload)}`;
}

function readToken(token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [username, expiresRaw, signature] = parts;
  const payload = `${username}.${expiresRaw}`;

  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  if (Number(expiresRaw) < Date.now()) return null;
  return username;
}

export async function createSession(username: string): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE_NAME, createToken(username), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_HOURS * 60 * 60,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

/** Returns the signed-in admin username, or null. */
export async function getAdmin(): Promise<string | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    return readToken(token);
  } catch {
    // Missing SESSION_SECRET, tampered cookie, etc.
    return null;
  }
}

/**
 * Guard for admin pages and server actions. Redirects to login when signed out.
 * Call this at the top of every admin page and every admin action — a page
 * guard alone does not protect the action.
 */
export async function requireAdmin(): Promise<string> {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}
