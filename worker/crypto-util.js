import { randomBytes, randomInt, scryptSync, timingSafeEqual } from "node:crypto";

export function uid(prefix = "") {
  return prefix + randomBytes(8).toString("hex");
}

export function hashPass(pass) {
  const salt = randomBytes(8).toString("hex");
  const hash = scryptSync(String(pass), salt, 32).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPass(pass, stored) {
  if (!stored || !stored.includes(":")) return false;
  const [salt, hash] = stored.split(":");
  const next = scryptSync(String(pass), salt, 32).toString("hex");
  const a = Buffer.from(hash, "hex");
  const b = Buffer.from(next, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function genPasscode() {
  let s = "";
  for (let i = 0; i < 8; i++) s += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return s;
}

const HANDLE_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

function slugifyName(name) {
  const slug = String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 16);
  return /^[a-z]/.test(slug) && slug.length >= 3 ? slug : "";
}

function randomHandle() {
  let s = "";
  for (let i = 0; i < 5; i++) s += HANDLE_ALPHABET[randomInt(HANDLE_ALPHABET.length)];
  return `caster-${s}`;
}

export function genHandle(db, name) {
  const taken = (h) => {
    const key = String(h).toLowerCase();
    const hit = (row) => String(row.handle || row.wechat || "").toLowerCase() === key;
    return (db.applications || []).some(hit) || (db.users || []).some(hit);
  };

  const base = slugifyName(name);
  if (base && !taken(base)) return base;
  if (base) {
    for (let n = 2; n <= 20; n++) {
      const candidate = `${base}${n}`;
      if (!taken(candidate)) return candidate;
    }
  }
  for (let i = 0; i < 50; i++) {
    const candidate = randomHandle();
    if (!taken(candidate)) return candidate;
  }
  return `caster-${randomBytes(4).toString("hex")}`;
}

export function handleOf(row) {
  return String((row && (row.handle || row.wechat)) || "");
}
