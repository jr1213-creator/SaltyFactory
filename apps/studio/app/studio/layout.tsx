export const dynamic = "force-dynamic";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireStudioUser, SUPABASE_ACCESS_COOKIE, SUPABASE_REFRESH_COOKIE } from "@saltyfactory/auth";
import { NotificationBell, ProgressBar, SearchCommand, UserMenu, WorkspaceSwitcher } from "@saltyfactory/ui";

const links = [
  ["Dashboard", "/studio"],
  ["Trends", "/studio/trends"],
  ["Briefs", "/studio/briefs"],
  ["Assets", "/studio/assets"],
  ["Products", "/studio/drafts"],
  ["Publish Review", "/studio/publish"],
  ["Analytics", "/studio/analytics"],
  ["Integrations", "/studio/integrations"],
  ["AI Employees", "/studio/ai-employees"],
  ["Billing", "/studio/billing"],
  ["Settings", "/studio/settings"]
];

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  try {
    const jar = await cookies();
    const accessToken = jar.get(SUPABASE_ACCESS_COOKIE)?.value || "";
    const refreshToken = jar.get(SUPABASE_REFRESH_COOKIE)?.value || "";
    await requireStudioUser(`${SUPABASE_ACCESS_COOKIE}=${accessToken}; ${SUPABASE_REFRESH_COOKIE}=${refreshToken}`);
  } catch (error) {
    if (error instanceof Error && error.message === "unauthenticated") redirect("/login");
    throw error;
  }

  return <div className="studio-shell">
    <aside className="studio-sidebar">
      <a className="studio-logo" href="/studio"><span className="studio-logo-mark" />SaltyFactory</a>
      <nav className="studio-nav" aria-label="Studio navigation">
        {links.map(([label, href]) => <a key={href} href={href}>{label}</a>)}
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
