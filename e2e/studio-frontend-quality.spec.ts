import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { existsSync, mkdirSync } from "node:fs";

const protectedRoutes = [
  "/studio",
  "/studio/setup",
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

type AuthenticatedRoute = {
  path: string;
  heading: RegExp;
  primary?: RegExp;
  allowEnvNames?: boolean;
};

const authenticatedRoutes: AuthenticatedRoute[] = [
  { path: "/studio", heading: /business command center|command center/i, primary: /POD Launch Studio|Command Center Launchpad/i },
  { path: "/studio/setup", heading: /setup|feature readiness/i, primary: /Quick Start|Provider Setup Required/i, allowEnvNames: true },
  { path: "/studio/pod-launch-studio", heading: /pod launch|launch studio|product pipeline/i },
  { path: "/studio/publish-review", heading: /publish review|launch readiness/i },
  { path: "/studio/printify-catalog", heading: /printify/i },
  { path: "/studio/shopify-products", heading: /shopify/i },
  { path: "/studio/pod-batches", heading: /batch|pod batches/i },
  { path: "/studio/ai-employees", heading: /ai employees|ai workforce/i },
  { path: "/studio/ai-employees/hiring", heading: /hiring|hire requests/i },
  { path: "/studio/ai-employees/improvements", heading: /improvement|self-improvement/i },
  { path: "/studio/ai-employees/models", heading: /models|runtime/i },
  { path: "/studio/business", heading: /business/i },
  { path: "/studio/business/profile", heading: /profile|business identity/i },
  { path: "/studio/business/documents", heading: /documents/i },
  { path: "/studio/business/print-studio", heading: /print studio|business card/i },
  { path: "/studio/business/banking", heading: /banking|novo|plaid/i }
];

const storageStatePath = process.env.STUDIO_E2E_STORAGE_STATE || "";
const authenticatedFixtureReady = Boolean(storageStatePath && existsSync(storageStatePath));

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
  test.skip(!authenticatedFixtureReady, "Set STUDIO_E2E_STORAGE_STATE to a browser-safe Supabase Playwright storageState file.");

  if (authenticatedFixtureReady) {
    test.use({ storageState: storageStatePath });
  }

  for (const route of authenticatedRoutes) {
    test(`${route.path} renders authenticated without console errors`, async ({ page }) => {
      const errors: string[] = [];
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
      });

      await page.goto(route.path);
      await expect(page).not.toHaveURL(/\/login/);
      await expect(page.getByRole("heading", { name: route.heading }).first()).toBeVisible();
      await expect(page.locator(".studio-sidebar")).toBeVisible();
      await expect(page.locator(".studio-command-nav")).toBeVisible();
      if (route.primary) await expect(page.getByText(route.primary).first()).toBeVisible();

      const bodyText = await page.locator("body").innerText();
      expect(bodyText).not.toMatch(/Find\s+Search disabled|Search disabled/i);
      expect(bodyText).not.toMatch(/100%Profile completeness|Google connectedconnected|0%0 configured|Missing0 snapshots|1needs_review|0POD builder/i);
      expect(bodyText).not.toMatch(/Launch statePrintify|not sentnot createdOpen Product Builder/i);
      if (!route.allowEnvNames) {
        expect(bodyText).not.toMatch(/DATABASE_URL|REPOSITORY_ADAPTER|AI_IMAGE_ENABLED|HF_API_TOKEN|PRINTIFY_API_TOKEN|PRINTIFY_SHOP_ID|SHOPIFY_ADMIN_TOKEN|SHOPIFY_STORE_DOMAIN|LIVE_PUBLISHING_ENABLED/);
      }
      expect(bodyText).not.toMatch(/shpat_|sk_live_|postgres:\/\/|SUPABASE_SERVICE_ROLE_KEY\s*=/i);

      const scrollbarWidth = await page.locator(".studio-command-nav").evaluate((element) => getComputedStyle(element).scrollbarWidth);
      expect(scrollbarWidth).toBe("none");

      const accessibility = await new AxeBuilder({ page })
        .exclude("[data-axe-exclude]")
        .analyze();

      expect(accessibility.violations).toEqual([]);
      expect(errors.filter((error) => !error.includes("favicon"))).toEqual([]);

      if (process.env.STUDIO_E2E_SCREENSHOTS === "true") {
        mkdirSync("test-results/studio-authenticated", { recursive: true });
        await page.screenshot({
          path: `test-results/studio-authenticated/${route.path.replaceAll("/", "-").replace(/^-/, "")}.png`,
          fullPage: true,
          animations: "disabled"
        });
      }
    });
  }

  test("requires a browser-safe Supabase Auth fixture for screenshots", async () => {
    expect(authenticatedFixtureReady).toBe(true);
  });
});
