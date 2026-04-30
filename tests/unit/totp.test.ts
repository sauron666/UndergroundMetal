import { describe, it, expect } from "vitest";
import { generateSecret, verify, generateRecoveryCodes } from "@/server/security/totp";

describe("generateSecret", () => {
  it("returns a base32 secret and otpauth URI", () => {
    const { secret, uri } = generateSecret("user@example.com");
    expect(secret).toMatch(/^[A-Z2-7]+$/);
    expect(uri.startsWith("otpauth://totp/")).toBe(true);
    expect(uri).toContain("issuer=");
    expect(uri).toContain(encodeURIComponent("user@example.com"));
  });
});

describe("verify", () => {
  it("rejects bad shape", () => {
    const { secret } = generateSecret("a@b.c");
    expect(verify("12345", secret)).toBe(false);
    expect(verify("abcdef", secret)).toBe(false);
    expect(verify("1234567", secret)).toBe(false);
  });

  it("accepts the codes RFC 6238 generates", () => {
    // Round-trip: derive a code from the same secret using the same logic
    // and confirm verify accepts it. We replicate the HMAC-SHA1 flow inline
    // to avoid exporting hotp().
    const { secret } = generateSecret("a@b.c");
    // Cheap way: try every 6-digit number? No — use real hotp via crypto.
    const crypto = require("node:crypto") as typeof import("node:crypto");
    const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    function decode(input: string): Buffer {
      const clean = input.toUpperCase().replace(/=+$/g, "");
      let bits = 0,
        value = 0;
      const bytes: number[] = [];
      for (const ch of clean) {
        value = (value << 5) | B32.indexOf(ch);
        bits += 5;
        if (bits >= 8) {
          bytes.push((value >>> (bits - 8)) & 0xff);
          bits -= 8;
        }
      }
      return Buffer.from(bytes);
    }
    const counter = Math.floor(Date.now() / 1000 / 30);
    const cbuf = Buffer.alloc(8);
    cbuf.writeBigUInt64BE(BigInt(counter));
    const hmac = crypto.createHmac("sha1", decode(secret)).update(cbuf).digest();
    const offset = hmac[hmac.length - 1] & 0xf;
    const code =
      (((hmac[offset] & 0x7f) << 24) |
        ((hmac[offset + 1] & 0xff) << 16) |
        ((hmac[offset + 2] & 0xff) << 8) |
        (hmac[offset + 3] & 0xff)) %
      1_000_000;
    const formatted = code.toString().padStart(6, "0");
    expect(verify(formatted, secret)).toBe(true);
  });
});

describe("generateRecoveryCodes", () => {
  it("produces unique codes in the expected format", () => {
    const codes = generateRecoveryCodes(10);
    expect(codes).toHaveLength(10);
    for (const c of codes) {
      expect(c).toMatch(/^[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{2}$/);
    }
    expect(new Set(codes).size).toBe(10);
  });
});
