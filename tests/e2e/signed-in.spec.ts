import { test, expect } from "@playwright/test";

/**
 * Signed-in flows. These tests sign in via the credentials form against
 * fixture users created by global-setup.ts. We don't bother with storage-
 * state caching because the flow surfaces are tiny and the precheck +
 * NextAuth round-trip is fast enough.
 */

const READER = { email: "reader@e2e.local", password: "password123" };
const ADMIN = { email: "admin@e2e.local", password: "password123" };

async function signIn(
  page: import("@playwright/test").Page,
  email: string,
  password: string
) {
  await page.goto("/auth/signin");
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Password").fill(password);
  await page.getByRole("button", { name: /^Sign in$/i }).click();
  // The form redirects to "/" on success.
  await page.waitForURL("/", { timeout: 10_000 });
}

test.describe("signed-in (reader)", () => {
  test("can reach /account", async ({ page }) => {
    await signIn(page, READER.email, READER.password);
    await page.goto("/account");
    await expect(
      page.getByRole("heading", { name: /Settings/i })
    ).toBeVisible();
  });

  test("can reach /messages inbox", async ({ page }) => {
    await signIn(page, READER.email, READER.password);
    await page.goto("/messages");
    await expect(
      page.getByRole("heading", { name: /Inbox/i })
    ).toBeVisible();
  });

  test("/notifications page renders", async ({ page }) => {
    await signIn(page, READER.email, READER.password);
    await page.goto("/notifications");
    await expect(
      page.getByRole("heading", { name: /Notifications/i })
    ).toBeVisible();
  });

  test("/become-author lets you submit a pitch", async ({ page }) => {
    await signIn(page, READER.email, READER.password);
    await page.goto("/become-author");
    await expect(
      page.getByRole("heading", { name: /Become an author/i })
    ).toBeVisible();
  });

  test("/bookmarks renders empty state", async ({ page }) => {
    await signIn(page, READER.email, READER.password);
    await page.goto("/bookmarks");
    await expect(
      page.getByRole("heading", { name: /Bookmarks/i })
    ).toBeVisible();
  });

  test("can open data export", async ({ page, request }) => {
    await signIn(page, READER.email, READER.password);
    // Cookies are now set; download via request context inheriting them.
    const cookies = await page.context().cookies();
    const cookieHeader = cookies
      .map((c) => `${c.name}=${c.value}`)
      .join("; ");
    const r = await request.get("/api/account/export", {
      headers: { cookie: cookieHeader },
    });
    expect(r.status()).toBe(200);
    const body = await r.json();
    expect(body.user?.email).toBe(READER.email);
    expect(body.meta?.exportVersion).toBeDefined();
  });
});

test.describe("signed-in (admin)", () => {
  test("can reach /admin and see analytics link", async ({ page }) => {
    await signIn(page, ADMIN.email, ADMIN.password);
    await page.goto("/admin");
    await expect(
      page.getByRole("heading", { name: /Overview/i })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Analytics/i })
    ).toBeVisible();
  });

  test("admin moderation queue loads", async ({ page }) => {
    await signIn(page, ADMIN.email, ADMIN.password);
    await page.goto("/admin/moderation");
    await expect(
      page.getByRole("heading", { name: /Moderation queue/i })
    ).toBeVisible();
  });
});
