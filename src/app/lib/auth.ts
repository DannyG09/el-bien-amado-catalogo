import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "admin_session";
const SESSION_DURATION = 8 * 60 * 60;

function getSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("ADMIN_SESSION_SECRET no está configurado correctamente");
  }

  return secret;
}

function createSignature(payload: string): string {
  return createHmac("sha256", getSecret())
    .update(payload)
    .digest("base64url");
}

export function createSessionToken(): string {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_DURATION;
  const payload = `v1.${expiresAt}`;
  const signature = createSignature(payload);

  return `${payload}.${signature}`;
}

export async function isAdminAuthenticated(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (!token) return false;

    const parts = token.split(".");

    if (parts.length !== 3) return false;

    const [version, expiration, signature] = parts;

    if (version !== "v1") return false;

    if (!/^\d+$/.test(expiration)) return false;

    if (!/^[A-Za-z0-9_-]+$/.test(signature)) return false;

    const expiresAt = Number(expiration);

    if (!Number.isSafeInteger(expiresAt)) return false;

    if (expiresAt <= Math.floor(Date.now() / 1000)) {
      return false;
    }

    const payload = `${version}.${expiration}`;
    const expectedSignature = createSignature(payload);

    const received = Buffer.from(signature, "base64url");
    const expected = Buffer.from(expectedSignature, "base64url");

    if (received.length !== expected.length) return false;

    return timingSafeEqual(received, expected);
  } catch {
    return false;
  }
}

export async function setAdminSession(): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION,
  });
}

export async function clearAdminSession(): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.delete(COOKIE_NAME);
}

