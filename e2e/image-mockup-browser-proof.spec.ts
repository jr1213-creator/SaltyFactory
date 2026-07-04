import { expect, type Locator, test } from "@playwright/test";
import { mkdirSync } from "node:fs";

const proofDir = process.env.IMAGE_MOCKUP_BROWSER_PROOF_DIR || "test-results/image-mockup-browser-proof";
const bypassReady = process.env.PLAYWRIGHT_AUTH_BYPASS === "true";

async function expectLoadedImage(locator: Locator) {
  await expect(locator).toBeVisible();
  await expect.poll(async () => locator.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0 && image.naturalHeight > 0)).toBe(true);
}

function screenshotName(name: string) {
  return `${proofDir}/${name}.png`;
}

test.describe("image generation and mockup browser proof", () => {
  test.skip(!bypassReady, "Run with PLAYWRIGHT_AUTH_BYPASS=true through the image/mockup browser proof runner.");
  test.setTimeout(120_000);

  test("browser can generate local proof art, QA it, render mockups, and set a hero", async ({ page, request }) => {
    mkdirSync(proofDir, { recursive: true });
    await page.context().addCookies([{
      name: "sb-access-token",
      value: "playwright-proof",
      domain: "localhost",
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax"
    }]);
    const requestHeaders = { cookie: "sb-access-token=playwright-proof" };

    const created = await request.post("/api/studio/design-briefs", {
      headers: requestHeaders,
      data: {
        title: "Browser Proof Coastal Rodeo",
        phrase_text: "Coastal Rodeo Social Club",
        product_type: "tee",
        art_direction: "Original coastal western badge art with coral and turquoise accents.",
        collection: "Browser Proof"
      }
    });
    const createdText = await created.text();
    expect(created.ok(), createdText).toBe(true);
    const createdBody = JSON.parse(createdText);
    const briefId = String(createdBody.brief.id);

    const approved = await request.post(`/api/studio/design-briefs/${briefId}/approve`, { headers: requestHeaders });
    const approvedText = await approved.text();
    expect(approved.ok(), approvedText).toBe(true);

    await page.goto("/studio/briefs");
    await expect(page.getByRole("button", { name: /Generate 4 options/i }).first()).toBeVisible();
    await page.screenshot({ path: screenshotName("generation-ready"), fullPage: true, animations: "disabled" });

    await page.goto("/studio/image-generation");
    await expect(page.getByRole("heading", { name: /Image Generation Studio/i })).toBeVisible();
    await page.getByLabel(/Approved brief/i).selectOption(briefId);
    await page.getByLabel(/Variant count/i).fill("4");
    await page.getByRole("button", { name: /Generate 4 options/i }).click();
    await expect(page.getByText(/Image generation completed/i)).toBeVisible({ timeout: 120_000 });
    await expectLoadedImage(page.getByAltText(/Generated artwork variant preview/i).first());
    await page.screenshot({ path: screenshotName("variants-completed"), fullPage: true, animations: "disabled" });

    const assetHref = await page.locator('a[href^="/studio/assets?asset_id="]').first().getAttribute("href");
    expect(assetHref).toBeTruthy();
    const assetUrl = new URL(assetHref!, "http://localhost:3001");
    const assetId = assetUrl.searchParams.get("asset_id");
    expect(assetId).toBeTruthy();

    await page.goto(`/studio/assets?asset_id=${encodeURIComponent(assetId!)}`);
    await expect(page.getByText(/Private derivative proof/i)).toBeVisible();
    await expect(page.getByText(/print png/i).first()).toBeVisible();
    await expectLoadedImage(page.getByAltText(/print png private derivative preview/i).first());
    await page.screenshot({ path: screenshotName("asset-derivative-proof"), fullPage: true, animations: "disabled" });

    await page.getByRole("button", { name: /Run QA/i }).click();
    await expect(page.getByText(/QA status/i).first()).toBeVisible({ timeout: 60_000 });
    const approveResponse = page.waitForResponse((response) => response.url().includes(`/api/studio/assets/${assetId}/approve`) && response.request().method() === "POST");
    await page.getByRole("button", { name: /Approve Asset/i }).click();
    await expect.poll(async () => (await approveResponse).ok()).toBe(true);
    await expect(page.getByText(/approved/i).first()).toBeVisible({ timeout: 60_000 });

    await page.goto(`/studio/mockups?asset_id=${encodeURIComponent(assetId!)}`);
    await expect(page.getByRole("heading", { name: /Mockup Studio/i })).toBeVisible();
    await expect(page.getByText(/Internal Mockup Workflow/i)).toBeVisible();
    await expectLoadedImage(page.getByAltText(/Approved source artwork preview/i).first());
    await expect(page.getByLabel(/Internal template/i)).toBeVisible();
    await page.getByRole("button", { name: /Generate recommended mockups/i }).click();
    await expect(page.getByText(/recommended mockups created/i)).toBeVisible({ timeout: 90_000 });
    await expectLoadedImage(page.getByAltText(/Rendered mockup preview/i).first());
    await expect.poll(async () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: screenshotName("mockup-gallery"), fullPage: true, animations: "disabled" });

    await page.getByRole("button", { name: /Set as hero mockup|Set hero mockup/i }).click();
    await expect(page.getByText(/hero mockup selected/i)).toBeVisible({ timeout: 60_000 });
    await page.screenshot({ path: screenshotName("hero-selected"), fullPage: true, animations: "disabled" });

    const bodyText = await page.locator("body").innerText();
    expect(bodyText).not.toMatch(/\{[\s\S]*"ok"[\s\S]*\}/);
    expect(bodyText).not.toMatch(/generated_asset_pending|mockup_render_job_failed|provider_runtime_false|qa_status_passed_with_warnings/);
    const hrefs = await page.locator("a").evaluateAll((anchors) => anchors.map((anchor) => anchor.getAttribute("href") || ""));
    expect(hrefs.filter((href) => href.startsWith("/api/"))).toEqual([]);
  });
});
