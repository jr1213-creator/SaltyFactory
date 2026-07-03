"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

export type StudioNavLink = readonly [label: string, href: string];
export type StudioNavSection = {
  id: string;
  label: string;
  primaryHref: string;
  description: string;
  links: readonly StudioNavLink[];
};
export type StudioCommandCenterLink = {
  label: string;
  href: string;
  sectionId: string;
  description: string;
};
export type StudioStageLink = {
  stage: string;
  label: string;
  href: string;
  blockerHint: string;
};

export const STUDIO_NAV_STORAGE_KEY = "saltyfactory.studio.nav.expanded";
export const STUDIO_DASHBOARD_LINK: StudioNavLink = ["Dashboard", "/studio"];

export const STUDIO_NAV_SECTIONS: readonly StudioNavSection[] = [
  {
    id: "pod-studio",
    label: "POD Studio",
    primaryHref: "/studio/pod-launch-studio",
    description: "Generate artwork, prepare products, create provider drafts, and review launch readiness.",
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
    primaryHref: "/studio/ai-employees",
    description: "Owner-gated AI workforce, hiring requests, model routing, and improvement suggestions.",
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
    primaryHref: "/studio/business",
    description: "Business decisions, financial readiness, identity, documents, banking, and authority requests.",
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
    primaryHref: "/studio/customer-command-center",
    description: "Customer capture, CRM operations, inbox, scheduling, segments, and customer campaign drafts.",
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
    primaryHref: "/studio/products",
    description: "Approved public projections, Shopify draft references, and storefront-facing product state.",
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
    primaryHref: "/studio/marketing-command-center",
    description: "Campaign planning, proof packs, channel drafts, approvals, social care, and tracking readiness.",
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
    primaryHref: "/studio/baseline",
    description: "Baseline snapshots, measurement readiness, and provider-imported performance context.",
    links: [
      ["Baseline & Impact", "/studio/baseline"],
      ["Google Data", "/studio/integrations"]
    ]
  },
  {
    id: "operations",
    label: "Operations",
    primaryHref: "/studio/setup",
    description: "Feature readiness, provider setup, workspace settings, billing, and operational guardrails.",
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
    primaryHref: "/studio/dropshipping",
    description: "Future growth paths that remain clearly separated from the core POD launch workflow.",
    links: [["Accessory Dropshipping", "/studio/dropshipping"]]
  }
];

export const STUDIO_COMMAND_CENTER_LINKS: readonly StudioCommandCenterLink[] = [
  { label: "Home", href: "/studio", sectionId: "dashboard", description: "Workspace command summary" },
  { label: "POD", href: "/studio/pod-launch-studio", sectionId: "pod-studio", description: "Product launch pipeline" },
  { label: "AI", href: "/studio/ai-employees", sectionId: "ai-employees", description: "Owner-gated AI workforce" },
  { label: "Business", href: "/studio/business", sectionId: "business", description: "Decision support and documents" },
  { label: "Customer", href: "/studio/customer-command-center", sectionId: "customer", description: "CRM and capture operations" },
  { label: "Marketing", href: "/studio/marketing-command-center", sectionId: "marketing", description: "Campaign planning and approvals" },
  { label: "Setup", href: "/studio/setup", sectionId: "operations", description: "Provider readiness and guardrails" }
];

export const STUDIO_POD_STAGE_LINKS: readonly StudioStageLink[] = [
  { stage: "01", label: "Plan", href: "/studio/product-builder", blockerHint: "Product idea and source record" },
  { stage: "02", label: "Generate", href: "/studio/image-generation", blockerHint: "Image provider and approved prompt" },
  { stage: "03", label: "QA", href: "/studio/assets", blockerHint: "Asset QA and approval" },
  { stage: "04", label: "Mockup", href: "/studio/mockups", blockerHint: "Real mockup asset" },
  { stage: "05", label: "Price", href: "/studio/pricing-margins", blockerHint: "Cost and margin inputs" },
  { stage: "06", label: "Provider", href: "/studio/printify-catalog", blockerHint: "Printify catalog selection" },
  { stage: "07", label: "Review", href: "/studio/publish-review", blockerHint: "Owner launch gates" }
];

const primaryActionBySection: Record<string, StudioNavLink> = {
  "pod-studio": ["Open Publish Review", "/studio/publish-review"],
  "ai-employees": ["Review AI Hiring", "/studio/ai-employees/hiring"],
  business: ["Open Documents", "/studio/business/documents"],
  customer: ["Open Customers", "/studio/customers"],
  storefront: ["Open Shopify Drafts", "/studio/shopify-products"],
  marketing: ["Open Approvals", "/studio/marketing/approvals"],
  analytics: ["Open Baseline", "/studio/baseline"],
  operations: ["Open Feature Readiness", "/studio/setup"],
  expansion: ["Open Dropshipping", "/studio/dropshipping"]
};

