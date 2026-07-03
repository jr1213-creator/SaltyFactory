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
      ["POD Launch Studio", "/studio/pod-launch-studio"],
      ["POD Batches", "/studio/pod-batches"],
      ["Product Builder", "/studio/product-builder"],
      ["Image Generation", "/studio/image-generation"],
      ["Designs", "/studio/designs"],
      ["Assets", "/studio/assets"],
      ["Mockups", "/studio/mockups"],
      ["Printify Catalog", "/studio/printify-catalog"],
      ["Listing Drafts", "/studio/listing-drafts"],
      ["Pricing & Margins", "/studio/pricing-margins"],
      ["Publish Review", "/studio/publish-review"],
      ["Launch Packet", "/studio/launch-packet"]
    ]
  },
  {
    id: "ai-employees",
    label: "AI Employees",
    links: [
      ["AI Employees", "/studio/ai-employees"],
      ["Hiring Desk", "/studio/ai-employees/hiring"],
      ["Improvement Desk", "/studio/ai-employees/improvements"],
      ["Model Registry", "/studio/ai-employees/models"],
      ["Model Evaluations", "/studio/ai-employees/model-evals"],
      ["Model Usage", "/studio/ai-employees/model-usage"],
      ["Capability Requests", "/studio/ai-employees/capability-requests"],
      ["Training Requests", "/studio/ai-employees/training-requests"],
      ["Tool Access Requests", "/studio/ai-employees/tool-access-requests"]
    ]
  },
  {
    id: "business",
    label: "Business",
    links: [
      ["Business Command Center", "/studio/business"],
      ["Financials", "/studio/business/financials"],
      ["Opportunities", "/studio/business/opportunities"],
      ["Trends", "/studio/business/trends"],
      ["Products", "/studio/business/products"],
      ["Customers", "/studio/business/customers"],
      ["Campaign Decisions", "/studio/business/campaign-decisions"],
      ["Experiments", "/studio/business/experiments"],
      ["Forecasts", "/studio/business/forecasts"],
      ["Decision Memos", "/studio/business/decision-memos"],
      ["Business Profile", "/studio/business/profile"],
      ["Goals", "/studio/business/goals"],
      ["Brand Purpose", "/studio/business/brand-purpose"],
      ["Documents", "/studio/business/documents"],
      ["Banking", "/studio/business/banking"],
      ["Print Studio", "/studio/business/print-studio"],
      ["Authority Requests", "/studio/business/authority-requests"]
    ]
  },
  {
    id: "customer",
    label: "Customer",
    links: [
      ["Customer Command Center", "/studio/customer-command-center"],
      ["Customers", "/studio/customers"],
      ["Segments", "/studio/customer-segments"],
      ["Customer Capture", "/studio/customer-capture"],
      ["Customer Inbox", "/studio/customer-inbox"],
      ["Customer Campaigns", "/studio/customer-campaigns"],
      ["Customer Intelligence", "/studio/customer-intelligence"],
      ["Customer Scheduling", "/studio/customer-scheduling"]
    ]
  },
  {
    id: "storefront",
    label: "Storefront",
    links: [
      ["Products", "/studio/products"],
      ["Shopify Products", "/studio/shopify-products"],
      ["Shopify / Printify", "/studio/integrations"],
      ["SaltyCowhide.com", "/studio/drafts"]
    ]
  },
  {
    id: "marketing",
    label: "Marketing",
    links: [
      ["Marketing Command Center", "/studio/marketing-command-center"],
      ["Campaigns", "/studio/marketing-campaigns"],
      ["Pinterest Pin Factory", "/studio/marketing/pinterest"],
      ["Social Draft Queue", "/studio/marketing/social"],
      ["Email Draft Studio", "/studio/marketing/email"],
      ["Ads Hub", "/studio/marketing/ads"],
      ["Search Visibility", "/studio/marketing/search-visibility"],
      ["Campaign Assets", "/studio/marketing/assets"],
      ["Tracking / UTMs", "/studio/marketing/tracking"],
      ["Research Board", "/studio/marketing/research"],
      ["Approvals", "/studio/marketing/approvals"],
      ["Social Care", "/studio/marketing/social-care"],
      ["Social Planner", "/studio/social-planner"],
      ["Channels", "/studio/channels"],
      ["Trends", "/studio/trends"],
      ["Marketing Setup", "/studio/marketing/setup"]
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
      ["Account Center", "/studio/account-center"],
      ["Feature Readiness", "/studio/setup"],
      ["Business Profile", "/studio/settings/business-profile"],
      ["Integrations", "/studio/integrations"],
      ["Setup Guide", "/studio/migration-guide"],
      ["Vertical Pack", "/studio/settings/vertical-pack"],
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
