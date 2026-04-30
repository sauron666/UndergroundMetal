import { test, expect } from "@playwright/test";

test.describe("auth flows (UI smoke)", () => {
  test("signup form validates", async ({ page }) => {
    await page.goto("/auth/signup");
    await expect(
      page.getByRole("heading", { name: /Carve your name/i })
    ).toBeVisible();

    await page.getByPlaceholder("Email").fill("not-an-email");
    await page.getByPlaceholder("Username").fill("ab");
    await page.getByPlaceholder(/Password/).fill("short");
    // Submit — browser-level validation should keep us on the page.
    await page.getByRole("button", { name: /Create account/i }).click();
    await expect(page).toHaveURL(/\/auth\/signup/);
  });

  test("signin shows magic-link option", async ({ page }) => {
    await page.goto("/auth/signin");
    await page.getByRole("button", { name: /Email me a sign-in link/i }).click();
    await expect(
      page.getByText(/We'll email you a one-time link/i)
    ).toBeVisible();
  });

  test("become-author requires sign-in", async ({ page }) => {
    await page.goto("/become-author");
    await expect(page).toHaveURL(/\/auth\/signin/);
  });

  test("admin requires sign-in", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/auth\/signin/);
  });

  test("messages requires sign-in", async ({ page }) => {
    await page.goto("/messages");
    await expect(page).toHaveURL(/\/auth\/signin/);
  });

  test("notifications requires sign-in", async ({ page }) => {
    await page.goto("/notifications");
    await expect(page).toHaveURL(/\/auth\/signin/);
  });
});
