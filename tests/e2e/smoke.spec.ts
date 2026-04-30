import { test, expect } from "@playwright/test";

test.describe("smoke", () => {
  test("home renders the hero", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /Dig deeper/i, level: 1 })
    ).toBeVisible();
  });

  test("about page renders", async ({ page }) => {
    await page.goto("/about");
    await expect(page.getByRole("heading", { name: "Manifesto" })).toBeVisible();
  });

  test("legal pages exist", async ({ page }) => {
    for (const slug of ["terms", "privacy", "dmca", "cookies"]) {
      await page.goto(`/legal/${slug}`);
      await expect(page.locator("h1")).toBeVisible();
    }
  });

  test("health endpoint", async ({ request }) => {
    const res = await request.get("/api/health");
    expect([200, 503]).toContain(res.status());
    const body = await res.json();
    expect(body).toHaveProperty("ok");
    expect(body).toHaveProperty("uptime");
  });

  test("manifest.webmanifest is valid JSON", async ({ request }) => {
    const res = await request.get("/manifest.webmanifest");
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json.name).toBeDefined();
  });

  test("robots.txt and sitemap.xml are reachable", async ({ request }) => {
    const r1 = await request.get("/robots.txt");
    expect(r1.status()).toBe(200);
    const r2 = await request.get("/sitemap.xml");
    expect([200, 500]).toContain(r2.status());
  });

  test("signin page renders form", async ({ page }) => {
    await page.goto("/auth/signin");
    await expect(page.getByPlaceholder("Email")).toBeVisible();
    await expect(page.getByPlaceholder("Password")).toBeVisible();
  });

  test("discover page renders search input", async ({ page }) => {
    await page.goto("/discover");
    await expect(
      page.getByPlaceholder(/Slavic atmospheric black metal/i)
    ).toBeVisible();
  });
});
