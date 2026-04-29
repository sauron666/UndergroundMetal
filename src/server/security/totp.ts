/**
 * RFC 6238 TOTP (HOTP over Unix-time / step-30s) — no external dependencies.
 *
 * Why hand-roll: the install graph is already wide; node:crypto's HMAC-SHA1
 * is plenty for a 6-digit OTP. The API surface mirrors the parts of
 * `otplib`/`speakeasy` we'd actually use:
 *
 *   - generateSecret(): returns a base32 secret + provisioning URI for QR.
 *   - verify(token, secret): tolerates ±1 step (~30s) clock drift.
 *
 * The provisioning URI follows the otpauth:// format used by Google
 * Authenticator, Authy, Bitwarden, 1Password, etc.
 */

import crypto from "node:crypto";

const STEP_SECONDS = 30;
const DIGITS = 6;

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/=+$/g, "").replace(/\s/g, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const ch of clean) {
    const idx = B32.indexOf(ch);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

function hotp(secretB32: string, counter: number): string {
  const key = base32Decode(secretB32);
  const cbuf = Buffer.alloc(8);
  // 64-bit big-endian counter
  cbuf.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac("sha1", key).update(cbuf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return (code % 10 ** DIGITS).toString().padStart(DIGITS, "0");
}

export function generateSecret(label: string, issuer = "Underground Metal"): {
  secret: string;
  uri: string;
} {
  const buf = crypto.randomBytes(20); // 160 bits per RFC 6238
  const secret = base32Encode(buf).replace(/=+$/g, "");
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: "SHA1",
    digits: String(DIGITS),
    period: String(STEP_SECONDS),
  });
  const uri = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(
    label
  )}?${params.toString()}`;
  return { secret, uri };
}

export function verify(
  token: string,
  secret: string,
  toleranceSteps = 1
): boolean {
  const trimmed = token.replace(/\s/g, "");
  if (!/^\d{6}$/.test(trimmed)) return false;
  const now = Math.floor(Date.now() / 1000);
  const counter = Math.floor(now / STEP_SECONDS);
  for (let drift = -toleranceSteps; drift <= toleranceSteps; drift++) {
    if (hotp(secret, counter + drift) === trimmed) return true;
  }
  return false;
}

export function generateRecoveryCodes(count = 10): string[] {
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const raw = crypto.randomBytes(5).toString("hex").toUpperCase();
    // Format as XXXX-XXXX-XX for readability
    out.push(`${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8)}`);
  }
  return out;
}
