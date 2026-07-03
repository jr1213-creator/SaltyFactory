import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const protectedRoutes = [
  "/studio/pod-launch-studio",
  "/studio/publish-review",
  "/studio/printify-catalog",
  "/studio/shopify-products",
  "/studio/pod-batches",
  "/studio/ai-employees",
  "/studio/ai-employees/hiring",
  "/studio/ai-employees/improvements",
  "/studio/ai-employees/models",
  "/studio/business",
  "/studio/business/profile",
  "/studio/business/documents",
  "/studio/business/print-studio",
  "/studio/business/banking"
];

test.describe("Studio frontend protection", () => {
  for (const route of protectedRoutes) {
    test(`${route} redirects unauthenticated users`, async ({ page }) => {
      const errors: string[] = [];
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
      });
      await page.goto(route);
      await expect(page).toHaveURL(/\/login/);
      expect(errors.filter((error) => !error.includes("favicon"))).toEqual([]);
    });
  }

  test("/login renders without console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /sign in|login|studio/i })).toBeVisible();
    const accessibility = await new AxeBuilder({ page }).analyze();
    expect(accessibility.violations).toEqual([]);
    expect(errors.filter((error) => !error.includes("favicon"))).toEqual([]);
  });
});

test.describe("Authenticated Studio QA", () => {
  test.skip("requires a browser-safe Supabase Auth fixture; do not bypass production auth for screenshots", async () => {
    // Intentional skip. Authenticated Playwright coverage should be enabled only
    // after the repo has a real browser-test Supabase session fixture.
  });
});
