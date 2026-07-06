import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import MarketingLaunchPlannerPage from "../apps/studio/app/studio/marketing/page";

describe("marketing launch planning Studio page", () => {
  it("renders the owner-reviewable planning lane without live-action language", async () => {
    const html = renderToStaticMarkup(await MarketingLaunchPlannerPage());

    expect(html).toContain("Marketing Launch Planning");
    expect(html).toContain("No-Spend Options");
    expect(html).toContain("Paid Draft Options");
    expect(html).toContain("Approval Queue");
    expect(html).toContain("Create Launch Plan");
    expect(html).not.toContain("Launch live campaign");
    expect(html).not.toContain("Send email now");
    expect(html).not.toContain("Publish post now");
  });

  it("opens launch plans in a Studio detail page instead of raw API JSON", () => {
    const source = readFileSync(join(process.cwd(), "apps/studio/app/studio/marketing/page.tsx"), "utf8");

    expect(source).toContain("/studio/marketing/launch-plans/${plan.id}");
    expect(source).not.toContain("href={`/api/studio/marketing/launch-plans/${plan.id}`}");
  });
});
