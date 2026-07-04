import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  STUDIO_TOP_NAV_AREAS,
  activeStudioTopNavAreaId,
  allStudioTopNavItems,
  topStudioCommandLabels
} from "../apps/studio/app/studio/StudioNavigation";

function studioPageFileForRoute(href: string) {
  const cleanHref = (href.split("?")[0] ?? href).replace(/^\/+/, "");
  return join(process.cwd(), "apps/studio/app", cleanHref, "page.tsx");
}

describe("clean Studio navigation", () => {
  it("renders compact top-level labels only", () => {
    expect(topStudioCommandLabels()).toEqual(["Home", "POD", "AI", "Business", "Storefront", "Marketing", "Customers", "Operations"]);
    expect(topStudioCommandLabels().every((label) => !label.includes(" "))).toBe(true);
  });

  it("keeps descriptions inside dropdown data instead of inline top nav links", () => {
    const source = readFileSync(join(process.cwd(), "apps/studio/app/studio/StudioNavigation.tsx"), "utf8");
    expect(source).toContain("Studio command center navigation");
    expect(source).toContain("studio-command-menu-header");
    expect(source).not.toContain("<small>{link.description}</small>");
    expect(source).not.toContain("All modules");
  });

  it("top nav routes are Studio pages, not API or missing placeholders", () => {
    const items = allStudioTopNavItems();
    expect(items.length).toBeGreaterThan(30);
    for (const item of items) {
      expect(item.href.startsWith("/studio")).toBe(true);
      expect(item.href.startsWith("/api")).toBe(false);
      expect(existsSync(studioPageFileForRoute(item.href))).toBe(true);
    }
  });

  it("mega menu areas have grouped links and no empty route dumps", () => {
    for (const area of STUDIO_TOP_NAV_AREAS) {
      expect(area.groups.length).toBeGreaterThan(0);
      expect(area.groups.every((group) => group.label && group.items.length)).toBe(true);
      expect(area.groups.flatMap((group) => group.items).every((item) => item.label && item.description && item.href)).toBe(true);
    }
  });

  it("highlights the active top-level area from current routes", () => {
    expect(activeStudioTopNavAreaId("/studio")).toBe("home");
    expect(activeStudioTopNavAreaId("/studio/briefs")).toBe("pod");
    expect(activeStudioTopNavAreaId("/studio/image-generation")).toBe("pod");
    expect(activeStudioTopNavAreaId("/studio/ai-employees/model-usage")).toBe("ai");
    expect(activeStudioTopNavAreaId("/studio/business/documents")).toBe("business");
    expect(activeStudioTopNavAreaId("/studio/shopify-products")).toBe("storefront");
    expect(activeStudioTopNavAreaId("/studio/marketing/search-visibility")).toBe("marketing");
    expect(activeStudioTopNavAreaId("/studio/customer-inbox")).toBe("customers");
    expect(activeStudioTopNavAreaId("/studio/onboarding/guided")).toBe("operations");
  });

  it("launcher replaces disabled search language and exposes key workflow routes", () => {
    const source = readFileSync(join(process.cwd(), "apps/studio/app/studio/StudioNavigation.tsx"), "utf8");
    const layout = readFileSync(join(process.cwd(), "apps/studio/app/studio/layout.tsx"), "utf8");
    expect(layout).toContain("StudioRouteLauncher");
    expect(source).toContain("Search or jump to workflow...");
    expect(source).toContain("studio-route-launcher-panel");
    expect(source).toContain("Jump to workflow");
    expect(source).toContain("/studio/printify-catalog");
    expect(source).toContain("/studio/publish-review");
    expect(source).not.toContain("Search disabled");
    expect(source).not.toContain("Workspace search is not configured yet");
  });

  it("keeps the POD workflow sidebar available", () => {
    const source = readFileSync(join(process.cwd(), "apps/studio/app/studio/StudioNavigation.tsx"), "utf8");
    expect(source).toContain("StudioPodStageRail");
    expect(source).toContain("POD launch stages");
    expect(source).toContain("/studio/printify-catalog");
    expect(source).toContain("/studio/publish-review");
  });
});
