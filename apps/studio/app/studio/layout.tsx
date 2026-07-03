export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireStudioUser } from "@saltyfactory/auth";
import { NotificationBell, ProgressBar, SearchCommand, UserMenu, WorkspaceSwitcher } from "@saltyfactory/ui";
import { StudioNavigation } from "./StudioNavigation";

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
      <StudioNavigation />
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
        <div className="page-actions"><NotificationBell /><UserMenu /></div>
      </header>
      <main className="studio-content">{children}</main>
    </div>
  </div>;
}
