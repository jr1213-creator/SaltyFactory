import React from "react";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ArtifactCard, BentoGrid, BentoMetric, ProviderCard, PublishGateCard, SetupConciergeCard } from "../packages/ui/src";
import {
  STUDIO_MEGA_MENU_AREAS,
  activeStudioMegaArea,
  allStudioMegaMenuItems,
  topStudioCommandLabels
} from "../apps/studio/app/studio/StudioNavigation";

function routeFileForStudioHref(href: string) {
  const route = href.split("#")[0] ?? href;
  const parts = route.split("/").filter(Boolean);
  return join(process.cwd(), "apps/studio/app", ...parts, "page.tsx");
}

describe("tactile coastal Studio design system", () => {
  it("global nav exposes the requested top command areas", () => {
    expect(topStudioCommandLabels()).toEqual([
      "Home",
      "POD Factory",
      "AI Workforce",
      "Business",
      "Storefront",
      "Marketing",
      "Customers",
      "Operations"
    ]);
    expect(activeStudioMegaArea("/studio/printify-catalog").label).toBe("POD Factory");
    expect(activeStudioMegaArea("/studio/integrations").label).toBe("Storefront");
  });

  it("mega menu items have valid Studio routes and never link to API routes", () => {
    for (const { item } of allStudioMegaMenuItems()) {
      expect(item.icon.length).toBeGreaterThanOrEqual(2);
      expect(item.href).toMatch(/^\/studio/);
      expect(item.href).not.toMatch(/^\/api\//);
      expect(item.href).not.toMatch(/\/api\//);
      expect(existsSync(routeFileForStudioHref(item.href))).toBe(true);
    }
  });

  it("global nav source includes keyboard close, click outside close, and mobile coverage", () => {
    const source = readFileSync(join(process.cwd(), "apps/studio/app/studio/StudioNavigation.tsx"), "utf8");
    expect(source).toContain('event.key === "Escape"');
    expect(source).toContain("pointerdown");
    expect(source).toContain("StudioMobileNav");
    expect(source).toContain("StudioWorkflowSidebar");
    expect(source).not.toMatch(/href=\"\/api\//);
  });

  it("CSS declares the exact SaltyFactory palette tokens and texture utilities", () => {
    const css = readFileSync(join(process.cwd(), "apps/studio/app/globals.css"), "utf8");
    expect(css).toContain("--sf-ink: rgb(12, 24, 38)");
    expect(css).toContain("--sf-coral: rgb(239, 103, 91)");
    expect(css).toContain("--sf-turquoise: rgb(0, 141, 150)");
    expect(css).toContain("--sf-warm-paper: rgb(246, 237, 224)");
    expect(css).toContain(".sf-texture-topo");
    expect(css).toContain(".sf-texture-sand");
    expect(css).toContain(".sf-texture-canvas");
    expect(css).toContain(".sf-texture-denim");
    expect(css).toContain(".sf-grid-paper");
    expect(css).toContain(".sf-stitch-border");
  });

  it("bento primitives render provider, artifact, gate, and setup states", () => {
    const html = renderToStaticMarkup(
      React.createElement(BentoGrid, null,
        React.createElement(BentoMetric, { label: "Generated art", value: "1", detail: "Private asset visible", tone: "seafoam" }),
        React.createElement(ProviderCard, { title: "Printify", status: "connected", description: "Catalog browsing ready.", source: "secure workspace credential" }),
        React.createElement(ArtifactCard, { title: "Mockup preview", status: "approved ready", description: "Composed from protected artwork." }),
        React.createElement(PublishGateCard, { title: "Owner approval", status: "owner gated", description: "Live publish remains blocked.", tone: "warning" }),
        React.createElement(SetupConciergeCard, { title: "Guided setup", status: "ready", description: "Provider records are the normal runtime path.", tone: "success" })
      )
    );
    expect(html).toContain("bento-grid");
    expect(html).toContain("bento-provider-card");
    expect(html).toContain("Mockup preview");
    expect(html).toContain("owner gated");
    expect(html).not.toMatch(/owner_gated|setup_needed|provider_disabled/);
  });

  it("shared UI no longer uses old single-letter avatar or notification markers", () => {
    const source = readFileSync(join(process.cwd(), "packages/ui/src/index.tsx"), "utf8");
    expect(source).not.toContain("name.slice(0, 1)");
    expect(source).not.toContain(">A</span>");
    expect(source).not.toContain(">o<span>");
    expect(source).toContain("<Bell");
    expect(source).toContain("<CircleUserRound");
  });

  it("mega menu area definitions include descriptions and avoid placeholders", () => {
    for (const area of STUDIO_MEGA_MENU_AREAS) {
      expect(area.description.length).toBeGreaterThan(20);
      for (const group of area.groups) {
        expect(group.items.length).toBeGreaterThan(0);
        for (const item of group.items) {
          expect(item.label).not.toMatch(/placeholder|coming soon/i);
          expect(item.description.length).toBeGreaterThan(24);
        }
      }
    }
  });
});
