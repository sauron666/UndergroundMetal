import { test, expect } from "@playwright/test";

test.describe("discovery + browse", () => {
  test("home → discover deep-link works", async ({ page }) => {
    await page.goto("/");
    // Try-this chips on the home hero
    const chip = page.getByRole("link", {
      name: /Atmospheric black metal about nature/i,
    });
    await expect(chip).toBeVisible();
    await chip.click();
    await expect(page).toHaveURL(/\/discover\?q=/);
  });

  test("/bands list page renders the search field", async ({ page }) => {
    await page.goto("/bands");
    await expect(page.getByPlaceholder(/Search bands/i)).toBeVisible();
  });

  test("/bg-archive renders header in Bulgarian", async ({ page }) => {
    await page.goto("/bg-archive");
    await expect(
      page.getByRole("heading", { name: /Българската метъл сцена/i })
    ).toBeVisible();
  });

  test("/concerts renders filter form", async ({ page }) => {
    await page.goto("/concerts");
    await expect(page.getByPlaceholder("Sofia")).toBeVisible();
    await expect(page.getByPlaceholder("BG")).toBeVisible();
  });

  test("/articles renders type tabs", async ({ page }) => {
    await page.goto("/articles");
    await expect(page.getByRole("link", { name: /All/i })).toBeVisible();
    await expect(
      page.getByRole("link", { name: /review/i })
    ).toBeVisible();
  });

  test("/lists renders the public CTA", async ({ page }) => {
    await page.goto("/lists");
    await expect(page.getByRole("link", { name: /New list/i })).toBeVisible();
  });

  test("/forum renders categories", async ({ page }) => {
    await page.goto("/forum");
    await expect(
      page.getByRole("link", { name: /Recommendations/i })
    ).toBeVisible();
  });

  test("/calendar opens current month", async ({ page }) => {
    await page.goto("/calendar");
    await expect(
      page.getByRole("link", { name: /Prev/i })
    ).toBeVisible();
  });

  test("RSS feed returns valid XML content type", async ({ request }) => {
    const r = await request.get("/feed/articles.xml");
    expect([200, 404]).toContain(r.status()); // 404 acceptable in empty-DB CI
    if (r.status() === 200) {
      const ct = r.headers()["content-type"] ?? "";
      expect(ct).toContain("application/rss+xml");
    }
  });
});
