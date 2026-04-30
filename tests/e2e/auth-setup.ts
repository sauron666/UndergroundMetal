import { test as setup } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const READER_STATE = "tests/e2e/.auth/reader.json";
const ADMIN_STATE = "tests/e2e/.auth/admin.json";

const READER = { email: "reader@e2e.local", password: "password123" };
const ADMIN = { email: "admin@e2e.local", password: "password123" };

setup("authenticate as reader", async ({ page, context }) => {
  await mkdir("tests/e2e/.auth", { recursive: true });
  await page.goto("/auth/signin");
  await page.getByPlaceholder("Email").fill(READER.email);
  await page.getByPlaceholder("Password").fill(READER.password);
  await page.getByRole("button", { name: /^Sign in$/i }).click();
  await page.waitForURL("/", { timeout: 15_000 });
  await context.storageState({ path: READER_STATE });
});

setup("authenticate as admin", async ({ page, context }) => {
  await mkdir("tests/e2e/.auth", { recursive: true });
  await page.goto("/auth/signin");
  await page.getByPlaceholder("Email").fill(ADMIN.email);
  await page.getByPlaceholder("Password").fill(ADMIN.password);
  await page.getByRole("button", { name: /^Sign in$/i }).click();
  await page.waitForURL("/", { timeout: 15_000 });
  await context.storageState({ path: ADMIN_STATE });
});
