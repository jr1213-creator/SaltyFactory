"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
export type StudioTopNavMenuItem = {
  label: string;
  href: string;
  description: string;
  status?: string;
};
export type StudioTopNavMenuGroup = {
  label: string;
  items: readonly StudioTopNavMenuItem[];
};
export type StudioTopNavArea = {
  id: string;
  label: string;
  href: string;
  description: string;
  sectionIds: readonly string[];
  groups: readonly StudioTopNavMenuGroup[];
};

export const STUDIO_NAV_STORAGE_KEY = "saltyfactory.studio.nav.expanded";
export const STUDIO_DASHBOARD_LINK: StudioNavLink = ["Dashboard", "/studio"];

export const STUDIO_TOP_NAV_AREAS: readonly StudioTopNavArea[] = [
  {
    id: "home",
    label: "Home",
    href: "/studio",
    description: "Workspace command center, guided setup, readiness, and integrations.",
    sectionIds: ["dashboard"],
    groups: [
      {
        label: "Command",
        items: [
          { label: "Command Center", href: "/studio", description: "Workspace operating overview and next actions.", status: "Home" },
          { label: "Guided Setup", href: "/studio/onboarding/guided", description: "Launch Setup Concierge for provider connections." },
          { label: "Feature Readiness", href: "/studio/setup", description: "Provider and workflow readiness with safe owner language." },
          { label: "Integrations", href: "/studio/integrations", description: "Unified connected provider stack and Google data readiness." }
        ]
      }
    ]
  },
  {
    id: "pod",
    label: "POD",
    href: "/studio/pod-launch-studio",
    description: "Generate artwork, prepare mockups, choose Printify inputs, and review launch gates.",
    sectionIds: ["pod-studio"],
    groups: [
      {
        label: "Golden Path",
        items: [
          { label: "Launch Studio", href: "/studio/pod-launch-studio", description: "Main POD command center and stage map.", status: "Core" },
          { label: "Briefs", href: "/studio/briefs", description: "Approve prompts and send briefs to generation." },
          { label: "Image Generation", href: "/studio/image-generation", description: "Generated artwork jobs using the connected provider." },
          { label: "Assets", href: "/studio/assets", description: "Protected generated asset previews and QA actions." },
          { label: "Mockups", href: "/studio/mockups", description: "Composed internal mockups from approved artwork." }
        ]
      },
      {
        label: "Product Launch",
        items: [
          { label: "Printify Catalog", href: "/studio/printify-catalog", description: "Browse real blueprints, providers, variants, and shipping." },
          { label: "Product Builder", href: "/studio/product-builder", description: "Create product drafts from approved assets and mockups." },
          { label: "Publish Review", href: "/studio/publish-review", description: "Owner-gated readiness and provider draft actions.", status: "Gated" },
          { label: "Launch Packet", href: "/studio/launch-packet", description: "Review product, provider, and publish blockers." },
          { label: "POD Batches", href: "/studio/pod-batches", description: "Batch product creation workspace." }
        ]
      }
    ]
  },
  {
    id: "ai",
    label: "AI",
    href: "/studio/ai-employees",
    description: "Owner-gated AI workforce, hiring, improvements, and model operations.",
    sectionIds: ["ai-employees"],
    groups: [
      {
        label: "Workforce",
        items: [
          { label: "AI Employees", href: "/studio/ai-employees", description: "Role-based draft assistants and approval queue.", status: "Drafts" },
          { label: "Hiring Desk", href: "/studio/ai-employees/hiring", description: "Review proposed AI employee roles." },
          { label: "Improvement Desk", href: "/studio/ai-employees/improvements", description: "Review improvement suggestions and repeated blockers." }
        ]
      },
      {
        label: "Model Ops",
        items: [
          { label: "Model Registry", href: "/studio/ai-employees/models", description: "Configured model records and routing context." },
          { label: "Model Usage", href: "/studio/ai-employees/model-usage", description: "Usage records without exposing provider secrets." },
          { label: "Model Evaluations", href: "/studio/ai-employees/model-evals", description: "Owner-reviewed model evaluation records." }
        ]
      }
    ]
  },
  {
    id: "business",
    label: "Business",
    href: "/studio/business",
    description: "Business OS, opportunities, decisions, documents, and legitimacy work.",
    sectionIds: ["business"],
    groups: [
      {
        label: "Command",
        items: [
          { label: "Business Command Center", href: "/studio/business", description: "Business readiness, decisions, and next actions.", status: "OS" },
          { label: "Business Profile", href: "/studio/business/profile", description: "Workspace business profile and readiness." },
          { label: "Opportunities", href: "/studio/business/opportunities", description: "Saved opportunities for owner review." },
          { label: "Decision Memos", href: "/studio/business/decision-memos", description: "Decision records and assumptions." }
        ]
      },
      {
        label: "Legitimacy",
        items: [
          { label: "Documents", href: "/studio/business/documents", description: "Business documents and owner-approved proof packs." },
          { label: "Authority Requests", href: "/studio/business/authority-requests", description: "Sensitive authority requests and approvals." },
          { label: "Print Studio", href: "/studio/business/print-studio", description: "Business card and print-ready legitimacy assets." }
        ]
      }
    ]
  },
  {
    id: "storefront",
    label: "Storefront",
    href: "/studio/shopify-products",
    description: "Shopify, Printify, provider setup, product drafts, and storefront-facing state.",
    sectionIds: ["storefront"],
    groups: [
      {
        label: "Commerce",
        items: [
          { label: "Shopify Products", href: "/studio/shopify-products", description: "Shopify draft refs and product readiness.", status: "Drafts" },
          { label: "Printify Catalog", href: "/studio/printify-catalog", description: "Printify catalog browsing and variant selection." },
          { label: "Publish Review", href: "/studio/publish-review", description: "Provider draft actions behind owner gates." },
          { label: "Product Builder", href: "/studio/product-builder", description: "Create and update product drafts." }
        ]
      },
      {
        label: "Providers",
        items: [
          { label: "Integrations", href: "/studio/integrations", description: "Connected provider stack and readiness." },
          { label: "Provider Setup", href: "/studio/onboarding/providers", description: "Guided provider connection entry point." }
        ]
      }
    ]
  },
  {
    id: "marketing",
    label: "Marketing",
    href: "/studio/marketing-command-center",
    description: "Campaigns, approvals, social, email, ads, tracking, and search visibility.",
    sectionIds: ["marketing", "analytics"],
    groups: [
      {
        label: "Command",
        items: [
          { label: "Marketing Command Center", href: "/studio/marketing-command-center", description: "Marketing work queue and channel readiness.", status: "Drafts" },
          { label: "Campaigns", href: "/studio/marketing-campaigns", description: "Campaign drafts and launch planning." },
          { label: "Approvals", href: "/studio/marketing/approvals", description: "Owner-gated marketing approvals." }
        ]
      },
      {
        label: "Channels",
        items: [
          { label: "Social", href: "/studio/marketing/social", description: "Social draft queue and planning." },
          { label: "Email", href: "/studio/marketing/email", description: "Email draft studio without live sending." },
          { label: "Ads", href: "/studio/marketing/ads", description: "Ad drafts without automatic spend." },
          { label: "Tracking / UTMs", href: "/studio/marketing/tracking", description: "Campaign tracking and UTM links." },
          { label: "Search / AEO / GEO", href: "/studio/marketing/search-visibility", description: "Search visibility and AI-readiness work." }
        ]
      }
    ]
  },
  {
    id: "customers",
    label: "Customers",
    href: "/studio/customer-command-center",
    description: "Customer command center, CRM, leads, inbox, campaigns, service, and scheduling.",
    sectionIds: ["customer"],
    groups: [
      {
        label: "Command",
        items: [
          { label: "Customer Command Center", href: "/studio/customer-command-center", description: "Customer operations overview.", status: "Ops" },
          { label: "Customers", href: "/studio/customers", description: "Customer records and safe empty states." },
          { label: "Leads", href: "/studio/leads", description: "Lead records and follow-up work." },
          { label: "Segments", href: "/studio/customer-segments", description: "Customer segment definitions." }
        ]
      },
      {
        label: "Operations",
        items: [
          { label: "Inbox", href: "/studio/customer-inbox", description: "Customer conversation workspace." },
          { label: "Campaigns", href: "/studio/customer-campaigns", description: "Customer campaign drafts." },
          { label: "Opportunities", href: "/studio/opportunities", description: "CRM opportunity pipeline." },
          { label: "Service Cases", href: "/studio/service-cases", description: "Service case workflow." },
          { label: "Scheduling", href: "/studio/customer-scheduling", description: "Appointment and scheduling setup." }
        ]
      }
    ]
  },
  {
    id: "operations",
    label: "Operations",
    href: "/studio/onboarding/guided",
    description: "Guided setup, provider readiness, integrations, storage readiness, and help.",
    sectionIds: ["operations"],
    groups: [
      {
        label: "Setup",
        items: [
          { label: "Guided Setup", href: "/studio/onboarding/guided", description: "Launch Setup Concierge for provider connections.", status: "Primary" },
          { label: "Quick Setup", href: "/studio/onboarding/quick-start", description: "Fast local setup checklist." },
          { label: "Feature Readiness", href: "/studio/setup", description: "Runtime readiness and exact setup blockers." },
          { label: "Provider Setup", href: "/studio/onboarding/providers", description: "Provider-specific connection pages." }
        ]
      },
      {
        label: "Diagnostics",
        items: [
          { label: "Integrations", href: "/studio/integrations", description: "Unified provider readiness and connected stack." },
          { label: "Storage Readiness", href: "/studio/setup", description: "Generated asset storage readiness diagnostic." },
          { label: "Help Requests", href: "/studio/onboarding/help", description: "Request setup help without exposing secrets." }
        ]
      }
    ]
  }
];

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
      ["Launch Setup Concierge", "/studio/onboarding"],
      ["Guided Setup", "/studio/onboarding/guided"],
      ["Quick Setup", "/studio/onboarding/quick-start"],
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
  { label: "Setup", href: "/studio/onboarding", sectionId: "operations", description: "Guided provider setup" }
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
  operations: ["Launch Guided Setup", "/studio/onboarding/guided"],
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

