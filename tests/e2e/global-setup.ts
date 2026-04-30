/**
 * Playwright global setup. Provisions deterministic test users in the live
 * database the spec runner uses so signed-in flows can run without manually
 * stitching browser fixtures per spec.
 *
 * Users:
 *   reader@e2e.local    READER, password "password123"
 *   admin@e2e.local     ADMIN,  password "password123"
 *
 * Run only when DATABASE_URL points at a non-production cluster (we check
 * for a "test" or "localhost" host as a guard).
 */

import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

async function ensureUser(email: string, role: "READER" | "ADMIN") {
  const passwordHash = await bcrypt.hash("password123", 10);
  await db.user.upsert({
    where: { email },
    create: {
      email,
      username: email.split("@")[0],
      name: email.split("@")[0],
      passwordHash,
      role,
    },
    update: { passwordHash, role },
  });
}

export default async function globalSetup() {
  const url = process.env.DATABASE_URL ?? "";
  // Safety: refuse to mutate a production-looking DB.
  const looksProd =
    !!url &&
    !url.includes("localhost") &&
    !url.includes("127.0.0.1") &&
    !url.includes("postgres:postgres") &&
    !url.includes("test");
  if (looksProd) {
    console.warn(
      "[playwright globalSetup] DATABASE_URL looks production-ish; skipping fixture user creation."
    );
    return;
  }

  try {
    await ensureUser("reader@e2e.local", "READER");
    await ensureUser("admin@e2e.local", "ADMIN");
  } catch (e) {
    console.warn(
      "[playwright globalSetup] could not create fixture users:",
      e instanceof Error ? e.message : e
    );
  } finally {
    await db.$disconnect();
  }
}
