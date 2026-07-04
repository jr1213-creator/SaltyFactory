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
export type StudioMegaMenuItem = {
  icon: string;
  label: string;
  description: string;
  href: string;
  status?: string;
};
export type StudioMegaMenuGroup = {
  label: string;
  items: readonly StudioMegaMenuItem[];
};
export type StudioMegaMenuArea = {
  id: string;
  label: string;
  href: string;
  description: string;
  groups: readonly StudioMegaMenuGroup[];
};

export const STUDIO_NAV_STORAGE_KEY = "saltyfactory.studio.nav.expanded";
export const STUDIO_DASHBOARD_LINK: StudioNavLink = ["Dashboard", "/studio"];

export const STUDIO_MEGA_MENU_AREAS: readonly StudioMegaMenuArea[] = [
  {
    id: "home",
    label: "Home",
    href: "/studio",
    description: "Owner command center and next best actions.",
    groups: [
      {
        label: "Command",
        items: [
          { icon: "HQ", label: "Owner Command Center", description: "Workspace launch, approval, and readiness summary.", href: "/studio", status: "now" },
          { icon: "RD", label: "Feature Readiness", description: "Provider, storage, and workflow readiness without secret leakage.", href: "/studio/setup", status: "safe" }
        ]
      }
    ]
  },
  {
    id: "pod-factory",
    label: "POD Factory",
    href: "/studio/pod-launch-studio",
    description: "Plan, generate, QA, mock up, select catalog inputs, and review launch gates.",
    groups: [
      {
        label: "Launch Pipeline",
        items: [
          { icon: "PL", label: "POD Launch Studio", description: "The main human-approved product pipeline.", href: "/studio/pod-launch-studio", status: "core" },
          { icon: "PB", label: "Product Builder", description: "Create one product draft from approved art and mockups.", href: "/studio/product-builder" },
          { icon: "PR", label: "Publish Review", description: "Final gate control for Printify, Shopify draft, and live publish.", href: "/studio/publish-review", status: "gated" },
          { icon: "LP", label: "Launch Packet", description: "Review the complete launch packet before provider actions.", href: "/studio/launch-packet" }
        ]
      },
      {
        label: "Creative Production",
        items: [
          { icon: "BR", label: "Briefs", description: "Approve source briefs before generation.", href: "/studio/briefs" },
          { icon: "IG", label: "Image Generation", description: "Queue provider-backed generated artwork.", href: "/studio/image-generation", status: "private" },
          { icon: "AR", label: "Assets", description: "View protected source art, QA status, and next actions.", href: "/studio/assets" },
          { icon: "MK", label: "Mockups", description: "Compose and inspect real mockup previews.", href: "/studio/mockups" }
        ]
      },
      {
        label: "Commerce Setup",
        items: [
          { icon: "PC", label: "Printify Catalog", description: "Browse real Printify blueprints, providers, and variants.", href: "/studio/printify-catalog" },
          { icon: "SP", label: "Shopify Products", description: "Inspect Shopify draft readiness and product refs.", href: "/studio/shopify-products" },
          { icon: "PM", label: "Pricing & Margins", description: "Review price, margin, and product economics.", href: "/studio/pricing-margins" },
          { icon: "BT", label: "POD Batches", description: "Manage batch product creation work.", href: "/studio/pod-batches" }
        ]
      }
    ]
  },
  {
    id: "ai-workforce",
    label: "AI Workforce",
    href: "/studio/ai-employees",
    description: "Owner-gated employee drafts, hiring, and model operations.",
    groups: [
      {
        label: "Review",
        items: [
          { icon: "AE", label: "AI Employees", description: "Role-based assistants that draft work for owner review.", href: "/studio/ai-employees", status: "drafts" },
          { icon: "AQ", label: "Approval Queue", description: "Review AI work items and owner approvals.", href: "/studio/ai-employees" }
        ]
      },
      {
        label: "Workforce",
        items: [
          { icon: "HD", label: "Hiring Desk", description: "Review proposed employee definitions.", href: "/studio/ai-employees/hiring" },
          { icon: "ID", label: "Improvement Desk", description: "Inspect improvement suggestions and repeated blockers.", href: "/studio/ai-employees/improvements" }
        ]
      },
      {
        label: "Model Ops",
        items: [
          { icon: "MR", label: "Model Registry", description: "Configured models and safe usage boundaries.", href: "/studio/ai-employees/models" },
          { icon: "MU", label: "Model Usage", description: "Usage context without provider secret exposure.", href: "/studio/ai-employees/model-usage" },
          { icon: "ME", label: "Model Evaluations", description: "Owner-reviewed model evaluation records.", href: "/studio/ai-employees/model-evals" }
        ]
      }
    ]
  },
  {
    id: "business",
    label: "Business",
    href: "/studio/business",
    description: "Business operating system, legitimacy assets, decisions, and forecasts.",
    groups: [
      {
        label: "Command",
        items: [
          { icon: "BC", label: "Business Command Center", description: "Business health, identity, and decision summary.", href: "/studio/business", status: "ops" },
          { icon: "BP", label: "Business Profile", description: "Workspace business profile and readiness.", href: "/studio/business/profile" },
          { icon: "GL", label: "Goals", description: "Business goals that drive next actions.", href: "/studio/business/goals" }
        ]
      },
      {
        label: "Decisions",
        items: [
          { icon: "OP", label: "Opportunities", description: "Saved business opportunities for review.", href: "/studio/business/opportunities" },
          { icon: "DM", label: "Decision Memos", description: "Owner-approved decisions and assumptions.", href: "/studio/business/decision-memos" },
          { icon: "FC", label: "Forecasts", description: "Forecast scenarios and business assumptions.", href: "/studio/business/forecasts" }
        ]
      },
      {
        label: "Legitimacy",
        items: [
          { icon: "DC", label: "Documents", description: "Business documents and proof packs.", href: "/studio/business/documents" },
          { icon: "PS", label: "Business Card / Print Studio", description: "Printable legitimacy assets for owner approval.", href: "/studio/business/print-studio" },
          { icon: "AR", label: "Authority Requests", description: "Sensitive authority approvals stay explicit.", href: "/studio/business/authority-requests" }
        ]
      }
    ]
  },
  {
    id: "storefront",
    label: "Storefront",
    href: "/studio/shopify-products",
    description: "Shopify, Printify, provider connections, and draft product state.",
    groups: [
      {
        label: "Shopify / Printify",
        items: [
          { icon: "SP", label: "Shopify Products", description: "Shopify draft references and readiness.", href: "/studio/shopify-products", status: "drafts" },
          { icon: "PC", label: "Printify Catalog", description: "Real catalog browsing and variant selection.", href: "/studio/printify-catalog" },
          { icon: "PR", label: "Publish Review", description: "Provider actions and publish gates.", href: "/studio/publish-review", status: "gated" },
          { icon: "PD", label: "Product Drafts", description: "Draft and listing records in the product workflow.", href: "/studio/listing-drafts" }
        ]
      },
      {
        label: "Providers",
        items: [
          { icon: "PV", label: "Provider Connections", description: "Guided provider connection records.", href: "/studio/onboarding/providers" },
          { icon: "IN", label: "Integrations", description: "Connected commerce and storage stack.", href: "/studio/integrations", status: "stack" },
          { icon: "GS", label: "Guided Setup", description: "Launch Setup Concierge for provider connections.", href: "/studio/onboarding/guided" }
        ]
      }
    ]
  },
  {
    id: "marketing",
    label: "Marketing",
    href: "/studio/marketing-command-center",
    description: "Campaign drafts, approvals, visibility, and channel work.",
    groups: [
      {
        label: "Command",
        items: [
          { icon: "MC", label: "Marketing Command Center", description: "Marketing work queue and channel readiness.", href: "/studio/marketing-command-center", status: "drafts" },
          { icon: "CA", label: "Campaigns", description: "Campaign records awaiting owner review.", href: "/studio/marketing-campaigns" },
          { icon: "AP", label: "Approvals", description: "Marketing approvals remain owner-gated.", href: "/studio/marketing/approvals", status: "gated" }
        ]
      },
      {
        label: "Channels",
        items: [
          { icon: "SO", label: "Social", description: "Social draft queue and planner.", href: "/studio/marketing/social" },
          { icon: "EM", label: "Email", description: "Email draft studio without live sending.", href: "/studio/marketing/email" },
          { icon: "AD", label: "Ads", description: "Ad drafts without automatic spend.", href: "/studio/marketing/ads" }
        ]
      },
      {
        label: "Visibility",
        items: [
          { icon: "SV", label: "Search / AEO / GEO", description: "Search visibility and answer-engine work.", href: "/studio/marketing/search-visibility" },
          { icon: "UT", label: "Tracking / UTMs", description: "Measurement and campaign tracking readiness.", href: "/studio/marketing/tracking" },
          { icon: "MA", label: "Assets", description: "Marketing asset workflow and proof packs.", href: "/studio/marketing/assets" }
        ]
      }
    ]
  },
  {
    id: "customers",
    label: "Customers",
    href: "/studio/customer-command-center",
    description: "CRM, capture, service, scheduling, and customer campaigns.",
    groups: [
      {
        label: "Command",
        items: [
          { icon: "CC", label: "Customer Command Center", description: "Customer operations overview.", href: "/studio/customer-command-center", status: "ops" }
        ]
      },
      {
        label: "CRM",
        items: [
          { icon: "CU", label: "Customers", description: "Customer records and safe empty states.", href: "/studio/customers" },
          { icon: "LD", label: "Leads", description: "Lead records and owner follow-up paths.", href: "/studio/leads" },
          { icon: "SG", label: "Segments", description: "Customer segment definitions.", href: "/studio/customer-segments" },
          { icon: "OP", label: "Opportunities", description: "Sales opportunities and owner action.", href: "/studio/opportunities" }
        ]
      },
      {
        label: "Ops",
        items: [
          { icon: "IB", label: "Inbox", description: "Customer inbox and cases.", href: "/studio/customer-inbox" },
          { icon: "CP", label: "Campaigns", description: "Customer campaign drafts.", href: "/studio/customer-campaigns" },
          { icon: "SC", label: "Service Cases", description: "Service cases without fake PII.", href: "/studio/service-cases" },
          { icon: "SD", label: "Scheduling", description: "Customer scheduling configuration.", href: "/studio/customer-scheduling" }
        ]
      }
    ]
  },
  {
    id: "operations",
    label: "Operations",
    href: "/studio/onboarding/guided",
    description: "Setup, diagnostics, guardrails, and admin operations.",
    groups: [
      {
        label: "Setup",
        items: [
          { icon: "GS", label: "Guided Setup", description: "Connect providers through secure workspace records.", href: "/studio/onboarding/guided", status: "normal path" },
          { icon: "QS", label: "Quick Setup", description: "Local-first setup checklist.", href: "/studio/onboarding/quick-start" },
          { icon: "FR", label: "Feature Readiness", description: "Owner-facing readiness and exact next blockers.", href: "/studio/setup" },
          { icon: "PS", label: "Provider Setup", description: "Provider-specific connection pages.", href: "/studio/onboarding/providers" }
        ]
      },
      {
        label: "Diagnostics",
        items: [
          { icon: "IN", label: "Integrations", description: "Unified provider readiness and connected stack.", href: "/studio/integrations" },
          { icon: "SR", label: "Storage Readiness", description: "Protected storage diagnostic for generated assets.", href: "/studio/setup#storage-readiness" },
          { icon: "SG", label: "Security / Guardrails", description: "Safety controls and publish restrictions.", href: "/studio/setup#safety" }
        ]
      },
      {
        label: "Admin",
        items: [
          { icon: "ST", label: "Settings", description: "Workspace settings and local Studio controls.", href: "/studio/settings" },
          { icon: "AE", label: "Audit Events", description: "Workspace activity and audit trail context.", href: "/studio/account-center#activity" }
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
  const routeHref = href.split("#")[0] ?? href;
  if (routeHref === "/studio") return pathname === "/studio";
  return pathname === routeHref || pathname.startsWith(`${routeHref}/`);
}

export function allStudioMegaMenuItems(areas: readonly StudioMegaMenuArea[] = STUDIO_MEGA_MENU_AREAS) {
  return areas.flatMap((area) => area.groups.flatMap((group) => group.items.map((item) => ({ area, group, item }))));
}

export function activeStudioMegaArea(pathname: string, areas: readonly StudioMegaMenuArea[] = STUDIO_MEGA_MENU_AREAS) {
  const matches = areas
    .map((area) => {
      const items = area.groups.flatMap((group) => group.items).filter((item) => isActiveStudioHref(pathname, item.href));
      const longest = items.sort((a, b) => b.href.length - a.href.length)[0];
      const areaIsActive = isActiveStudioHref(pathname, area.href);
      return { area, item: longest, score: longest ? longest.href.length + 100 : areaIsActive ? area.href.length : 0 };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);
  const fallback = (areas[0] ?? STUDIO_MEGA_MENU_AREAS[0]) as StudioMegaMenuArea;
  return matches[0]?.area ?? fallback;
}

export function topStudioCommandLabels() {
  return STUDIO_MEGA_MENU_AREAS.map((area) => area.label);
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

export function StudioNavStatusBadge({ status }: { status: string }) {
  return <span className="studio-nav-status-badge">{status}</span>;
}

export function StudioMegaMenuItem({ item, pathname, onNavigate }: { item: StudioMegaMenuItem; pathname: string; onNavigate?: (() => void) | undefined }) {
  return <a
    className="studio-mega-menu-item"
    href={item.href}
    aria-current={isActiveStudioHref(pathname, item.href) ? "page" : undefined}
    onClick={onNavigate}
  >
    <span className="studio-mega-item-icon" aria-hidden="true">{item.icon}</span>
    <span>
      <strong>{item.label}</strong>
      <small>{item.description}</small>
    </span>
    {item.status ? <StudioNavStatusBadge status={item.status} /> : null}
  </a>;
}

export function StudioMegaMenuGroup({ group, pathname, onNavigate }: { group: StudioMegaMenuGroup; pathname: string; onNavigate?: (() => void) | undefined }) {
  return <section className="studio-mega-menu-group">
    <h3>{group.label}</h3>
    <div className="studio-mega-menu-items">
      {group.items.map((item) => <StudioMegaMenuItem key={`${group.label}-${item.href}-${item.label}`} item={item} pathname={pathname} onNavigate={onNavigate} />)}
    </div>
  </section>;
}

export function StudioMegaMenu({ area, pathname, onNavigate }: { area: StudioMegaMenuArea; pathname: string; onNavigate?: (() => void) | undefined }) {
  return <div className="studio-mega-menu" role="menu" aria-label={`${area.label} menu`}>
    <header className="studio-mega-menu-header">
      <span className="eyebrow-label">{area.label}</span>
      <p>{area.description}</p>
    </header>
    <div className="studio-mega-menu-grid">
      {area.groups.map((group) => <StudioMegaMenuGroup key={`${area.id}-${group.label}`} group={group} pathname={pathname} onNavigate={onNavigate} />)}
    </div>
  </div>;
}

export function StudioCommandLauncher({ label = "Launch command", href = "/studio/pod-launch-studio" }: { label?: string; href?: string }) {
  return <a className="studio-command-launcher" href={href}>{label}</a>;
}

export function StudioMobileNav({ pathname, onNavigate }: { pathname: string; onNavigate?: (() => void) | undefined }) {
  return <details className="studio-mobile-nav">
    <summary>Studio menu</summary>
    <div className="studio-mobile-nav-panel">
      {STUDIO_MEGA_MENU_AREAS.map((area) => <details key={`mobile-${area.id}`}>
        <summary>{area.label}</summary>
        {area.groups.flatMap((group) => group.items).map((item) => <a key={`mobile-${area.id}-${item.href}-${item.label}`} href={item.href} aria-current={isActiveStudioHref(pathname, item.href) ? "page" : undefined} onClick={onNavigate}>{item.label}</a>)}
      </details>)}
    </div>
  </details>;
}

export function StudioGlobalNav() {
  const pathname = usePathname() || "/studio";
  const activeArea = useMemo(() => activeStudioMegaArea(pathname), [pathname]);
  const [openAreaId, setOpenAreaId] = useState<string | null>(null);
  const navRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenAreaId(null);
    }
    function onPointerDown(event: PointerEvent) {
      if (navRef.current && event.target instanceof Node && !navRef.current.contains(event.target)) setOpenAreaId(null);
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, []);

  return <nav className="studio-global-nav studio-command-nav" aria-label="Studio global command navigation" ref={navRef}>
    <div className="studio-global-nav-track">
      {STUDIO_MEGA_MENU_AREAS.map((area) => {
        const active = activeArea.id === area.id || isActiveStudioHref(pathname, area.href);
        const open = openAreaId === area.id;
        const panelId = `studio-mega-${area.id}`;
        return <div className="studio-global-nav-item" key={area.id}>
          <button
            type="button"
            className={`studio-command-link${active ? " is-active" : ""}`}
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpenAreaId((current) => current === area.id ? null : area.id)}
          >
            <span>{area.label}</span>
            <small>{area.description}</small>
          </button>
          {open ? <div id={panelId} className="studio-mega-menu-shell"><StudioMegaMenu area={area} pathname={pathname} onNavigate={() => setOpenAreaId(null)} /></div> : null}
        </div>;
      })}
    </div>
    <StudioMobileNav pathname={pathname} onNavigate={() => setOpenAreaId(null)} />
  </nav>;
}

export function StudioWorkflowSidebar() {
  const pathname = usePathname() || "/studio";
  const activeArea = activeStudioMegaArea(pathname);
  const activeItem = allStudioMegaMenuItems().find(({ item }) => isActiveStudioHref(pathname, item.href))?.item;
  const title = activeItem?.label ?? activeArea.label;
  const primary = activeArea.groups[0]?.items[0];

  return <aside className="studio-workflow-sidebar" aria-label="Contextual workflow navigation">
    <section className="studio-context-panel sf-texture-topo">
      <p className="eyebrow-label">{activeArea.label}</p>
      <strong>{title}</strong>
      <p>{activeArea.description}</p>
      <div className="studio-context-actions">
        {primary ? <a href={primary.href}>{primary.label}</a> : null}
        <a href="/studio/onboarding/help">Setup help</a>
      </div>
    </section>
    {activeArea.id === "pod-factory" ? <StudioPodStageRail /> : null}
    <nav className="studio-context-nav" aria-label={`${activeArea.label} workflow links`}>
      {activeArea.groups.map((group) => <section key={`context-${activeArea.id}-${group.label}`} className="studio-context-nav-group">
        <h3>{group.label}</h3>
        {group.items.map((item) => <a key={`context-${item.href}-${item.label}`} href={item.href} aria-current={isActiveStudioHref(pathname, item.href) ? "page" : undefined}>
          <span className="studio-mega-item-icon" aria-hidden="true">{item.icon}</span>
          <span><strong>{item.label}</strong><small>{item.description}</small></span>
        </a>)}
      </section>)}
    </nav>
  </aside>;
}

export function StudioCommandCenterNav() {
  return <StudioGlobalNav />;
}

export function StudioTopNavDropdowns() {
  return <StudioGlobalNav />;
}