export function allStudioTopNavItems(areas: readonly StudioTopNavArea[] = STUDIO_TOP_NAV_AREAS) {
  return areas.flatMap((area) => area.groups.flatMap((group) => group.items.map((item) => ({ ...item, areaId: area.id, groupLabel: group.label }))));
}

export function activeStudioTopNavAreaId(pathname: string, areas: readonly StudioTopNavArea[] = STUDIO_TOP_NAV_AREAS) {
  if (pathname === "/studio") return "home";
  const activeSectionIds = activeStudioNavSectionIds(pathname);
  const bySection = areas.find((area) => area.sectionIds.some((id) => activeSectionIds.includes(id)));
  if (bySection) return bySection.id;
  const activeItems = allStudioTopNavItems(areas)
    .filter((item) => isActiveStudioHref(pathname, item.href))
    .sort((a, b) => b.href.length - a.href.length);
  return activeItems[0]?.areaId ?? areas.find((area) => isActiveStudioHref(pathname, area.href))?.id ?? "home";
}

export function topStudioCommandLabels() {
  return STUDIO_TOP_NAV_AREAS.map((area) => area.label);
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
  const activeAreaId = useMemo(() => activeStudioTopNavAreaId(pathname), [pathname]);
  const [openAreaId, setOpenAreaId] = useState<string | null>(null);
  const navRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!openAreaId) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenAreaId(null);
    }
    function onPointerDown(event: MouseEvent) {
      if (!navRef.current?.contains(event.target as Node)) setOpenAreaId(null);
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [openAreaId]);

  return <nav className="studio-command-nav" aria-label="Studio command center navigation" ref={navRef}>
    <div className="studio-command-list" aria-label="Primary Studio areas">
      {STUDIO_TOP_NAV_AREAS.map((area, index) => {
        const active = activeAreaId === area.id;
        const open = openAreaId === area.id;
        const menuId = `studio-top-nav-menu-${area.id}`;
        return <div className="studio-command-item" key={area.id}>
          <button
            type="button"
            className={`studio-command-link${active ? " is-active" : ""}`}
            aria-haspopup="menu"
            aria-expanded={open}
            aria-controls={menuId}
            onClick={() => setOpenAreaId((current) => current === area.id ? null : area.id)}
          >
            <span>{area.label}</span>
          </button>
          {open ? <div
            className={`studio-command-menu studio-top-nav-menu${index >= STUDIO_TOP_NAV_AREAS.length - 3 ? " align-right" : ""}`}
            id={menuId}
            role="menu"
          >
            <div className="studio-command-menu-header">
              <strong>{area.label}</strong>
              <p>{area.description}</p>
            </div>
            {area.groups.map((group) => <section key={`${area.id}-${group.label}`}>
              <strong>{group.label}</strong>
              {group.items.map((item) => <a
                href={item.href}
                key={`${area.id}-${group.label}-${item.href}`}
                role="menuitem"
                aria-current={isActiveStudioHref(pathname, item.href) ? "page" : undefined}
                onClick={() => setOpenAreaId(null)}
              >
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.description}</small>
                </span>
                {item.status ? <em>{item.status}</em> : null}
              </a>)}
            </section>)}
          </div> : null}
        </div>;
      })}
    </div>
    <StudioMobileCommandNav pathname={pathname} />
  </nav>;
}

