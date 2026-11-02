import { createHmac, timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "cc_sess";
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

function b64url(buf) {
  return Buffer.from(buf)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromB64url(s) {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return Buffer.from(b64, "base64");
}

function sign(payloadB64, secret) {
  return b64url(createHmac("sha256", secret).update(payloadB64).digest());
}

export function readSession(cookieHeader, secret) {
  if (!cookieHeader || !secret) return {};
  const parts = cookieHeader.split(";").map((x) => x.trim());
  const raw = parts.find((p) => p.startsWith(`${COOKIE_NAME}=`));
  if (!raw) return {};
  const value = raw.slice(COOKIE_NAME.length + 1);
  const [payloadB64, sig] = value.split(".");
  if (!payloadB64 || !sig) return {};
  const expect = sign(payloadB64, secret);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expect);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return {};
    const data = JSON.parse(fromB64url(payloadB64).toString("utf8"));
    if (data.exp && Date.now() > data.exp) return {};
    return data.body || {};
  } catch {
    return {};
  }
}

export function sessionCookie(body, secret, { secure }) {
  const payload = {
    body: body || {},
    exp: Date.now() + MAX_AGE_MS
  };
  const payloadB64 = b64url(JSON.stringify(payload));
  const value = `${payloadB64}.${sign(payloadB64, secret)}`;
  const attrs = [
    `${COOKIE_NAME}=${value}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${Math.floor(MAX_AGE_MS / 1000)}`
  ];
  if (secure) attrs.push("Secure");
  return attrs.join("; ");
}

export function clearSessionCookie({ secure }) {
  const attrs = [
    `${COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0"
  ];
  if (secure) attrs.push("Secure");
  return attrs.join("; ");
}

export function cookieSecure(env, url) {
  if (env.COOKIE_SECURE != null) {
    return ["1", "true", "yes"].includes(String(env.COOKIE_SECURE).toLowerCase());
  }
  return url.protocol === "https:";
}
