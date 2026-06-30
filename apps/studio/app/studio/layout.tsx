export const dynamic = "force-dynamic";
import { requireStudioUser } from "@saltyfactory/auth";
const links=["trends","clusters","phrases","briefs","generate","assets","mockups","drafts","publish","products","settings"];
export default async function StudioLayout({children}:{children:React.ReactNode}){ await requireStudioUser(); return <div className="shell"><aside className="side"><h2>SaltyFactory</h2><a href="/studio">Dashboard</a>{links.map(l=><a key={l} href={`/studio/${l}`}>{l}</a>)}<a href="/api/studio/logout">Logout</a></aside><main className="main">{children}</main></div>; }
