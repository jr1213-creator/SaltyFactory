export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireStudioUser } from "@saltyfactory/auth";
import { NotificationBell, ProgressBar, SearchCommand, UserMenu, WorkspaceSwitcher } from "@saltyfactory/ui";

const navGroups = [
  {
    label: "",
    links: [["Dashboard", "/studio"]]
  },
  {
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
    label: "AI Employees",
    links: [["AI Employees", "/studio/ai-employees"]]
  },
  {
    label: "Storefront",
    links: [
      ["Products", "/studio/products"],
      ["Shopify / Printify", "/studio/integrations"],
      ["SaltyCowhide.com", "/studio/drafts"]
    ]
  },
  {
    label: "Marketing",
    links: [
      ["Social Planner", "/studio/social-planner"],
      ["Channels", "/studio/channels"],
      ["Trends", "/studio/trends"]
    ]
  },
  {
    label: "Analytics",
    links: [
      ["Baseline & Impact", "/studio/baseline"],
      ["Google Data", "/studio/integrations"]
    ]
  },
  {
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
    label: "Expansion",
    links: [["Accessory Dropshipping", "/studio/dropshipping"]]
  }
];

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  try {
    const jar = await cookies();
    const cookieHeader = jar.getAll().map(({ name, value }) => `${name}=${encodeURIComponent(value)}`).join("; ");
    await requireStudioUser(cookieHeader);
  } catch (error) {
    if (error instanceof Error && error.message === "unauthenticated") redirect("/login");
    if (error instanceof Error && error.message === "forbidden") redirect("/login?error=missing_membership");
    throw error;
  }

  return <div className="studio-shell">
    <aside className="studio-sidebar">
      <a className="studio-logo" href="/studio"><span className="studio-logo-mark" />SaltyFactory</a>
      <nav className="studio-nav" aria-label="Studio navigation">
        {navGroups.map((group) => <section className="studio-nav-group" key={group.label || "dashboard"}>
          {group.label ? <h2 className="studio-nav-heading">{group.label}</h2> : null}
          {group.links.map(([label, href]) => <a key={`${group.label}-${href}-${label}`} href={href}>{label}</a>)}
        </section>)}
      </nav>
      <section className="studio-plan">
        <strong>Pro Studio Plan <a href="/studio/billing">Manage</a></strong>
        <ProgressBar label="Credits used" value={68} />
        <ProgressBar label="Storage" value={42} />
      </section>
    </aside>
    <div className="studio-main">
      <header className="studio-topbar">
        <WorkspaceSwitcher />
        <SearchCommand />
        <div className="sf-page-actions"><NotificationBell /><UserMenu /></div>
      </header>
      <main className="studio-content">{children}</main>
    </div>
  </div>;
}