export function StudioTopNavDropdowns() {
  return <StudioCommandCenterNav />;
}

function StudioMobileCommandNav({ pathname }: { pathname: string }) {
  return <details className="studio-mobile-command-nav">
    <summary>Menu</summary>
    <div className="studio-mobile-command-panel">
      {STUDIO_TOP_NAV_AREAS.map((area) => <section key={`mobile-${area.id}`}>
        <strong>{area.label}</strong>
        {area.groups.flatMap((group) => group.items).map((item) => <a
          href={item.href}
          key={`mobile-${area.id}-${item.href}`}
          aria-current={isActiveStudioHref(pathname, item.href) ? "page" : undefined}
        >
          {item.label}
        </a>)}
      </section>)}
    </div>
  </details>;
}

export function StudioRouteLauncher() {
  const [open, setOpen] = useState(false);
  const launcherRef = useRef<HTMLDivElement | null>(null);
  const items = useMemo(() => {
    const unique = new Map<string, ReturnType<typeof allStudioTopNavItems>[number]>();
    for (const item of allStudioTopNavItems()) if (!unique.has(item.href)) unique.set(item.href, item);
    return [...unique.values()];
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    function onPointerDown(event: MouseEvent) {
      if (!launcherRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [open]);

  return <div className="studio-route-launcher" ref={launcherRef}>
    <button
      type="button"
      className="studio-route-launcher-trigger"
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-controls="studio-route-launcher-panel"
      onClick={() => setOpen((current) => !current)}
    >
      Search or jump to workflow...
    </button>
    {open ? <div className="studio-route-launcher-panel" id="studio-route-launcher-panel" role="dialog" aria-label="Route launcher">
      <div className="studio-route-launcher-header">
        <strong>Jump to workflow</strong>
        <span>Major Studio routes</span>
      </div>
      <div className="studio-route-launcher-list">
        {items.map((item) => <a href={item.href} key={`launcher-${item.href}`} onClick={() => setOpen(false)}>
          <span>
            <strong>{item.label}</strong>
            <small>{item.description}</small>
          </span>
          <em>{STUDIO_TOP_NAV_AREAS.find((area) => area.id === item.areaId)?.label}</em>
        </a>)}
      </div>
    </div> : null}
  </div>;
}
