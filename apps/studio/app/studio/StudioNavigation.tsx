"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

export type StudioNavLink = readonly [label: string, href: string];
export type StudioNavSection = {
  id: string;
  label: string;
  links: readonly StudioNavLink[];
};

export const STUDIO_NAV_STORAGE_KEY = "saltyfactory.studio.nav.expanded";
export const STUDIO_DASHBOARD_LINK: StudioNavLink = ["Dashboard", "/studio"];

export const STUDIO_NAV_SECTIONS: readonly StudioNavSection[] = [
  {
    id: "pod-studio",
    label: "POD Studio",
    links: [
      ["Product Builder", "/studio/pod-migration"],
      ["Designs", "/studio/designs"],
      ["Assets", "/studio/assets"],
      ["Mockups", "/studio/mockups"],
      ["Listing Drafts", "/studio/listing-drafts"],
      ["Pricing & Margins", "/studio/pricing"],
      ["Publish Review", "/studio/publish"]
    ]
  },
  {
    id: "ai-employees",
    label: "AI Employees",
    links: [["AI Employees", "/studio/ai-employees"]]
  },
  {
    id: "storefront",
    label: "Storefront",
    links: [
      ["Products", "/studio/products"],
      ["Shopify / Printify", "/studio/integrations"],
      ["SaltyCowhide.com", "/studio/drafts"]
    ]
  },
  {
    id: "marketing",
    label: "Marketing",
    links: [
      ["Social Planner", "/studio/social-planner"],
      ["Channels", "/studio/channels"],
      ["Trends", "/studio/trends"]
    ]
  },
  {
    id: "analytics",
    label: "Analytics",
    links: [
      ["Baseline & Impact", "/studio/baseline"],
      ["Google Data", "/studio/integrations"]
    ]
  },
  {
    id: "operations",
    label: "Operations",
    links: [
      ["Business Profile", "/studio/settings/business-profile"],
      ["Integrations", "/studio/integrations"],
      ["Setup Guide", "/studio/migration-guide"],
      ["Settings", "/studio/settings"],
      ["Billing", "/studio/billing"]
    ]
  },
  {
    id: "expansion",
    label: "Expansion",
    links: [["Accessory Dropshipping", "/studio/dropshipping"]]
  }
];

export function isActiveStudioHref(pathname: string, href: string) {
  if (href === "/studio") return pathname === "/studio";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function activeStudioNavSectionIds(pathname: string, sections: readonly StudioNavSection[] = STUDIO_NAV_SECTIONS) {
  return sections.filter((section) => section.links.some(([, href]) => isActiveStudioHref(pathname, href))).map((section) => section.id);
}

export function parseStoredStudioNavSections(value: string | null | undefined, sections: readonly StudioNavSection[] = STUDIO_NAV_SECTIONS) {
  if (!value) return [];
  const validIds = new Set(sections.map((section) => section.id));
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string" && validIds.has(id)) : [];
  } catch {
    return [];
  }
}

export function resolveExpandedStudioNavSections(input: { pathname: string; storedValue?: string | null; userExpandedIds?: readonly string[]; sections?: readonly StudioNavSection[] }) {
  const sections = input.sections ?? STUDIO_NAV_SECTIONS;
  const expanded = new Set(input.userExpandedIds ?? parseStoredStudioNavSections(input.storedValue, sections));
  for (const id of activeStudioNavSectionIds(input.pathname, sections)) expanded.add(id);
  return [...expanded];
}

export function visibleStudioNavLinks(input: { pathname: string; expandedIds: readonly string[]; sections?: readonly StudioNavSection[] }) {
  const sections = input.sections ?? STUDIO_NAV_SECTIONS;
  const expanded = new Set(resolveExpandedStudioNavSections({ pathname: input.pathname, userExpandedIds: input.expandedIds, sections }));
  return sections.flatMap((section) => expanded.has(section.id) ? section.links.map(([label]) => label) : []);
}

function persistExpanded(ids: Iterable<string>) {
  try {
    window.localStorage.setItem(STUDIO_NAV_STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // Navigation still works when storage is blocked.
  }
}

export function StudioNavigation() {
  const pathname = usePathname() || "/studio";
  const activeSectionIds = useMemo(() => activeStudioNavSectionIds(pathname), [pathname]);
  const [userExpandedIds, setUserExpandedIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      setUserExpandedIds(parseStoredStudioNavSections(window.localStorage.getItem(STUDIO_NAV_STORAGE_KEY)));
    } catch {
      setUserExpandedIds([]);
    }
  }, []);

  const expandedIds = useMemo(
    () => new Set(resolveExpandedStudioNavSections({ pathname, userExpandedIds })),
    [pathname, userExpandedIds]
  );
  const allSectionIds = STUDIO_NAV_SECTIONS.map((section) => section.id);
  const allExpanded = allSectionIds.every((id) => expandedIds.has(id));

  function toggleSection(id: string) {
    setUserExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      persistExpanded(next);
      return [...next];
    });
  }

  function setAll(expand: boolean) {
    const next = expand ? allSectionIds : [];
    persistExpanded(next);
    setUserExpandedIds(next);
  }

  return <nav className="studio-nav" aria-label="Studio navigation">
    <a className="studio-nav-top-link" href={STUDIO_DASHBOARD_LINK[1]} aria-current={isActiveStudioHref(pathname, STUDIO_DASHBOARD_LINK[1]) ? "page" : undefined}>{STUDIO_DASHBOARD_LINK[0]}</a>
    <div className="studio-nav-tools" aria-label="Navigation display controls">
      <button type="button" onClick={() => setAll(!allExpanded)}>{allExpanded ? "Collapse all" : "Expand all"}</button>
    </div>
    {STUDIO_NAV_SECTIONS.map((section) => {
      const expanded = expandedIds.has(section.id);
      const active = activeSectionIds.includes(section.id);
      const panelId = `studio-nav-section-${section.id}`;
      return <section className="studio-nav-group" key={section.id}>
        <button
          type="button"
          className={`studio-nav-section-button${active ? " is-active" : ""}`}
          aria-expanded={expanded}
          aria-controls={panelId}
          onClick={() => toggleSection(section.id)}
        >
          <span>{section.label}</span>
          <span aria-hidden="true" className="studio-nav-chevron">{expanded ? "-" : "+"}</span>
        </button>
        <div id={panelId} className="studio-nav-section-panel" hidden={!expanded}>
          {section.links.map(([label, href]) => <a key={`${section.id}-${href}-${label}`} href={href} aria-current={isActiveStudioHref(pathname, href) ? "page" : undefined}>{label}</a>)}
        </div>
      </section>;
    })}
  </nav>;
}
