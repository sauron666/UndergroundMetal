import { test, expect } from "@playwright/test";

/**
 * Reader-scoped specs. Storage state is preloaded from
 * tests/e2e/.auth/reader.json by the playwright project config, so each
 * test starts already-signed-in.
 */

const READER_EMAIL = "reader@e2e.local";

test.describe("signed-in (reader)", () => {
  test("/account shows the settings heading", async ({ page }) => {
    await page.goto("/account");
    await expect(
      page.getByRole("heading", { name: /Settings/i })
    ).toBeVisible();
  });

  test("/messages renders the inbox heading", async ({ page }) => {
    await page.goto("/messages");
    await expect(
      page.getByRole("heading", { name: /Inbox/i })
    ).toBeVisible();
  });

  test("/notifications renders", async ({ page }) => {
    await page.goto("/notifications");
    await expect(
      page.getByRole("heading", { name: /Notifications/i })
    ).toBeVisible();
  });

  test("/become-author renders the application screen", async ({ page }) => {
    await page.goto("/become-author");
    await expect(
      page.getByRole("heading", { name: /Become an author/i })
    ).toBeVisible();
  });

  test("/bookmarks renders empty state", async ({ page }) => {
    await page.goto("/bookmarks");
    await expect(
      page.getByRole("heading", { name: /Bookmarks/i })
    ).toBeVisible();
  });

  test("/api/account/export returns the user's archive", async ({ page, request }) => {
    const cookies = await page.context().cookies();
    const cookieHeader = cookies
      .map((c) => `${c.name}=${c.value}`)
      .join("; ");
    const r = await request.get("/api/account/export", {
      headers: { cookie: cookieHeader },
    });
    expect(r.status()).toBe(200);
    const body = await r.json();
    expect(body.user?.email).toBe(READER_EMAIL);
    expect(body.meta?.exportVersion).toBeDefined();
  });
});