export function isActiveStudioHref(pathname: string, href: string) {
  if (href === "/studio") return pathname === "/studio";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function activeStudioNavSectionIds(pathname: string, sections: readonly StudioNavSection[] = STUDIO_NAV_SECTIONS) {
  return sections.filter((section) => section.links.some(([, href]) => isActiveStudioHref(pathname, href))).map((section) => section.id);
}

export function getActiveStudioNavContext(pathname: string, sections: readonly StudioNavSection[] = STUDIO_NAV_SECTIONS) {
  const matches = sections
    .map((section) => {
      const activeLinks = section.links
        .filter(([, href]) => isActiveStudioHref(pathname, href))
        .sort((a, b) => b[1].length - a[1].length);
      return { section, activeLink: activeLinks[0] };
    })
    .filter((entry): entry is { section: StudioNavSection; activeLink: StudioNavLink } => Boolean(entry.activeLink));
  if (matches.length) return matches.sort((a, b) => b.activeLink[1].length - a.activeLink[1].length)[0];
  return null;
}

export function getStudioBreadcrumbs(pathname: string) {
  const context = getActiveStudioNavContext(pathname);
  const breadcrumbs: StudioNavLink[] = [STUDIO_DASHBOARD_LINK];
  if (!context) return breadcrumbs;
  breadcrumbs.push([context.section.label, context.section.primaryHref]);
  if (context.activeLink[1] !== context.section.primaryHref) breadcrumbs.push(context.activeLink);
  return breadcrumbs;
}

export function getStudioPrimaryAction(pathname: string): StudioNavLink {
  const context = getActiveStudioNavContext(pathname);
  if (!context) return ["Open POD Launch Studio", "/studio/pod-launch-studio"];
  return primaryActionBySection[context.section.id] ?? [context.section.label, context.section.primaryHref];
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

export function topStudioCommandLabels() {
  return STUDIO_COMMAND_CENTER_LINKS.map((link) => link.label);
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

  return <nav className="studio-nav" aria-label="Studio module explorer">
    <div className="studio-nav-heading">
      <span>Module explorer</span>
      <a href={STUDIO_DASHBOARD_LINK[1]} aria-current={isActiveStudioHref(pathname, STUDIO_DASHBOARD_LINK[1]) ? "page" : undefined}>{STUDIO_DASHBOARD_LINK[0]}</a>
    </div>
    <div className="studio-nav-tools" aria-label="Navigation display controls">
      <button type="button" onClick={() => setAll(!allExpanded)}>{allExpanded ? "Collapse all modules" : "Expand all modules"}</button>
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
          <span><strong>{section.label}</strong><small>{section.description}</small></span>
          <span aria-hidden="true" className="studio-nav-chevron">{expanded ? "-" : "+"}</span>
        </button>
        <div id={panelId} className="studio-nav-section-panel" hidden={!expanded}>
          {section.links.map(([label, href]) => <a key={`${section.id}-${href}-${label}`} href={href} aria-current={isActiveStudioHref(pathname, href) ? "page" : undefined}>{label}</a>)}
        </div>
      </section>;
    })}
  </nav>;
}

export function StudioWorkflowContextPanel() {
  const pathname = usePathname() || "/studio";
  const context = getActiveStudioNavContext(pathname);
  const breadcrumbs = getStudioBreadcrumbs(pathname);
  const [actionLabel, actionHref] = getStudioPrimaryAction(pathname);
  const title = context?.activeLink[0] ?? "Command Center";
  const sectionLabel = context?.section.label ?? "Studio Home";
  const description = context?.section.description ?? "Workspace-wide launch, setup, approval, and business readiness overview.";

  return <section className="studio-context-panel" aria-label="Current Studio workflow">
    <nav className="studio-breadcrumbs" aria-label="Studio breadcrumbs">
      {breadcrumbs.map(([label, href], index) => <span key={`${href}-${label}`}>
        {index > 0 ? <span aria-hidden="true">/</span> : null}
        <a href={href} aria-current={index === breadcrumbs.length - 1 ? "page" : undefined}>{label}</a>
      </span>)}
    </nav>
    <p className="eyebrow-label">{sectionLabel}</p>
    <strong>{title}</strong>
    <p>{description}</p>
    <div className="studio-context-actions">
      <a href={actionHref}>{actionLabel}</a>
      <a href="/studio/setup">Setup</a>
    </div>
  </section>;
}

export function StudioPodStageRail() {
  const pathname = usePathname() || "/studio";

  return <nav className="studio-stage-rail" aria-label="POD launch stages">
    <div className="studio-stage-rail-header">
      <span>POD launch stages</span>
      <a href="/studio/pod-launch-studio">Pipeline</a>
    </div>
    {STUDIO_POD_STAGE_LINKS.map((link) => <a
      className="studio-stage-link"
      href={link.href}
      key={link.href}
      aria-current={isActiveStudioHref(pathname, link.href) ? "page" : undefined}
      title={link.blockerHint}
    >
      <span>{link.stage}</span>
      <strong>{link.label}</strong>
      <small>{link.blockerHint}</small>
    </a>)}
  </nav>;
}

export function StudioCommandCenterNav() {
  const pathname = usePathname() || "/studio";
  const activeSectionIds = useMemo(() => activeStudioNavSectionIds(pathname), [pathname]);

  return <nav className="studio-command-nav" aria-label="Studio command center navigation">
    {STUDIO_COMMAND_CENTER_LINKS.map((link) => {
      const active = link.href === "/studio" ? pathname === "/studio" : activeSectionIds.includes(link.sectionId) || isActiveStudioHref(pathname, link.href);
      return <a
        className={`studio-command-link${active ? " is-active" : ""}`}
        href={link.href}
        key={link.href}
        aria-current={active ? "page" : undefined}
        title={link.description}
      >
        <span>{link.label}</span>
        <small>{link.description}</small>
      </a>;
    })}
    <details className="studio-command-more studio-top-nav-dropdown">
      <summary>
        <span>More</span>
        <small>All modules</small>
      </summary>
      <div className="studio-command-menu studio-top-nav-menu">
        {STUDIO_NAV_SECTIONS.map((section) => <section key={`more-${section.id}`}>
          <strong>{section.label}</strong>
          {section.links.map(([label, href]) => <a key={`${section.id}-top-${href}-${label}`} href={href} aria-current={isActiveStudioHref(pathname, href) ? "page" : undefined}>{label}</a>)}
        </section>)}
      </div>
    </details>
  </nav>;
}

export function StudioTopNavDropdowns() {
  return <StudioCommandCenterNav />;
}
